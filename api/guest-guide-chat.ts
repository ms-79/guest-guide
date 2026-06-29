import { getKnowledgeBundle, renderSystemPrompt, supabaseConfigured } from './_lib/supabase-rest';
import { substituteTokens } from '../src/lib/knowledge';

export const config = { runtime: 'edge' };

const env = (name: string): string => (process.env[name] || '').replace(/^﻿/, '').trim();

// Generic, property-agnostic fallback used ONLY if the CMS is unreachable or has
// no prompt for the property. The real, editable prompts live in Supabase
// (chatbot_prompts). Tokens are substituted at runtime.
const FALLBACK_PROMPT = `Du bist der digitale Concierge der Unterkunft {{property_name}} im Allgäu. Du duzt die Gäste, antwortest freundlich und knapp und sprichst den Gast nur mit Vornamen an.

SPRACHE: Erkenne die Sprache der Nachricht und antworte IMMER in derselben Sprache. Antworte ausschließlich anhand der bereitgestellten Informationen. Erfinde niemals Codes, Passwörter, Preise oder Zeiten.

Wenn du etwas nicht weißt, biete den WhatsApp-Kontakt an: {{whatsapp_url}}.

FORMATIERUNG: Markdown, ### (h3) Überschriften mit Emoji, **fett** für wichtige Werte, Aufzählungen für Schritte.`;

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

async function sendInvoiceEmail(
  input: { full_name: string; address: string; contact_person?: string; vat_id?: string },
  guestName: string,
  resendKey: string,
  recipient: string,
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
      to: recipient,
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
    const { messages, context, property, locale } = await req.json();
    const apiKey = env('ANTHROPIC_API_KEY');
    const resendKey = env('RESEND_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

    // ── Load the property-specific knowledge from the CMS ─────────────────────
    // Falls back to a generic prompt only if the CMS is unreachable or the
    // property has no prompt, so the chatbot keeps working during rollout.
    const propertySlug: string = property || '';
    const lang: string = locale || 'de';
    let basePrompt = '';
    let invoiceRecipient = env('INVOICE_RECIPIENT_EMAIL') || 'markus.siegmann@gmail.com';
    let whatsappUrl = '';
    let propertyName = 'der Unterkunft';

    if (propertySlug && supabaseConfigured()) {
      try {
        const bundle = await getKnowledgeBundle(propertySlug, lang);
        if (bundle) {
          basePrompt = renderSystemPrompt(bundle);
          propertyName = bundle.propertyName;
          if (bundle.invoiceRecipientEmail) invoiceRecipient = bundle.invoiceRecipientEmail;
          if (bundle.whatsappNumber) whatsappUrl = `https://wa.me/${bundle.whatsappNumber}`;
        }
      } catch (err) {
        console.error('chat: CMS knowledge fetch failed, using fallback prompt', err);
      }
    }

    if (!basePrompt) {
      basePrompt = substituteTokens(FALLBACK_PROMPT, {
        property_name: propertyName,
        whatsapp_url: whatsappUrl,
      });
    }

    let guestContext = '';
    const guestName: string = context?.guestName || 'Gast';
    if (context?.wifiPassword) guestContext += `\nDas WLAN-Passwort für diesen Gast lautet: **${context.wifiPassword}**`;
    if (context?.boxCode) guestContext += `\nDer Schlüsselbox-Code für diesen Gast lautet: **${context.boxCode}**`;
    if (context?.guestName) guestContext += `\nDer Gast heißt: ${context.guestName}`;

    const systemContent = basePrompt + (guestContext ? `\n\nINDIVIDUELLE GÄSTEDATEN:${guestContext}` : '');
    const systemBlock = [{ type: 'text', text: systemContent, cache_control: { type: 'ephemeral' } }];

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
                await sendInvoiceEmail(input, guestName, resendKey, invoiceRecipient);
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
