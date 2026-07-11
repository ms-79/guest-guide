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
// A0. Hero / welcome block (per property + locale)
// ---------------------------------------------------------------------------
// The guest-guide hero (claim + welcome text). Editable in the admin, rendered
// on the guide. The dynamic greeting ("Willkommen {guestFirstName}"), stay dates
// and reservation data stay in Hostaway / the guest session and are NOT stored
// here — only the property's editorial copy lives in the content repo.
export const heroContentSchema = z.object({
  /** Eyebrow / claim above the greeting, e.g. "Eure ACHZEIT beginnt hier." */
  eyebrow: z.string().min(1, 'hero.eyebrow must not be empty'),
  /** Welcome paragraph. Markdown (**bold**) is rendered inline on the guide. */
  introMd: z.string().min(1, 'hero.introMd must not be empty'),
  /** Optional subtle line under the intro. */
  subline: z.string().optional(),
  /** Optional concierge hint (points guests at the chatbot). */
  conciergeHint: z.string().optional(),
});
export type HeroContent = z.infer<typeof heroContentSchema>;

export const heroFileSchema = z.object({
  propertySlug: z.string().min(1),
  locale: localeSchema,
  sourceLocale: localeSchema.optional(),
  translationStatus: translationStatusSchema.optional(),
  hero: heroContentSchema,
});
export type HeroFile = z.infer<typeof heroFileSchema>;

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
  /** Google Maps link (guest taps it for navigation + live distance/time). */
  mapsUrl: z.string().url().optional(),
  /** Town/area line shown under the name, e.g. 'Oberstdorf' (not localised). */
  locationLabel: z.string().optional(),
  /** Hide from the guide after this date (ISO, e.g. seasonal '2026-03-08'). */
  showUntil: z.string().optional(),
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
  /** Localised category label shown after the location, e.g. 'Regional Cuisine'. */
  categoryLabel: z.string().optional(),
  /** Localised emphasis badge next to the name, e.g. 'Top-Empfehlung' (editable). */
  badge: z.string().optional(),
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
// B. Chatbot facts guard — defined in a zod-free module so Edge routes can
// import it without bundling zod. Re-exported here for existing consumers.
// ---------------------------------------------------------------------------
export { FORBIDDEN_FACT_PATTERNS, findForbiddenFactMatches } from './facts-guard';
