# Supabase — Multi-Property CMS

This directory holds the database schema and seed data for the internal
Multi-Property CMS (guest guides, FAQ/knowledge base, AI facts, chatbot prompts).

The CMS stores **stable content only**. Reservation data (door codes, WiFi
passwords, guest names) is **never** stored here — Hostaway remains the single
source of truth, fetched at runtime by `api/reservation.ts`.

## Layout

```
supabase/
  migrations/
    0001_init.sql   — schema, indexes, RLS policies
    0002_seed.sql   — brands, properties, topics, default + ACHZEIT chatbot prompt
```

## Applying the schema

Either via the Supabase SQL editor (paste each file in order) or the CLI:

```bash
# one-off, against a remote project
supabase db push          # if using supabase/config.toml + linked project
# or run the files directly:
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_seed.sql
```

The seed is idempotent (upserts on `host` / `slug`, guarded inserts for prompts),
so it is safe to re-run.

## Required environment variables

Server-side (Vercel Edge functions — `api/`):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Anon key — used by the public read path; RLS enforces published/approved only |
| `SUPABASE_SERVICE_ROLE_KEY` | (optional) only if a route needs to bypass RLS — never expose to the client |

Frontend admin (Vite — must be prefixed `VITE_`):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Same project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon key for the admin client (Supabase Auth + RLS-scoped queries) |

## Creating the first admin user

1. Create a user in Supabase Auth (Dashboard → Authentication → Add user, or invite).
2. Insert a matching `profiles` row so `is_staff()` returns true:

```sql
insert into public.profiles (id, email, role)
values ('<auth-user-uuid>', '<email>', 'admin');
```

Without a `profiles` row a logged-in user has no staff access (RLS denies writes).

## RLS summary

- **anon** (public read API): `SELECT` only `status = 'published'` (content/faqs/prompts),
  `status = 'approved'` (ai_facts), `status = 'active'` (properties).
- **authenticated staff** (has a `profiles` row → `is_staff()`): full read/write.
- **service_role**: bypasses RLS; server-side use only.
