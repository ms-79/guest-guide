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

## Rollen & Zugriffsmodell

**Entscheidung:** Zwei Rollen.

| Rolle | Zugriff |
|---|---|
| **admin** | Voller Schreib-/Lesezugriff auf **alle** Brands & Properties (Allgäu-Stays-Betreiber). |
| **manager** | Schreib-/Lesezugriff nur auf die **Brands**, denen er zugeordnet ist. Ein Brand umfasst mehrere Property-Slugs (siehe `BRANDS` in `properties.ts`). |

Scoping erfolgt auf **Brand-Ebene** (`brand_host`), nicht pro einzelner Property —
so wie `BRANDS` die Property-Slugs bündelt. Ein Felder's-Manager verwaltet damit
automatisch House **und** Appartement.

```sql
-- Rolle je Auth-User. Key referenziert Supabase auth.users.
create table app_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','manager')),
  full_name  text,
  created_at timestamptz not null default now()
);

-- Welche Brands darf ein Manager verwalten. Admins brauchen keinen Eintrag.
create table manager_brands (
  user_id    uuid not null references auth.users(id) on delete cascade,
  brand_host text not null,               -- z. B. 'guide.felders-escapes.com'
  primary key (user_id, brand_host)
);
```

### Row Level Security

Zentrale Helper-Funktion (SECURITY DEFINER, damit die Policies die Rollen-
Tabellen lesen dürfen) kapselt die Zugriffslogik an einer Stelle:

```sql
-- true, wenn der aktuelle Auth-User die Property bearbeiten darf:
-- Admin immer, Manager wenn ihm der Brand der Property zugeordnet ist.
create or replace function can_edit_property(p_slug text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_users u where u.user_id = auth.uid() and u.role = 'admin'
  )
  or exists (
    select 1
    from properties p
    join manager_brands mb
      on mb.brand_host = p.brand_host and mb.user_id = auth.uid()
    where p.slug = p_slug
  );
$$;

alter table guide_sections   enable row level security;
alter table chatbot_facts    enable row level security;
alter table recommendations  enable row level security;
alter table properties       enable row level security;
alter table app_users        enable row level security;
alter table manager_brands   enable row level security;

-- Gästemappe: öffentlich (anon key) nur veröffentlichte Inhalte lesen.
create policy "public read published sections"
  on guide_sections for select using (is_published = true);
create policy "public read active recommendations"
  on recommendations for select using (is_active = true);
-- chatbot_facts bewusst KEIN anon-Read (nur Service-Role, s. u.).

-- Schreiben: nur eigene Brand-Properties (Manager) bzw. alles (Admin).
create policy "scoped write sections"
  on guide_sections for all to authenticated
  using (can_edit_property(property_slug))
  with check (can_edit_property(property_slug));
create policy "scoped write facts"
  on chatbot_facts for all to authenticated
  using (can_edit_property(property_slug))
  with check (can_edit_property(property_slug));
create policy "scoped write recommendations"
  on recommendations for all to authenticated
  using (can_edit_property(property_slug))
  with check (can_edit_property(property_slug));

-- Manager sieht nur seine eigene Rollen-/Brand-Zeile; Admin verwaltet alle.
create policy "read own user row" on app_users for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from app_users a
                    where a.user_id = auth.uid() and a.role = 'admin'));
create policy "admin manages users" on app_users for all to authenticated
  using (exists (select 1 from app_users a
                 where a.user_id = auth.uid() and a.role = 'admin'))
  with check (exists (select 1 from app_users a
                      where a.user_id = auth.uid() and a.role = 'admin'));
```

> `manager_brands` erhält analoge Policies: Manager liest seine eigenen Zeilen,
> nur Admin schreibt (Manager-Onboarding ist Admin-Aufgabe).

> Hinweis Sicherheit: `chatbot_facts` sind bewusst **nicht** über den anon key
> öffentlich lesbar, da sie sensible Betriebsdetails enthalten können. Die
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

**Phase 0 — Fundament** (Detail siehe unten)
- Supabase-Projekt, Env-Vars, Client-Wrapper, Tabellen + Rollen + RLS,
  Seed von `properties` und dem ersten Admin.

**Phase 1 — Chatbot-Facts** (Detail siehe unten)
- `chatbot_facts` für ACHZEIT aus dem `SYSTEM_PROMPT` befüllen, Edge-Function
  liest Facts pro Property. Behebt sofort das Single-Property-Problem des Bots.

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

## Phase 0 — Fundament (Detailausarbeitung)

Ziel: Supabase steht, Rollen/RLS greifen, aber noch kein sichtbares Verhalten
geändert. Rein additiv.

1. **Supabase-Projekt** in der Organisation anlegen (Region EU, DSGVO). Kein
   Umschalten des bestehenden Vercel-Setups nötig.
2. **Env-Vars** setzen (Vercel + lokal `.env`, niemals committen):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — für Frontend (öffentlich,
     nur anon key; RLS schützt die Daten).
   - `SUPABASE_SERVICE_ROLE_KEY` — **nur** für Edge-Functions (`api/`),
     server-side, wie `ANTHROPIC_API_KEY`. Nie ins Frontend-Bundle.
3. **Dependency + Client:** `@supabase/supabase-js` hinzufügen. Zwei dünne
   Wrapper:
   - `src/lib/supabase.ts` — Browser-Client mit anon key (für Gästemappe/Admin).
   - Helper in den Edge-Functions — Server-Client mit Service-Role-Key.
4. **Schema-Migration** anwenden (SQL aus „Datenmodell" + „Rollen &
   Zugriffsmodell"): Tabellen `properties`, `guide_sections`, `chatbot_facts`,
   `recommendations`, `app_users`, `manager_brands`; Funktion
   `can_edit_property`; alle RLS-Policies. Ablage als versionierte
   SQL-Migrationsdateien im Repo (`supabase/migrations/`), damit reproduzierbar.
5. **Seed:**
   - `properties` aus `src/config/properties.ts` + `BRANDS` befüllen (`slug`,
     `brand_host`, `display_name`). Bleibt Single Source für Content-FKs.
   - Ersten **Admin** anlegen: Auth-User (Markus) einladen, Zeile in `app_users`
     mit `role='admin'`.
6. **Verifikation:** `npm run build` grün; ein manueller Testquery mit anon key
   liest veröffentlichte Sektionen, ein Query ohne Auth kann `chatbot_facts`
   **nicht** lesen (RLS greift).

Definition of Done: DB + RLS live, Admin existiert, keine Verhaltensänderung an
Gästemappe/Chatbot.

## Phase 1 — Chatbot-Facts (Detailausarbeitung)

Ziel: Der Bot antwortet mit **property-eigenen** Fakten statt für alle
Properties mit ACHZEIT-Fakten. Größter Hebel, kleinste Angriffsfläche.

1. **Facts extrahieren:** Den ACHZEIT-Teil des `SYSTEM_PROMPT` aus
   `api/guest-guide-chat.ts` in `chatbot_facts`-Zeilen zerlegen — eine Aussage
   pro Zeile, gruppiert per `category` (`address`, `check-in`, `appliances`,
   `sauna`, `house-rules`, `recommendations` …). `locale='de'` (siehe
   Entscheidung Chatbot-Sprache). Als Seed-Migration ablegen.
2. **Prompt-Gerüst trennen:** Im `SYSTEM_PROMPT` bleibt nur das **property-
   unabhängige** Gerüst (Rolle, Ton, Duzen, Nur-Vorname-Regel, „bei Unsicherheit
   WhatsApp"). Die property-spezifischen Fakten werden zur Laufzeit angehängt.
3. **Edge-Function-Anpassung** (`api/guest-guide-chat.ts`):
   - Property-Slug kommt aus dem Request (analog `api/reservation.ts`, das den
     `property`-Param schon nutzt).
   - Server-Client (Service-Role-Key) lädt `chatbot_facts` der Property (aktive,
     nach `category`/`sort_order` sortiert) und rendert sie als Textblock.
   - `systemContent = GERÜST + FACTS_BLOCK + (guestContext ? …)`. Reihenfolge und
     das Anhängen von `INDIVIDUELLE GÄSTEDATEN` bleiben unverändert.
   - **Unverändert lassen** (CLAUDE.md-Regeln): `anthropic-beta`-Caching-Header,
     `cache_control: { type: 'ephemeral' }` auf dem System-Block,
     Anthropic→OpenAI-SSE-Konvertierung, `guestData`-Injektion.
   - **Cache-Hinweis:** Da Facts jetzt Teil des gecachten System-Blocks sind,
     ist der Prompt-Cache pro Property natürlich getrennt (unterschiedlicher
     Inhalt → eigener Cache-Key). Kein Konflikt, aber bewusst so.
4. **Fallback** (siehe Entscheidung): Lädt der Facts-Query nicht (Supabase down),
   fällt die Function auf ein minimales, generisches Gerüst zurück und der Bot
   bleibt antwortfähig — er sagt bei Unsicherheit „weiß ich nicht, frag den Host
   per WhatsApp", statt ganz auszufallen.
5. **Verifikation:** Für ACHZEIT identisches Verhalten wie vorher (Regressions-
   check gegen den alten Prompt). Für Felder's/Phils: Bot nennt **nicht** mehr
   ACHZEIT-Fakten. `npm run build` grün; SSE-Streaming im Frontend unverändert.

Definition of Done: Bot ist property-aware; ACHZEIT unverändert, andere
Properties nicht mehr mit ACHZEIT-Fakten verunreinigt.

## Offene Entscheidungen

1. **Chatbot-Sprache:** `SYSTEM_PROMPT` ist heute deutsch, der Bot übersetzt
   selbst (per `CLAUDE.md` beibehalten). Facts also nur auf `de` pflegen und den
   Bot übersetzen lassen — oder mehrsprachige Facts? Empfehlung: **`de`
   belassen**, Aufwand minimal halten.
2. **Property-Config-Migration:** `checkinTime`/`wifiName` etc. vorerst in
   `properties.ts` lassen (Phase 3+) oder gleich in `properties`-Tabelle? →
   Vorschlag: Code lassen, bis Admin-UI existiert.
3. ~~**Admin-Auth-Umfang**~~ — **entschieden:** zwei Rollen, `admin` (voller
   Zugriff über alle Brands) + `manager` (Brand-Scope). Siehe „Rollen &
   Zugriffsmodell". Manager-Onboarding (Einladung + `manager_brands`-Eintrag) ist
   eine Admin-Funktion in Phase 4.
4. **Fallback-Strategie:** Wenn Supabase nicht erreichbar ist — Gästemappe auf
   Code-Defaults zurückfallen oder Fehlerzustand? Für die Facts der Edge-Function
   relevant. Für Phase 1 als Fallback-Gerüst vorgeschlagen (s. o.); für die
   Gästemappe (Phase 3) noch zu entscheiden.

## Nicht-Ziele (bewusst ausgeklammert)

- Kein Wechsel des Frontend-Frameworks (bleibt Vite-SPA).
- Kein Ersetzen der Hostaway-Integration — Reservierungsdaten bleiben live aus
  Hostaway (`api/reservation.ts`).
- Kein Verschieben der Infrastruktur-/Routing-Config in die DB.
