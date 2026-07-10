/**
 * Build-time content generator.
 *
 * Reads the Git-backed content under `content/properties/**`, validates every
 * file with the Zod schemas in `src/content/schemas.ts`, and emits a single
 * plain-data TypeScript module at `src/generated/content.ts`.
 *
 * WHY: the `/api` routes run on the Vercel Edge Runtime, where Node built-ins
 * (`fs`, `path`, …) are unavailable — they cannot read the content files at
 * request time. This script runs at build time (Node), does all filesystem
 * access + validation here, and produces an importable module that the Edge
 * functions consume with zero runtime I/O.
 *
 * Usage:
 *   tsx scripts/generate-content.ts           # validate + write generated file
 *   tsx scripts/generate-content.ts --check    # validate only, write nothing
 *
 * Exit code is non-zero when any content is invalid, so it fails the build.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LOCALES,
  type Locale,
  guideFileSchema,
  placesFileSchema,
  recommendationsFileSchema,
  findForbiddenFactMatches,
  type GuideSection,
  type Place,
  type RecommendationItem,
} from '../src/content/schemas';
import { getProperty } from '../src/config/properties';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CONTENT_DIR = join(ROOT, 'content', 'properties');
const OUT_FILE = join(ROOT, 'src', 'generated', 'content.ts');

const CHECK_ONLY = process.argv.includes('--check');

const errors: string[] = [];
const err = (msg: string) => errors.push(msg);

// ---------------------------------------------------------------------------
// Collected, validated data
// ---------------------------------------------------------------------------
interface PropertyContent {
  slug: string;
  displayName: string;
  whatsappNumber: string;
  facts: Partial<Record<Locale, string>>;
  guide: Partial<Record<Locale, GuideSection[]>>;
  places: Place[];
  recommendations: Partial<Record<Locale, RecommendationItem[]>>;
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

function loadProperty(slug: string): PropertyContent | null {
  const cfg = getProperty(slug);
  if (!cfg) {
    err(`Unknown property slug "${slug}" (no entry in src/config/properties.ts). Add it there first.`);
    return null;
  }

  const dir = join(CONTENT_DIR, slug);
  const content: PropertyContent = {
    slug,
    displayName: cfg.displayName,
    whatsappNumber: cfg.whatsappNumber,
    facts: {},
    guide: {},
    places: [],
    recommendations: {},
  };

  // --- B. Chatbot facts (Markdown) ---------------------------------------
  const factsDir = join(dir, 'chatbot');
  if (existsSync(factsDir)) {
    for (const locale of LOCALES) {
      const file = join(factsDir, `facts.${locale}.md`);
      if (!existsSync(file)) continue;
      const md = readFileSync(file, 'utf8').trim();
      if (!md) {
        err(`[${slug}] chatbot/facts.${locale}.md is empty`);
        continue;
      }
      const hits = findForbiddenFactMatches(md);
      if (hits.length) {
        err(`[${slug}] chatbot/facts.${locale}.md contains forbidden term(s): ${hits.join(', ')} — sensitive data must not live in the content repo`);
        continue;
      }
      content.facts[locale] = md;
    }
  }

  // --- A. Guide sections (JSON) ------------------------------------------
  const guideDir = join(dir, 'guide');
  if (existsSync(guideDir)) {
    for (const locale of LOCALES) {
      const file = join(guideDir, `${locale}.json`);
      if (!existsSync(file)) continue;
      const parsed = guideFileSchema.safeParse(readJson(file));
      if (!parsed.success) {
        err(`[${slug}] guide/${locale}.json invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
        continue;
      }
      const data = parsed.data;
      if (data.propertySlug !== slug) err(`[${slug}] guide/${locale}.json propertySlug "${data.propertySlug}" does not match folder`);
      if (data.locale !== locale) err(`[${slug}] guide/${locale}.json locale "${data.locale}" does not match filename`);
      const seen = new Set<string>();
      for (const s of data.sections) {
        if (seen.has(s.key)) err(`[${slug}] guide/${locale}.json duplicate section key "${s.key}"`);
        seen.add(s.key);
      }
      // internal content is never exported to guest guide / chatbot bundles.
      content.guide[locale] = data.sections.filter((s) => s.visibility !== 'internal');
    }
  }

  // --- C. Recommendations (places + per-locale copy) ---------------------
  const recDir = join(dir, 'recommendations');
  if (existsSync(recDir)) {
    const placesFile = join(recDir, 'places.json');
    let placeIds = new Set<string>();
    if (existsSync(placesFile)) {
      const parsed = placesFileSchema.safeParse(readJson(placesFile));
      if (!parsed.success) {
        err(`[${slug}] recommendations/places.json invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
      } else {
        if (parsed.data.propertySlug !== slug) err(`[${slug}] recommendations/places.json propertySlug mismatch`);
        for (const p of parsed.data.places) {
          if (placeIds.has(p.id)) err(`[${slug}] recommendations/places.json duplicate place id "${p.id}"`);
          placeIds.add(p.id);
        }
        content.places = parsed.data.places.filter((p) => p.visibility !== 'internal');
      }
    }
    for (const locale of LOCALES) {
      const file = join(recDir, `${locale}.json`);
      if (!existsSync(file)) continue;
      const parsed = recommendationsFileSchema.safeParse(readJson(file));
      if (!parsed.success) {
        err(`[${slug}] recommendations/${locale}.json invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
        continue;
      }
      if (parsed.data.propertySlug !== slug) err(`[${slug}] recommendations/${locale}.json propertySlug mismatch`);
      if (parsed.data.locale !== locale) err(`[${slug}] recommendations/${locale}.json locale mismatch`);
      for (const item of parsed.data.items) {
        if (!placeIds.has(item.placeId)) err(`[${slug}] recommendations/${locale}.json references unknown placeId "${item.placeId}"`);
      }
      content.recommendations[locale] = parsed.data.items;
    }
  }

  return content;
}

// ---------------------------------------------------------------------------
// Discover properties from the content directory
// ---------------------------------------------------------------------------
if (!existsSync(CONTENT_DIR)) {
  console.error(`Content directory not found: ${CONTENT_DIR}`);
  process.exit(1);
}

const slugs = readdirSync(CONTENT_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const properties = slugs.map(loadProperty).filter((p): p is PropertyContent => p !== null);

if (errors.length) {
  console.error(`\n✖ Content validation failed with ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Emit generated module
// ---------------------------------------------------------------------------
function emit(): string {
  const j = (v: unknown) => JSON.stringify(v, null, 2);

  const factsEntries = properties.map((p) => `  '${p.slug}': ${j(p.facts)},`).join('\n');
  const metaEntries = properties
    .map((p) => `  '${p.slug}': { displayName: ${JSON.stringify(p.displayName)}, whatsappNumber: ${JSON.stringify(p.whatsappNumber)} },`)
    .join('\n');
  const guideEntries = properties.map((p) => `  '${p.slug}': ${j(p.guide)},`).join('\n');
  const placesEntries = properties.map((p) => `  '${p.slug}': ${j(p.places)},`).join('\n');
  const recEntries = properties.map((p) => `  '${p.slug}': ${j(p.recommendations)},`).join('\n');

  return `// AUTO-GENERATED by scripts/generate-content.ts — DO NOT EDIT.
// Run \`npm run generate-content\` to regenerate. Source of truth: content/properties/**
/* eslint-disable */
import type { GuideSection, Place, RecommendationItem, Locale } from '../content/schemas';

export interface PropertyMeta { displayName: string; whatsappNumber: string; }

/** Raw chatbot facts Markdown, per property + locale. */
export const chatbotFacts: Record<string, Partial<Record<Locale, string>>> = {
${factsEntries}
};

/** Minimal per-property meta derived from src/config/properties.ts (generated). */
export const propertyMeta: Record<string, PropertyMeta> = {
${metaEntries}
};

/** Guide sections (internal visibility already stripped), per property + locale. */
export const guideSections: Record<string, Partial<Record<Locale, GuideSection[]>>> = {
${guideEntries}
};

/** Recommendation base places (internal stripped), per property. */
export const places: Record<string, Place[]> = {
${placesEntries}
};

/** Recommendation per-locale copy, per property + locale. */
export const recommendations: Record<string, Partial<Record<Locale, RecommendationItem[]>>> = {
${recEntries}
};

/** Locale fallback order used when a requested locale is missing. */
const FACT_FALLBACKS: Locale[] = ['de', 'en'];

/**
 * Resolve chatbot facts for a property, falling back de → en when the
 * requested locale is missing. Returns null when the property has no facts.
 */
export function getChatbotFacts(
  slug: string,
  locale: string,
): { markdown: string; locale: Locale } | null {
  const byLocale = chatbotFacts[slug];
  if (!byLocale) return null;
  const order = [locale as Locale, ...FACT_FALLBACKS];
  for (const l of order) {
    const md = byLocale[l];
    if (md) return { markdown: md, locale: l };
  }
  return null;
}
`;
}

if (CHECK_ONLY) {
  console.log(`✔ Content valid: ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} (${slugs.join(', ')})`);
  process.exit(0);
}

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, emit(), 'utf8');
console.log(`✔ Generated ${OUT_FILE} from ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} (${slugs.join(', ')})`);
