export const config = { runtime: 'edge' };

// Public read API: returns the assembled, locale-resolved knowledge for a
// property (base prompt + approved facts + published FAQ). Used by the guest
// guide / chatbot and available as a stable public contract for future clients.
//
// Only published/approved content is ever returned — enforced both by the
// query filters and by RLS on the anon key.

import { getKnowledgeBundle, renderSystemPrompt, supabaseConfigured } from './_lib/supabase-rest';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const slug = (url.searchParams.get('property') || '').trim();
  const locale = (url.searchParams.get('locale') || 'de').trim();

  if (!slug) return json({ error: 'missing_property' }, 400);
  if (!supabaseConfigured()) return json({ error: 'cms_unavailable' }, 503);

  try {
    const bundle = await getKnowledgeBundle(slug, locale);
    if (!bundle) return json({ error: 'unknown_property' }, 404);

    return json({
      property: bundle.propertySlug,
      propertyName: bundle.propertyName,
      whatsappNumber: bundle.whatsappNumber,
      locale,
      facts: bundle.facts,
      faqs: bundle.faqs,
      systemPrompt: renderSystemPrompt(bundle),
    });
  } catch (e) {
    return json({ error: 'cms_error', detail: e instanceof Error ? e.message : 'unknown' }, 500);
  }
}
