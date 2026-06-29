// Edge-safe Supabase access via the PostgREST endpoint (no SDK dependency in
// Edge functions — mirrors the direct-fetch pattern used in api/reservation.ts).
// Reads with the anon key so RLS enforces "published / approved only".
//
// Files prefixed with "_" inside api/ are NOT deployed as endpoints by Vercel,
// so this module is import-only.

import {
  buildKnowledgeBundle,
  renderSystemPrompt,
} from '../../src/lib/knowledge';
import type {
  PropertyRow,
  ChatbotPromptRow,
  AiFactRow,
  FaqRow,
  KnowledgeBundle,
} from '../../src/lib/cms-types';

const env = (name: string): string => (process.env[name] || '').replace(/^﻿/, '').trim();

export function supabaseConfigured(): boolean {
  return !!env('SUPABASE_URL') && !!env('SUPABASE_ANON_KEY');
}

async function sbSelect<T>(pathAndQuery: string): Promise<T[]> {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_ANON_KEY');
  if (!url || !key) throw new Error('Supabase is not configured');

  const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase REST ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T[];
}

/** Fetch and assemble the knowledge bundle for a property slug + locale. */
export async function getKnowledgeBundle(
  slug: string,
  locale: string,
): Promise<KnowledgeBundle | null> {
  const props = await sbSelect<PropertyRow>(
    `properties?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
  );
  const property = props[0];
  if (!property) return null;

  const scope = `or=(property_id.is.null,property_id.eq.${property.id})`;

  const [prompts, facts, faqs] = await Promise.all([
    sbSelect<ChatbotPromptRow>(`chatbot_prompts?${scope}&status=eq.published&select=*`),
    sbSelect<AiFactRow>(`ai_facts?${scope}&status=eq.approved&select=*`),
    sbSelect<FaqRow>(`faqs?${scope}&status=eq.published&expose_to_chatbot=eq.true&select=*`),
  ]);

  return buildKnowledgeBundle({ property, prompts, facts, faqs, locale });
}

export { renderSystemPrompt };
