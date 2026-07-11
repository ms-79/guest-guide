export const config = { runtime: 'edge' };

import { hasValidSession } from '../../src/server/session';
import {
  chatbotFacts,
  heroContent,
  guideSections,
  places,
  recommendations,
  propertyMeta,
} from '../../src/generated/content';

const env = (name: string): string => (process.env[name] || '').replace(/^\uFEFF/, '').trim();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Read-only admin content API (Phase 2). Requires a valid admin session.
 * - GET /api/admin/content                → list of properties (slug + name)
 * - GET /api/admin/content?propertySlug=x  → content bundle for that property
 *
 * Content is served from the build-time generated module (no filesystem at
 * runtime). Internal-visibility content is already stripped during generation.
 * There is intentionally no write path here.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const secret = env('ADMIN_SESSION_SECRET');
  if (!secret) return json({ error: 'Admin-Bereich ist nicht konfiguriert.' }, 500);

  if (!(await hasValidSession(req, secret))) {
    return json({ error: 'Nicht angemeldet.' }, 401);
  }

  const slug = new URL(req.url).searchParams.get('propertySlug');

  if (!slug) {
    const propertiesList = Object.entries(propertyMeta).map(([s, meta]) => ({
      slug: s,
      displayName: meta.displayName,
    }));
    return json({ properties: propertiesList });
  }

  if (!propertyMeta[slug]) return json({ error: 'Unbekannte Property.' }, 404);

  return json({
    slug,
    displayName: propertyMeta[slug].displayName,
    facts: chatbotFacts[slug] ?? {},
    hero: heroContent[slug] ?? {},
    guide: guideSections[slug] ?? {},
    places: places[slug] ?? [],
    recommendations: recommendations[slug] ?? {},
  });
}
