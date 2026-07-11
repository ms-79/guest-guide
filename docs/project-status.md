# Projekt-Status & nächste Schritte

> Lebendes Memory-Dokument. Fasst zusammen, was gebaut ist, welche Entscheidungen
> gelten und was als Nächstes ansteht. Stand: Juli 2026.

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
  `src/generated/content.ts` + `src/generated/recommendations.ts`, beide gitignored).
  Details: `docs/content-architecture.md`.
- **Chatbot property-aware:** `api/guest-guide-chat.ts` lädt property-spezifische Facts;
  behebt den früheren „alle Properties teilen den ACHZEIT-Prompt"-Bug. Facts für alle 4
  Properties vorhanden (nur `facts.de.md`).
- **Admin `/admin`:** passwortgeschützt (HttpOnly-Session-Cookie, `ADMIN_PASSCODE` +
  `ADMIN_SESSION_SECRET`). **Facts-Editor** live: bearbeiten → Pull Request (via
  `GITHUB_TOKEN`). Read-only-Ansicht für Guide-Sektionen & Empfehlungen.
- **Empfehlungen migriert:** Restaurants, Einkaufen, Ausflüge kommen aus der Content-Schicht
  (schlankes Modell, alle 6 Sprachen erhalten, pflegbare Badges, `showUntil`).

## Offener PR

- **#11** — Pro-Eintrag-Fallback auf Deutsch (Grundlage für „nur Deutsch pflegen"). Klein,
  ohne sichtbaren Effekt bis deutsch-only-Content existiert. → mergen.

## Nächste Schritte (priorisiert)

1. **Empfehlungen-Editor im `/admin` (deutsch-only)** — der eigentliche „Punkt 2":
   - Formular pro Property: Empfehlungen hinzufügen/bearbeiten/entfernen/sortieren mit
     Feldern **Name · Maps-Link · Kategorie · Badge (optional) · deutscher Text (optional) ·
     `showUntil` (optional)**.
   - **Speichern → Pull Request.** Server schreibt `places.json` + `de.json`.
   - Bausteine: (a) GitHub-Helper `src/server/github.ts` auf **mehrere Dateien pro PR**
     erweitern; (b) PR-Route `api/admin/content/pr.ts` um `kind: 'recommendations'`
     (Zod-validiert); (c) Editor-Formular in `src/pages/Admin.tsx`.
2. **KI-Übersetzung beim Speichern** (später): deutscher Text/Badge → 5 Sprachen via
   Anthropic, in denselben PR geschrieben, markiert als `machine_translated`.
3. **Restliche Guide-Blöcke** ins schlanke Modell ziehen: **E-Ladesäulen** und **Parken**
   (noch hartkodiert in `GuestGuideContent.tsx`, nutzen noch Distanzen/`WalkingIcon`/
   `CarIcon`).
4. **Gästemappen-Sektionen** (Zugang, WLAN, Küche, Sauna …) aus `translations.ts` /
   `GuestGuideContent.tsx` in `guide/*.json` lösen (größerer Umbau; UI-Strings bleiben in
   `translations.ts`).
5. **Cleanup:** veraltete `supabase/functions/` entfernen; ggf. `allShopsNote`/
   `allExcursionsNote` (erwähnen noch Distanzen) überdenken.
6. **Kleinkram:** WhatsApp-Nummern für Felder's House/Appartement & Phils Apartment in
   `src/config/properties.ts` (aktuell leer) — Chatbot-Kontakt fällt sonst generisch aus.

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
- Feature-Branch: `claude/multi-property-guest-guide-status-5d16y7`; nach jedem Merge frisch
  von `master` neu aufsetzen (Folge-PRs, force-with-lease erlaubt, da nur bereits gemergte
  Historie überschrieben wird).
- Jede Property hat einen eigenen Ordner; nur Content wandert in die DB-freie Content-Schicht,
  Infrastruktur-Config bleibt in `src/config/properties.ts`.
- Beschreibungen/Badges bei Migrationen **nie abtippen** — per Skript aus `translations.ts`
  ziehen (Übertragungsfehler vermeiden).
