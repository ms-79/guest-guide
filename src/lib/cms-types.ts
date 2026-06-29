// Shared CMS types — used by the admin UI, the public read API, and the chat
// route. Kept dependency-free so Edge functions can import it via a relative
// path without pulling in browser-only code.

export const LOCALES = ['de', 'en', 'es', 'it', 'fr', 'nl'] as const;
export type CmsLocale = (typeof LOCALES)[number];

/** Multilingual text stored as JSONB, e.g. { de: '...', en: '...' }. */
export type I18nText = Partial<Record<CmsLocale, string>>;

export type ContentStatus = 'draft' | 'published';
export type FactStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface PropertyRow {
  id: string;
  slug: string;
  brand_id: string | null;
  display_name: string;
  hostaway_listing_id: number;
  whatsapp_number: string | null;
  logo: string | null;
  favicon: string | null;
  primary_color: string | null;
  wifi_name: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  pets_allowed: boolean;
  grill_available: boolean;
  coffee_type: 'nespresso' | 'filter' | 'vollautomat' | null;
  dishwasher_tabs_included: boolean;
  kurtaxe_per_person_per_night: number | null;
  google_analytics_id: string | null;
  invoice_recipient_email: string | null;
  status: 'active' | 'draft';
}

export interface ChatbotPromptRow {
  id: string;
  property_id: string | null;
  locale: string | null;
  base_prompt: string;
  version: number;
  status: ContentStatus;
}

export interface AiFactRow {
  id: string;
  property_id: string | null;
  topic_id: string | null;
  fact: I18nText;
  source: string | null;
  note: string | null;
  status: FactStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source_entry_id: string | null;
  version: number;
}

export interface FaqRow {
  id: string;
  property_id: string | null;
  topic_id: string | null;
  question: I18nText;
  answer: I18nText;
  expose_to_chatbot: boolean;
  status: ContentStatus;
}

export interface TopicRow {
  id: string;
  key: string;
  label: I18nText;
  sort_order: number;
}

/** Everything the chatbot needs to answer for one property in one locale. */
export interface KnowledgeBundle {
  propertySlug: string;
  propertyName: string;
  whatsappNumber: string | null;
  invoiceRecipientEmail: string | null;
  basePrompt: string;
  facts: string[];
  faqs: { question: string; answer: string }[];
}
