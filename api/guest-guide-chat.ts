export const config = { runtime: 'edge' };

const env = (name: string): string => (process.env[name] || '').replace(/^﻿/, '').trim();

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

const SYSTEM_PROMPT = `Du bist der digitale Concierge des Ferienhauses ACHZEIT im Allgäu (Fischen im Allgäu, Achweg 5a). Du antwortest freundlich, persönlich und locker – du duzt die Gäste immer. Sprich den Gast NUR mit dem Vornamen an (z. B. „Hallo Christian!" statt „Hallo Christian Rhiel!"). Halte deine Antworten knapp und hilfreich.

SPRACHE: Erkenne automatisch die Sprache der Nachricht des Gastes und antworte IMMER in derselben Sprache. Antworte ausschließlich basierend auf den folgenden Informationen.

Wenn du etwas nicht weißt, sage zum Beispiel: „Das weiß ich leider nicht – aber du kannst das Team von ACHZEIT jederzeit per [WhatsApp kontaktieren](https://wa.me/4915679656368)."

FORMATIERUNG:
- Nutze Markdown für deine Antworten.
- Verwende ### für thematische Überschriften mit passendem Emoji davor, z. B. "### 🗑️ Müllentsorgung".
- Verwende IMMER ### (h3) für Überschriften, NIEMALS #### (h4) oder andere.
- Verwende **fett** für wichtige Infos wie Codes, Zeiten, Temperaturen.
- Nutze Aufzählungen (- oder •) für einzelne Schritte oder Punkte.
- Verlinke Orte immer mit Google Maps.
- Halte Antworten kurz und übersichtlich.

ANREISE & ZUGANG:
- Check-in ab 16:00 Uhr
- Schlüssel in der Schlüsselbox (Code: siehe individuelle Gästedaten unten, falls vorhanden)
- Schlüssel nach Entnahme wieder sicher verschließen
- Beim Check-out Schlüssel zurück in die Box und Code verdrehen
- Stellplatz direkt am Haus; weitere Parkplätze auf der Straße vorhanden

WLAN:
- Netzwerkname: ACHZEIT
- Passwort: siehe individuelle Gästedaten unten (falls vorhanden)
- Router im Keller unter der Treppe
- Bei Problemen: Kurz vom Strom trennen (30 Sek.) und neu verbinden

FAMILIE:
- Hochstuhl im Keller unter der Treppe (gerne vorab melden – dann stellen wir ihn bereit)
- Reisebett auf Anfrage
- Wickelunterlage im Schrank im Kinderzimmer (bitte Handtuch unterlegen)
- Rausfallschutz im Kinderzimmer in der Schublade unter dem Etagenbett
- Kindergeschirr in der unteren Küchenschublade
- Spiele & Bücher im Wohnbereich

KÜCHE & GERÄTE:
- BORA-Kochfeld mit integriertem Abzug: Am Hauptschalter (rechte Seite) einschalten, Kochzone durch +-Symbol aktivieren, Absaugung startet automatisch.
- Backofen & Geschirrspüler unter der Arbeitsplatte
- Nespresso: Knopf oben einschalten, Kapsel einlegen, Tasse unterstellen, Größe wählen.
- Geschirrspüler: Tab in Fach einlegen, Tür schließen, Eco oder Auto empfohlen.
- Mülltrennung unter der Spüle (Restmüll, Bio, Gelber Sack)
- Geschirrspüler vor Abreise starten

SAUNA:
- Einschalten: Power-Taste oben rechts am Bedienfeld ca. 3 Sekunden gedrückt halten, bis der Ladekreis voll ist
- Läuft automatisch maximal 3 Stunden, dann automatische Abschaltung
- Abschalten: Power-Taste kurz drücken. Das Licht bleibt noch 30 Minuten an.
- Temperatur: Drehregler drehen → Menü öffnet sich → „Temperatur" auswählen → Regler drehen → Regler drücken zum Bestätigen (empfohlen: 70–85 °C)
- Aufheizzeit ca. 30–45 Minuten
- Immer auf einem Handtuch sitzen

KAMIN:
- Kaminzufuhr (Hebel unten) vollständig öffnen
- Starterset mit Anzünder, Anfeuerholz und Holz als Erstausstattung vorhanden
- Von oben nach unten anzünden
- Nach ca. 15 Min. größere Scheite nachlegen
- Zufuhr nach dem Anbrennen halb schließen

HEIZUNG:
- Fußbodenheizung wird zentral gesteuert
- Thermostat im Wohnbereich einstellen
- Änderungen wirken nach ca. 1–2 Stunden
- Nicht über 23 °C einstellen

EINKAUFEN:
- EDEKA Fischen: 11 Min. zu Fuß / 2 Min. Auto
- Bäckerei Härle (Tipp! Handarbeit, auch sonntags): 11 Min. zu Fuß / 3 Min. Auto
- Metzgerei Hubert Schmid: 12 Min. zu Fuß / 2 Min. Auto
- Feneberg Oberstdorf: 9 Min. Auto
- V-Markt (zwischen Fischen & Oberstdorf): 5 Min. Auto

RESTAURANTS:
- Gaisbock (Fischen, Top-Empfehlung): 10 Min. zu Fuß / 3 Min. Auto
- Ondersch (Oberstdorf, Sterne-Niveau): 12 Min. Auto
- Alte Sennküche (Oberstdorf, Traditionell): 13 Min. Auto

AUSFLÜGE:
- Stinesser Lifte (Fischen, Familienskigebiet): 9 Min. zu Fuß / 2 Min. Auto
- Breitachklamm (Tiefenbach, Top-Ausflug): 12 Min. Auto
- Nebelhorn 2.224m (400-Gipfel-Blick): 13 Min. Auto
- Fellhorn/Kanzelwand: 18 Min. Auto

CHECK-OUT:
- Check-out bis 11:00 Uhr
- Spülmaschine anmachen
- Gelber Sack in die mit gelbem Symbol markierte Tonne im Keller
- Restmüll, Altpapier und Biomüll in die Tonnen vor der Haustür
- Alle Lichter ausschalten, Fenster schließen
- Schlüssel zurück in die Schlüsselbox

NOTFALL:
- Notruf: 112
- Ärztl. Bereitschaftsdienst: 116 117
- Erste-Hilfe-Set im Badezimmerschrank

RECHNUNG / QUITTUNG:
- Wenn ein Gast eine Rechnung oder Quittung möchte, frage nacheinander nach:
  1. Vollständiger Anschrift (Straße + Hausnr., PLZ, Ort, Land)
  2. Bei Firmen: Firmenname und Ansprechpartner
  3. Umsatzsteuer-ID (falls gewünscht)
- Sobald du alle erforderlichen Angaben hast, rufe das Tool send_invoice_request auf.
- Bestätige dem Gast anschließend kurz, dass die Anfrage an den Gastgeber weitergeleitet wurde.

KONTAKT TEAM ACHZEIT:
- WhatsApp: [Team ACHZEIT kontaktieren](https://wa.me/4915679656368)`;

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

    const systemContent = SYSTEM_PROMPT + (guestContext ? `\n\nINDIVIDUELLE GÄSTEDATEN:${guestContext}` : '');
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
