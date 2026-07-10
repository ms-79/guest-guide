// Zod schemas + shared types for the Git-backed content layer.
//
// This is the single source of truth for the *shape* of property content that
// lives under `content/properties/**`. The build-time generator
// (`scripts/generate-content.ts`) validates every content file against these
// schemas before emitting `src/generated/content.ts`.
//
// WHY schemas live here (in `src/`) rather than in `scripts/`: the inferred
// types are consumed by both the generator and (via `import type`) the
// generated module and API routes, so a single definition keeps them in sync.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Locales
// ---------------------------------------------------------------------------
// Mirror of the locales supported by the guest guide UI (translations.ts).
export const LOCALES = ['de', 'en', 'es', 'it', 'fr', 'nl'] as const;
export type Locale = (typeof LOCALES)[number];
export const localeSchema = z.enum(LOCALES);

/** de = source of truth, en = required. Others fall back to en, then de. */
export const FALLBACK_LOCALES: Locale[] = ['de', 'en'];

// ---------------------------------------------------------------------------
// Enums shared across content types
// ---------------------------------------------------------------------------
export const phaseSchema = z.enum(['pre_arrival', 'stay', 'departure', 'post_stay']);
export type Phase = z.infer<typeof phaseSchema>;

/**
 * Who may see a piece of content.
 * - public   → may be served without guest auth
 * - guest    → only after a valid guest session (magic link / PIN / token)
 * - internal → admin only; never to a guest, never to the chatbot
 */
export const visibilitySchema = z.enum(['public', 'guest', 'internal']);
export type Visibility = z.infer<typeof visibilitySchema>;

export const translationStatusSchema = z.enum([
  'source',
  'machine_translated',
  'reviewed',
  'stale',
  'missing',
]);
export type TranslationStatus = z.infer<typeof translationStatusSchema>;

// ---------------------------------------------------------------------------
// A. Guide sections
// ---------------------------------------------------------------------------
export const guideSectionSchema = z.object({
  key: z.string().min(1, 'section key must not be empty'),
  title: z.string().min(1, 'section title must not be empty'),
  bodyMd: z.string().min(1, 'section bodyMd must not be empty'),
  phase: phaseSchema,
  // Default sichtbarkeit ist bewusst `guest`, nicht `public`.
  visibility: visibilitySchema.default('guest'),
  sortOrder: z.number(),
  translationStatus: translationStatusSchema,
});
export type GuideSection = z.infer<typeof guideSectionSchema>;

export const guideFileSchema = z.object({
  propertySlug: z.string().min(1),
  locale: localeSchema,
  sourceLocale: localeSchema.optional(),
  sections: z.array(guideSectionSchema),
});
export type GuideFile = z.infer<typeof guideFileSchema>;

// ---------------------------------------------------------------------------
// C. Recommendations (normalised: stable places + per-locale copy)
// ---------------------------------------------------------------------------
export const placeSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  name: z.string().min(1),
  mapsUrl: z.string().url().optional(),
  distanceText: z.string().optional(),
  sortOrder: z.number(),
  visibility: visibilitySchema.default('guest'),
});
export type Place = z.infer<typeof placeSchema>;

export const placesFileSchema = z.object({
  propertySlug: z.string().min(1),
  places: z.array(placeSchema),
});
export type PlacesFile = z.infer<typeof placesFileSchema>;

export const recommendationItemSchema = z.object({
  placeId: z.string().min(1),
  descriptionMd: z.string().optional(),
  tipMd: z.string().optional(),
  translationStatus: translationStatusSchema,
});
export type RecommendationItem = z.infer<typeof recommendationItemSchema>;

export const recommendationsFileSchema = z.object({
  propertySlug: z.string().min(1),
  locale: localeSchema,
  items: z.array(recommendationItemSchema),
});
export type RecommendationsFile = z.infer<typeof recommendationsFileSchema>;

// ---------------------------------------------------------------------------
// B. Chatbot facts guard
// ---------------------------------------------------------------------------
// Chatbot facts are free-form Markdown (property-specific, locale-specific).
// They must never contain sensitive/booking-specific data — those come from
// Hostaway at request time, never from the content repo. This guard is a
// *defence in depth* check, not a replacement for human review.
export const FORBIDDEN_FACT_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'Türcode', re: /\bt(?:ü|ue)rcode\b/i },
  { label: 'door code', re: /\bdoor\s?code\b/i },
  { label: 'PIN', re: /\bpin\b/i },
  { label: 'Zahlungsstatus', re: /\bzahlungsstatus\b/i },
  { label: 'payment status', re: /\bpayment\s?status\b/i },
  { label: 'Gastdaten', re: /\bgastdaten\b/i },
  { label: 'IBAN', re: /\biban\b/i },
  { label: 'Kreditkarte', re: /\bkreditkarte\b/i },
];

/** Returns the labels of any forbidden patterns found in a facts document. */
export function findForbiddenFactMatches(markdown: string): string[] {
  return FORBIDDEN_FACT_PATTERNS.filter((p) => p.re.test(markdown)).map((p) => p.label);
}
