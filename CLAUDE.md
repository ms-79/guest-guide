# CLAUDE.md — Digital Guest Guide

## Project Overview

**Digital Guest Guide** — multi-tenant digital guestbook (Gästemappe) for vacation rentals.

Stack: React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Vercel Edge Functions

Integrations:
- **Hostaway** — reservation lookup, door code, WiFi password (OAuth2 Client Credentials)
- **Anthropic Claude** — streaming chatbot with prompt caching (`guest-guide-chat.ts`)

Deployment: Vercel (team: `allgaeu-stays`, project: `guest-guide`)
Repo: https://github.com/ms-79/guest-guide

---

## Multi-Tenancy

Properties are configured in `src/config/properties.ts`.
Route: `/guide/:slug` — slug maps to a `PropertyConfig` entry.

Current properties: `achzeit` (Fischen im Allgäu, Hostaway listing `463607`).

To add a new property: add entry to `PROPERTIES` in `properties.ts`.

---

## Environment Variables

```
HOSTAWAY_CLIENT_ID       # OAuth client ID
HOSTAWAY_API_TOKEN       # OAuth client secret
HOSTAWAY_BASE_URL        # https://api.hostaway.com/v1
ANTHROPIC_API_KEY        # Claude API (chatbot)
```

Never hardcode secrets. Never expose to frontend.

---

## API Routes (`api/`)

| File | Purpose |
|---|---|
| `reservation.ts` | Verify guest PIN or token, return booking + door/WiFi data |
| `guest-guide-chat.ts` | Streaming chatbot via Claude Haiku with prompt caching |

All routes: Vercel Edge Runtime (`export const config = { runtime: 'edge' }`).

**Hostaway auth:** OAuth2 Client Credentials — token cached in-memory per warm instance.

### Chatbot SSE Format

Frontend expects OpenAI SSE format. The API route converts Anthropic SSE → OpenAI SSE:
- `content_block_delta` with `text_delta` → `{ choices: [{ delta: { content } }] }`
- `message_stop` → `data: [DONE]`

Prompt caching enabled: `anthropic-beta: prompt-caching-2024-07-31` + `cache_control: { type: 'ephemeral' }` on system prompt.

---

## Guest Data Rules

This system processes guest PII (names, phone numbers, booking details, door codes).

- Never log sensitive guest data.
- Never expose door codes or WiFi passwords beyond the authenticated guest session.
- PIN verification uses last 4 digits of guest phone — no brute-force protection yet (known limitation).
- `FIXED_TOKEN = 'ABC321'` is a placeholder — replace with proper token generation for production.

---

## Known Gotchas

- In-memory caches reset on cold start — short reservation cache TTL (30s) is intentional.
- Vercel Edge Runtime has no Node.js built-ins.
- Anthropic response: `data?.content?.[0]?.text` (not `choices[0].message.content`).
- Frontend chatbot parses OpenAI SSE format — don't change the conversion logic without updating the frontend.

---

## Engineering Philosophy

- Simple, robust, maintainable over clever.
- Production stability always first.
- Explicit over magic.
- Think like a senior production engineer.

## Planning

For non-trivial tasks: **plan before implementing**.
1. Analyze architecture, dependencies, risks.
2. Write concise implementation plan.
3. Break into verifiable subtasks.
4. Only then implement.

## Verification

Before claiming success:
- Inspect actual code and API shapes.
- Verify env vars are present.
- Run type checks / build if available (`npm run build`).
- Check Vercel deployment logs.

## Coding Standards

- Strong typing, explicit error handling.
- Small focused functions.
- Comments explain WHY, not what.
- No unnecessary dependencies.

## Git

- Logically grouped, minimal commits.
- Never commit `.env` or secrets.
- Push triggers automatic Vercel deployment.
