export const config = { runtime: 'edge' };

import { hasValidSession } from '../../../src/server/session';
import { createContentPr, type GithubConfig } from '../../../src/server/github';
import { findForbiddenFactMatches } from '../../../src/content/facts-guard';
import { propertyMeta } from '../../../src/generated/content';

const env = (name: string): string => (process.env[name] || '').replace(/^\uFEFF/, '').trim();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Locales allowed for content files (kept inline to avoid bundling zod/schemas).
const LOCALES = ['de', 'en', 'es', 'it', 'fr', 'nl'];
const MAX_CONTENT_BYTES = 100_000;

/**
 * Admin write-via-PR (Phase 3). Requires a valid admin session. Writes a single
 * content file on a NEW branch and opens a pull request against the base branch
 * — never commits to the base branch directly. Currently supports editing the
 * chatbot facts Markdown (kind: 'facts').
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = env('ADMIN_SESSION_SECRET');
  if (!secret) return json({ error: 'Admin-Bereich ist nicht konfiguriert.' }, 500);
  if (!(await hasValidSession(req, secret))) return json({ error: 'Nicht angemeldet.' }, 401);

  const token = env('GITHUB_TOKEN');
  const owner = env('GITHUB_OWNER') || 'ms-79';
  const repo = env('GITHUB_REPO') || 'guest-guide';
  const baseBranch = env('GITHUB_BASE_BRANCH') || 'master';
  if (!token) return json({ error: 'GitHub-Integration ist nicht konfiguriert (GITHUB_TOKEN fehlt).' }, 500);

  let payload: { propertySlug?: unknown; kind?: unknown; locale?: unknown; content?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Ungültige Anfrage.' }, 400);
  }

  const propertySlug = typeof payload.propertySlug === 'string' ? payload.propertySlug : '';
  const kind = typeof payload.kind === 'string' ? payload.kind : '';
  const locale = typeof payload.locale === 'string' ? payload.locale : '';
  const content = typeof payload.content === 'string' ? payload.content : '';

  // --- Validation -----------------------------------------------------------
  if (!propertyMeta[propertySlug]) return json({ error: 'Unbekannte Property.' }, 400);
  if (kind !== 'facts') return json({ error: 'Nicht unterstützter Content-Typ.' }, 400);
  if (!LOCALES.includes(locale)) return json({ error: 'Ungültige Sprache.' }, 400);
  if (!content.trim()) return json({ error: 'Inhalt darf nicht leer sein.' }, 400);
  if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) {
    return json({ error: 'Inhalt ist zu groß.' }, 400);
  }
  const forbidden = findForbiddenFactMatches(content);
  if (forbidden.length) {
    return json(
      { error: `Inhalt enthält unzulässige Begriffe (${forbidden.join(', ')}). Sensible Daten gehören nicht in den Content.` },
      400,
    );
  }

  // --- Build safe path + branch (constructed server-side, no traversal) ------
  const path = `content/properties/${propertySlug}/chatbot/facts.${locale}.md`;
  const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const branch = `content/${propertySlug}-${stamp}-facts-${locale}`;
  const displayName = propertyMeta[propertySlug].displayName;
  const title = `Update chatbot facts (${locale}) for ${displayName}`;
  const body = [
    `Aktualisierte Chatbot-Fakten (\`${locale}\`) für **${displayName}**.`,
    '',
    `Erstellt über den Content-Admin. Datei: \`${path}\`.`,
    'Bitte die Vercel-Preview prüfen und nach dem Merge geht die Änderung live.',
  ].join('\n');

  const cfg: GithubConfig = { token, owner, repo, baseBranch };
  try {
    const result = await createContentPr(cfg, {
      path,
      content: content.endsWith('\n') ? content : content + '\n',
      branch,
      commitMessage: title,
      prTitle: title,
      prBody: body,
    });
    return json({ ok: true, url: result.url, number: result.number, branch: result.branch });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Pull Request konnte nicht erstellt werden.' }, 502);
  }
}
