export const config = { runtime: 'edge' };

import { hasValidSession } from '../../../src/server/session';
import { getChatbotFacts, propertyMeta } from '../../../src/generated/content';
import { findForbiddenFactMatches } from '../../../src/content/facts-guard';
import { ALLOWED_GUEST_PLACEHOLDERS, findUnknownPlaceholders } from '../../../src/content/placeholders';

const env = (name: string): string => (process.env[name] || '').replace(/^﻿/, '').trim();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LOCALES = ['de', 'en', 'es', 'it', 'fr', 'nl'];
const LOCALE_NAMES: Record<string, string> = {
  de: 'Deutsch', en: 'Englisch', es: 'Spanisch', it: 'Italienisch', fr: 'Französisch', nl: 'Niederländisch',
};
const MODES = ['create', 'improve', 'shorten', 'lengthen', 'translate'] as const;
type Mode = (typeof MODES)[number];

const MODE_TASK: Record<Mode, string> = {
  create: 'Erzeuge einen neuen, kurzen Text.',
  improve: 'Verbessere den vorhandenen Text (Klarheit, Ton), ohne den Sinn zu verändern.',
  shorten: 'Kürze den vorhandenen Text, ohne wichtige Informationen zu verlieren.',
  lengthen: 'Formuliere den vorhandenen Text etwas ausführlicher, aber bleib knapp und konkret.',
  translate: 'Übersetze den vorhandenen Text in die Zielsprache und behalte Ton und Bedeutung bei.',
};

// Brand/tone scaffold for the EDITORIAL helper (distinct from the chatbot).
// The model writes guest-facing copy — it must not invent house details and may
// only reference dynamic values via the allowed placeholders.
const TONE = `Du bist redaktionelle Unterstützung für die digitale Gästemappe einer hochwertigen Ferienunterkunft im Allgäu (Marke ACHZEIT / Allgäu Stays).

TON:
- warm, ruhig, natürlich, hochwertig; familienfreundlich (Familien mit Kindern).
- Allgäu-Gefühl (Natur, Berge, Sauna, Kamin, Rückzugsort). Kein Corporate-Sprech, keine hohlen Superlative, kein Werbeblabla.
- Auf Deutsch: Du-Form (du/ihr/euch/eure). Auf Englisch: freundliches „you". Immer knapp und klar.

REGELN (WICHTIG):
- Nutze AUSSCHLIESSLICH die unten stehenden PROPERTY-FAKTEN. Erfinde KEINE Details (Codes, Zeiten, Preise, Ausstattung, Hausregeln), die nicht in den Fakten stehen.
- Verwende für dynamische, gastspezifische Werte NUR Platzhalter in doppelten geschweiften Klammern aus der erlaubten Liste – schreibe NIEMALS konkrete Codes, Passwörter, Zeiten oder Namen hinein.
- Gib NUR den fertigen Text zurück (Markdown erlaubt: **fett**, Listen). Keine Vorrede, keine Anführungszeichen um den ganzen Text, keine Erklärungen.`;

/**
 * AI editorial helper (admin only): generates or refines guest-guide copy from
 * the property's facts, in the target locale and brand tone. Draft-only — the
 * caller previews and explicitly accepts; nothing is published here.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = env('ADMIN_SESSION_SECRET');
  if (!secret) return json({ error: 'Admin-Bereich ist nicht konfiguriert.' }, 500);
  if (!(await hasValidSession(req, secret))) return json({ error: 'Nicht angemeldet.' }, 401);

  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'KI-Integration ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt).' }, 500);

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Ungültige Anfrage.' }, 400);
  }

  const propertySlug = typeof payload.propertySlug === 'string' ? payload.propertySlug : '';
  const locale = typeof payload.locale === 'string' ? payload.locale : '';
  const mode = (typeof payload.mode === 'string' ? payload.mode : 'create') as Mode;
  const target = typeof payload.target === 'string' ? payload.target.slice(0, 200) : '';
  const currentText = typeof payload.currentText === 'string' ? payload.currentText.slice(0, 4000) : '';
  const instructions = typeof payload.instructions === 'string' ? payload.instructions.slice(0, 500) : '';

  if (!propertyMeta[propertySlug]) return json({ error: 'Unbekannte Property.' }, 400);
  if (!LOCALES.includes(locale)) return json({ error: 'Ungültige Sprache.' }, 400);
  if (!MODES.includes(mode)) return json({ error: 'Ungültiger Modus.' }, 400);
  if (!target) return json({ error: 'Es fehlt die Angabe, was erzeugt werden soll.' }, 400);
  if (mode !== 'create' && !currentText.trim()) return json({ error: 'Für diesen Modus wird ein vorhandener Text benötigt.' }, 400);

  const displayName = propertyMeta[propertySlug].displayName;
  const facts = getChatbotFacts(propertySlug, locale);
  const factsBlock = facts
    ? `PROPERTY-FAKTEN (${displayName}):\n\n${facts.markdown}`
    : `PROPERTY-FAKTEN (${displayName}): Es liegen keine spezifischen Fakten vor. Schreibe nur allgemeine, unverfängliche Begrüßungs-/Hinweistexte und erfinde keine hausspezifischen Details.`;

  const placeholderList = ALLOWED_GUEST_PLACEHOLDERS.map((p) => `- {{${p.token}}} = ${p.label}`).join('\n');
  const system = `${TONE}\n\nERLAUBTE PLATZHALTER (nur diese, sonst keine):\n${placeholderList}\n\n${factsBlock}`;

  const userParts = [
    `Aufgabe: ${MODE_TASK[mode]}`,
    `Es geht um: ${target}.`,
    `Zielsprache: ${LOCALE_NAMES[locale] || locale}. Schreibe den gesamten Text in dieser Sprache.`,
  ];
  if (currentText.trim()) userParts.push(`Vorhandener Text:\n"""\n${currentText.trim()}\n"""`);
  if (instructions.trim()) userParts.push(`Zusätzliche Hinweise: ${instructions.trim()}`);
  userParts.push('Antworte NUR mit dem fertigen Text.');

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system,
        messages: [{ role: 'user', content: userParts.join('\n\n') }],
      }),
    });
  } catch {
    return json({ error: 'KI-Service nicht erreichbar.' }, 502);
  }

  if (!res.ok) {
    if (res.status === 429) return json({ error: 'Zu viele Anfragen – bitte kurz warten.' }, 429);
    return json({ error: 'KI-Service nicht verfügbar.' }, 502);
  }

  let data: { content?: Array<{ type: string; text?: string }> };
  try {
    data = await res.json();
  } catch {
    return json({ error: 'Ungültige Antwort vom KI-Service.' }, 502);
  }

  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('').trim();
  if (!text) return json({ error: 'Die KI hat keinen Text erzeugt. Bitte erneut versuchen.' }, 502);

  // Safety net: the draft must not contain forbidden sensitive terms, and any
  // placeholders it used must be on the whitelist. Fail closed on either.
  const forbidden = findForbiddenFactMatches(text);
  if (forbidden.length) return json({ error: `Vorschlag enthielt unzulässige Begriffe (${forbidden.join(', ')}). Bitte erneut versuchen.` }, 422);
  const unknown = findUnknownPlaceholders(text);
  if (unknown.length) return json({ error: `Vorschlag nutzte unbekannte Platzhalter (${unknown.map((u) => `{{${u}}}`).join(', ')}). Bitte erneut versuchen.` }, 422);

  return json({ text });
}
