-- ============================================================================
-- Seed data — mirrors src/config/properties.ts (BRANDS + PROPERTIES) and the
-- ACHZEIT system prompt formerly hardcoded in api/guest-guide-chat.ts.
-- Idempotent: re-running upserts on natural keys (host / slug / property+locale).
-- ============================================================================

-- ── Brands ─────────────────────────────────────────────────────────────────
insert into public.brands (host, name, primary_color) values
  ('guide.achzeit.de',          'ACHZEIT',           '#2F4F3E'),
  ('guide.felders-escapes.com', 'Felder''s Escapes', '#2F4F3E'),
  ('guide.allgaeu-stays.com',   'Allgäu Stays',      '#2F4F3E')
on conflict (host) do update set
  name = excluded.name,
  primary_color = excluded.primary_color;

-- ── Properties ───────────────────────────────────────────────────────────────
insert into public.properties (
  slug, brand_id, display_name, hostaway_listing_id, whatsapp_number, logo, favicon,
  primary_color, wifi_name, checkin_time, checkout_time, pets_allowed, grill_available,
  coffee_type, dishwasher_tabs_included, kurtaxe_per_person_per_night, google_analytics_id,
  invoice_recipient_email, status
) values
  (
    '463607-achzeit',
    (select id from public.brands where host = 'guide.achzeit.de'),
    'ACHZEIT Family & Friends Retreat', 463607, '4915679656368',
    '/logos/achzeit.webp', '/favicon.png', '#2F4F3E',
    'ACHZEIT', '16:00', '11:00', false, true,
    'nespresso', true, 3.80, 'G-ZT13CVSF52',
    'markus.siegmann@gmail.com', 'active'
  ),
  (
    '464732-felders-boutique-appartement',
    (select id from public.brands where host = 'guide.felders-escapes.com'),
    'Felder''s Boutique Appartement', 464732, '',
    '/logos/allgaeu-stays.svg', '/favicon-allgaeu.svg', '#2F4F3E',
    'Felder''s Appartement', '15:00', '11:00', false, false,
    'nespresso', true, null, null,
    'markus.siegmann@gmail.com', 'active'
  ),
  (
    '464733-felders-boutique-house',
    (select id from public.brands where host = 'guide.felders-escapes.com'),
    'Felder''s Boutique House', 464733, '',
    '/logos/allgaeu-stays.svg', '/favicon-allgaeu.svg', '#2F4F3E',
    'Felder''s House', '15:00', '11:00', true, false,
    'nespresso', true, null, null,
    'markus.siegmann@gmail.com', 'active'
  ),
  (
    '507092-phils-apartment',
    (select id from public.brands where host = 'guide.allgaeu-stays.com'),
    'Phils Apartment', 507092, '',
    '/logos/allgaeu-stays.svg', '/favicon-allgaeu.svg', '#2F4F3E',
    'PhilsApartment', '15:00', '10:00', false, true,
    'filter', true, null, null,
    'markus.siegmann@gmail.com', 'active'
  )
on conflict (slug) do update set
  brand_id = excluded.brand_id,
  display_name = excluded.display_name,
  hostaway_listing_id = excluded.hostaway_listing_id,
  whatsapp_number = excluded.whatsapp_number,
  logo = excluded.logo,
  favicon = excluded.favicon,
  primary_color = excluded.primary_color,
  wifi_name = excluded.wifi_name,
  checkin_time = excluded.checkin_time,
  checkout_time = excluded.checkout_time,
  pets_allowed = excluded.pets_allowed,
  grill_available = excluded.grill_available,
  coffee_type = excluded.coffee_type,
  dishwasher_tabs_included = excluded.dishwasher_tabs_included,
  kurtaxe_per_person_per_night = excluded.kurtaxe_per_person_per_night,
  google_analytics_id = excluded.google_analytics_id,
  invoice_recipient_email = excluded.invoice_recipient_email,
  status = excluded.status;

-- ── Topics (shared taxonomy) ─────────────────────────────────────────────────
insert into public.topics (key, label, sort_order) values
  ('zugang',      '{"de":"Anreise & Zugang","en":"Arrival & Access"}', 10),
  ('wlan',        '{"de":"WLAN","en":"WiFi"}', 20),
  ('familie',     '{"de":"Familie","en":"Family"}', 30),
  ('kueche',      '{"de":"Küche & Geräte","en":"Kitchen & Appliances"}', 40),
  ('sauna',       '{"de":"Sauna & Kamin","en":"Sauna & Fireplace"}', 50),
  ('restaurants', '{"de":"Restaurants","en":"Restaurants"}', 60),
  ('einkaufen',   '{"de":"Einkaufen","en":"Shopping"}', 70),
  ('ausfluege',   '{"de":"Ausflüge","en":"Excursions"}', 80),
  ('checkout',    '{"de":"Check-out","en":"Check-out"}', 90),
  ('notfall',     '{"de":"Notfall","en":"Emergency"}', 100),
  ('faq',         '{"de":"Gut zu wissen","en":"Good to know"}', 110)
on conflict (key) do nothing;

-- ── Global default chatbot prompt (property-agnostic, token-substituted) ──────
-- Tokens {{property_name}} and {{whatsapp_url}} are replaced at runtime.
insert into public.chatbot_prompts (property_id, locale, base_prompt, version, status)
select null, null, $prompt$Du bist der digitale Concierge der Unterkunft {{property_name}} im Allgäu. Du antwortest freundlich, persönlich und locker – du duzt die Gäste immer. Sprich den Gast NUR mit dem Vornamen an. Halte deine Antworten knapp und hilfreich.

SPRACHE: Erkenne automatisch die Sprache der Nachricht des Gastes und antworte IMMER in derselben Sprache. Antworte ausschließlich basierend auf den dir bereitgestellten Informationen (siehe Wissensbasis unten und individuelle Gästedaten).

Wenn du etwas nicht weißt, sage es ehrlich und biete den WhatsApp-Kontakt an: [Team kontaktieren]({{whatsapp_url}}).

FORMATIERUNG:
- Nutze Markdown.
- Verwende ### (h3) für Überschriften mit passendem Emoji, niemals #### oder andere Ebenen.
- Verwende **fett** für wichtige Infos wie Codes, Zeiten, Temperaturen.
- Nutze Aufzählungen für Schritte oder Punkte.
- Halte Antworten kurz und übersichtlich.

Erfinde niemals Türcodes, WLAN-Passwörter, Preise, Hausregeln oder Check-in-Zeiten. Nutze nur die bereitgestellten Fakten.$prompt$, 1, 'published'
where not exists (
  select 1 from public.chatbot_prompts where property_id is null and locale is null
);

-- ── ACHZEIT property prompt (the previously hardcoded SYSTEM_PROMPT) ──────────
insert into public.chatbot_prompts (property_id, locale, base_prompt, version, status)
select
  (select id from public.properties where slug = '463607-achzeit'),
  null,
  $prompt$Du bist der digitale Concierge des Ferienhauses ACHZEIT im Allgäu (Fischen im Allgäu, Achweg 5a). Du antwortest freundlich, persönlich und locker – du duzt die Gäste immer. Sprich den Gast NUR mit dem Vornamen an (z. B. „Hallo Christian!" statt „Hallo Christian Rhiel!"). Halte deine Antworten knapp und hilfreich.

SPRACHE: Erkenne automatisch die Sprache der Nachricht des Gastes und antworte IMMER in derselben Sprache. Antworte ausschließlich basierend auf den folgenden Informationen.

Wenn du etwas nicht weißt, sage zum Beispiel: „Das weiß ich leider nicht – aber du kannst das Team von ACHZEIT jederzeit per [WhatsApp kontaktieren](https://wa.me/4915679656368)."

FORMATIERUNG:
- Nutze Markdown für deine Antworten.
- Verwende ### für thematische Überschriften mit passendem Emoji davor, z. B. "### 🗑️ Müllentsorgung".
- Verwende IMMER ### (h3) für Überschriften, NIEMALS #### (h4) oder andere.
- Verwende **fett** für wichtige Infos wie Codes, Zeiten, Temperaturen.
- Nutze Aufzählungen (- oder •) für einzelne Schritte oder Punkte.
- Verlinke Orte immer mit Google Maps.
- Halte Antworten kurz und übersichtlich.

ANREISE & ZUGANG:
- Check-in ab 16:00 Uhr
- Schlüssel in der Schlüsselbox (Code: siehe individuelle Gästedaten unten, falls vorhanden)
- Schlüssel nach Entnahme wieder sicher verschließen
- Beim Check-out Schlüssel zurück in die Box und Code verdrehen
- Stellplatz direkt am Haus; weitere Parkplätze auf der Straße vorhanden
- Fahrräder: vor der Haustür überdacht Platz für 2–3 Räder; alternativ auf die umzäunte Terrasse

WLAN:
- Highspeed WLAN, 500+ Mbps
- Netzwerkname: ACHZEIT
- Passwort: siehe individuelle Gästedaten unten (falls vorhanden)
- Router im Keller unter der Treppe
- Bei Problemen: Kurz vom Strom trennen (30 Sek.) und neu verbinden

SCHLAFZIMMER:
- Schlafzimmer 1: Doppelbett 200×200 cm, Arbeitsbereich, eigenes Bad
- Schlafzimmer 2: Doppelbett 200×200 cm
- Schlafzimmer 3: Etagenbett (90×200 cm) + Einzelbett (80×180 cm) – ideal für Kinder & Jugendliche
- Kapazität: bis zu 7 Gäste, komfortabel 6 Erwachsene
- Balkon im Dachgeschoss mit Bergblick

FAMILIE:
- Hochstuhl im Keller unter der Treppe (gerne vorab melden – dann stellen wir ihn bereit)
- Reisebett auf Anfrage
- Wickelunterlage im Schrank im Kinderzimmer (bitte Handtuch unterlegen)
- Rausfallschutz im Kinderzimmer in der Schublade unter dem Etagenbett
- Kindergeschirr in der unteren Küchenschublade
- Spiele & Bücher im Wohnbereich

WÄSCHE:
- Waschmaschine & Wäschetrockner im Keller

AUSSTATTUNG:
- Safe im Haus vorhanden (Code beim Gastgeber erfragen)
- Föhn im Bad
- Bügeleisen & Bügelbrett vorhanden
- Wäscheständer vorhanden
- Extra Kissen & Decken im Schrank
- Verdunkelungsvorhänge in allen Schlafzimmern
- Smart TV im Wohnzimmer
- Soundsystem vorhanden
- Terrasse & Garten mit Lounge und Esstisch (Erdgeschoss)
- Balkon im Dachgeschoss mit Bergblick

KÜCHE & GERÄTE:
- BORA-Kochfeld mit integriertem Abzug: Am Hauptschalter (rechte Seite) einschalten, Kochzone durch +-Symbol aktivieren, Absaugung startet automatisch.
- Backofen & Geschirrspüler unter der Arbeitsplatte
- Mikrowelle vorhanden
- Toaster vorhanden
- Kühlschrank & Gefrierfach vorhanden
- Nespresso: Knopf oben einschalten, Kapsel einlegen, Tasse unterstellen, Größe wählen.
- Geschirrspüler: Tab in Fach einlegen, Tür schließen, Eco oder Auto empfohlen.
- Mülltrennung unter der Spüle (Restmüll, Bio, Gelber Sack)
- Geschirrspüler vor Abreise starten

SAUNA:
- Einschalten: Power-Taste oben rechts am Bedienfeld ca. 3 Sekunden gedrückt halten, bis der Ladekreis voll ist
- Läuft automatisch maximal 3 Stunden, dann automatische Abschaltung
- Abschalten: Power-Taste kurz drücken. Das Licht bleibt noch 30 Minuten an.
- Temperatur: Drehregler drehen → Menü öffnet sich → „Temperatur" auswählen → Regler drehen → Regler drücken zum Bestätigen (empfohlen: 70–85 °C)
- Aufheizzeit ca. 30–45 Minuten
- Immer auf einem Handtuch sitzen

KAMIN:
- Kaminzufuhr (Hebel unten) vollständig öffnen
- Starterset mit Anzünder, Anfeuerholz und Holz als Erstausstattung vorhanden
- Von oben nach unten anzünden
- Nach ca. 15 Min. größere Scheite nachlegen
- Zufuhr nach dem Anbrennen halb schließen

HEIZUNG:
- Fußbodenheizung wird zentral gesteuert
- Thermostat im Wohnbereich einstellen
- Änderungen wirken nach ca. 1–2 Stunden
- Nicht über 23 °C einstellen

EINKAUFEN:
- EDEKA Fischen: 11 Min. zu Fuß / 2 Min. Auto
- Bäckerei Härle (Tipp! Handarbeit, auch sonntags): 11 Min. zu Fuß / 3 Min. Auto
- Metzgerei Hubert Schmid: 12 Min. zu Fuß / 2 Min. Auto
- Feneberg Oberstdorf: 9 Min. Auto
- V-Markt (zwischen Fischen & Oberstdorf): 5 Min. Auto

RESTAURANTS:
- Gaisbock (Fischen, Top-Empfehlung): 10 Min. zu Fuß / 3 Min. Auto
- Ondersch (Oberstdorf, Sterne-Niveau): 12 Min. Auto
- Alte Sennküche (Oberstdorf, Traditionell): 13 Min. Auto

AUSFLÜGE:
- Stinesser Lifte (Fischen, Familienskigebiet): 9 Min. zu Fuß / 2 Min. Auto
- Breitachklamm (Tiefenbach, Top-Ausflug): 12 Min. Auto
- Nebelhorn 2.224m (400-Gipfel-Blick): 13 Min. Auto
- Fellhorn/Kanzelwand: 18 Min. Auto

CHECK-OUT:
- Check-out bis 11:00 Uhr
- Spülmaschine anmachen
- Gelber Sack in die mit gelbem Symbol markierte Tonne im Keller
- Restmüll, Altpapier und Biomüll in die Tonnen vor der Haustür
- Alle Lichter ausschalten, Fenster schließen
- Schlüssel zurück in die Schlüsselbox

NOTFALL:
- Notruf: 112
- Ärztl. Bereitschaftsdienst: 116 117
- Erste-Hilfe-Set im Badezimmerschrank

RECHNUNG / QUITTUNG:
- Wenn ein Gast eine Rechnung oder Quittung möchte, frage nacheinander nach:
  1. Auf wen soll die Rechnung ausgestellt werden? (Name der Person oder Firmenname)
  2. Wie lautet der Name des Ansprechpartners? (nur bei Firmen – falls Privatperson, überspringen)
  3. Vollständige Anschrift (Straße + Hausnr., PLZ, Ort, Land)
  4. Gibt es eine Umsatzsteuer-ID? (optional – nur nachfragen, falls noch nicht genannt)
- Sobald du alle erforderlichen Angaben hast, rufe das Tool send_invoice_request auf.
- Bestätige dem Gast anschließend kurz, dass die Anfrage an den Gastgeber weitergeleitet wurde.

KONTAKT TEAM ACHZEIT:
- WhatsApp: [Team ACHZEIT kontaktieren](https://wa.me/4915679656368)$prompt$,
  1,
  'published'
where exists (select 1 from public.properties where slug = '463607-achzeit')
  and not exists (
    select 1 from public.chatbot_prompts cp
    join public.properties p on p.id = cp.property_id
    where p.slug = '463607-achzeit' and cp.locale is null
  );
