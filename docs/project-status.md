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
  `ADMIN_SESSION_SECRET`).
  - **Facts-Editor** live: bearbeiten → Pull Request (via `GITHUB_TOKEN`).
  - **Empfehlungen-Editor** live (deutsch-only): pro Property hinzufügen/bearbeiten/
    entfernen/sortieren (Name · Maps-Link · Kategorie · optional Ort/Unterzeile/Badge/
    `showUntil`/Text) → Pull Request schreibt `places.json` + `de.json` (PR #12).
  - **Header-Buttons** (PR #13): **Vorschau** öffnet die Live-Gästemappe der gewählten
    Property (`/:slug`); **Veröffentlichen** öffnet die offenen **Content-PRs genau dieser
    Property** (GitHub-Suche `head:content/<slug>`, blendet Feature-PRs aus). Beide
    deaktiviert, solange keine Property gewählt ist.
- **Empfehlungen migriert:** Restaurants, Einkaufen, Ausflüge kommen aus der Content-Schicht
  (schlankes Modell, alle 6 Sprachen erhalten, pflegbare Badges, `showUntil`). Pro-Eintrag-
  Fallback auf Deutsch (PR #11). **E-Ladesäulen** optisch aufs Maps-Link-Modell umgestellt
  (PR #13, noch hartkodiert — Daten nicht migriert).

## Offener PR

- Keiner. Letzter Merge: **#13** (Admin-Header-Buttons + E-Ladesäulen-Restyle).

## Nächste Schritte (priorisiert)

1. **KI-Übersetzung beim Speichern** (der eigentliche nächste große Schritt): deutscher
   Text/Badge → 5 Sprachen via Anthropic, in denselben PR geschrieben, markiert als
   `machine_translated`. Bis dahin greift der Pro-Eintrag-Fallback auf Deutsch.
2. **Restliche Guide-Blöcke** ins schlanke Modell ziehen: **Parken** (noch hartkodiert in
   `GuestGuideContent.tsx`, nutzt noch Distanzen). Die E-Ladesäulen sind optisch schon
   umgestellt, aber die **Daten** liegen noch hartkodiert im Component — bei Bedarf in die
   Content-Schicht ziehen.
3. **Gästemappen-Sektionen** (Zugang, WLAN, Küche, Sauna …) aus `translations.ts` /
   `GuestGuideContent.tsx` in `guide/*.json` lösen (größerer Umbau; UI-Strings bleiben in
   `translations.ts`).
4. **Cleanup:** veraltete `supabase/functions/` entfernen; ggf. `allShopsNote`/
   `allExcursionsNote` (erwähnen noch Distanzen) überdenken.
5. **Kleinkram:** WhatsApp-Nummern für Felder's House/Appartement & Phils Apartment in
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
