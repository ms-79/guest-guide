import { describe, it, expect } from 'vitest';
import {
  pickLocale,
  substituteTokens,
  resolvePrompt,
  mergeForProperty,
  buildKnowledgeBundle,
  renderSystemPrompt,
} from './knowledge';
import type { AiFactRow, ChatbotPromptRow, FaqRow, PropertyRow } from './cms-types';

const baseProperty: PropertyRow = {
  id: 'prop-1',
  slug: '463607-achzeit',
  brand_id: null,
  display_name: 'ACHZEIT',
  hostaway_listing_id: 463607,
  whatsapp_number: '4915679656368',
  logo: null,
  favicon: null,
  primary_color: null,
  wifi_name: 'ACHZEIT',
  checkin_time: '16:00',
  checkout_time: '11:00',
  pets_allowed: false,
  grill_available: true,
  coffee_type: 'nespresso',
  dishwasher_tabs_included: true,
  kurtaxe_per_person_per_night: 3.8,
  google_analytics_id: null,
  invoice_recipient_email: 'host@example.com',
  status: 'active',
};

describe('pickLocale', () => {
  it('returns the requested locale', () => {
    expect(pickLocale({ de: 'Hallo', en: 'Hi' }, 'en')).toBe('Hi');
  });
  it('falls back to German, then any value', () => {
    expect(pickLocale({ de: 'Hallo' }, 'fr')).toBe('Hallo');
    expect(pickLocale({ es: 'Hola' }, 'fr')).toBe('Hola');
  });
  it('handles empty / nullish input', () => {
    expect(pickLocale(null, 'de')).toBe('');
    expect(pickLocale({}, 'de')).toBe('');
  });
});

describe('substituteTokens', () => {
  it('replaces known tokens and leaves unknown intact', () => {
    expect(substituteTokens('Hi {{property_name}} – {{nope}}', { property_name: 'ACHZEIT' }))
      .toBe('Hi ACHZEIT – {{nope}}');
  });
});

describe('mergeForProperty', () => {
  it('keeps globals and the matching property, drops others', () => {
    const rows = [
      { property_id: null, v: 'g' },
      { property_id: 'prop-1', v: 'p1' },
      { property_id: 'prop-2', v: 'p2' },
    ];
    expect(mergeForProperty(rows, 'prop-1').map((r) => r.v)).toEqual(['g', 'p1']);
  });
});

describe('resolvePrompt', () => {
  const mk = (over: Partial<ChatbotPromptRow>): ChatbotPromptRow => ({
    id: 'x', property_id: null, locale: null, base_prompt: 'p', version: 1, status: 'published', ...over,
  });

  it('prefers a property+locale prompt over global', () => {
    const prompts = [
      mk({ id: 'global', property_id: null, locale: null, base_prompt: 'GLOBAL' }),
      mk({ id: 'prop', property_id: 'prop-1', locale: null, base_prompt: 'PROP' }),
      mk({ id: 'propde', property_id: 'prop-1', locale: 'de', base_prompt: 'PROP_DE' }),
    ];
    expect(resolvePrompt(prompts, 'prop-1', 'de')?.base_prompt).toBe('PROP_DE');
  });

  it('falls back to global default when no property prompt exists', () => {
    const prompts = [mk({ id: 'global', base_prompt: 'GLOBAL' })];
    expect(resolvePrompt(prompts, 'prop-1', 'de')?.base_prompt).toBe('GLOBAL');
  });

  it('never returns another property\'s prompt', () => {
    const prompts = [mk({ id: 'other', property_id: 'prop-2', base_prompt: 'OTHER' })];
    expect(resolvePrompt(prompts, 'prop-1', 'de')).toBeNull();
  });

  it('ignores unpublished prompts', () => {
    const prompts = [mk({ id: 'draft', property_id: 'prop-1', status: 'draft', base_prompt: 'DRAFT' })];
    expect(resolvePrompt(prompts, 'prop-1', 'de')).toBeNull();
  });
});

describe('buildKnowledgeBundle', () => {
  const prompts: ChatbotPromptRow[] = [
    { id: 'g', property_id: null, locale: null, base_prompt: 'Concierge {{property_name}} – {{whatsapp_url}}', version: 1, status: 'published' },
  ];
  const facts: AiFactRow[] = [
    { id: 'f1', property_id: 'prop-1', topic_id: null, fact: { de: 'Sauna max 3h', en: 'Sauna max 3h' }, source: null, note: null, status: 'approved', reviewed_by: null, reviewed_at: null, source_entry_id: null, version: 1 },
    { id: 'f2', property_id: 'prop-1', topic_id: null, fact: { de: 'Geheim' }, source: null, note: null, status: 'pending_review', reviewed_by: null, reviewed_at: null, source_entry_id: null, version: 1 },
    { id: 'f3', property_id: 'prop-2', topic_id: null, fact: { de: 'Andere Property' }, source: null, note: null, status: 'approved', reviewed_by: null, reviewed_at: null, source_entry_id: null, version: 1 },
  ];
  const faqs: FaqRow[] = [
    { id: 'q1', property_id: null, topic_id: null, question: { de: 'Parken?' }, answer: { de: 'Vor dem Haus.' }, expose_to_chatbot: true, status: 'published' },
    { id: 'q2', property_id: 'prop-1', topic_id: null, question: { de: 'Versteckt?' }, answer: { de: 'Ja' }, expose_to_chatbot: true, status: 'draft' },
    { id: 'q3', property_id: 'prop-1', topic_id: null, question: { de: 'Nicht im Bot' }, answer: { de: 'x' }, expose_to_chatbot: false, status: 'published' },
  ];

  it('includes only approved facts for this property + globals, substitutes tokens', () => {
    const b = buildKnowledgeBundle({ property: baseProperty, prompts, facts, faqs, locale: 'de' });
    expect(b.basePrompt).toContain('ACHZEIT');
    expect(b.basePrompt).toContain('https://wa.me/4915679656368');
    expect(b.facts).toEqual(['Sauna max 3h']);          // pending + other property excluded
    expect(b.faqs).toEqual([{ question: 'Parken?', answer: 'Vor dem Haus.' }]); // draft + non-exposed excluded
    expect(b.invoiceRecipientEmail).toBe('host@example.com');
  });

  it('renders facts and FAQ into the system prompt', () => {
    const b = buildKnowledgeBundle({ property: baseProperty, prompts, facts, faqs, locale: 'de' });
    const out = renderSystemPrompt(b);
    expect(out).toContain('WISSENSBASIS');
    expect(out).toContain('- Sauna max 3h');
    expect(out).toContain('HÄUFIGE FRAGEN');
    expect(out).toContain('F: Parken?');
  });
});
