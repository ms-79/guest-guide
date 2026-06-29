-- ============================================================================
-- Digital Guest Guide — Multi-Property CMS schema (MVP)
-- ============================================================================
-- Stores STABLE content only. Reservation data (door codes, WiFi passwords,
-- guest names) is NEVER stored here — Hostaway stays the single source of truth
-- and is fetched at runtime via api/reservation.ts.
--
-- i18n: multilingual text is stored as JSONB keyed by locale, e.g.
--   { "de": "...", "en": "...", "es": "...", "it": "...", "fr": "...", "nl": "..." }
-- mirroring the t() helper in src/components/guest-guide/translations.ts.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — staff users (1:1 with auth.users), drives admin access + roles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  role        text not null default 'editor' check (role in ('admin', 'editor', 'reviewer')),
  -- optional: restrict a user to specific property slugs; null/empty = all
  property_scope jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Any authenticated user that has a profile row is considered staff.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- brands — canonical host -> brand mapping (replaces BRANDS in properties.ts)
-- ---------------------------------------------------------------------------
create table if not exists public.brands (
  id            uuid primary key default gen_random_uuid(),
  host          text not null unique,            -- e.g. 'guide.achzeit.de'
  name          text not null,
  primary_color text,
  logo          text,
  favicon       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_brands_updated before update on public.brands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- properties — source of truth for property config (replaces PROPERTIES)
-- ---------------------------------------------------------------------------
create table if not exists public.properties (
  id                          uuid primary key default gen_random_uuid(),
  slug                        text not null unique,        -- '<listingId>-<name>'
  brand_id                    uuid references public.brands (id) on delete set null,
  display_name                text not null,
  hostaway_listing_id         bigint not null unique,
  whatsapp_number             text,                        -- without '+'
  logo                        text,
  favicon                     text,
  primary_color               text,
  wifi_name                   text,
  checkin_time                text,                        -- '16:00'
  checkout_time               text,                        -- '11:00'
  pets_allowed                boolean not null default false,
  grill_available             boolean not null default false,
  coffee_type                 text check (coffee_type in ('nespresso', 'filter', 'vollautomat')),
  dishwasher_tabs_included    boolean not null default true,
  kurtaxe_per_person_per_night numeric(6,2),               -- null = section hidden
  google_analytics_id         text,
  invoice_recipient_email     text,                        -- where the chatbot routes invoice requests
  status                      text not null default 'active' check (status in ('active', 'draft')),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create trigger trg_properties_updated before update on public.properties
  for each row execute function public.set_updated_at();
create index if not exists idx_properties_brand on public.properties (brand_id);

-- ---------------------------------------------------------------------------
-- topics — shared taxonomy for guest guide AND chatbot knowledge
-- ---------------------------------------------------------------------------
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,         -- 'zugang', 'wlan', 'familie', ...
  label      jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_topics_updated before update on public.topics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- content_entries — structured guest-guide content (places, instructions, ...)
-- property_id NULL = global (applies to all properties unless overridden)
-- Populated in a later phase; table created now so the model is stable.
-- ---------------------------------------------------------------------------
create table if not exists public.content_entries (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid references public.properties (id) on delete cascade,
  topic_id          uuid references public.topics (id) on delete set null,
  kind              text not null default 'section' check (kind in ('place', 'instruction', 'section', 'note')),
  title             jsonb not null default '{}'::jsonb,
  body              jsonb not null default '{}'::jsonb,
  url               text,
  maps_link         text,
  metadata          jsonb not null default '{}'::jsonb,   -- travel_walk_min, travel_drive_min, power_kw, badges, steps[]
  valid_from        date,
  valid_until       date,
  expose_to_chatbot boolean not null default false,
  sort_order        int not null default 0,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id),
  updated_by        uuid references auth.users (id)
);
create trigger trg_content_entries_updated before update on public.content_entries
  for each row execute function public.set_updated_at();
create index if not exists idx_content_property on public.content_entries (property_id);
create index if not exists idx_content_topic on public.content_entries (topic_id);

-- ---------------------------------------------------------------------------
-- faqs — knowledge base / FAQ
-- ---------------------------------------------------------------------------
create table if not exists public.faqs (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid references public.properties (id) on delete cascade,
  topic_id          uuid references public.topics (id) on delete set null,
  question          jsonb not null default '{}'::jsonb,
  answer            jsonb not null default '{}'::jsonb,
  expose_to_chatbot boolean not null default true,
  sort_order        int not null default 0,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id),
  updated_by        uuid references auth.users (id)
);
create trigger trg_faqs_updated before update on public.faqs
  for each row execute function public.set_updated_at();
create index if not exists idx_faqs_property on public.faqs (property_id);

-- ---------------------------------------------------------------------------
-- ai_facts — verified facts for the chatbot, with approval workflow
-- ---------------------------------------------------------------------------
create table if not exists public.ai_facts (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid references public.properties (id) on delete cascade,
  topic_id        uuid references public.topics (id) on delete set null,
  fact            jsonb not null default '{}'::jsonb,     -- i18n text
  source          text,
  note            text,
  status          text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'rejected')),
  reviewed_by     uuid references auth.users (id),
  reviewed_at     timestamptz,
  source_entry_id uuid references public.content_entries (id) on delete set null,  -- link to guide content
  version         int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id)
);
create trigger trg_ai_facts_updated before update on public.ai_facts
  for each row execute function public.set_updated_at();
create index if not exists idx_ai_facts_property on public.ai_facts (property_id);
create index if not exists idx_ai_facts_status on public.ai_facts (status);

-- ---------------------------------------------------------------------------
-- chatbot_prompts — base system prompt per property (replaces hardcoded prompt)
-- property_id NULL = global default. locale NULL = applies to all languages.
-- ---------------------------------------------------------------------------
create table if not exists public.chatbot_prompts (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade,
  locale      text,
  base_prompt text not null,
  version     int not null default 1,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_by  uuid references auth.users (id)
);
create trigger trg_chatbot_prompts_updated before update on public.chatbot_prompts
  for each row execute function public.set_updated_at();
create index if not exists idx_prompts_property on public.chatbot_prompts (property_id);

-- ---------------------------------------------------------------------------
-- audit_log — change / approval history
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id     uuid,
  action     text not null,
  actor      uuid references auth.users (id),
  diff       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_table_row on public.audit_log (table_name, row_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Pattern:
--   * anon (public read API, anon key)  -> SELECT only published/approved rows
--   * authenticated staff               -> full read/write
--   * service_role                      -> bypasses RLS (used server-side only)
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.brands          enable row level security;
alter table public.properties      enable row level security;
alter table public.topics          enable row level security;
alter table public.content_entries enable row level security;
alter table public.faqs            enable row level security;
alter table public.ai_facts        enable row level security;
alter table public.chatbot_prompts enable row level security;
alter table public.audit_log       enable row level security;

-- profiles: a user sees their own row; staff sees all; staff manages.
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_admin_all on public.profiles
  for all using (public.is_staff()) with check (public.is_staff());

-- brands / topics: public read, staff write.
create policy brands_public_read on public.brands for select using (true);
create policy brands_staff_write on public.brands for all
  using (public.is_staff()) with check (public.is_staff());

create policy topics_public_read on public.topics for select using (true);
create policy topics_staff_write on public.topics for all
  using (public.is_staff()) with check (public.is_staff());

-- properties: anon reads active; staff full.
create policy properties_public_read on public.properties
  for select using (status = 'active' or public.is_staff());
create policy properties_staff_write on public.properties for all
  using (public.is_staff()) with check (public.is_staff());

-- content_entries: anon reads published; staff full.
create policy content_public_read on public.content_entries
  for select using (status = 'published' or public.is_staff());
create policy content_staff_write on public.content_entries for all
  using (public.is_staff()) with check (public.is_staff());

-- faqs: anon reads published; staff full.
create policy faqs_public_read on public.faqs
  for select using (status = 'published' or public.is_staff());
create policy faqs_staff_write on public.faqs for all
  using (public.is_staff()) with check (public.is_staff());

-- ai_facts: anon reads ONLY approved; staff full.
create policy ai_facts_public_read on public.ai_facts
  for select using (status = 'approved' or public.is_staff());
create policy ai_facts_staff_write on public.ai_facts for all
  using (public.is_staff()) with check (public.is_staff());

-- chatbot_prompts: anon reads published; staff full.
create policy prompts_public_read on public.chatbot_prompts
  for select using (status = 'published' or public.is_staff());
create policy prompts_staff_write on public.chatbot_prompts for all
  using (public.is_staff()) with check (public.is_staff());

-- audit_log: staff read; inserts done by service role / triggers.
create policy audit_staff_read on public.audit_log
  for select using (public.is_staff());
