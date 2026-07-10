export const config = { runtime: 'edge' };

// Property content is generated at build time (scripts/generate-content.ts)
// into a plain-data module. Edge runtime cannot read the filesystem, so we
// import the validated content instead of reading content/**  at request time.
import { getChatbotFacts, propertyMeta } from '../src/generated/content';

const env = (name: string): string => (process.env[name] || '').replace(/^\uFEFF/, '').trim();

const INVOICE_TOOL = {
  name: 'send_invoice_request',
  description: 'Schickt eine Rechnungsanfrage mit den Gästedaten an den Gastgeber per E-Mail. Nur aufrufen, wenn du alle erforderlichen Informationen (vollständige Anschrift) vom Gast erhalten hast.',
  input_schema: {
    type: 'object',
    properties: {
      full_name: { type: 'string', description: 'Vollständiger Name (Privatperson) oder Firmenname' },
      address: { type: 'string', description: 'Vollständige Anschrift: Straße + Hausnr., PLZ, Ort, Land' },
      contact_person: { type: 'string', description: 'Ansprechpartner bei Firmen (optional)' },
      vat_id: { type: 'string', description: 'Umsatzsteuer-ID (optional)' },
    },
    required: ['full_name', 'address'],
  },
};

// ── Block A: globales, property-unabhängiges Assistant-Gerüst ──────────────
// Enthält nur Rolle, Ton, Sicherheits- und Formatierungsregeln sowie den
// Rechnungs-Flow. KEINE property-spezifischen Fakten — die kommen als Block B
// aus den generierten Property-Facts (content/properties/**).
const GLOBAL_SCAFFOLD = `Du bist der digitale Concierge einer Ferienunterkunft im Allgäu. Du antwortest freundlich, persönlich und locker – du duzt die Gäste immer. Sprich den Gast NUR mit dem Vornamen an (z. B. „Hallo Christian!" statt „Hallo Christian Rhiel!"). Halte deine Antworten knapp und hilfreich.

SPRACHE: Erkenne automatisch die Sprache der Nachricht des Gastes und antworte IMMER in derselben Sprache.

WICHTIG – NICHT HALLUZINIEREN: Antworte ausschließlich auf Basis der unten stehenden PROPERTY-FAKTEN und der individuellen Gästedaten. Erfinde niemals hausspezifische Details (Codes, Ausstattung, Zeiten, Preise, Hausregeln). Wenn eine Information nicht in den PROPERTY-FAKTEN steht, sage ehrlich, dass du es nicht sicher weißt.

FORMATIERUNG:
- Nutze Markdown für deine Antworten.
- Verwende ### für thematische Überschriften mit passendem Emoji davor, z. B. "### 🗑️ Müllentsorgung".
- Verwende IMMER ### (h3) für Überschriften, NIEMALS #### (h4) oder andere.
- Verwende **fett** für wichtige Infos wie Codes, Zeiten, Temperaturen.
- Nutze Aufzählungen (- oder •) für einzelne Schritte oder Punkte.
- Verlinke Orte, wenn möglich, mit Google Maps.
- Halte Antworten kurz und übersichtlich.

RECHNUNG / QUITTUNG:
- Wenn ein Gast eine Rechnung oder Quittung möchte, frage nacheinander nach:
  1. Auf wen soll die Rechnung ausgestellt werden? (Name der Person oder Firmenname)
  2. Wie lautet der Name des Ansprechpartners? (nur bei Firmen – falls Privatperson, überspringen)
  3. Vollständige Anschrift (Straße + Hausnr., PLZ, Ort, Land)
  4. Gibt es eine Umsatzsteuer-ID? (optional – nur nachfragen, falls noch nicht genannt)
- Sobald du alle erforderlichen Angaben hast, rufe das Tool send_invoice_request auf.
- Bestätige dem Gast anschließend kurz, dass die Anfrage an den Gastgeber weitergeleitet wurde.`;

/**
 * Builds the cacheable system text (Block A + Block B) for a property.
 * Block A is the global scaffold, Block B are the property-specific facts
 * loaded from the generated content (with de → en fallback). If no facts are
 * available, a safe fallback tells the assistant not to invent house details.
 * Guest context (Block C) is added separately and is NOT part of this text.
 */
function buildSystemText(propertySlug: string, locale: string): string {
  const meta = propertyMeta[propertySlug];
  const displayName = meta?.displayName ?? 'dieser Unterkunft';
  const wa = meta?.whatsappNumber;
  const contactHint = wa
    ? `Verweise den Gast bei Unsicherheit oder Problemen an den Gastgeber per [WhatsApp](https://wa.me/${wa}).`
    : `Verweise den Gast bei Unsicherheit oder Problemen an den Gastgeber bzw. das Team von Allgäu Stays.`;

  const facts = getChatbotFacts(propertySlug, locale);
  const factsBlock = facts
    ? `PROPERTY-FAKTEN (${displayName}):\n\n${facts.markdown}`
    : `PROPERTY-FAKTEN: Für ${displayName} liegen dir gerade keine spezifischen Hausinformationen vor. Erfinde KEINE hausspezifischen Details. Wenn der Gast nach konkreten Hausinfos fragt, sage freundlich, dass du die Information gerade nicht sicher abrufen kannst.`;

  return `${GLOBAL_SCAFFOLD}\n\n${contactHint}\n\n${factsBlock}`;
}

async function sendInvoiceEmail(
  input: { full_name: string; address: string; contact_person?: string; vat_id?: string },
  guestName: string,
  resendKey: string,
): Promise<void> {
  const lines = [
    `Neue Rechnungsanfrage über den Gäste-Chatbot`,
    ``,
    `Gast: ${guestName}`,
    ``,
    `--- Rechnungsdaten ---`,
    `Name / Firma: ${input.full_name}`,
    `Adresse: ${input.address}`,
  ];
  if (input.contact_person) lines.push(`Ansprechpartner: ${input.contact_person}`);
  if (input.vat_id) lines.push(`USt-ID: ${input.vat_id}`);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'info@allgaeu-stays.com',
      to: 'markus.siegmann@gmail.com',
      subject: `Rechnungsanfrage – ${guestName}`,
      text: lines.join('\n'),
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}`);
}

function makeAnthropicHeaders(apiKey: string) {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'content-type': 'application/json',
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { messages, context } = await req.json();
    const apiKey = env('ANTHROPIC_API_KEY');
    const resendKey = env('RESEND_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

    let guestContext = '';
    const guestName: string = context?.guestName || 'Gast';
    if (context?.wifiPassword) guestContext += `\nDas WLAN-Passwort für diesen Gast lautet: **${context.wifiPassword}**`;
    if (context?.boxCode) guestContext += `\nDer Schlüsselbox-Code für diesen Gast lautet: **${context.boxCode}**`;
    if (context?.guestName) guestContext += `\nDer Gast heißt: ${context.guestName}`;

    // Property-aware prompt: Block A (scaffold) + Block B (property facts) are
    // cacheable; Block C (guest context) is a separate, NON-cached block so no
    // per-guest/sensitive data ends up in the prompt cache.
    const propertySlug: string = context?.propertySlug || '';
    const locale: string = context?.locale || 'de';
    const systemBlock: Array<Record<string, unknown>> = [
      { type: 'text', text: buildSystemText(propertySlug, locale), cache_control: { type: 'ephemeral' } },
    ];
    if (guestContext) {
      systemBlock.push({ type: 'text', text: `INDIVIDUELLE GÄSTEDATEN:${guestContext}` });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: makeAnthropicHeaders(apiKey),
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        stream: true,
        system: systemBlock,
        tools: [INVOICE_TOOL],
        messages,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const body = await response.text().catch(() => '');
      if (status === 429) return new Response(JSON.stringify({ error: 'Zu viele Anfragen – bitte kurz warten.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'AI-Service nicht verfügbar', status, detail: body.slice(0, 200) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      const reader = response.body!.getReader();
      let buf = '';

      // Accumulate tool_use blocks
      type ToolBlock = { id: string; name: string; inputJson: string };
      let currentTool: ToolBlock | null = null;
      const toolBlocks: ToolBlock[] = [];
      let assistantTextSoFar = '';
      const assistantContentForFollowUp: unknown[] = [];

      const write = (text: string) =>
        writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));

      try {
        // ── Phase 1: stream first response ───────────────────────────────────
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            try {
              const ev = JSON.parse(jsonStr);

              if (ev.type === 'content_block_start') {
                if (ev.content_block.type === 'tool_use') {
                  currentTool = { id: ev.content_block.id, name: ev.content_block.name, inputJson: '' };
                } else if (ev.content_block.type === 'text') {
                  // text block starting – nothing to do
                }
              } else if (ev.type === 'content_block_delta') {
                if (ev.delta.type === 'text_delta') {
                  assistantTextSoFar += ev.delta.text;
                  await write(ev.delta.text);
                } else if (ev.delta.type === 'input_json_delta' && currentTool) {
                  currentTool.inputJson += ev.delta.partial_json;
                }
              } else if (ev.type === 'content_block_stop') {
                if (currentTool) {
                  toolBlocks.push(currentTool);
                  currentTool = null;
                }
              }
            } catch { /* ignore malformed lines */ }
          }
        }

        // ── Phase 2: execute tools if any ────────────────────────────────────
        if (toolBlocks.length > 0) {
          if (assistantTextSoFar) {
            assistantContentForFollowUp.push({ type: 'text', text: assistantTextSoFar });
          }

          const toolResults: unknown[] = [];

          for (const tool of toolBlocks) {
            assistantContentForFollowUp.push({
              type: 'tool_use',
              id: tool.id,
              name: tool.name,
              input: JSON.parse(tool.inputJson || '{}'),
            });

            if (tool.name === 'send_invoice_request') {
              try {
                const input = JSON.parse(tool.inputJson || '{}');
                await sendInvoiceEmail(input, guestName, resendKey);
                toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: 'Email erfolgreich versendet.' });
              } catch (e) {
                toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: `Fehler beim Versenden: ${e instanceof Error ? e.message : 'Unbekannt'}`, is_error: true });
              }
            }
          }

          // Second call: get Claude's confirmation text
          const followUpMessages = [
            ...messages,
            { role: 'assistant', content: assistantContentForFollowUp },
            { role: 'user', content: toolResults },
          ];

          const followUp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: makeAnthropicHeaders(apiKey),
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 512,
              stream: true,
              system: systemBlock,
              messages: followUpMessages,
              // No tools here to prevent infinite loops
            }),
          });

          if (followUp.ok) {
            const reader2 = followUp.body!.getReader();
            let buf2 = '';
            while (true) {
              const { done, value } = await reader2.read();
              if (done) break;
              buf2 += decoder.decode(value, { stream: true });
              const lines = buf2.split('\n');
              buf2 = lines.pop() || '';
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const ev = JSON.parse(line.slice(6).trim());
                  if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
                    await write(ev.delta.text);
                  }
                } catch { /* ignore */ }
              }
            }
          }
        }
      } finally {
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();
      }
    })();

    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unbekannter Fehler' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
