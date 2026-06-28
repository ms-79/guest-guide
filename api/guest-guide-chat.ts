export const config = { runtime: 'edge' };

/** Strip UTF-8 BOM (U+FEFF) and surrounding whitespace from an env var. */
const env = (name: string): string => (process.env[name] || '').replace(/^﻿/, '').trim();

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
- Carport direkt am Haus

WLAN:
- Netzwerkname: ACHZEIT
- Passwort: siehe individuelle Gästedaten unten (falls vorhanden)
- Router im Keller unter der Treppe
- Bei Problemen: Kurz vom Strom trennen (30 Sek.) und neu verbinden

FAMILIE:
- Babybett und Hochstuhl im Keller unter der Treppe
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

KONTAKT TEAM ACHZEIT:
- WhatsApp: [Team ACHZEIT kontaktieren](https://wa.me/4915679656368)`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { messages, context } = await req.json();
    const apiKey = env('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

    let guestContext = '';
    if (context?.wifiPassword) guestContext += `\nDas WLAN-Passwort für diesen Gast lautet: **${context.wifiPassword}**`;
    if (context?.boxCode) guestContext += `\nDer Schlüsselbox-Code für diesen Gast lautet: **${context.boxCode}**`;
    if (context?.guestName) guestContext += `\nDer Gast heißt: ${context.guestName}`;

    const systemContent = SYSTEM_PROMPT + (guestContext ? `\n\nINDIVIDUELLE GÄSTEDATEN:${guestContext}` : '');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        stream: true,
        system: [{ type: 'text', text: systemContent, cache_control: { type: 'ephemeral' } }],
        messages,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const body = await response.text().catch(() => '');
      if (status === 429) return new Response(JSON.stringify({ error: 'Zu viele Anfragen – bitte kurz warten.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'AI-Service nicht verfügbar', status, detail: body.slice(0, 200) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Convert Anthropic SSE format to OpenAI SSE format (frontend expects OpenAI format)
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      const reader = response.body!.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                const openai = JSON.stringify({ choices: [{ delta: { content: parsed.delta.text } }] });
                await writer.write(encoder.encode(`data: ${openai}\n\n`));
              } else if (parsed.type === 'message_stop') {
                await writer.write(encoder.encode('data: [DONE]\n\n'));
              }
            } catch { /* ignore malformed lines */ }
          }
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unbekannter Fehler' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
