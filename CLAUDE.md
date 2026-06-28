# CLAUDE.md — Digital Guest Guide

## Product Vision

The Digital Guest Guide is a **mobile-first, multilingual, property-specific digital guestbook** for vacation rentals. It supports guests before and during their stay by surfacing relevant house information, local recommendations, and step-by-step instructions — reducing repetitive host inquiries and delivering a premium, warm guest experience.

Mid-term, it serves as the foundation for an AI-powered guest service layer (concierge chatbot). Long-term, it scales to multiple properties via configuration, not code duplication.

---

## Current State vs. Planned

| Area | Current State | Planned / Desired |
|---|---|---|
| Properties | 1 property (`achzeit`), config-driven | Multiple properties, admin-managed |
| Auth | PIN (last 4 digits of phone) + fixed token | Reservation-based magic links, time-limited tokens |
| Content | Hardcoded in `translations.ts` and components | Structured knowledge base per property |
| Languages | 6 locales (de, en, es, it, fr, nl) in `translations.ts` | Same, but content sourced from structured config |
| Chatbot | Streaming Claude Haiku, system prompt in API route | System prompt + property knowledge cleanly separated |
| Events | Live via `GuestGuideEvents` component (external source) | Stays the same or extended |
| Admin UI | None | Future: admin UI for property content management |
| Token security | `FIXED_TOKEN = 'ABC321'` placeholder | Reservation-scoped, short-lived, unguessable |

---

## User Roles

**Guest**
- Accesses the guide at `/guide/:slug`
- Authenticates via PIN (last 4 digits of booking phone number) or magic link token
- Sees only their own booking data (door code, WiFi, check-in/out dates)
- Can use public sections without authentication (assumption — some sections may be accessible pre-auth)

**Property Owner / Manager (e.g., Markus at ACHZEIT)**
- Provides property-specific content (house rules, instructions, recommendations)
- Currently: content lives in `translations.ts` and `GuestGuideContent.tsx`
- Future: manages content via admin UI

**Allgäu Stays Admin**
- Manages properties, integrations, and system-level configuration
- Currently: via code + `src/config/properties.ts`
- Future: admin UI

---

## ACHZEIT Brand & Tone

Brand name: **ACHZEIT** — always in ALL CAPS.
Full name in communications: **ACHZEIT Family & Friends Retreat**

**Tone:**
- Warm, high-quality, calm, natural
- Familienfreundlich — explicitly for families with children
- Allgäu feeling: nature, mountains, sauna, fireplace, retreat
- No corporate or bureaucratic language
- No overselling or hollow superlatives
- Short, clear guest information — nothing more

**Language rules:**
- German: Du-form (`du`, `ihr`, `euch`, `eure`)
- English: friendly `you`
- All 6 locales: `de`, `en`, `es`, `it`, `fr`, `nl`

---

## Multi-Tenancy

Properties are configured in `src/config/properties.ts`.

```typescript
interface PropertyConfig {
  slug: string;           // URL: /guide/:slug
  displayName: string;    // e.g., 'ACHZEIT'
  whatsappNumber: string; // without +
  logo: string;           // path to /public/logos/
  primaryColor: string;   // CSS hex
  hostawayListingId?: number;
}
```

Route: `/guide/:slug` → `GuestGuide.tsx` → `getProperty(slug)` → `GuestGuideInner`.

**Current properties:** `achzeit` (listing ID `463607`).

**To add a new property:** add entry to `PROPERTIES` in `properties.ts`, then add its slug to the owning brand's `propertySlugs` in `BRANDS` (same file). Do not duplicate components.

### Brands / Domains

`BRANDS` in `properties.ts` is the single source of truth mapping each canonical host to the property slugs served under it:

| Host | Brand | Properties |
|---|---|---|
| `guide.achzeit.de` | ACHZEIT | `463607-achzeit` |
| `guide.felders-escapes.com` | Felder's Escapes | `464733-felders-boutique-house`, `464732-felders-boutique-appartement` |
| `guide.allgaeu-stays.com` | Allgäu Stays | `507092-phils-apartment` |

**Slug convention:** `<listingId>-<slug(internalListingName)>` where `internalListingName` is the Hostaway listing's internal name and `slug()` = lowercase, strip apostrophe/accent chars (`'` `´` `` ` `` `’`), other non-`[a-z0-9]` runs → single `-`, trim (e.g. `ACHZEIT` → `achzeit`, `Felder´s Boutique House` → `felders-boutique-house`). Slugs are static URL ids (not fetched at runtime) and the listingId prefix is how `getListingIdFromSlug` resolves the listing. Keep the same string in sync across `properties.ts`, `api/magic-link.ts`, and the n8n write-back's `LISTING_SLUGS`.

All hosts point at the **same** Vercel project (`guest-guide`) — add each as a domain in Vercel + a DNS CNAME → `cname.vercel-dns.com`. `GuestGuide.tsx` redirects a property reached on a non-canonical live host to its brand host (slug + `?t=` token preserved). `localhost`, `127.0.0.1`, and `*.vercel.app` are exempt so dev/preview work on any host. `api/magic-link.ts` builds the guest URL from the **request host**, so generate each property's link via its own brand domain and guests stay on-brand automatically.

**Known limitation:** `reservation.ts` has `LISTING_ID` hardcoded as `'463607'`. The `property` param is passed in the query but not yet used for routing to different Hostaway listings. This must be made dynamic before adding a second property.

---

## Property Content Model

Property-specific content should live in structured configuration, not scattered across component JSX.

Currently, content topics covered in `translations.ts` and `GuestGuideContent.tsx`:

| Topic | Where |
|---|---|
| Check-in / Check-out times | `translations.ts` (hardcoded strings) |
| WiFi network name | Hardcoded `'ACHZEIT'` in `GuestGuideContent.tsx` |
| WiFi password | From Hostaway via `reservation.ts` |
| Door / key box code | From Hostaway via `reservation.ts` |
| Parking | `translations.ts` |
| Family equipment | `translations.ts` |
| Kitchen & appliances | `translations.ts` |
| Sauna & fireplace | `translations.ts` |
| Waste separation / checkout steps | `translations.ts` |
| Emergency contacts | `translations.ts` (112, 116 117 — hardcoded) |
| Local recommendations | Hardcoded in `GuestGuideContent.tsx` with Google Maps links |
| Allgäu Walser Pass link | From Hostaway custom field (`customFieldId: 89486`) |

**Rule:** When adding new content topics, add translations to `translations.ts` using the `t()` helper. Do not write language strings directly in components. Do not add new locales without adding all keys.

**Future:** Move property-specific data (check-in time, WiFi name, emergency contacts, recommendations) to `PropertyConfig` so they are configurable per property without touching components.

---

## Content Language Strategy

The system is multilingual from the ground up. Supported locales: `de`, `en`, `es`, `it`, `fr`, `nl`.

**Current implementation:**
- All UI strings defined in `translations.ts` using `t(de, en, es, it, fr, nl)` helper
- Locale detected from Hostaway booking `guestLanguage` field (`mapHostawayLanguage()`)
- Guest can override via `GuestGuideLanguageToggle`
- Locale stored in `GuestGuideLanguageContext` (React context), available via `useGuestGuideLocale()`

**Rules:**
- Never hardcode German (or any language) text directly in components
- All new strings must be added to `translations.ts` with all 6 locales
- Exception: ACHZEIT brand name is never translated
- When in doubt: add a German + English entry and mark others as `[TODO]` — but don't skip the key

**Chatbot locale:** The chatbot system prompt is in German. It detects the guest's language automatically and responds in the same language. Do not change this behavior.

---

## Folder Structure & Responsibilities

```
src/
  config/
    properties.ts         — PropertyConfig definitions, getProperty() lookup
  pages/
    GuestGuide.tsx        — Main page: auth flow state machine, data fetching, renders inner
    NotFound.tsx          — 404 page
  components/
    guest-guide/
      GuestGuideContent.tsx       — All accordion sections (Zugang, WLAN, Familie, Küche, etc.)
      GuestGuideChatbot.tsx       — Floating chatbot, SSE streaming, voice input
      GuestGuideHero.tsx          — Hero section with guest name, dates, AWPass link
      GuestGuideStickyNav.tsx     — Sticky top navigation between sections
      GuestGuidePinEntry.tsx      — PIN entry screen (pre-auth)
      GuestGuideEvents.tsx        — Live events widget (external source)
      GuestGuideLanguageContext.tsx — Locale state (React context + provider)
      GuestGuideLanguageToggle.tsx  — Language selector UI
      translations.ts             — All UI strings, all 6 locales
    ui/                   — shadcn/ui primitives (do not modify unless necessary)
    ScrollReveal.tsx      — Animation helper
  hooks/
    use-mobile.tsx        — Responsive breakpoint hook
    use-toast.ts          — Toast notification hook
  lib/
    utils.ts              — Tailwind class merge utility (cn)
  assets/                 — Static images (photos, icons, logos)
api/
  reservation.ts          — Hostaway auth, PIN/token lookup, returns booking data
  guest-guide-chat.ts     — Claude Haiku streaming chatbot, Anthropic→OpenAI SSE conversion
```

**State machine in `GuestGuide.tsx`:**
```
loading → (token in URL?) → loaded
        → pin (warmup call)
             → (valid PIN) → loaded
             → error
             → no_reservation
```

---

## Guest Authentication / Access Rules

**Current state:**
- PIN = last 4 digits of guest phone number from Hostaway
- Token = `{reservationId}.{FIXED_TOKEN}` stored in URL query param `?t=`
- `FIXED_TOKEN = 'ABC321'` — **not production-ready, must be replaced**

**Access rules:**
- Door codes, WiFi passwords, guest names, dates → only after successful auth
- Public sections (restaurants, excursions, checkout info) → currently shown post-auth only
- All sensitive data must remain server-side until auth is confirmed

**Production requirements (not yet implemented):**
- Tokens must be reservation-scoped, time-limited, and cryptographically random
- PIN verification needs rate limiting (currently no brute-force protection)
- Avoid exposing internal Hostaway IDs in URLs if possible

**Fail closed:** On any auth error, show error state — never show partial guest data.

---

## Hostaway Integration Rules

Hostaway is the **source of truth** for all reservation data.

**Current field mappings used in `reservation.ts`:**

| Hostaway field | Used as |
|---|---|
| `guestName` / `guestFirstName` + `guestLastName` | `guestName` |
| `guestLanguage` / `language` | `guestLanguage` → mapped via `mapHostawayLanguage()` |
| `arrivalDate` | `checkin` |
| `departureDate` | `checkout` |
| `numberOfGuests` | `numberOfGuests` |
| `doorCode` / `doorSecurityCode` | `doorCode` (also checked on listing level) |
| `wifiPassword` (listing-level) | `wifiPassword` |
| `guestPhone` / `phone` | Last 4 digits → PIN |
| Custom field `89486` | `awpassLink` (Allgäu Walser Pass) |

**Rules:**
- All Hostaway API calls belong exclusively in `api/` routes — never in frontend
- No credentials in client-side code
- Reservation lookup must be defensive: handle missing fields, API errors, timeouts
- Never log `doorCode`, `wifiPassword`, `guestPhone`, or `guestName`
- When adding new Hostaway fields, document the mapping here

**Token caching:** OAuth2 access token is cached in-memory per warm Edge instance. Cold starts re-fetch. This is expected behavior.

---

## Chatbot / AI Assistant Rules

The chatbot is a streaming Claude Haiku instance (`guest-guide-chat.ts`).

**What it may answer:**
- House instructions (sauna, fireplace, BORA cooktop, etc.)
- Local recommendations from the system prompt
- Check-in/out times, parking, WiFi troubleshooting steps
- General Allgäu region questions

**What it must NOT do:**
- Invent door codes, WiFi passwords, or prices
- Hallucinate house rules, fees (Kurtaxe), or check-in times if not in the prompt
- Provide booking-specific data (door code, WiFi PW) — these are injected from `guestData` context into the system prompt, already verified
- When uncertain: explicitly say it doesn't know and offer WhatsApp contact

**Technical rules:**
- System prompt cached via `anthropic-beta: prompt-caching-2024-07-31` — do not remove
- `cache_control: { type: 'ephemeral' }` on system message — do not remove
- Frontend parses **OpenAI SSE format** — the Anthropic→OpenAI conversion in `guest-guide-chat.ts` must not be changed without updating the frontend
- SSE conversion: `content_block_delta` → `{ choices: [{ delta: { content } }] }`, `message_stop` → `[DONE]`
- `ANTHROPIC_API_KEY` is server-side only

---

## Environment Variables

```
HOSTAWAY_CLIENT_ID       # OAuth2 client ID (163024 for ACHZEIT)
HOSTAWAY_API_TOKEN       # OAuth2 client secret
HOSTAWAY_BASE_URL        # https://api.hostaway.com/v1
ANTHROPIC_API_KEY        # Claude API — server-side only, never expose
```

Never hardcode. Never expose to frontend. All used in `api/` routes only.

---

## API Routes (`api/`)

All routes run on Vercel Edge Runtime: `export const config = { runtime: 'edge' }`.
No Node.js built-ins (`fs`, `crypto`, `path`, etc.) — Web APIs only.

| File | Purpose |
|---|---|
| `reservation.ts` | Hostaway OAuth, PIN/token lookup, returns booking + door/WiFi |
| `guest-guide-chat.ts` | Claude Haiku streaming chatbot, Anthropic→OpenAI SSE |

---

## Security & Privacy Checklist

Before shipping any auth or data flow change, verify:

- [ ] No secrets in frontend bundle
- [ ] No PII (name, phone, door code) in logs
- [ ] Door code / WiFi password not returned without successful auth
- [ ] All inputs validated (PIN format, token structure)
- [ ] PIN rate limiting in place *(not yet implemented)*
- [ ] Token is reservation-scoped and time-limited *(not yet implemented)*
- [ ] Hostaway internal IDs not unnecessarily exposed
- [ ] CORS handled deliberately (same-origin on Vercel = no explicit CORS needed)
- [ ] Auth errors fail closed — never return partial data

---

## Development Workflow

1. Read relevant files before changing them.
2. Make small, verifiable changes — one concern per commit.
3. No broad refactors without a clear need.
4. When changing API response shapes: check what the frontend expects.
5. When changing SSE format: check `GuestGuideChatbot.tsx` parser.
6. When adding new translation keys: add all 6 locales in `translations.ts`.
7. After changes: run `npm run build` — fix type errors at the root, don't cast them away.
8. No new npm dependencies without a clear reason.
9. If something is unclear from the code, document the assumption explicitly.

---

## Testing & Verification

**Build:** `npm run build` must succeed with no type errors.

**Manual flow checklist:**
- [ ] `/guide/achzeit` loads without errors
- [ ] PIN entry screen appears (not authenticated)
- [ ] Valid PIN → guest data shown (name, dates, door code, WiFi)
- [ ] Invalid PIN → friendly error, no crash
- [ ] URL token (`?t=`) auto-authenticates on load
- [ ] Expired/invalid token → falls through to PIN screen
- [ ] Authenticated: door code + WiFi visible
- [ ] Not authenticated: no sensitive data visible
- [ ] Chatbot opens, streams response correctly
- [ ] Chatbot language follows guest locale
- [ ] Language toggle changes all UI text
- [ ] All 6 locales render without missing keys
- [ ] Error states show friendly messages, not stack traces
- [ ] `/guide/unknown-slug` → redirects to `/404`

---

## Known Limitations / TODOs

| Item | Status |
|---|---|
| `FIXED_TOKEN = 'ABC321'` in `reservation.ts` | Placeholder — must be replaced before wider use |
| PIN brute-force protection | Not implemented — add rate limiting before production |
| `LISTING_ID` hardcoded in `reservation.ts` | Blocks true multi-tenancy — must use `property` param |
| In-memory caches | Per Edge instance only — reset on cold start (intentional) |
| WiFi network name `'ACHZEIT'` hardcoded in `GuestGuideContent.tsx` | Should move to `PropertyConfig` |
| Emergency contacts (112, 116 117) hardcoded | Should move to `PropertyConfig` |
| Content (restaurants, excursions) hardcoded in components | Should move to structured config or knowledge base |
| No admin UI | Content changes require code changes |
| No PDF/print view | Future option |
| No QR code generation | Future option |
| Stinesser Lifte shown conditionally until `2026-03-08` | Date-based display logic in `GuestGuideContent.tsx` — update annually |

---

## Future Direction

*(Planned — not current state)*

- Admin UI for property content management
- Structured knowledge base per property (replaces hardcoded `translations.ts` content)
- Reservation-based magic links (replace `FIXED_TOKEN`)
- Dynamic `LISTING_ID` routing for multi-property support
- Integration with Hostaway Custom Fields for property-specific data
- Optional: Stripe payment links for Kurtaxe or add-ons
- Optional: Allgäu Walser Pass / Tramino integration
- Optional: PDF / print view for house information
- Optional: QR code in house linking directly to `/guide/:slug`

---

## Engineering Philosophy

- Simple, robust, maintainable over clever.
- Boring technology over fragile cleverness.
- Production stability first.
- Explicit over magic.
- Plan before implementing non-trivial changes.
- Comments explain WHY, not what.
- No unnecessary dependencies.
- Small, logically grouped commits. Never commit `.env`.

---

## Git

- Repo: https://github.com/ms-79/guest-guide (public)
- Branch: `master` → auto-deploys to Vercel production
- Vercel team: `allgaeu-stays`, project: `guest-guide`
