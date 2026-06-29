// Pure knowledge-resolution helpers — no I/O, no framework. Shared by the
// public read API (api/chat-knowledge.ts) and the chat route
// (api/guest-guide-chat.ts), and unit-tested in src/lib/knowledge.test.ts.

import {
  type CmsLocale,
  type I18nText,
  type AiFactRow,
  type FaqRow,
  type ChatbotPromptRow,
  type PropertyRow,
  type KnowledgeBundle,
} from './cms-types';

const FALLBACK_LOCALE: CmsLocale = 'de';

/** Pick the best string for a locale, falling back to German, then any value. */
export function pickLocale(text: I18nText | null | undefined, locale: string): string {
  if (!text) return '';
  const l = locale as CmsLocale;
  if (text[l]) return text[l] as string;
  if (text[FALLBACK_LOCALE]) return text[FALLBACK_LOCALE] as string;
  const first = Object.values(text).find((v) => typeof v === 'string' && v.trim() !== '');
  return first ?? '';
}

/** Replace {{token}} placeholders. Unknown tokens are left untouched. */
export function substituteTokens(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

/**
 * Resolve which chatbot prompt wins: a published property-specific prompt for
 * the locale, else property-specific locale-agnostic, else a global default.
 * Only published prompts are considered.
 */
export function resolvePrompt(
  prompts: ChatbotPromptRow[],
  propertyId: string | null,
  locale: string,
): ChatbotPromptRow | null {
  const published = prompts.filter((p) => p.status === 'published');
  const byPref = (p: ChatbotPromptRow): number => {
    let score = 0;
    if (p.property_id && p.property_id === propertyId) score += 4;
    else if (!p.property_id) score += 1; // global default
    else return -1; // belongs to a different property — never use
    if (p.locale === locale) score += 2;
    else if (!p.locale) score += 1;
    else return -1; // wrong locale-specific prompt
    return score;
  };
  return published
    .map((p) => ({ p, score: byPref(p) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.p ?? null;
}

/**
 * Merge global (property_id === null) and property-specific rows. Only rows for
 * the given property or global rows are kept; everything else is dropped.
 */
export function mergeForProperty<T extends { property_id: string | null }>(
  rows: T[],
  propertyId: string | null,
): T[] {
  return rows.filter((r) => r.property_id === null || r.property_id === propertyId);
}

/** Build the knowledge bundle (approved facts + published FAQ + base prompt). */
export function buildKnowledgeBundle(args: {
  property: PropertyRow;
  prompts: ChatbotPromptRow[];
  facts: AiFactRow[];
  faqs: FaqRow[];
  locale: string;
}): KnowledgeBundle {
  const { property, prompts, facts, faqs, locale } = args;

  const prompt = resolvePrompt(prompts, property.id, locale);
  const whatsappUrl = property.whatsapp_number
    ? `https://wa.me/${property.whatsapp_number}`
    : '';

  const basePrompt = substituteTokens(prompt?.base_prompt ?? '', {
    property_name: property.display_name,
    whatsapp_number: property.whatsapp_number ?? '',
    whatsapp_url: whatsappUrl,
  });

  const resolvedFacts = mergeForProperty(facts, property.id)
    .filter((f) => f.status === 'approved')
    .map((f) => pickLocale(f.fact, locale).trim())
    .filter((s) => s !== '');

  const resolvedFaqs = mergeForProperty(faqs, property.id)
    .filter((f) => f.status === 'published' && f.expose_to_chatbot)
    .map((f) => ({
      question: pickLocale(f.question, locale).trim(),
      answer: pickLocale(f.answer, locale).trim(),
    }))
    .filter((f) => f.question !== '' && f.answer !== '');

  return {
    propertySlug: property.slug,
    propertyName: property.display_name,
    whatsappNumber: property.whatsapp_number,
    invoiceRecipientEmail: property.invoice_recipient_email,
    basePrompt,
    facts: resolvedFacts,
    faqs: resolvedFaqs,
  };
}

/** Render the knowledge bundle into the final system prompt text. */
export function renderSystemPrompt(bundle: KnowledgeBundle): string {
  let out = bundle.basePrompt.trim();

  if (bundle.facts.length > 0) {
    out += '\n\nWISSENSBASIS (geprüfte Fakten – ausschließlich diese verwenden):';
    for (const fact of bundle.facts) out += `\n- ${fact}`;
  }

  if (bundle.faqs.length > 0) {
    out += '\n\nHÄUFIGE FRAGEN:';
    for (const faq of bundle.faqs) out += `\nF: ${faq.question}\nA: ${faq.answer}`;
  }

  return out;
}
