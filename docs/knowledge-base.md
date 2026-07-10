# Knowledge Base & Admin-Webapp — Architektur- und Umsetzungsplan

> Status: **Vorschlag / noch nicht umgesetzt.** Dieses Dokument beschreibt die
> geplante Datenpflege-Schicht (Supabase) und die Migrationsreihenfolge. Kein
> Code darin ist bereits gebaut. Entscheidungen, die noch offen sind, stehen
> unter „Offene Entscheidungen".

## Ziel

Eine **Datenquelle, zwei Konsumenten**:

- **Gästemappe** (`/guide/:slug`) — strukturierter, property-spezifischer Content
  (Zugang, WLAN, Küche, Sauna, Empfehlungen …), heute verstreut in
  `translations.ts` und hardcoded in `GuestGuideContent.tsx`.
- **Chatbot** (`api/guest-guide-chat.ts`) — „Facts", die heute im
  `SYSTEM_PROMPT` hardcoded stehen.

Dazu eine **Admin-Webapp** zur Pflege dieser Inhalte durch Property-Manager,
ohne Code-Änderung.

## Warum jetzt

Zwei konkrete Schmerzpunkte aus dem aktuellen Code:

1. **Der Chatbot ist Single-Property.** Der `SYSTEM_PROMPT` in
   `api/guest-guide-chat.ts` ist vollständig ACHZEIT-spezifisch (Adresse
   „Achweg 5a", BORA-Kochfeld, Empfehlung „Gaisbock" …). Alle vier Properties
   teilen sich denselben Prompt — für Felder's/Phils antwortet der Bot mit
   ACHZEIT-Fakten. Das blockiert echtes Multi-Property.
2. **Content-Pflege erfordert Code-Deploys.** Jede Änderung an Öffnungszeiten,
   Empfehlungen oder Hausregeln ist ein Commit in `translations.ts` /
   `GuestGuideContent.tsx`.

## Tech-Stack-Entscheidung

Bestehenden Stack **behalten**, nur eine Datenschicht ergänzen:

- **Guest Guide:** React 18 + TypeScript + Vite (SPA) auf Vercel, shadcn/ui +
  Radix + Tailwind, react-query. → unverändert.
- **API:** Vercel Edge Functions (`api/`) für Hostaway, Chatbot, Magic-Links. →
  unverändert.
- **Neu — Datenpflege:** **Supabase** (Postgres + Auth + Row Level Security +
  Storage).
- **Admin-UI:** **keine separate App / kein Next.js.** Geschützte `/admin`-Route
  in derselben Vite-App, gleicher shadcn-Stack, `react-hook-form` + `zod`
  (bereits als Dependency vorhanden), `@supabase/supabase-js` als einzige neue
  Runtime-Abhängigkeit.

Begründung: ein Deployment, ein Design-System, keine doppelte UI-Bibliothek.
„Boring technology" statt zweitem Stack — passt zur Engineering-Philosophie in
`CLAUDE.md`.

### Abgrenzung zu den alten `supabase/functions/`

Der Ordner `supabase/functions/` enthält **veraltete Edge-Functions**
(reservation/chat) aus dem Initial-Commit und wird nicht mehr genutzt (das
Frontend ruft ausschließlich `/api/*` auf Vercel). Er hat **nichts** mit dieser
Knowledge-Base zu tun und sollte separat aufgeräumt werden, um Verwechslung zu
vermeiden. Supabase kommt hier ausschließlich als **Datenbank + Auth** zum
Einsatz, nicht als Function-Runtime.

## Zielarchitektur

```
                    ┌───────────────────────────────┐
                    │  Supabase (Postgres + Auth)   │
                    │  properties · guide_sections  │
                    │  chatbot_facts · recommendations │
                    └──────┬──────────────────┬─────┘
     liest (anon, RLS ro)  │                  │  schreibt (Auth + RLS)
                           ▼                  ▼
        Gästemappe /guide/:slug        Admin-Webapp /admin
        (React SPA, Vercel)            (React SPA, Vercel)
              │
              ▼  Facts aus DB in System-Prompt
        api/guest-guide-chat.ts (Vercel Edge)
```

- Gästemappe & Admin sprechen Supabase über `@supabase/supabase-js` direkt an
  (öffentliche Read-Policies für Gastdaten, Auth-geschützte Write-Policies fürs
  Admin).
- Die Chatbot-Edge-Function lädt die Facts der jeweiligen Property serverseitig
  und baut den System-Prompt daraus zusammen (statt hardcoded String).

## Was bleibt vorerst in Code (nicht in die DB)

Bewusste Grenze, um Risiko klein zu halten:

- **Infrastruktur-Config bleibt in `src/config/properties.ts`:** `slug`,
  `hostawayListingId`, `BRANDS`/Domains, `primaryColor`, `favicon`. Das ist
  versioniert, selten geändert und teils sicherheitsrelevant (Routing).
- **Nur der *Content* wandert in die DB:** Gästemappen-Sektionen, Chatbot-Facts,
  Empfehlungen. Operative Felder wie `checkinTime`/`wifiName` können in einer
  späteren Phase folgen (siehe Phase 3).

## Datenmodell (Entwurf)

Startpunkt, nicht final. Alles mehrsprachig über eine `locale`-Spalte
(`de|en|es|it|fr|nl`), passend zu `translations.ts`.

```sql
-- Properties: Spiegel der Code-Config, Key ist der bestehende Slug.
-- Vorerst nur die Felder, die die Content-Tabellen als FK brauchen.
create table properties (
  slug         text primary key,          -- z. B. '463607-achzeit'
  brand_host   text not null,             -- z. B. 'guide.achzeit.de'
  display_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Strukturierter Gästemappen-Content, pro Property + Sprache + Sektion.
-- Ersetzt schrittweise Inhalte aus translations.ts / GuestGuideContent.tsx.
create table guide_sections (
  id           uuid primary key default gen_random_uuid(),
  property_slug text not null references properties(slug) on delete cascade,
  locale       text not null,             -- de|en|es|it|fr|nl
  key          text not null,             -- z. B. 'wifi', 'kitchen', 'sauna'
  title        text not null,
  body_md      text not null,             -- Markdown (wie log-chat es schon rendert)
  sort_order   int  not null default 0,
  is_published boolean not null default true,
  updated_at   timestamptz not null default now(),
  unique (property_slug, locale, key)
);

-- Chatbot-Facts: gehen in den System-Prompt der Edge-Function.
-- category gruppiert (z. B. 'appliances', 'check-in', 'house-rules').
create table chatbot_facts (
  id           uuid primary key default gen_random_uuid(),
  property_slug text not null references properties(slug) on delete cascade,
  locale       text not null default 'de', -- Prompt ist heute deutsch; s. Offene Fragen
  category     text not null,
  fact         text not null,             -- Freitext, eine Aussage pro Zeile
  sort_order   int  not null default 0,
  is_active    boolean not null default true,
  updated_at   timestamptz not null default now()
);

-- Empfehlungen (heute hardcoded in GuestGuideContent.tsx).
create table recommendations (
  id           uuid primary key default gen_random_uuid(),
  property_slug text not null references properties(slug) on delete cascade,
  locale       text not null,
  category     text not null,             -- 'restaurant' | 'excursion' | ...
  name         text not null,
  description  text,
  maps_url     text,
  distance     text,                      -- z. B. '10 Min. zu Fuß'
  sort_order   int  not null default 0,
  is_active    boolean not null default true,
  updated_at   timestamptz not null default now()
);
```

### Row Level Security (Skizze)

```sql
alter table guide_sections   enable row level security;
alter table chatbot_facts    enable row level security;
alter table recommendations  enable row level security;
alter table properties       enable row level security;

-- Öffentlich lesbar (Gästemappe, anon key) — nur veröffentlichte Inhalte.
create policy "public read published sections"
  on guide_sections for select
  using (is_published = true);

-- Schreiben nur für authentifizierte Admins.
-- Feingranulare Property-/Brand-Beschränkung folgt über eine
-- Zuordnungstabelle (admin_property_access), sobald mehrere Manager existieren.
create policy "authenticated write sections"
  on guide_sections for all
  to authenticated
  using (true) with check (true);
```

> Hinweis Sicherheit: `chatbot_facts` sollten **nicht** über den anon key
> öffentlich lesbar sein, wenn sie sensible Betriebsdetails enthalten. Die
> Chatbot-Edge-Function nutzt den **Service-Role-Key** (server-side, wie
> `ANTHROPIC_API_KEY` in `CLAUDE.md`) und liest serverseitig. Nur wirklich
> öffentliche Inhalte (Empfehlungen, Sektionstexte) bekommen anon-Read.

## Konsumenten-Integration

- **Gästemappe:** react-query-Hook lädt `guide_sections` + `recommendations` für
  den aktuellen `property_slug` + `locale`. `translations.ts` bleibt für reine
  UI-Strings (Buttons, Labels); nur **Content** kommt aus der DB.
- **Chatbot:** `api/guest-guide-chat.ts` lädt `chatbot_facts` der Property
  serverseitig und baut `SYSTEM_PROMPT` dynamisch. Die bestehenden Regeln aus
  `CLAUDE.md` bleiben: prompt-caching-Header, `cache_control: ephemeral`,
  Anthropic→OpenAI-SSE-Konvertierung, `guestData` weiterhin injiziert.

## Migrationsreihenfolge (inkrementell, jede Phase deploybar)

**Phase 0 — Fundament**
- Supabase-Projekt anlegen; `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` als Env-Vars (Frontend nur URL + anon key).
- `@supabase/supabase-js` hinzufügen, dünner Client-Wrapper in `src/lib/`.
- Tabellen + RLS anlegen; `properties` aus `properties.ts` seeden.

**Phase 1 — Chatbot-Facts (größter Hebel, kleinste Fläche)**
- `chatbot_facts` für ACHZEIT aus dem bestehenden `SYSTEM_PROMPT` befüllen.
- Edge-Function liest Facts pro Property → behebt sofort das Single-Property-
  Problem des Bots. `translations.ts` bleibt unangetastet.

**Phase 2 — Empfehlungen**
- `recommendations` aus `GuestGuideContent.tsx` migrieren; Komponente liest aus
  der DB. Klar abgegrenztes, gut testbares Stück.

**Phase 3 — Gästemappen-Sektionen**
- `guide_sections` schrittweise aus `translations.ts`-Content füllen, Sektion für
  Sektion. UI-Strings bleiben in `translations.ts`.

**Phase 4 — Admin-Webapp**
- `/admin`-Route mit Supabase Auth (Login), CRUD-Formulare (react-hook-form +
  zod) für Facts, Empfehlungen, Sektionen. Property-/Brand-Scoping über RLS.

**Phase 5 — Aufräumen**
- Veraltete `supabase/functions/` entfernen.
- Migrierte Content-Blöcke aus `translations.ts` / Komponenten entfernen, sobald
  die DB-Quelle live und verifiziert ist.

## Offene Entscheidungen

1. **Chatbot-Sprache:** `SYSTEM_PROMPT` ist heute deutsch, der Bot übersetzt
   selbst (per `CLAUDE.md` beibehalten). Facts also nur auf `de` pflegen und den
   Bot übersetzen lassen — oder mehrsprachige Facts? Empfehlung: **`de`
   belassen**, Aufwand minimal halten.
2. **Property-Config-Migration:** `checkinTime`/`wifiName` etc. vorerst in
   `properties.ts` lassen (Phase 3+) oder gleich in `properties`-Tabelle? →
   Vorschlag: Code lassen, bis Admin-UI existiert.
3. **Admin-Auth-Umfang:** Ein einziger Admin (Markus) vs. mehrere Property-
   Manager mit Brand-Scoping. Bestimmt, wie früh `admin_property_access` +
   feingranulare RLS gebraucht werden.
4. **Fallback-Strategie:** Wenn Supabase nicht erreichbar ist — Gästemappe auf
   Code-Defaults zurückfallen oder Fehlerzustand? Für die Facts der Edge-Function
   relevant (Chatbot darf nicht komplett ausfallen).

## Nicht-Ziele (bewusst ausgeklammert)

- Kein Wechsel des Frontend-Frameworks (bleibt Vite-SPA).
- Kein Ersetzen der Hostaway-Integration — Reservierungsdaten bleiben live aus
  Hostaway (`api/reservation.ts`).
- Kein Verschieben der Infrastruktur-/Routing-Config in die DB.
