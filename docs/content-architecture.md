# Content-Architektur (Git-backed) — Phase 1

Diese Doku beschreibt die repo-basierte Content-Schicht des Digital Guest Guide,
die in **Phase 1** eingeführt wurde. Sie ist die praktische Anleitung für alle,
die Property-Inhalte pflegen oder erweitern.

## Warum Git-backed Content statt Supabase

Für den aktuellen Umfang (wenige Properties, ein bis wenige Pfleger) ist eine
eigene Content-Datenbank **nicht durch Datenmenge** gerechtfertigt, sondern nur
durch die Anforderung „nicht-technische Manager pflegen selbst". Diese
Admin-Funktion kommt später. Bis dahin gilt:

- **Git/Repo = Source of Truth für Content.** Versioniert, review-bar (Pull
  Request), ohne zusätzlichen Datenbank-Betrieb und ohne neue Angriffsfläche.
- Kein Supabase, keine Supabase-Auth, keine RLS, kein MDX, keine Admin-Webapp in
  v1. Diese sind bewusste Nicht-Ziele von Phase 1.

Langfristiges Zielbild: eine Admin-Webapp wird ein **strukturierter Editor** für
genau diese Dateien und legt Änderungen als **GitHub Pull Request** an
(Vercel-Preview als Vorschau, Merge = live). Der Content bleibt im Repo.

## Warum Phase 1 noch keine Admin-Webapp baut

Phase 1 liefert einen echten, lauffähigen Release mit dem wichtigsten Bugfix
(property-aware Chatbot) und der **Grundstruktur** für Content: Ordnerlayout,
Schemas, Validierung, Build-Integration. Ohne diese Grundlage hätte eine
Admin-Webapp nichts, worauf sie schreiben könnte. Die Webapp folgt in
Phase 2 (read-only) und Phase 3 (write via PR).

## Ordnerstruktur

```
content/
  properties/
    463607-achzeit/
      guide/
        de.json            # Gästemappen-Sektionen (vorbereitet)
        en.json
      chatbot/
        facts.de.md        # Chatbot-Facts (Phase-1-Kern)
        facts.en.md
      recommendations/
        places.json        # stabile Basisdaten (id, Kategorie, Maps, Distanz)
        de.json            # deutsche Beschreibung/Tipp je place
        en.json
  evals/
    chatbot-reference-questions.de.json
```

Jede Property hat **einen eigenen Ordner** (Ordnername = Property-Slug aus
`src/config/properties.ts`). Property-spezifische Inhalte werden nicht in
globalen Dateien vermischt.

## Content-Typen & Sichtbarkeiten

### A. Guide Sections (`guide/*.json`)
Strukturierte Gästemappen-Sektionen. In Phase 1 **vorbereitet**, aber noch nicht
in der Gästemappen-UI genutzt (die UI läuft weiter über `translations.ts` /
`GuestGuideContent.tsx`). Felder: `key`, `title`, `bodyMd` (Markdown), `phase`,
`visibility`, `sortOrder`, `translationStatus`.

### B. Chatbot Facts (`chatbot/facts.<locale>.md`)
**Der Kern von Phase 1.** Freies Markdown mit property- und sprach-spezifischen
Fakten in thematischen Blöcken (nicht überatomisiert). Werden serverseitig in den
Chatbot-Prompt geladen. Enthalten **keine** sensiblen Daten.

### C. Recommendations (`recommendations/`)
Normalisiert: `places.json` hält stabile Basisdaten (id, Kategorie, Name,
Maps-Link, Distanz, Sichtbarkeit); `de.json`/`en.json` halten die
sprach-spezifische Beschreibung/Tipp je `placeId`. In Phase 1 vorbereitet.

### Sichtbarkeiten
| Wert | Bedeutung |
|---|---|
| `public` | Darf jeder sehen; im Zweifel auch ohne Gast-Auth auslieferbar. |
| `guest` | Nur mit gültiger Guest-Session (Magic Link / PIN / Token). **Default.** |
| `internal` | Nur Admin. Nie an Gäste, nie an den Chatbot. Wird nicht exportiert. |

Der Generator entfernt `internal`-Inhalte aus der generierten Datei, sodass sie
gar nicht erst in ein Client- oder Chatbot-Bundle gelangen können.

## Build-Time Content Generation

Die `/api`-Routen laufen als **Vercel Edge Functions** — dort sind Node-Builtins
(`fs`, `path`) nicht verfügbar. Deshalb wird Content **zur Build-Zeit** validiert
und in ein importierbares Modul geschrieben:

```
content/properties/**  ──[ scripts/generate-content.ts (Node, Zod) ]──▶  src/generated/content.ts
```

- `src/generated/content.ts` ist **generiert** — nicht manuell editieren
  (steht in `.gitignore`, wird bei jedem Build neu erzeugt).
- `/api` importiert **nur** dieses generierte Modul, nie das Dateisystem.
- Der Build **schlägt fehl**, wenn Content ungültig ist.

npm-Scripts:

| Script | Zweck |
|---|---|
| `npm run generate-content` | Validiert + schreibt `src/generated/content.ts`. |
| `npm run validate-content` | Nur validieren (`--check`), schreibt nichts. |
| `prebuild` / `predev` | Führt `generate-content` automatisch vor Build/Dev aus. |

## Validierung

`scripts/generate-content.ts` prüft mit den Zod-Schemas aus
`src/content/schemas.ts` u. a.:

- Property-Slug existiert in `src/config/properties.ts`.
- Locale ist erlaubt (`de|en|es|it|fr|nl`); Datei-Locale = Feld-Locale.
- `key` eindeutig innerhalb Property + Locale.
- `visibility`, `phase`, `sortOrder`, Titel/Body nicht leer.
- Recommendation-`placeId` referenziert einen existierenden Place.
- Chatbot-Facts enthalten keine offensichtlich verbotenen Begriffe (Türcode,
  Door Code, PIN, Zahlungsstatus, Payment Status, Gastdaten, IBAN, Kreditkarte).
  **Nur ein zusätzlicher Guard — ersetzt keine manuelle Prüfung.**

## Sicherheitsregeln (harte Invarianten)

1. Keine Gastdaten im Content-Repo.
2. Keine Türcodes im Content-Repo.
3. Keine Zahlungsdaten im Content-Repo.
4. Keine privaten Telefonnummern / internen Eskalationswege im guest/chatbot-Content.
5. `internal`-Content wird nie an Gäste oder Chatbot ausgeliefert.
6. Hostaway bleibt Source of Truth für Reservierungsdaten (Türcode, WLAN-Passwort
   kommen zur Laufzeit aus Hostaway, nicht aus dem Content).
7. Der Chatbot bekommt nur minimalen Guest Context.
8. Guest Context liegt **nicht** im gecachten Prompt-Block.

## So pflegst du Content nach Phase 1

Es gibt noch keine Admin-Webapp. Pflege erfolgt direkt im Repo:

1. Datei ändern, z. B. `content/properties/463607-achzeit/chatbot/facts.de.md`.
2. `npm run validate-content` lokal ausführen (optional, aber empfohlen).
3. Commit / Pull Request.
4. Vercel deployt; nach Merge nutzt der Chatbot die neuen Facts.

### Neue Property-Facts ergänzen
1. Sicherstellen, dass die Property in `src/config/properties.ts` existiert
   (Slug!).
2. Ordner anlegen: `content/properties/<slug>/chatbot/facts.de.md` (und
   `facts.en.md`).
3. Fakten in thematischen Markdown-Blöcken schreiben — keine sensiblen Daten.
4. `npm run validate-content`, dann committen. Der Chatbot ist damit für diese
   Property property-aware.

### Neue Sprache ergänzen
- Chatbot: `facts.<locale>.md` im `chatbot/`-Ordner anlegen. Fehlt eine Sprache,
  fällt der Chatbot automatisch auf `de` bzw. `en` zurück.
- Guide/Recommendations: `<locale>.json` mit passendem `locale`-Feld anlegen.
- `de` = Source of Truth, `en` = Pflicht, `es/it/fr/nl` = optional. Der
  `translationStatus` (source | machine_translated | reviewed | stale | missing)
  dokumentiert den Stand; automatisches Stale-Markieren ist noch nicht gebaut.

### Content validieren
```
npm run validate-content
```

## Chatbot: wie er jetzt property-aware ist

`api/guest-guide-chat.ts` baut den System-Prompt aus Blöcken:

- **Block A — globales Gerüst** (`GLOBAL_SCAFFOLD`): Rolle, Ton, Sicherheit
  (nicht halluzinieren), Formatierung, Rechnungs-Flow. Property-unabhängig.
- **Block B — Property Context**: Facts aus
  `content/properties/<slug>/chatbot/facts.<locale>.md` (Fallback `de` → `en`).
- **Block C — Guest Context**: minimale Reservierungsdaten (Name, WLAN-Passwort,
  Box-Code) aus Hostaway. **Separater, nicht gecachter** System-Block.
- **Block D — User-Frage**.

Der Property-Slug kommt vom Frontend (`context.propertySlug`). Blöcke A+B sind
cachebar (`cache_control: ephemeral`), Block C bewusst nicht.

**Fallback:** Fehlen Facts für die Property, erfindet der Bot keine
hausspezifischen Details, sondern verweist freundlich auf den Kontakt/WhatsApp.

## Chatbot-Eval

`content/evals/chatbot-reference-questions.de.json` enthält ~25 Referenzfragen.
Vor und nach einer Änderung an den Facts jede Frage im Chatbot stellen und die
Antworten manuell vergleichen (bleiben Fakten korrekt, property-spezifisch, ohne
Halluzination?). Ein automatischer Test kann später darauf aufbauen.

## Admin-Bereich (`/admin`)

Unter `/admin` gibt es einen **passwortgeschützten** Content-Admin. Chatbot-Facts
lassen sich **bearbeiten** (Phase 3 — Speichern öffnet einen Pull Request);
Gästemappen-Sektionen und Empfehlungen sind vorerst **read-only**.

**Ablauf:** `/admin` → Login mit Zugangscode → Property auswählen → Content
ansehen → Facts bearbeiten → „Als Pull Request speichern" → PR prüfen/mergen.

**Auth (Edge-safe, ohne Datenbank):**
- Login `POST /api/admin/login` prüft den Zugangscode konstant-zeitig und setzt
  ein **HttpOnly**-Session-Cookie (`SameSite=Strict`, `Secure` außer auf
  localhost), das mit HMAC-SHA256 (Web Crypto) signiert ist und nach 12 h
  abläuft. Zugangscode und Secret werden nie geloggt.
- `POST /api/admin/logout` löscht das Cookie.
- `GET /api/admin/content` (Property-Liste) und
  `GET /api/admin/content?propertySlug=…` (Content-Bundle) liefern **nur mit
  gültiger Session** Daten, sonst `401`. Der Content stammt aus dem generierten
  Modul (kein Dateisystemzugriff, `internal`-Inhalte bereits entfernt).
- Ein einfacher In-Memory-Limiter bremst Brute-Force auf den Zugangscode.

### Bearbeiten via Pull Request (Phase 3)

- `POST /api/admin/content/pr` (session-geschützt) schreibt **nie** direkt in den
  Base-Branch. Ablauf serverseitig: neuen Branch vom Base-Branch anlegen →
  geänderte Datei schreiben → Pull Request gegen den Base-Branch öffnen →
  PR-URL zurückgeben. Danach: Vercel-Preview prüfen → mergen = live.
- Unterstützt aktuell `kind: 'facts'` — die Chatbot-Facts-Markdown pro Sprache.
  Der Dateipfad wird **serverseitig** aus `propertySlug` + `locale` gebaut (kein
  Path-Traversal); Slug/Locale werden validiert und der Facts-Guard läuft erneut
  (keine sensiblen Begriffe).
- Das **GitHub-Token bleibt serverseitig** und wird nie ans Frontend gegeben.
  Branch-Name z. B. `content/463607-achzeit-20260711-facts-de`, PR-Titel z. B.
  „Update chatbot facts (de) for ACHZEIT Family & Friends Retreat".

**Benötigte Environment-Variablen (nur serverseitig):**

| Variable | Zweck |
|---|---|
| `ADMIN_PASSCODE` | Zugangscode für den Admin-Login. |
| `ADMIN_SESSION_SECRET` | Zufälliges Secret zum Signieren des Session-Cookies. |
| `GITHUB_TOKEN` | Token mit Schreibrechten (Contents + Pull Requests) auf dem Repo — für die PR-Erstellung. |
| `GITHUB_OWNER` | Repo-Owner (Default `ms-79`). |
| `GITHUB_REPO` | Repo-Name (Default `guest-guide`). |
| `GITHUB_BASE_BRANCH` | Ziel-Branch der PRs (Default `master`). |

Ohne `ADMIN_*` antwortet der Login mit „nicht konfiguriert"; ohne `GITHUB_TOKEN`
schlägt nur das Speichern per PR fehl (Lesen/Anmelden geht weiter). Alle gehören
in die Vercel-Projekt-Env, niemals ins Frontend-Bundle oder ins Repo.

## Für später vorbereitet (nicht Teil von Phase 1)

- `GET /api/guide-content?propertySlug=…&locale=…`: liefert später nur `public`
  und autorisierte `guest`-Inhalte, nie `internal`, mit Locale-Fallback. Die
  Gästemappe soll langfristig hierüber Content beziehen statt aus
  `translations.ts` / `GuestGuideContent.tsx`. In Phase 1 bleibt die Gästemappe
  unverändert; UI-Strings bleiben in `translations.ts`.
