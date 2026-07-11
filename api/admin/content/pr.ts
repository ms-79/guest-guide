export const config = { runtime: 'edge' };

import { hasValidSession } from '../../../src/server/session';
import { createContentPr, type GithubConfig } from '../../../src/server/github';
import { findForbiddenFactMatches } from '../../../src/content/facts-guard';
import { findUnknownPlaceholders } from '../../../src/content/placeholders';
import { heroContentSchema, placesFileSchema, recommendationsFileSchema } from '../../../src/content/schemas';
import { propertyMeta } from '../../../src/generated/content';

const env = (name: string): string => (process.env[name] || '').replace(/^\uFEFF/, '').trim();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LOCALES = ['de', 'en', 'es', 'it', 'fr', 'nl'];
const MAX_CONTENT_BYTES = 200_000;

const stampNow = () => new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

/**
 * Admin write-via-PR (Phase 3). Requires a valid admin session. Writes content
 * file(s) on a NEW branch and opens a pull request against the base branch —
 * never commits to the base branch directly.
 *
 * kind: 'facts'           → chatbot facts Markdown (single file, per locale)
 * kind: 'recommendations' → recommendations for a property, German only
 *                           (writes recommendations/places.json + de.json)
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = env('ADMIN_SESSION_SECRET');
  if (!secret) return json({ error: 'Admin-Bereich ist nicht konfiguriert.' }, 500);
  if (!(await hasValidSession(req, secret))) return json({ error: 'Nicht angemeldet.' }, 401);

  const token = env('GITHUB_TOKEN');
  const cfg: GithubConfig = {
    token,
    owner: env('GITHUB_OWNER') || 'ms-79',
    repo: env('GITHUB_REPO') || 'guest-guide',
    baseBranch: env('GITHUB_BASE_BRANCH') || 'master',
  };
  if (!token) return json({ error: 'GitHub-Integration ist nicht konfiguriert (GITHUB_TOKEN fehlt).' }, 500);

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Ungültige Anfrage.' }, 400);
  }

  const propertySlug = typeof payload.propertySlug === 'string' ? payload.propertySlug : '';
  const kind = typeof payload.kind === 'string' ? payload.kind : '';
  if (!propertyMeta[propertySlug]) return json({ error: 'Unbekannte Property.' }, 400);
  const displayName = propertyMeta[propertySlug].displayName;

  let files: Array<{ path: string; content: string }>;
  let title: string;
  let branch: string;

  if (kind === 'facts') {
    const locale = typeof payload.locale === 'string' ? payload.locale : '';
    const content = typeof payload.content === 'string' ? payload.content : '';
    if (!LOCALES.includes(locale)) return json({ error: 'Ungültige Sprache.' }, 400);
    if (!content.trim()) return json({ error: 'Inhalt darf nicht leer sein.' }, 400);
    if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) return json({ error: 'Inhalt ist zu groß.' }, 400);
    const forbidden = findForbiddenFactMatches(content);
    if (forbidden.length) return json({ error: `Inhalt enthält unzulässige Begriffe (${forbidden.join(', ')}).` }, 400);

    files = [{ path: `content/properties/${propertySlug}/chatbot/facts.${locale}.md`, content: content.endsWith('\n') ? content : content + '\n' }];
    title = `Update chatbot facts (${locale}) for ${displayName}`;
    branch = `content/${propertySlug}-${stampNow()}-facts-${locale}`;
  } else if (kind === 'hero') {
    const locale = typeof payload.locale === 'string' ? payload.locale : '';
    if (!LOCALES.includes(locale)) return json({ error: 'Ungültige Sprache.' }, 400);
    const heroParsed = heroContentSchema.safeParse(payload.hero);
    if (!heroParsed.success) return json({ error: 'Ungültige Hero-Daten.', detail: heroParsed.error.issues.slice(0, 3) }, 400);
    const hero = heroParsed.data;
    const combined = [hero.eyebrow, hero.introMd, hero.subline, hero.conciergeHint].filter(Boolean).join(' ');
    const hits = findForbiddenFactMatches(combined);
    if (hits.length) return json({ error: `Text enthält unzulässige Begriffe (${hits.join(', ')}).` }, 400);
    const badPh = findUnknownPlaceholders(combined);
    if (badPh.length) return json({ error: `Text nutzt unbekannte Platzhalter (${badPh.map((t) => `{{${t}}}`).join(', ')}).` }, 400);

    const fileBody = {
      propertySlug,
      locale,
      sourceLocale: 'de',
      translationStatus: locale === 'de' ? 'source' : 'reviewed',
      hero,
    };
    const content = JSON.stringify(fileBody, null, 2) + '\n';
    if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) return json({ error: 'Inhalt ist zu groß.' }, 400);

    files = [{ path: `content/properties/${propertySlug}/hero/${locale}.json`, content }];
    title = `Update hero copy (${locale}) for ${displayName}`;
    branch = `content/${propertySlug}-${stampNow()}-hero-${locale}`;
  } else if (kind === 'recommendations') {
    // German-only: client sends the full places list + the German items.
    const placesParsed = placesFileSchema.safeParse({ propertySlug, places: payload.places });
    const itemsParsed = recommendationsFileSchema.safeParse({ propertySlug, locale: 'de', items: payload.items });
    if (!placesParsed.success) return json({ error: 'Ungültige Orte-Daten.', detail: placesParsed.error.issues.slice(0, 3) }, 400);
    if (!itemsParsed.success) return json({ error: 'Ungültige Empfehlungs-Texte.', detail: itemsParsed.error.issues.slice(0, 3) }, 400);

    const placeIds = new Set(placesParsed.data.places.map((p) => p.id));
    for (const it of itemsParsed.data.items) {
      if (!placeIds.has(it.placeId)) return json({ error: `Text verweist auf unbekannten Ort "${it.placeId}".` }, 400);
      const hits = findForbiddenFactMatches([it.descriptionMd, it.tipMd, it.badge].filter(Boolean).join(' '));
      if (hits.length) return json({ error: `Text enthält unzulässige Begriffe (${hits.join(', ')}).` }, 400);
    }

    const placesContent = JSON.stringify({ propertySlug, places: placesParsed.data.places }, null, 2) + '\n';
    const itemsContent = JSON.stringify({ propertySlug, locale: 'de', items: itemsParsed.data.items }, null, 2) + '\n';
    if (new TextEncoder().encode(placesContent + itemsContent).length > MAX_CONTENT_BYTES) return json({ error: 'Inhalt ist zu groß.' }, 400);

    files = [
      { path: `content/properties/${propertySlug}/recommendations/places.json`, content: placesContent },
      { path: `content/properties/${propertySlug}/recommendations/de.json`, content: itemsContent },
    ];
    title = `Update recommendations for ${displayName}`;
    branch = `content/${propertySlug}-${stampNow()}-recommendations`;
  } else {
    return json({ error: 'Nicht unterstützter Content-Typ.' }, 400);
  }

  const body = [
    `Aktualisierter Content für **${displayName}** (über den Content-Admin).`,
    '',
    'Bitte die Vercel-Preview prüfen; nach dem Merge geht die Änderung live.',
  ].join('\n');

  try {
    const result = await createContentPr(cfg, { files, branch, commitMessage: title, prTitle: title, prBody: body });
    return json({ ok: true, url: result.url, number: result.number, branch: result.branch });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Pull Request konnte nicht erstellt werden.' }, 502);
  }
}
