# Projekt-Status & nächste Schritte

> Lebendes Memory-Dokument. Fasst zusammen, was gebaut ist, welche Entscheidungen
> gelten und was als Nächstes ansteht. Stand: Juli 2026 (Hero-Phase 2 live auf `master`).

## Getroffene Entscheidungen (gelten)

- **Kein Supabase** in v1. Content lebt **Git-basiert** im Repo (`content/properties/**`),
  Source of Truth ist Git; Pflege via Pull Request; Vercel-Preview als Vorschau.
- **Bestehender Stack bleibt:** React 18 + Vite (SPA) auf Vercel, Vercel Edge Functions
  (`api/`), Hostaway (Reservierungen), Anthropic Claude (Chatbot). Kein Framework-Wechsel.
- **Chatbot-Facts nur auf Deutsch** pflegen — der Bot übersetzt seine Antwort live in die
  Gastsprache.
- **Empfehlungen-Modell „schlank" (Option A):** Google-Maps-Link + optional Badge +
  optional deutscher Text. **Keine** manuell gepflegten Distanzen/Fahrzeiten, keine
  Website-Links. Badge ist ein **pflegbares, lokalisiertes Textfeld**. Saison-Ausblendung
  über `showUntil`-Datum am Ort.
- **Empfehlungen ebenfalls nur auf Deutsch pflegen**, Übersetzung in die 5 anderen
  Sprachen **später** (KI, über den vorhandenen `ANTHROPIC_API_KEY`). Bis dahin greift der
  Pro-Eintrag-Fallback auf Deutsch (PR #11).
- **Karten-Tippzustand** dezent (leichtes Abdunkeln + Schatten), kein Voll-Grün.
- **Admin schreibt nie direkt auf `master`** — alle Änderungen laufen über einen
  serverseitig erzeugten Pull Request.

## Was gebaut & live ist (auf `master`)

- **Content-Schicht:** `content/properties/<slug>/…`, Zod-Validierung
  (`src/content/schemas.ts`), Build-Time-Generator (`scripts/generate-content.ts` →
  `src/generated/content.ts` [server, inkl. Facts] + `src/generated/recommendations.ts`
  + `src/generated/hero.ts` [beide frontend-sicher, ohne Facts], alle gitignored).
  Details: `docs/content-architecture.md`.
- **Chatbot property-aware:** `api/guest-guide-chat.ts` lädt property-spezifische Facts;
  behebt den früheren „alle Properties teilen den ACHZEIT-Prompt"-Bug. Facts für alle 4
  Properties vorhanden (nur `facts.de.md`).
- **Admin `/admin`:** passwortgeschützt (HttpOnly-Session-Cookie, `ADMIN_PASSCODE` +
  `ADMIN_SESSION_SECRET`).
  - **Facts-Editor** live: bearbeiten → Pull Request (via `GITHUB_TOKEN`).
  - **Empfehlungen-Editor** live (deutsch-only): pro Property hinzufügen/bearbeiten/
    entfernen/sortieren (Name · Maps-Link · Kategorie · optional Ort/Unterzeile/Badge/
    `showUntil`/Text) → Pull Request schreibt `places.json` + `de.json` (PR #12).
  - **Header-Buttons** (PR #13): **Vorschau** öffnet die Live-Gästemappe der gewählten
    Property (`/:slug`); **Veröffentlichen** öffnet die offenen **Content-PRs genau dieser
    Property** (GitHub-Suche `head:content/<slug>`, blendet Feature-PRs aus). Beide
    deaktiviert, solange keine Property gewählt ist.
  - **Tab-Struktur** (Phase 2): Admin gegliedert in **Fakten · Gästemappe · Empfehlungen**.
  - **Hero-Editor** (Phase 2) live unter *Gästemappe*: Claim/Eyebrow + Begrüßungstext
    (+ optional Subline/Concierge-Hinweis) **pro Property & Sprache** → Pull Request
    (`kind: 'hero'` → `content/<slug>/hero/<locale>.json`).
- **Hero nicht mehr hartkodiert** (Phase 2): `content/properties/463607-achzeit/hero/*.json`
  (alle 6 Sprachen, aus `translations.ts` übernommen). Frontend liest über das
  facts-freie `src/generated/hero.ts` (`getHero(slug, locale)`, Fallback Locale → de → en);
  `GuestGuideHero` fällt auf `translations.ts` zurück, wenn eine Property (noch) keinen
  Hero-Content hat. `"EURE ACHZEIT BEGINNT HIER."` + Begrüßungstext sind damit pflegbar.
- **Empfehlungen migriert:** Restaurants, Einkaufen, Ausflüge kommen aus der Content-Schicht
  (schlankes Modell, alle 6 Sprachen erhalten, pflegbare Badges, `showUntil`). Pro-Eintrag-
  Fallback auf Deutsch (PR #11). **E-Ladesäulen** optisch aufs Maps-Link-Modell umgestellt
  (PR #13, noch hartkodiert — Daten nicht migriert).

## Offener PR

- Keiner. Die Hero-Phase 2 (Tab-Struktur, Hero-Editor, `hero/*.json`, Frontend liest
  aus der Content-Schicht) wurde **direkt auf `master` gepusht** (Commit `4d1d599`, kein
  PR — die GitHub-PR-Integration war in der Session getrennt). Davor zuletzt gemergt: **#13**.

## Rest-Roadmap aus dem großen Admin-Auftrag (Zielbild)

> Der ursprüngliche Auftrag (git-basierte Knowledge Base + Admin-Webapp + KI-generierte
> Gästemappentexte + Recommendations) ist ein **Mehr-Phasen-Vorhaben**. Erledigt sind bisher
> die Content-Schicht, der property-aware Chatbot, der Facts-Editor, der Empfehlungs-Editor
> und (neu) die **Hero-Pflege + Tab-Struktur**. **Noch NICHT gebaut** — nach Priorität:

1. **KI „Text aus Fakten erstellen"** (Kern des Zielbilds): Im Admin pro Gästemappen-Sektion
   ein Button, der aus den ausgewählten Facts + Brand-Ton einen **Textvorschlag** via
   Anthropic erzeugt (server-seitig, `ANTHROPIC_API_KEY`). Vorschau → *Übernehmen /
   Neu generieren / Abbrechen*. **Nie** ungefragt bestehende Texte überschreiben, **nie**
   Hostaway-Werte erfinden, **nie** live beim Gästezugriff generieren (nur Redaktionshilfe im Admin).
2. **Strukturierte Fakten-Tabelle** (ersetzt die heutige `chatbot/facts.de.md`-Freitext-Pflege):
   Facts als Einträge mit `name`, `category`, `description`, `source` (manual|hostaway),
   `hostawayField`, `active`, `chatbotEnabled`. Defaults aus Kategorien ableiten (siehe Auftrag
   §5.6). Chatbot rendert die Facts-Tabelle → Markdown-Kontext (eine Source of Truth). Migration
   der bestehenden `facts.de.md` in dieses Modell.
3. **Gästemappen-Sektionen editierbar** (`guide/*.json`): feste Standard-Sektionen (WLAN, Zugang,
   Check-in/out, Parken, Kontakt, Müll & Abreise) einführen, bestehende Sektionen aus
   `translations.ts` / `GuestGuideContent.tsx` migrieren, Fact-Referenzen je Sektion, KI-Button,
   dynamische Hostaway-Platzhalter (`{{wifiName}}`, `{{accessPin}}` …, nur bei gültiger Session).
   Heute sind `guide/*.json` erst **read-only** im Admin; die Gästemappe rendert noch aus
   `translations.ts`/`GuestGuideContent.tsx`.
4. **Sektions-Vorschläge** aus Ausstattung/Facts (Sauna→„Sauna", Kamin→„Kamin", …) mit Status
   `suggested / accepted / dismissed` (ignorierte tauchen nicht erneut auf).
5. **Veraltungserkennung**: Sektion als „Möglicherweise veraltet" markieren, wenn ein genutzter
   Fact nach der letzten Generierung geändert wurde (einfach: `usedFactIds` + `updatedAt`/Hash).
6. **KI-Übersetzung beim Speichern**: deutscher Text/Badge/Hero → 5 Sprachen via Anthropic, in
   denselben PR geschrieben, `translationStatus: machine_translated`. Bis dahin Deutsch-Fallback.
7. **Guide-Blöcke restlich migrieren**: **Parken** (noch hartkodiert in `GuestGuideContent.tsx`,
   nutzt Distanzen); E-Ladesäulen-**Daten** (optisch schon umgestellt, Daten noch im Component).
8. **Cleanup**: veraltete `supabase/functions/` entfernen; `allShopsNote`/`allExcursionsNote`
   (erwähnen noch Distanzen) überdenken.
9. **Kleinkram**: WhatsApp-Nummern für Felder's House/Appartement & Phils Apartment in
   `src/config/properties.ts` (aktuell leer) — sonst fällt der Chatbot-Kontakt generisch aus.

Feste Architektur-Leitplanken für alle Phasen (aus dem Auftrag, verbindlich): kein Supabase,
Git = Source of Truth, Änderungen nur via PR (Admin nie direkt auf `master`), Vercel-Preview
vor Merge, Hostaway bleibt Source of Truth für dynamische Gastdaten (nie im Repo, nie in
cachebaren Prompt-Blöcken, nie geloggt), interne Facts nie an Gast/Chatbot, `/api` bleibt
Edge (kein `fs`/Node-Builtins → Content nur über den Build-Time-Generator).

## Environment-Variablen (nur serverseitig, Vercel)

| Variable | Zweck | Scopes |
|---|---|---|
| `ADMIN_PASSCODE` | Admin-Login | Production + Preview |
| `ADMIN_SESSION_SECRET` | Session-Cookie-Signatur | Production + Preview |
| `GITHUB_TOKEN` | Fine-grained PAT (Contents + Pull requests, write) für Admin-PRs | Production + Preview |
| `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BASE_BRANCH` | optional (Defaults `ms-79` / `guest-guide` / `master`) | – |
| `HOSTAWAY_CLIENT_ID` / `HOSTAWAY_API_TOKEN` / `HOSTAWAY_BASE_URL` | Reservierungen | Production (+ Preview, damit PIN-Login auf Previews geht) |
| `ANTHROPIC_API_KEY` | Chatbot (später auch KI-Übersetzung) | Production + Preview |
| `RESEND_API_KEY` | E-Mails (Rechnungs-Flow, Chat-Log) | Production + Preview |

## Arbeitsweise / Konventionen

- Content-Pflege: Datei in `content/properties/**` ändern → `npm run validate-content` →
  Commit/PR → Vercel deployt → nach Merge live.
- Feature-Branch: pro Aufgabe ein eigener `claude/…`-Branch, nach jedem Merge frisch von
  `master` neu aufsetzen. Für Folge-Arbeit, die nur bereits gemergte Historie überschreibt,
  ist force-with-lease erlaubt.
- Jede Property hat einen eigenen Ordner; nur Content wandert in die DB-freie Content-Schicht,
  Infrastruktur-Config bleibt in `src/config/properties.ts`.
- Beschreibungen/Badges bei Migrationen **nie abtippen** — per Skript aus `translations.ts`
  ziehen (Übertragungsfehler vermeiden).
- **Build/Check vor Commit:** `npm run generate-content` (schreibt die `src/generated/*`) und
  `npm run build` müssen grün sein; `npm run validate-content` prüft nur.

## Hinweis für eine NEUE Session (Onboarding)

- **Kontext-Einstieg:** `CLAUDE.md` → dieses Dokument → `docs/content-architecture.md`. Damit
  ist der komplette Stand + die Rest-Roadmap abgedeckt.
- **GitHub-Tools (`mcp__github__*`):** funktionieren nur, wenn die GitHub-Integration verbunden
  ist **und** die Session frisch gestartet wurde (ein mitten in der Session neu verbundener
  Connector wird nicht rückwirkend aktiv). Für PR-basierte Arbeit also: Connector verbinden →
  neue Session → Feature-Branch → `create_pull_request`.
- **Git-Fallback:** Commit/Push nach `master` geht auch ohne GitHub-MCP über normales `git`
  (die Umgebung hat Push-Rechte). „Live" = Merge/Push nach `master` → Vercel deployt automatisch.
- Damit eine neue Session „alle Infos" hat, muss dieses Dokument auf `master` liegen (ein offener
  PR wäre für eine kalt gestartete Session unsichtbar).
