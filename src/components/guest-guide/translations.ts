export type GuestGuideLocale = 'de' | 'en' | 'es' | 'it' | 'fr' | 'nl';

export const LOCALE_LABELS: Record<GuestGuideLocale, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  fr: 'Français',
  nl: 'Nederlands',
};

export const LOCALE_FLAGS: Record<GuestGuideLocale, string> = {
  de: '🇩🇪',
  en: '🇬🇧',
  es: '🇪🇸',
  it: '🇮🇹',
  fr: '🇫🇷',
  nl: '🇳🇱',
};

// Map Hostaway language codes to our locales
export function mapHostawayLanguage(lang?: string): GuestGuideLocale {
  if (!lang) return 'de';
  const l = lang.toLowerCase().slice(0, 2);
  if (l === 'en') return 'en';
  if (l === 'es') return 'es';
  if (l === 'it') return 'it';
  if (l === 'fr') return 'fr';
  if (l === 'nl') return 'nl';
  if (l === 'de') return 'de';
  return 'de';
}

type T = Record<GuestGuideLocale, string>;

function t(de: string, en: string, es: string, it: string, fr: string, nl: string): T {
  return { de, en, es, it, fr, nl };
}

export const translations = {
  // Hero
  welcome: t('Willkommen', 'Welcome', 'Bienvenido/a', 'Benvenuto/a', 'Bienvenue', 'Welkom'),
  heroSubtitle: t(
    'Deine ACHZEIT in Fischen beginnt jetzt.',
    'Your ACHZEIT in Fischen starts now.',
    'Tu ACHZEIT en Fischen comienza ahora.',
    'Il tuo ACHZEIT a Fischen inizia ora.',
    'Ton ACHZEIT à Fischen commence maintenant.',
    'Je ACHZEIT in Fischen begint nu.',
  ),
  heroIntro: t(
    'Schön, dass ihr da seid. Hier findet ihr alle wichtigen Informationen für einen entspannten Aufenthalt im ACHZEIT Family & Friends Retreat.',
    'Great to have you here. You\'ll find all the important information for a relaxing stay at ACHZEIT Family & Friends Retreat.',
    'Qué bueno teneros aquí. Aquí encontraréis toda la información importante para una estancia relajante en ACHZEIT Family & Friends Retreat.',
    'Che bello avervi qui. Qui troverete tutte le informazioni importanti per un soggiorno rilassante all\'ACHZEIT Family & Friends Retreat.',
    'Ravi de vous avoir ici. Vous trouverez toutes les informations importantes pour un séjour relaxant à l\'ACHZEIT Family & Friends Retreat.',
    'Fijn dat jullie er zijn. Hier vinden jullie alle belangrijke informatie voor een ontspannen verblijf in ACHZEIT Family & Friends Retreat.',
  ),
  stay: t('Aufenthalt', 'Stay', 'Estancia', 'Soggiorno', 'Séjour', 'Verblijf'),
  whatsappCta: t(
    'Fragen? Schreibt uns per WhatsApp',
    'Questions? Message us on WhatsApp',
    '¿Preguntas? Escríbenos por WhatsApp',
    'Domande? Scrivici su WhatsApp',
    'Des questions ? Écrivez-nous sur WhatsApp',
    'Vragen? Stuur ons een WhatsApp',
  ),
  heroConciergeHint: t(
    'Habt ihr Fragen? Unser digitaler Concierge hilft euch sofort weiter.',
    'Any questions? Our digital concierge can help you right away.',
    '¿Tenéis preguntas? Nuestro conserje digital os ayuda de inmediato.',
    'Avete domande? Il nostro concierge digitale vi aiuta subito.',
    'Des questions ? Notre concierge numérique vous aide immédiatement.',
    'Hebben jullie vragen? Onze digitale conciërge helpt jullie meteen.',
  ),
  heroTagline: t(
    'Eure ACHZEIT beginnt hier.',
    'Your ACHZEIT starts here.',
    'Vuestro ACHZEIT comienza aquí.',
    'Il vostro ACHZEIT inizia qui.',
    'Votre ACHZEIT commence ici.',
    'Jullie ACHZEIT begint hier.',
  ),
  footerWhatsapp: t(
    'Persönliche Unterstützung? WhatsApp ist natürlich möglich.',
    'Personal support? WhatsApp is always an option.',
    '¿Asistencia personal? WhatsApp siempre es una opción.',
    'Assistenza personale? WhatsApp è sempre un\'opzione.',
    'Assistance personnelle ? WhatsApp est toujours possible.',
    'Persoonlijke ondersteuning? WhatsApp is altijd mogelijk.',
  ),
  conciergeGreeting: t(
    '👋 Willkommen im ACHZEIT.\nIch bin euer digitaler Concierge.\nIch helfe bei Fragen zu WLAN, Sauna, Check-out oder Ausflügen.',
    '👋 Welcome to ACHZEIT.\nI\'m your digital concierge.\nI can help with WiFi, sauna, check-out or excursions.',
    '👋 Bienvenido/a a ACHZEIT.\nSoy vuestro conserje digital.\nOs ayudo con WiFi, sauna, check-out o excursiones.',
    '👋 Benvenuto/a all\'ACHZEIT.\nSono il vostro concierge digitale.\nVi aiuto con WiFi, sauna, check-out o escursioni.',
    '👋 Bienvenue à l\'ACHZEIT.\nJe suis votre concierge numérique.\nJe vous aide pour le WiFi, le sauna, le check-out ou les excursions.',
    '👋 Welkom bij ACHZEIT.\nIk ben jullie digitale conciërge.\nIk help met WiFi, sauna, check-out of uitstapjes.',
  ),
  whatsappEscalation: t(
    'Möchtet ihr direkt persönlich mit uns schreiben?',
    'Would you like to message us directly?',
    '¿Os gustaría escribirnos directamente?',
    'Volete scriverci direttamente?',
    'Souhaitez-vous nous écrire directement ?',
    'Willen jullie ons direct een bericht sturen?',
  ),
  whatsappOpen: t(
    'WhatsApp öffnen',
    'Open WhatsApp',
    'Abrir WhatsApp',
    'Apri WhatsApp',
    'Ouvrir WhatsApp',
    'WhatsApp openen',
  ),

  // Quick actions & nav
  navZugang: t('Zugang', 'Access', 'Acceso', 'Accesso', 'Accès', 'Toegang'),
  navWlan: t('WLAN', 'WiFi', 'WiFi', 'WiFi', 'WiFi', 'WiFi'),
  navFamilie: t('Familie', 'Family', 'Familia', 'Famiglia', 'Famille', 'Familie'),
  navSauna: t('Sauna & Kamin', 'Sauna & Fireplace', 'Sauna y Chimenea', 'Sauna e Camino', 'Sauna & Cheminée', 'Sauna & Haard'),
  navSaunaShort: t('Sauna', 'Sauna', 'Sauna', 'Sauna', 'Sauna', 'Sauna'),
  navRestaurants: t('Restaurants', 'Restaurants', 'Restaurantes', 'Ristoranti', 'Restaurants', 'Restaurants'),
  navEinkaufen: t('Einkaufen', 'Shopping', 'Compras', 'Spesa', 'Courses', 'Winkelen'),
  navAusfluege: t('Ausflüge', 'Excursions', 'Excursiones', 'Escursioni', 'Excursions', 'Uitstapjes'),
  navEAuto: t('E-Auto', 'EV Charging', 'Coche eléctrico', 'Auto elettrica', 'Voiture élec.', 'Elektrisch'),
  navCheckout: t('Check-out', 'Check-out', 'Check-out', 'Check-out', 'Check-out', 'Check-out'),
  navAnleitungen: t('Anleitungen', 'Instructions', 'Instrucciones', 'Istruzioni', 'Instructions', 'Handleidingen'),
  navNotfall: t('Notfall', 'Emergency', 'Emergencia', 'Emergenza', 'Urgence', 'Noodgeval'),
  navFaq: t('Infos', 'Info', 'Info', 'Info', 'Infos', 'Info'),

  // Section titles
  sectionZugang: t('Anreise & Zugang', 'Arrival & Access', 'Llegada y acceso', 'Arrivo e accesso', 'Arrivée et accès', 'Aankomst & Toegang'),
  sectionWlan: t('WLAN', 'WiFi', 'WiFi', 'WiFi', 'WiFi', 'WiFi'),
  sectionFamilie: t('Familienfreundlich ausgestattet', 'Family-friendly amenities', 'Equipamiento familiar', 'Attrezzature per famiglie', 'Équipements familiaux', 'Gezinsvriendelijke voorzieningen'),
  sectionKueche: t('Küche & Geräte', 'Kitchen & Appliances', 'Cocina y electrodomésticos', 'Cucina e elettrodomestici', 'Cuisine et appareils', 'Keuken & Apparaten'),
  sectionSauna: t('Sauna & Kamin', 'Sauna & Fireplace', 'Sauna y chimenea', 'Sauna e camino', 'Sauna et cheminée', 'Sauna & Haard'),
  sectionRestaurants: t('Restaurant-Empfehlungen', 'Restaurant Recommendations', 'Restaurantes recomendados', 'Ristoranti consigliati', 'Restaurants recommandés', 'Restaurant-aanbevelingen'),
  sectionEinkaufen: t('Einkaufen & Versorgung', 'Shopping & Supplies', 'Compras y suministros', 'Spesa e forniture', 'Courses et approvisionnement', 'Winkelen & Bevoorrading'),
  sectionAusfluege: t('Ausflüge & Veranstaltungen', 'Excursions & Events', 'Excursiones y eventos', 'Escursioni e eventi', 'Excursions et événements', 'Uitstapjes & Evenementen'),
  sectionEAuto: t('E-Auto Ladestationen', 'EV Charging Stations', 'Estaciones de carga', 'Stazioni di ricarica', 'Bornes de recharge', 'Laadstations'),
  sectionFaq: t('Gut zu wissen', 'Good to Know', 'Información útil', 'Informazioni utili', 'Infos pratiques', 'Handige info'),
  sectionCheckout: t('Abreise', 'Departure', 'Salida', 'Partenza', 'Départ', 'Vertrek'),
  sectionAnleitungen: t('Hilfe & Anleitungen', 'Help & Instructions', 'Ayuda e instrucciones', 'Aiuto e istruzioni', 'Aide et instructions', 'Hulp & Handleidingen'),
  sectionNotfall: t('Notfall & Hilfe', 'Emergency & Help', 'Emergencia y ayuda', 'Emergenza e aiuto', 'Urgence et aide', 'Noodgeval & Hulp'),

  // Zugang section
  checkinFrom: t('Check-in ist ab', 'Check-in from', 'Check-in a partir de las', 'Check-in dalle', 'Enregistrement à partir de', 'Inchecken vanaf'),
  possible: t('möglich.', 'possible.', 'posible.', 'possibile.', 'possible.', 'mogelijk.'),
  boxCodeLabel: t('Schlüsselbox-Code', 'Key Box Code', 'Código de la caja', 'Codice della cassetta', 'Code du boîtier', 'Sleutelkluiscode'),
  boxCodeNote1: t(
    '📌 Bitte nach Entnahme des Schlüssels die Box wieder sicher verschließen.',
    '📌 Please lock the key box securely after taking the key.',
    '📌 Por favor, cierra la caja con llave después de sacar la llave.',
    '📌 Si prega di chiudere la cassetta dopo aver preso la chiave.',
    '📌 Veuillez refermer le boîtier après avoir pris la clé.',
    '📌 Sluit de sleutelkluis na het pakken van de sleutel.',
  ),
  boxCodeNote2: t(
    '📌 Beim Check-out den Schlüssel wieder in die Box hängen und den Code verdrehen.',
    '📌 At check-out, put the key back in the box and scramble the code.',
    '📌 Al salir, devuelve la llave a la caja y gira el código.',
    '📌 Al check-out, rimetti la chiave nella cassetta e cambia il codice.',
    '📌 Au départ, remettez la clé dans le boîtier et changez le code.',
    '📌 Bij vertrek de sleutel terughangen en de code verdraaien.',
  ),
  parking: t('Parken', 'Parking', 'Aparcamiento', 'Parcheggio', 'Parking', 'Parkeren'),
  carportNote: t('Zum Haus gehört genau ein Stellplatz direkt vor der Haustür. Die weiteren Parkplätze auf dem Schotter gehören den Nachbarn.', 'The house has exactly one parking space directly in front of the door. The other spots on the gravel belong to the neighbours.', 'La casa dispone de una única plaza de aparcamiento justo delante de la puerta. Las demás plazas de la grava son de los vecinos.', 'Alla casa spetta esattamente un posto auto proprio davanti alla porta. Gli altri posti sulla ghiaia sono dei vicini.', 'La maison dispose d\'une seule place de stationnement juste devant la porte. Les autres places sur le gravier appartiennent aux voisins.', 'Bij het huis hoort precies één parkeerplaats direct voor de voordeur. De andere plekken op het grind zijn van de buren.'),
  bikeNote: t(
    'Fahrräder: vor der Haustür überdacht Platz für 2–3 Räder; alternativ auf die umzäunte Terrasse.',
    'Bikes: covered space for 2–3 bikes at the front door; alternatively on the fenced terrace.',
    'Bicicletas: espacio cubierto para 2–3 bicicletas en la entrada; alternativa: terraza vallada.',
    'Biciclette: posto coperto per 2–3 bici davanti alla porta; in alternativa sul terrazzo recintato.',
    'Vélos : espace couvert pour 2–3 vélos devant la porte ; sinon sur la terrasse clôturée.',
    'Fietsen: overdekte ruimte voor 2–3 fietsen bij de voordeur; alternatief op het omheinde terras.',
  ),

  // WLAN
  networkName: t('Netzwerkname', 'Network Name', 'Nombre de red', 'Nome rete', 'Nom du réseau', 'Netwerknaam'),
  password: t('Passwort', 'Password', 'Contraseña', 'Password', 'Mot de passe', 'Wachtwoord'),
  wifiSpeed: t('Highspeed WLAN · 500+ Mbps', 'Highspeed WiFi · 500+ Mbps', 'WiFi de alta velocidad · 500+ Mbps', 'WiFi ad alta velocità · 500+ Mbps', 'WiFi haut débit · 500+ Mbps', 'Highspeed wifi · 500+ Mbps'),
  wifiTrouble: t('Bei Verbindungsproblemen', 'Connection Issues', 'Problemas de conexión', 'Problemi di connessione', 'Problèmes de connexion', 'Verbindingsproblemen'),
  wifiRouter: t(
    'Der Router befindet sich im Keller unter der Treppe.',
    'The router is in the basement under the stairs.',
    'El router está en el sótano debajo de las escaleras.',
    'Il router si trova in cantina sotto le scale.',
    'Le routeur se trouve au sous-sol sous l\'escalier.',
    'De router bevindt zich in de kelder onder de trap.',
  ),
  wifiRestart: t(
    'Kurz vom Strom trennen (30 Sekunden) und neu verbinden.',
    'Briefly unplug (30 seconds) and reconnect.',
    'Desconectar brevemente (30 segundos) y reconectar.',
    'Scollegare brevemente (30 secondi) e ricollegare.',
    'Débrancher brièvement (30 secondes) et rebrancher.',
    'Even loskoppelen (30 seconden) en opnieuw verbinden.',
  ),

  // Familie
  familyItems: {
    crib: t(
      'Hochstuhl im Keller unter der Treppe (gerne vorab melden – dann stellen wir ihn bereit); Reisebett auf Anfrage',
      'High chair in the basement under the stairs (let us know in advance and we\'ll set it up); travel cot available on request',
      'Trona en el sótano bajo las escaleras (avísanos antes y la preparamos); cuna de viaje bajo petición',
      'Seggiolone in cantina sotto le scale (avvisaci prima e lo prepariamo); lettino da viaggio su richiesta',
      'Chaise haute au sous-sol sous l\'escalier (prévenez-nous à l\'avance et on la prépare); lit de voyage sur demande',
      'Kinderstoel in de kelder onder de trap (meld het van tevoren dan zetten wij hem klaar); reisbedje op aanvraag',
    ),
    changingMat: t(
      'Wickelunterlage im Schrank im Kinderzimmer – bitte Handtuch unterlegen',
      'Changing mat in the wardrobe of the children\'s room – please place a towel underneath',
      'Cambiador en el armario de la habitación infantil – por favor coloca una toalla debajo',
      'Fasciatoio nell\'armadio della cameretta – mettere un asciugamano sotto',
      'Matelas à langer dans l\'armoire de la chambre d\'enfants – mettre une serviette dessous',
      'Verschoningsmatje in de kast van de kinderkamer – leg er een handdoek onder',
    ),
    bedGuard: t(
      'Rausfallschutz im Kinderzimmer in der Schublade unter dem Etagenbett',
      'Bed guard in the children\'s room in the drawer under the bunk bed',
      'Protección anticaída en el cajón debajo de la litera',
      'Protezione anticaduta nel cassetto sotto il letto a castello',
      'Barrière de lit dans le tiroir sous le lit superposé',
      'Bedhekje in de lade onder het stapelbed in de kinderkamer',
    ),
    games: t(
      'Spiele im Erdgeschoss im Schrank unter dem Fernseher',
      'Games on the ground floor in the cabinet under the TV',
      'Juegos en la planta baja en el armario bajo el televisor',
      'Giochi al piano terra nell\'armadio sotto la TV',
      'Jeux au rez-de-chaussée dans le meuble sous la télévision',
      'Spellen op de begane grond in de kast onder de tv',
    ),
  },
  bedroomsTitle: t('Schlafzimmer', 'Bedrooms', 'Dormitorios', 'Camere da letto', 'Chambres', 'Slaapkamers'),
  bedroom1: t(
    'Schlafzimmer 1 (Dachgeschoss) – Doppelbett 200×200 cm, Arbeitsbereich, eigenes Bad',
    'Bedroom 1 (top floor) – double bed 200×200 cm, work desk, en-suite bathroom',
    'Dormitorio 1 (ático) – cama doble 200×200 cm, escritorio, baño privado',
    'Camera 1 (mansarda) – letto matrimoniale 200×200 cm, scrivania, bagno privato',
    'Chambre 1 (dernier étage) – grand lit 200×200 cm, espace de travail, salle de bain privée',
    'Slaapkamer 1 (zolderverdieping) – tweepersoonsbed 200×200 cm, werkplek, eigen badkamer',
  ),
  bedroom2: t(
    'Schlafzimmer 2 (1. Obergeschoss) – Doppelbett 200×200 cm',
    'Bedroom 2 (1st floor) – double bed 200×200 cm',
    'Dormitorio 2 (1ª planta) – cama doble 200×200 cm',
    'Camera 2 (1° piano) – letto matrimoniale 200×200 cm',
    'Chambre 2 (1er étage) – grand lit 200×200 cm',
    'Slaapkamer 2 (1e verdieping) – tweepersoonsbed 200×200 cm',
  ),
  safeNote: t(
    'Safe im Haus vorhanden – der Code kann selbst programmiert werden',
    'Safe available in the house – you can program the code yourself',
    'Caja fuerte disponible – puedes programar el código tú mismo',
    'Cassaforte disponibile – puoi programmare il codice da solo',
    'Coffre-fort disponible – vous pouvez programmer le code vous-même',
    'Kluis aanwezig – je kunt de code zelf programmeren',
  ),
  bedroom3: t(
    'Schlafzimmer 3 (1. Obergeschoss) – Etagenbett (90×200 cm) + Einzelbett (80×180 cm), ideal für Kinder & Jugendliche',
    'Bedroom 3 (1st floor) – bunk bed (90×200 cm) + single bed (80×180 cm), ideal for children & teens',
    'Dormitorio 3 (1ª planta) – litera (90×200 cm) + cama individual (80×180 cm), ideal para niños',
    'Camera 3 (1° piano) – letto a castello (90×200 cm) + letto singolo (80×180 cm), ideale per bambini',
    'Chambre 3 (1er étage) – lits superposés (90×200 cm) + lit simple (80×180 cm), idéal pour les enfants',
    'Slaapkamer 3 (1e verdieping) – stapelbed (90×200 cm) + eenpersoonsbed (80×180 cm), ideaal voor kinderen',
  ),

  comfortTitle: t('Komfort & Ausstattung', 'Comfort & Amenities', 'Comodidades', 'Comfort e dotazioni', 'Confort & équipements', 'Comfort & voorzieningen'),
  hairdryerNote: t('Föhn im Bad', 'Hair dryer in the bathroom', 'Secador de pelo en el baño', 'Asciugacapelli in bagno', 'Sèche-cheveux dans la salle de bain', 'Haardroger in de badkamer'),
  ironNote: t('Bügeleisen & Bügelbrett vorhanden', 'Iron & ironing board available', 'Plancha y tabla de planchar disponibles', 'Ferro da stiro e asse da stiro disponibili', 'Fer à repasser et planche à repasser disponibles', 'Strijkijzer & strijkplank aanwezig'),
  dryingRackNote: t('Wäscheständer vorhanden', 'Drying rack available', 'Tendedero disponible', 'Stendino disponibile', 'Séchoir disponible', 'Droogrek aanwezig'),
  extraBeddingNote: t('Extra Kissen & Decken im Schrank', 'Extra pillows & blankets in the wardrobe', 'Almohadas y mantas extra en el armario', 'Cuscini e coperte extra nell\'armadio', 'Oreillers et couvertures supplémentaires dans l\'armoire', 'Extra kussens & dekens in de kast'),
  blackoutNote: t('Verdunkelungsvorhänge und Raffstore in allen Schlafzimmern', 'Blackout curtains and exterior blinds in all bedrooms', 'Cortinas opacas y persianas exteriores en todos los dormitorios', 'Tende oscuranti e frangisole in tutte le camere', 'Rideaux occultants et stores extérieurs dans toutes les chambres', 'Verduisteringsgordijnen en buitenzonwering in alle slaapkamers'),

  familyNote: t(
    'ACHZEIT ist bewusst familienfreundlich konzipiert – damit sich auch die Kleinsten wohlfühlen.',
    'ACHZEIT is designed to be family-friendly – so even the little ones feel at home.',
    'ACHZEIT está diseñado para ser apto para familias – para que los más pequeños también se sientan como en casa.',
    'ACHZEIT è pensato per le famiglie – affinché anche i più piccoli si sentano a casa.',
    'ACHZEIT est conçu pour être familial – pour que les plus petits se sentent aussi à l\'aise.',
    'ACHZEIT is bewust gezinsvriendelijk ingericht – zodat ook de kleintjes zich thuis voelen.',
  ),

  // Küche
  kitchenItems: {
    bora: t('BORA-Kochfeld mit integriertem Abzug', 'BORA cooktop with integrated extractor', 'Placa BORA con extractor integrado', 'Piano cottura BORA con aspiratore integrato', 'Plaque BORA avec hotte intégrée', 'BORA kookplaat met geïntegreerde afzuiging'),
    oven: t('Backofen & Geschirrspüler unter der Arbeitsplatte', 'Oven & dishwasher under the countertop', 'Horno y lavavajillas bajo la encimera', 'Forno e lavastoviglie sotto il piano di lavoro', 'Four et lave-vaisselle sous le plan de travail', 'Oven & vaatwasser onder het werkblad'),
    microwave: t('Mikrowelle', 'Microwave', 'Microondas', 'Microonde', 'Micro-ondes', 'Magnetron'),
    toaster: t('Toaster', 'Toaster', 'Tostadora', 'Tostapane', 'Grille-pain', 'Broodrooster'),
    fridge: t('Kühlschrank & Gefrierfach', 'Fridge & freezer compartment', 'Nevera y congelador', 'Frigorifero e congelatore', 'Réfrigérateur et compartiment congélateur', 'Koelkast & vriesvak'),
    coffee: t('Nespresso-Kaffeemaschine im Küchenbereich', 'Nespresso coffee machine in the kitchen area', 'Cafetera Nespresso en la cocina', 'Macchina del caffè Nespresso in cucina', 'Machine à café Nespresso dans la cuisine', 'Nespresso-koffiezetapparaat in de keuken'),
    waste: t('Mülltrennung unter der Spüle (Restmüll, Bio, Gelber Sack)', 'Waste separation under the sink (residual, organic, recyclables)', 'Separación de basura debajo del fregadero', 'Raccolta differenziata sotto il lavello', 'Tri des déchets sous l\'évier', 'Afvalscheiding onder de gootsteen'),
  },
  entertainmentTitle: t('Unterhaltung', 'Entertainment', 'Entretenimiento', 'Intrattenimento', 'Divertissement', 'Entertainment'),
  smartTvNote: t('Smart TV im Wohnzimmer, Schlafzimmer 1 und Schlafzimmer 2', 'Smart TV in the living room, bedroom 1 and bedroom 2', 'Smart TV en el salón, dormitorio 1 y dormitorio 2', 'Smart TV in soggiorno, camera 1 e camera 2', 'Smart TV dans le salon, chambre 1 et chambre 2', 'Smart TV in de woonkamer, slaapkamer 1 en slaapkamer 2'),
  soundSystemNote: t('Soundsystem vorhanden', 'Sound system available', 'Sistema de sonido disponible', 'Sistema audio disponibile', 'Système sonore disponible', 'Geluidsysteem aanwezig'),
  washerDryerNote: t(
    'Waschmaschine & Wäschetrockner vorhanden – im Keller',
    'Washing machine & tumble dryer available – in the basement',
    'Lavadora y secadora disponibles – en el sótano',
    'Lavatrice e asciugatrice disponibili – in cantina',
    'Lave-linge et sèche-linge disponibles – à la cave',
    'Wasmachine & wasdroger aanwezig – in de kelder',
  ),

  kitchenDishwasherNote: t(
    '📌 Bitte den Geschirrspüler vor Abreise starten.',
    '📌 Please start the dishwasher before departure.',
    '📌 Por favor, pon el lavavajillas antes de salir.',
    '📌 Si prega di avviare la lavastoviglie prima della partenza.',
    '📌 Veuillez lancer le lave-vaisselle avant le départ.',
    '📌 Start de vaatwasser voor vertrek.',
  ),

  // Sauna & Kamin
  sauna: t('Sauna', 'Sauna', 'Sauna', 'Sauna', 'Sauna', 'Sauna'),
  saunaNote1: t('Bitte ausschließlich im Sitzen auf einem Handtuch nutzen.', 'Please only use while sitting on a towel.', 'Úsela solo sentado sobre una toalla.', 'Usare solo seduti su un asciugamano.', 'N\'utiliser qu\'assis sur une serviette.', 'Gebruik de sauna alleen zittend op een handdoek.'),
  saunaNote2: t('Nach Nutzung kurz lüften.', 'Ventilate briefly after use.', 'Ventilar brevemente después de usar.', 'Ventilare brevemente dopo l\'uso.', 'Aérer brièvement après utilisation.', 'Na gebruik even ventileren.'),
  fireplace: t('Kamin', 'Fireplace', 'Chimenea', 'Camino', 'Cheminée', 'Haard'),
  fireplaceNote1: t('Starterset mit Anzünder, Anfeuerholz und Holz als Erstausstattung vorhanden.', 'Starter set with firelighters, kindling, and wood included.', 'Kit de inicio con encendedor y leña incluido.', 'Kit di avviamento con accendifuoco e legna incluso.', 'Kit de démarrage avec allume-feu et bois fourni.', 'Starterset met aanmaakblokjes en hout aanwezig.'),
  fireplaceNote2: t('Nur trockenes Holz verwenden.', 'Only use dry wood.', 'Usar solo leña seca.', 'Usare solo legna secca.', 'N\'utiliser que du bois sec.', 'Gebruik alleen droog hout.'),
  fireplaceNote3: t('Asche erst vollständig abgekühlt entsorgen.', 'Only dispose of ashes when fully cooled.', 'Desechar cenizas solo cuando estén completamente frías.', 'Smaltire le ceneri solo quando completamente fredde.', 'Ne jeter les cendres que lorsqu\'elles sont complètement refroidies.', 'As pas weggooien als deze volledig is afgekoeld.'),
  terraceNote: t(
    'Terrasse & Garten mit Esstisch – direkt zugänglich vom Erdgeschoss',
    'Terrace & garden with dining table – directly accessible from the ground floor',
    'Terraza y jardín con mesa de comedor – acceso directo desde la planta baja',
    'Terrazza e giardino con tavolo da pranzo – accesso diretto dal piano terra',
    'Terrasse et jardin avec table à manger – accès direct depuis le rez-de-chaussée',
    'Terras & tuin met eettafel – direct toegankelijk vanuit de begane grond',
  ),
  balconyNote: t(
    'Balkon im Dachgeschoss mit Bergblick – perfekt für den Morgenkaffee.',
    'Top-floor balcony with mountain views – perfect for your morning coffee.',
    'Balcón en el último piso con vistas a la montaña – perfecto para el café matutino.',
    'Balcone all\'ultimo piano con vista sulle montagne – perfetto per il caffè mattutino.',
    'Balcon au dernier étage avec vue sur les montagnes – parfait pour le café du matin.',
    'Balkon op de bovenste verdieping met bergzicht – perfect voor de ochtendkoffie.',
  ),

  saunaEnjoyNote: t(
    'Genießt eure ganz persönliche ACHZEIT – mit Wärme, Ruhe und Bergblick.',
    'Enjoy your personal ACHZEIT – with warmth, peace, and mountain views.',
    'Disfruta de tu ACHZEIT personal – con calidez, tranquilidad y vistas a las montañas.',
    'Goditi il tuo ACHZEIT personale – con calore, pace e vista sulle montagne.',
    'Profitez de votre ACHZEIT personnel – avec chaleur, calme et vue sur les montagnes.',
    'Geniet van je persoonlijke ACHZEIT – met warmte, rust en bergzicht.',
  ),

  // Restaurants
  restaurantsIntro: t(
    'Unsere persönlichen Tipps für euren Aufenthalt – von regional bis gehoben.',
    'Our personal recommendations for your stay – from regional to fine dining.',
    'Nuestras recomendaciones personales – de regional a alta cocina.',
    'I nostri consigli personali – dalla cucina regionale alla fine dining.',
    'Nos recommandations personnelles – de la cuisine régionale à la gastronomie.',
    'Onze persoonlijke tips – van regionaal tot fine dining.',
  ),
  topRecommendation: t('Top-Empfehlung', 'Top Pick', 'Recomendado', 'Consigliato', 'Recommandé', 'Topaanrader'),
  starLevel: t('Sterne-Niveau', 'Star Level', 'Nivel estrella', 'Livello stellare', 'Niveau étoilé', 'Sterrenniveau'),
  allRestaurantsNote: t(
    'Alle Restaurants sind in 3–13 Minuten mit dem Auto erreichbar.',
    'All restaurants are reachable within 3–13 minutes by car.',
    'Todos los restaurantes están a 3–13 minutos en coche.',
    'Tutti i ristoranti sono raggiungibili in 3–13 minuti in auto.',
    'Tous les restaurants sont accessibles en 3–13 minutes en voiture.',
    'Alle restaurants zijn in 3–13 minuten met de auto bereikbaar.',
  ),

  // Restaurant descriptions
  gaisbockDesc: t(
    'Traditionelle Allgäuer Gastlichkeit mit modernen Akzenten. Regionale Küche mit besten Zutaten aus der Heimat – gemütlich und herzlich.',
    'Traditional Allgäu hospitality with modern touches. Regional cuisine with the best local ingredients – cozy and warm.',
    'Hospitalidad tradicional del Allgäu con toques modernos. Cocina regional con los mejores ingredientes locales.',
    'Ospitalità tradizionale dell\'Allgäu con tocchi moderni. Cucina regionale con i migliori ingredienti locali.',
    'Hospitalité traditionnelle de l\'Allgäu avec des touches modernes. Cuisine régionale avec les meilleurs ingrédients locaux.',
    'Traditionele Allgäuer gastvrijheid met moderne accenten. Regionale keuken met de beste lokale ingrediënten.',
  ),
  onderschDesc: t(
    'Zwei Konzepte unter einem Dach – gehobene Küche und entspannte Genusswirtschaft. Perfekt für einen besonderen Abend.',
    'Two concepts under one roof – fine dining and relaxed cuisine. Perfect for a special evening.',
    'Dos conceptos bajo un techo – alta cocina y cocina relajada. Perfecto para una velada especial.',
    'Due concetti sotto un tetto – cucina raffinata e rilassata. Perfetto per una serata speciale.',
    'Deux concepts sous un toit – cuisine raffinée et décontractée. Parfait pour une soirée spéciale.',
    'Twee concepten onder één dak – fine dining en ontspannen keuken. Perfect voor een bijzondere avond.',
  ),
  alteSennkuecheDesc: t(
    'Gemütliche Stuben, deftige Schmankerl und gut gezapftes Bier – bodenständig und authentisch Oberstdorf.',
    'Cozy parlors, hearty Bavarian food and well-tapped beer – down-to-earth and authentic Oberstdorf.',
    'Salones acogedores, comida bávara abundante y cerveza de barril – auténtico Oberstdorf.',
    'Sale accoglienti, cucina bavarese abbondante e birra alla spina – autentico Oberstdorf.',
    'Salles chaleureuses, cuisine bavaroise copieuse et bière pression – authentique Oberstdorf.',
    'Gezellige kamers, stevige Beierse kost en getapt bier – nuchter en authentiek Oberstdorf.',
  ),
  wildeMaennleDesc: t(
    'Institution in der Fußgängerzone seit 1937. Hier trifft sich Jung und Alt – urgemütlich mit Brauereiausschank.',
    'Institution in the pedestrian zone since 1937. Where young and old meet – very cozy with brewery tap.',
    'Institución en la zona peatonal desde 1937. Donde jóvenes y mayores se encuentran – acogedor con cerveza de la casa.',
    'Istituzione nella zona pedonale dal 1937. Dove giovani e anziani si incontrano – accogliente con birra alla spina.',
    'Institution dans la zone piétonne depuis 1937. Où jeunes et moins jeunes se retrouvent – très chaleureux.',
    'Instituut in de voetgangerszone sinds 1937. Waar jong en oud elkaar ontmoet – oergezellig met brouwerijbier.',
  ),
  beiAlbertoDesc: t(
    'Familienbetrieb in zweiter Generation – Pizza, Pasta und italienisches Lebensgefühl mit großer Sonnenterrasse.',
    'Family-run for two generations – pizza, pasta and Italian lifestyle with a large sun terrace.',
    'Negocio familiar de segunda generación – pizza, pasta y estilo de vida italiano con gran terraza.',
    'Attività familiare di seconda generazione – pizza, pasta e stile di vita italiano con ampia terrazza.',
    'Entreprise familiale de deuxième génération – pizza, pasta et art de vivre italien avec grande terrasse.',
    'Familiebedrijf in de tweede generatie – pizza, pasta en Italiaans levensgevoel met groot zonneterras.',
  ),

  // Shopping
  shoppingIntro: t(
    'Alles Wichtige für den täglichen Bedarf – direkt in Fischen oder wenige Minuten entfernt.',
    'Everything you need for daily supplies – right in Fischen or just minutes away.',
    'Todo lo necesario para el día a día – en Fischen o a pocos minutos.',
    'Tutto il necessario per la vita quotidiana – a Fischen o a pochi minuti.',
    'Tout le nécessaire au quotidien – à Fischen ou à quelques minutes.',
    'Alles voor de dagelijkse boodschappen – in Fischen of op een paar minuten afstand.',
  ),
  edekaDesc: t('Vollsortiment direkt im Ort. Gut sortiert mit regionalen Produkten.', 'Full-range supermarket in the village. Well-stocked with regional products.', 'Supermercado completo en el pueblo. Bien surtido con productos regionales.', 'Supermercato completo nel paese. Ben fornito con prodotti regionali.', 'Supermarché complet au village. Bien approvisionné en produits régionaux.', 'Volledig assortiment in het dorp. Goed gesorteerd met regionale producten.'),
  haerleDesc: t(
    'Hier wird noch alles von Hand gemacht – frische Semmeln, Brot und Gebäck. Auch sonntags geöffnet.',
    'Everything still handmade – fresh rolls, bread and pastries. Also open on Sundays.',
    'Todo hecho a mano – panecillos frescos, pan y bollería. También abierto los domingos.',
    'Tutto ancora fatto a mano – panini freschi, pane e dolci. Aperto anche la domenica.',
    'Tout encore fait main – petits pains frais, pain et pâtisseries. Ouvert aussi le dimanche.',
    'Alles nog handgemaakt – verse broodjes, brood en gebak. Ook op zondag open.',
  ),
  ourTip: t('★ Unser Tipp', '★ Our Tip', '★ Nuestro consejo', '★ Il nostro consiglio', '★ Notre conseil', '★ Onze tip'),
  schmidDesc: t('Regionale Fleisch- und Wurstwaren vom Allgäuer Metzger.', 'Regional meat and sausages from the local butcher.', 'Carnes y embutidos regionales del carnicero local.', 'Carne e salumi regionali dal macellaio locale.', 'Viandes et charcuteries régionales du boucher local.', 'Regionaal vlees en worst van de plaatselijke slager.'),
  fenebergDesc: t('Großer Allgäuer Supermarkt mit breiter Auswahl.', 'Large Allgäu supermarket with a wide selection.', 'Gran supermercado del Allgäu con amplia selección.', 'Grande supermercato dell\'Allgäu con ampia selezione.', 'Grand supermarché de l\'Allgäu avec large choix.', 'Grote Allgäuer supermarkt met breed assortiment.'),
  vmarktDesc: t(
    'Großer Verbrauchermarkt mit riesiger Auswahl – von Lebensmitteln bis Haushalt.',
    'Large consumer market with a huge selection – from groceries to household goods.',
    'Gran mercado con enorme selección – desde alimentos hasta artículos para el hogar.',
    'Grande mercato con vasta selezione – dagli alimentari ai casalinghi.',
    'Grand marché avec un vaste choix – des courses ménagères aux produits alimentaires.',
    'Grote consumentenmarkt met enorm assortiment – van boodschappen tot huishouden.',
  ),
  apothekenDesc: t('Apotheke im Ortszentrum von Fischen.', 'Pharmacy in the center of Fischen.', 'Farmacia en el centro de Fischen.', 'Farmacia nel centro di Fischen.', 'Pharmacie au centre de Fischen.', 'Apotheek in het centrum van Fischen.'),
  allShopsNote: t(
    'Alle Geschäfte sind fußläufig oder in wenigen Minuten mit dem Auto erreichbar.',
    'All shops are within walking distance or a few minutes by car.',
    'Todas las tiendas están a poca distancia a pie o en coche.',
    'Tutti i negozi sono raggiungibili a piedi o in pochi minuti in auto.',
    'Tous les commerces sont accessibles à pied ou en quelques minutes en voiture.',
    'Alle winkels zijn te voet of in een paar minuten met de auto bereikbaar.',
  ),

  // Excursions
  excursionsIntro: t(
    'Rund um ACHZEIT gibt es viel zu entdecken – hier unsere Favoriten.',
    'There\'s so much to discover around ACHZEIT – here are our favorites.',
    'Hay mucho que descubrir alrededor de ACHZEIT – aquí nuestros favoritos.',
    'C\'è molto da scoprire intorno ad ACHZEIT – ecco i nostri preferiti.',
    'Il y a beaucoup à découvrir autour d\'ACHZEIT – voici nos favoris.',
    'Er is veel te ontdekken rondom ACHZEIT – hier onze favorieten.',
  ),
  topExcursion: t('Top-Ausflug', 'Top Excursion', 'Excursión top', 'Escursione top', 'Excursion top', 'Topuitstapje'),
  directInOrt: t('Direkt im Ort', 'Right in Town', 'En el pueblo', 'In paese', 'Dans le village', 'In het dorp'),
  gipfelblick: t('400er Gipfelblick', '400 Peaks View', 'Vista de 400 cumbres', 'Vista 400 vette', 'Vue 400 sommets', '400 toppen uitzicht'),
  stinesserDesc: t(
    'Kleines Skigebiet am Ortsrand – ideal für Anfänger und Familien. Mit Abendrodelbahn und gemütlichem Liftstadl.',
    'Small ski area at the edge of town – ideal for beginners and families. With evening toboggan run and cozy lift bar.',
    'Pequeña estación de esquí al borde del pueblo – ideal para principiantes y familias.',
    'Piccola area sciistica ai margini del paese – ideale per principianti e famiglie.',
    'Petit domaine skiable en bordure du village – idéal pour débutants et familles.',
    'Klein skigebied aan de rand van het dorp – ideaal voor beginners en gezinnen.',
  ),
  breitachklammDesc: t(
    'Die tiefste und eine der beeindruckendsten Felsschluchten Mitteleuropas. Im Sommer tosende Wasserfälle, im Winter magische Eisformationen.',
    'The deepest and one of the most impressive rock gorges in Central Europe. Thundering waterfalls in summer, magical ice formations in winter.',
    'La más profunda e impresionante garganta rocosa de Europa Central. Cascadas en verano, formaciones de hielo en invierno.',
    'La più profonda e impressionante gola rocciosa dell\'Europa centrale. Cascate in estate, formazioni di ghiaccio in inverno.',
    'La plus profonde et l\'une des gorges les plus impressionnantes d\'Europe centrale. Cascades en été, formations de glace en hiver.',
    'De diepste en meest indrukwekkende rotskloof van Midden-Europa. Bruisende watervallen in de zomer, magische ijsformaties in de winter.',
  ),
  nebelhornDesc: t(
    'Mit der Gondel auf 2.224 m – 400 Gipfel im Blick. Nordwandsteig und Panorama-Rundweg. Im Winter herrliches Skigebiet.',
    'By gondola to 2,224 m – 400 peaks in view. North face trail and panoramic loop. Excellent ski area in winter.',
    'En telecabina a 2.224 m – 400 cumbres a la vista. Sendero panorámico. Excelente zona de esquí en invierno.',
    'In gondola a 2.224 m – 400 vette in vista. Sentiero panoramico. Ottima area sciistica in inverno.',
    'En télécabine à 2 224 m – 400 sommets en vue. Sentier panoramique. Excellente station de ski en hiver.',
    'Per gondel naar 2.224 m – 400 toppen in het zicht. Panoramisch wandelpad. Geweldig skigebied in de winter.',
  ),
  fellhornDesc: t(
    'Blumenreiche Bergwiesen im Sommer, erstklassiges Skigebiet im Winter. Die Zwei-Länder-Wanderung (DE/AT) ist ein Highlight.',
    'Flower-rich mountain meadows in summer, first-class ski area in winter. The two-country hike (DE/AT) is a highlight.',
    'Praderas de montaña llenas de flores en verano, estación de esquí de primera en invierno.',
    'Prati di montagna fioriti in estate, area sciistica di prima classe in inverno.',
    'Prairies de montagne fleuries en été, domaine skiable de premier ordre en hiver.',
    'Bloemrijke bergweiden in de zomer, eersteklas skigebied in de winter.',
  ),
  sturmannDesc: t(
    'Die einzige begehbare Höhle im Allgäu – beeindruckende Tropfsteinformationen tief im Berg. Tolles Erlebnis auch für Kinder.',
    'The only accessible cave in the Allgäu – impressive stalactite formations deep in the mountain. Great experience for kids too.',
    'La única cueva accesible en el Allgäu – impresionantes formaciones de estalactitas. Gran experiencia para niños.',
    'L\'unica grotta accessibile nell\'Allgäu – impressionanti formazioni di stalattiti. Ottima esperienza anche per bambini.',
    'La seule grotte accessible de l\'Allgäu – impressionnantes formations de stalactites. Super expérience pour les enfants aussi.',
    'De enige toegankelijke grot in de Allgäu – indrukwekkende druipsteenformaties. Geweldige ervaring voor kinderen.',
  ),
  soellereckDesc: t(
    'Der Familienberg: Sommerrodelbahn, kurze Wanderwege und ein tolles Panorama. Ideal mit Kindern.',
    'The family mountain: summer toboggan run, short hiking trails and great panorama. Ideal with kids.',
    'La montaña familiar: tobogán de verano, rutas cortas y gran panorama. Ideal con niños.',
    'La montagna per famiglie: pista di slittino estiva, brevi sentieri e panorama fantastico. Ideale con bambini.',
    'La montagne familiale : piste de luge d\'été, courtes randonnées et superbe panorama. Idéal avec les enfants.',
    'De familieberg: zomerrodelbaan, korte wandelpaden en geweldig panorama. Ideaal met kinderen.',
  ),
  christleseeDesc: t(
    'Kristallklarer Bergsee mit türkisem Wasser – ein Geheimtipp zum Staunen. Leichte Wanderung ab Parkplatz Trettachtal.',
    'Crystal-clear mountain lake with turquoise water – a hidden gem. Easy hike from the Trettachtal parking lot.',
    'Lago de montaña cristalino con agua turquesa – un secreto. Caminata fácil desde el aparcamiento de Trettachtal.',
    'Lago di montagna cristallino con acqua turchese – un gioiello nascosto. Facile escursione dal parcheggio di Trettachtal.',
    'Lac de montagne cristallin aux eaux turquoise – un secret bien gardé. Randonnée facile depuis le parking de Trettachtal.',
    'Kristalhelder bergmeer met turquoise water – een verborgen parel. Makkelijke wandeling vanaf de parkeerplaats Trettachtal.',
  ),
  allExcursionsNote: t(
    'Alle Ausflugsziele sind in 2–19 Minuten mit dem Auto erreichbar.',
    'All excursion destinations are reachable within 2–19 minutes by car.',
    'Todos los destinos están a 2–19 minutos en coche.',
    'Tutte le destinazioni sono raggiungibili in 2–19 minuti in auto.',
    'Toutes les destinations sont accessibles en 2–19 minutes en voiture.',
    'Alle bestemmingen zijn in 2–19 minuten met de auto bereikbaar.',
  ),

  // EV Charging
  evIntro: t(
    'Öffentliche Ladestationen in der Nähe – am Haus selbst ist keine Ladestation vorhanden.',
    'Public charging stations nearby – no charging station at the house.',
    'Estaciones de carga públicas cerca – no hay estación en la casa.',
    'Stazioni di ricarica pubbliche vicine – nessuna stazione alla casa.',
    'Bornes de recharge publiques à proximité – pas de borne à la maison.',
    'Openbare laadstations in de buurt – geen laadstation bij het huis.',
  ),
  fastestStations: t('⚡ Schnellste Ladestationen', '⚡ Fastest Charging Stations', '⚡ Estaciones más rápidas', '⚡ Stazioni più veloci', '⚡ Bornes les plus rapides', '⚡ Snelste laadstations'),
  nearestStations: t('📍 Nächste Ladestationen', '📍 Nearest Charging Stations', '📍 Estaciones más cercanas', '📍 Stazioni più vicine', '📍 Bornes les plus proches', '📍 Dichtstbijzijnde laadstations'),
  allStationsNote: t(
    'Alle Stationen 5–15 Min. Fahrzeit · Quelle: Hörnerdörfer Tourismus',
    'All stations 5–15 min. drive · Source: Hörnerdörfer Tourism',
    'Todas las estaciones a 5–15 min. · Fuente: Turismo Hörnerdörfer',
    'Tutte le stazioni a 5–15 min. · Fonte: Turismo Hörnerdörfer',
    'Toutes les bornes à 5–15 min. · Source : Tourisme Hörnerdörfer',
    'Alle stations 5–15 min. rijden · Bron: Hörnerdörfer Toerisme',
  ),

  // Gut zu wissen / FAQ
  faqCheckinTitle: t('Flexible Anreise', 'Flexible Check-in', 'Llegada flexible', 'Arrivo flessibile', 'Arrivée flexible', 'Flexibel inchecken'),
  faqCheckinBody: t(
    'Standard-Check-in ab {time}. Da ihr per Self-Check-in über die Schlüsselbox reinkommt, klappt auch eine spätere Anreise problemlos.',
    'Standard check-in from {time}. Since you access via self-check-in with the key box, late arrivals work perfectly fine.',
    'Check-in estándar desde las {time}. Como el acceso es mediante auto-check-in con caja de llaves, también es posible llegar más tarde.',
    'Check-in standard dalle {time}. Poiché l\'accesso avviene tramite self-check-in con cassetta, anche un arrivo tardivo va benissimo.',
    'Check-in standard à partir de {time}. Comme l\'accès se fait par self-check-in via boîtier, une arrivée tardive ne pose aucun problème.',
    'Standaard check-in vanaf {time}. Omdat de toegang via self-check-in met sleutelkluis verloopt, is ook later aankomen prima.',
  ),
  faqCheckinEarly: t(
    'Für frühzeitigen Check-in bitte per WhatsApp anfragen – wir geben schnellstmöglich Bescheid.',
    'For early check-in, please ask via WhatsApp – we\'ll let you know as soon as possible.',
    'Para un check-in temprano, escríbenos por WhatsApp – te responderemos lo antes posible.',
    'Per un check-in anticipato, scrivici su WhatsApp – ti risponderemo il prima possibile.',
    'Pour un check-in anticipé, contactez-nous par WhatsApp – nous vous répondrons dès que possible.',
    'Voor vroeg inchecken graag via WhatsApp vragen – we laten het zo snel mogelijk weten.',
  ),
  faqPetsTitle: t('Haustiere', 'Pets', 'Mascotas', 'Animali domestici', 'Animaux de compagnie', 'Huisdieren'),
  faqPetsAllowed: t(
    'Haustiere sind auf Anfrage willkommen. Bitte vor der Buchung kurz per WhatsApp melden.',
    'Pets are welcome on request. Please get in touch via WhatsApp before booking.',
    'Las mascotas son bienvenidas bajo consulta previa. Contáctenos por WhatsApp antes de reservar.',
    'Gli animali domestici sono benvenuti su richiesta. Si prega di contattarci via WhatsApp prima della prenotazione.',
    'Les animaux de compagnie sont les bienvenus sur demande. Veuillez nous contacter via WhatsApp avant de réserver.',
    'Huisdieren zijn welkom op aanvraag. Neem voor de boeking even contact op via WhatsApp.',
  ),
  faqPetsNotAllowed: t(
    'Leider sind in dieser Unterkunft keine Haustiere erlaubt.',
    'Unfortunately, pets are not allowed in this property.',
    'Lamentablemente, no se admiten mascotas en este alojamiento.',
    'Purtroppo, gli animali domestici non sono ammessi in questa struttura.',
    'Malheureusement, les animaux de compagnie ne sont pas autorisés dans ce logement.',
    'Helaas zijn huisdieren niet toegestaan in dit verblijf.',
  ),
  faqKitchenTitle: t('Küche & Kaffee', 'Kitchen & Coffee', 'Cocina y café', 'Cucina e caffè', 'Cuisine et café', 'Keuken & Koffie'),
  faqCoffeeNespresso: t(
    'Kaffeemaschine: Nespresso (Kapseln in der Küchenschublade).',
    'Coffee machine: Nespresso (capsules in the kitchen drawer).',
    'Cafetera: Nespresso (cápsulas en el cajón de la cocina).',
    'Macchina del caffè: Nespresso (capsule nel cassetto della cucina).',
    'Machine à café : Nespresso (capsules dans le tiroir de la cuisine).',
    'Koffiezetapparaat: Nespresso (capsules in de keukenlade).',
  ),
  faqCoffeeFilter: t(
    'Filterkaffeemaschine (Kaffeepulver bitte selbst mitbringen).',
    'Filter coffee machine (please bring your own ground coffee).',
    'Cafetera de filtro (trae tu propio café molido).',
    'Macchina da caffè a filtro (portare il proprio caffè macinato).',
    'Cafetière filtre (apportez votre propre café moulu).',
    'Filterkoffiezetapparaat (gemalen koffie zelf meenemen).',
  ),
  faqCoffeeVollautomat: t(
    'Kaffeevollautomat (Bohnen vorhanden).',
    'Bean-to-cup coffee machine (beans included).',
    'Cafetera automática de granos (granos incluidos).',
    'Macchina automatica a chicchi (chicchi inclusi).',
    'Machine à café automatique (grains fournis).',
    'Volautomatisch koffiezetapparaat (koffiebonen aanwezig).',
  ),
  faqDishwasherTabsYes: t(
    'Spülmaschinen-Tabs sind vorhanden (unter der Spüle).',
    'Dishwasher tabs are available (under the sink).',
    'Hay pastillas para el lavavajillas (debajo del fregadero).',
    'Le pastiglie per la lavastoviglie sono disponibili (sotto il lavello).',
    'Des pastilles lave-vaisselle sont disponibles (sous l\'évier).',
    'Vaatwastabletten zijn aanwezig (onder de gootsteen).',
  ),
  faqGrillTitle: t('Grill', 'Barbecue', 'Barbacoa', 'Barbecue', 'Barbecue', 'Barbecue'),
  faqGrillAvailable: t(
    'Gemauerter Holzkohlegrill aus Stein auf der Terrasse zur Straße. Holzkohle bitte selbst mitbringen. Grillzange und Bürste liegen neben dem Kamin im Wohnzimmer. Nach der Nutzung bitte sauber hinterlassen.',
    'Stone-built charcoal grill on the street-facing terrace. Please bring your own charcoal. Grill tongs and brush are stored next to the fireplace in the living room. Please leave it clean after use.',
    'Barbacoa de carbón de obra de piedra en la terraza que da a la calle. Trae tu propio carbón. Pinzas y cepillo junto a la chimenea en el salón. Déjala limpia después.',
    'Griglia a carbone in muratura di pietra sulla terrazza verso la strada. Portare il proprio carbone. Pinze e spazzola accanto al camino in soggiorno. Lasciare pulito dopo l\'uso.',
    'Grill au charbon en pierre maçonnée sur la terrasse côté rue. Apportez votre propre charbon. Pinces et brosse près de la cheminée au salon. Laisser propre après utilisation.',
    'Gemetselde houtskoolbarbecue van steen op het terras aan de straatzijde. Breng eigen houtskool mee. Tang en borstel liggen bij de haard in de woonkamer. Na gebruik schoon achterlaten.',
  ),

  faqKurtaxeTitle: t('Kurtaxe', 'Tourist Tax', 'Tasa turística', 'Tassa di soggiorno', 'Taxe de séjour', 'Toeristenbelasting'),
  faqKurtaxeBody: t(
    '3,80 € pro Person/Nacht ab 14 Jahren, 1,90 € für Kinder von 6–13 Jahren, bis einschließlich 5 Jahre frei. Die Kurtaxe ist nicht im Übernachtungspreis enthalten – du erhältst einen Zahlungslink vom Gastgeber.',
    '3.80 € per person/night from age 14, 1.90 € for children aged 6–13, free up to and including age 5. The tourist tax is not included in the accommodation price – you\'ll receive a payment link from the host.',
    '3,80 € por persona/noche a partir de 14 años, 1,90 € para niños de 6–13 años, gratis hasta los 5 años inclusive. La tasa turística no está incluida en el precio – recibirás un enlace de pago del anfitrión.',
    '3,80 € per persona/notte dai 14 anni, 1,90 € per bambini dai 6 ai 13 anni, gratis fino a 5 anni compresi. La tassa di soggiorno non è inclusa nel prezzo – riceverai un link di pagamento dall\'host.',
    '3,80 € par personne/nuit à partir de 14 ans, 1,90 € pour les enfants de 6 à 13 ans, gratuit jusqu\'à 5 ans inclus. La taxe de séjour n\'est pas incluse dans le prix – vous recevrez un lien de paiement de l\'hôte.',
    '3,80 € per persoon/nacht vanaf 14 jaar, 1,90 € voor kinderen van 6–13 jaar, gratis tot en met 5 jaar. De toeristenbelasting is niet inbegrepen in de prijs – je ontvangt een betaallink van de gastheer.',
  ),

  faqInvoiceTitle: t('Rechnung / Quittung', 'Invoice / Receipt', 'Factura / Recibo', 'Fattura / Ricevuta', 'Facture / Reçu', 'Factuur / Kwitantie'),
  faqInvoiceBody: t(
    'Gerne stellen wir dir eine Rechnung aus. Bitte teile uns dazu vorab mit: vollständige Anschrift (bei Firmen: Firmenname und Ansprechpartner) sowie ggf. deine Umsatzsteuer-ID.',
    'We\'re happy to provide an invoice. Please send us in advance: your full address (for companies: company name and contact person) and your VAT ID if applicable.',
    'Con gusto te enviamos una factura. Por favor, indícanos con antelación: dirección completa (para empresas: nombre de la empresa y persona de contacto) y, si corresponde, tu número de IVA.',
    'Siamo lieti di emettere una fattura. Ti chiediamo di comunicarci in anticipo: indirizzo completo (per aziende: ragione sociale e persona di riferimento) e, se applicabile, il tuo numero di partita IVA.',
    'Nous vous établissons volontiers une facture. Merci de nous communiquer à l\'avance : adresse complète (pour les entreprises : raison sociale et interlocuteur) et, le cas échéant, votre numéro de TVA.',
    'We stellen graag een factuur op. Stuur ons van tevoren: volledig adres (voor bedrijven: bedrijfsnaam en contactpersoon) en indien van toepassing je btw-nummer.',
  ),

  // Check-out
  checkoutUntil: t('Check-out bis', 'Check-out by', 'Check-out antes de las', 'Check-out entro le', 'Check-out avant', 'Check-out vóór'),
  checkoutItems: {
    dishwasher: t('Spülmaschine anmachen', 'Start the dishwasher', 'Encender el lavavajillas', 'Avviare la lavastoviglie', 'Lancer le lave-vaisselle', 'Vaatwasser aanzetten'),
    yellowBag: t('Gelber Sack in die mit gelbem Symbol markierte Tonne im Keller', 'Yellow bag into the marked bin in the basement', 'Bolsa amarilla en el contenedor del sótano', 'Sacco giallo nel bidone in cantina', 'Sac jaune dans la poubelle au sous-sol', 'Gele zak in de gemarkeerde bak in de kelder'),
    waste: t('Restmüll, Altpapier und Biomüll in die Tonnen an der Straße', 'Residual waste, paper and organic waste in the bins by the street', 'Basura, papel y orgánico en los contenedores junto a la calle', 'Rifiuti, carta e organico nei bidoni lungo la strada', 'Déchets, papier et bio dans les poubelles au bord de la rue', 'Restafval, papier en GFT in de bakken aan de straat'),
    lights: t('Alle Lichter ausschalten', 'Turn off all lights', 'Apagar todas las luces', 'Spegnere tutte le luci', 'Éteindre toutes les lumières', 'Alle lichten uitdoen'),
    windows: t('Fenster schließen', 'Close windows', 'Cerrar ventanas', 'Chiudere le finestre', 'Fermer les fenêtres', 'Ramen sluiten'),
    heating: t('Heizung auf normale Temperatur stellen', 'Set heating to normal temperature', 'Ajustar la calefacción a temperatura normal', 'Impostare il riscaldamento a temperatura normale', 'Régler le chauffage à température normale', 'Verwarming op normale temperatuur zetten'),
    towels: t('Benutzte Handtücher im Bad auf den Boden oder in die Badewanne', 'Used towels on the bathroom floor or in the bathtub', 'Toallas usadas en el suelo del baño o en la bañera', 'Asciugamani usati sul pavimento del bagno o nella vasca', 'Serviettes utilisées au sol ou dans la baignoire', 'Gebruikte handdoeken op de badkamervloer of in het bad'),
    guestCards: t('Falls physische Gästekarten erhalten, diese auf den Tisch legen', 'If you received guest cards, leave them on the table', 'Si recibiste tarjetas de huésped, déjalas en la mesa', 'Se hai ricevuto carte ospite, lasciale sul tavolo', 'Si vous avez reçu des cartes d\'hôte, les laisser sur la table', 'Eventuele gastenkaarten op tafel leggen'),
    keys: t('Schlüssel zurück in die Schlüsselbox', 'Key back in the key box', 'Llave de vuelta en la caja', 'Chiave nella cassetta', 'Clé dans le boîtier', 'Sleutel terug in de sleutelkluis'),
  },
  checkoutThanks: t(
    'Vielen Dank für euren Aufenthalt im ACHZEIT.',
    'Thank you for your stay at ACHZEIT.',
    'Gracias por vuestra estancia en ACHZEIT.',
    'Grazie per il vostro soggiorno all\'ACHZEIT.',
    'Merci pour votre séjour à l\'ACHZEIT.',
    'Bedankt voor jullie verblijf in ACHZEIT.',
  ),

  // Anleitungen
  anleitungenIntro: t(
    'Schritt-für-Schritt-Anleitungen für die wichtigsten Geräte und Funktionen im Haus.',
    'Step-by-step instructions for the most important devices and features in the house.',
    'Instrucciones paso a paso para los dispositivos más importantes de la casa.',
    'Istruzioni passo dopo passo per i dispositivi più importanti della casa.',
    'Instructions étape par étape pour les appareils les plus importants de la maison.',
    'Stap-voor-stap handleidingen voor de belangrijkste apparaten in het huis.',
  ),
  boraCooktop: t('🍳 BORA-Kochfeld bedienen', '🍳 Using the BORA cooktop', '🍳 Usar la placa BORA', '🍳 Usare il piano BORA', '🍳 Utiliser la plaque BORA', '🍳 BORA kookplaat gebruiken'),
  boraSteps: [
    t('Kochfeld am Hauptschalter (rechte Seite) einschalten.', 'Turn on the cooktop at the main switch (right side).', 'Encender la placa en el interruptor principal (lado derecho).', 'Accendere il piano cottura dall\'interruttore principale (lato destro).', 'Allumer la plaque à l\'interrupteur principal (côté droit).', 'Kookplaat inschakelen met de hoofdschakelaar (rechterkant).'),
    t('Kochzone durch Berühren des +-Symbols aktivieren.', 'Activate the cooking zone by touching the + symbol.', 'Activar la zona de cocción tocando el símbolo +.', 'Attivare la zona cottura toccando il simbolo +.', 'Activer la zone de cuisson en touchant le symbole +.', 'Kookzone activeren door het +-symbool aan te raken.'),
    t('Temperatur mit Schieberegler oder +/- einstellen.', 'Set temperature with slider or +/-.', 'Ajustar temperatura con el deslizador o +/-.', 'Impostare la temperatura con il cursore o +/-.', 'Régler la température avec le curseur ou +/-.', 'Temperatuur instellen met schuifregelaar of +/-.'),
    t('Absaugung startet automatisch – Stufe kann manuell angepasst werden.', 'Extraction starts automatically – level can be adjusted manually.', 'La extracción se inicia automáticamente – el nivel se puede ajustar manualmente.', 'L\'aspirazione si avvia automaticamente – il livello può essere regolato manualmente.', 'L\'extraction démarre automatiquement – le niveau peut être ajusté manuellement.', 'Afzuiging start automatisch – niveau kan handmatig worden aangepast.'),
    t('Nach dem Kochen: Kochzone auf 0 stellen, Absaugung läuft automatisch nach.', 'After cooking: set zone to 0, extraction runs automatically.', 'Después de cocinar: zona a 0, extracción continúa automáticamente.', 'Dopo la cottura: zona a 0, aspirazione continua automaticamente.', 'Après la cuisson : zone à 0, extraction continue automatiquement.', 'Na het koken: zone op 0 zetten, afzuiging loopt automatisch na.'),
  ],
  boraNote: t('📌 Bitte keine Alufolie oder Töpfe direkt auf die Absaugöffnung stellen.', '📌 Please don\'t place aluminum foil or pots directly on the extraction opening.', '📌 No colocar papel de aluminio o ollas sobre la abertura de extracción.', '📌 Non posizionare fogli di alluminio o pentole sull\'apertura di aspirazione.', '📌 Ne pas placer de papier aluminium ou de casseroles sur l\'ouverture d\'extraction.', '📌 Geen aluminiumfolie of pannen op de afzuigopening plaatsen.'),

  saunaGuide: t('🧖 Sauna – Bedienung', '🧖 Using the sauna', '🧖 Usar la sauna', '🧖 Usare la sauna', '🧖 Utiliser le sauna', '🧖 De sauna gebruiken'),
  saunaSteps: [
    t('Einschalten: Power-Taste oben rechts am Bedienfeld ca. 3 Sekunden gedrückt halten, bis der Ladekreis voll ist – die Sauna startet. Das Licht geht dabei automatisch an und die Sauna läuft maximal 3 Stunden.', 'Switch on: press and hold the power button (top right of the panel) for ~3 seconds until the circle is fully loaded – the sauna starts. The light comes on automatically and the sauna runs for a maximum of 3 hours.', 'Encender: mantener pulsado el botón de encendido (arriba a la derecha) ~3 segundos hasta que el círculo esté completo – la sauna se enciende. La luz se enciende automáticamente y la sauna funciona un máximo de 3 horas.', 'Accensione: tenere premuto il pulsante di accensione (in alto a destra) ~3 secondi finché il cerchio è completo – la sauna si avvia. La luce si accende automaticamente e la sauna funziona per un massimo di 3 ore.', 'Allumer : maintenir le bouton d\'alimentation (en haut à droite) ~3 secondes jusqu\'à ce que le cercle soit complet – le sauna démarre. La lumière s\'allume automatiquement et le sauna fonctionne 3 heures au maximum.', 'Inschakelen: aan/uit-knop (rechtsboven) ~3 seconden ingedrukt houden tot de cirkel vol is – de sauna start. Het licht gaat automatisch aan en de sauna draait maximaal 3 uur.'),
    t('Temperatur: Drehregler drehen → Menü öffnet sich → „Temperatur" auswählen → Regler drehen zum Anpassen → Regler drücken zum Bestätigen. Empfohlen: 70–85 °C.', 'Temperature: turn the dial → menu opens → select "Temperature" → turn to adjust → press to confirm. Recommended: 70–85 °C.', 'Temperatura: girar el regulador → se abre el menú → seleccionar "Temperatura" → girar para ajustar → pulsar para confirmar. Recomendado: 70–85 °C.', 'Temperatura: girare la manopola → si apre il menu → selezionare "Temperatura" → girare per regolare → premere per confermare. Consigliato: 70–85 °C.', 'Température : tourner le bouton → le menu s\'ouvre → sélectionner « Température » → tourner pour régler → appuyer pour confirmer. Recommandé : 70–85 °C.', 'Temperatuur: draaiknop draaien → menu opent → "Temperatuur" selecteren → draaien om in te stellen → drukken om te bevestigen. Aanbevolen: 70–85 °C.'),
    t('Aufheizzeit ca. 30–45 Minuten abwarten.', 'Wait approx. 30–45 minutes for heating up.', 'Esperar aprox. 30–45 minutos para que se caliente.', 'Attendere circa 30–45 minuti per il riscaldamento.', 'Attendre env. 30–45 minutes pour le chauffage.', 'Wacht ca. 30–45 minuten opwarmtijd.'),
    t('Immer auf einem Handtuch sitzen.', 'Always sit on a towel.', 'Sentarse siempre sobre una toalla.', 'Sedersi sempre su un asciugamano.', 'Toujours s\'asseoir sur une serviette.', 'Altijd op een handdoek zitten.'),
    t('Abschalten: Power-Taste kurz drücken – oder die Sauna schaltet sich automatisch nach 3 Stunden ab. Das Licht bleibt danach noch 30 Minuten an.', 'Switch off: press the power button briefly – or the sauna turns off automatically after 3 hours. The light stays on for another 30 minutes.', 'Apagar: pulsar brevemente el botón – o apagado automático tras 3 horas. La luz permanece encendida 30 minutos más.', 'Spegnere: premere brevemente il pulsante – o spegnimento automatico dopo 3 ore. La luce rimane accesa altri 30 minuti.', 'Éteindre : appuyer brièvement sur le bouton – ou extinction automatique après 3 heures. La lumière reste allumée encore 30 minutes.', 'Uitschakelen: knop kort indrukken – of automatisch na 3 uur. Het licht blijft nog 30 minuten aan.'),
  ],
  saunaGuideNote: t('📌 Bitte kein Wasser direkt auf die Steuereinheit gießen.', '📌 Please don\'t pour water directly on the control unit.', '📌 No verter agua directamente sobre la unidad de control.', '📌 Non versare acqua direttamente sull\'unità di controllo.', '📌 Ne pas verser d\'eau directement sur l\'unité de contrôle.', '📌 Geen water direct op de besturingseenheid gieten.'),

  fireplaceGuide: t('🔥 Kamin anzünden', '🔥 Lighting the fireplace', '🔥 Encender la chimenea', '🔥 Accendere il camino', '🔥 Allumer la cheminée', '🔥 Haard aansteken'),
  fireplaceSteps: [
    t('Kaminzufuhr (Hebel unten) vollständig öffnen.', 'Open air supply (lever at bottom) fully.', 'Abrir la entrada de aire (palanca abajo) completamente.', 'Aprire completamente la presa d\'aria (leva in basso).', 'Ouvrir complètement l\'arrivée d\'air (levier en bas).', 'Luchttoevoer (hendel onderaan) volledig openen.'),
    t('Anzünder und kleines Holz als Basis schichten.', 'Layer firelighters and small wood as base.', 'Colocar encendedor y leña pequeña como base.', 'Disporre accendifuoco e legna piccola come base.', 'Disposer allume-feu et petit bois comme base.', 'Aanmaakblokjes en klein hout als basis opbouwen.'),
    t('Von oben nach unten anzünden.', 'Light from top to bottom.', 'Encender de arriba a abajo.', 'Accendere dall\'alto verso il basso.', 'Allumer de haut en bas.', 'Van boven naar beneden aansteken.'),
    t('Erst nach ca. 15 Min. größere Scheite nachlegen.', 'Add larger logs only after approx. 15 min.', 'Añadir troncos más grandes después de 15 min.', 'Aggiungere tronchi più grandi dopo circa 15 min.', 'Ajouter de plus grosses bûches après env. 15 min.', 'Pas na ca. 15 min. grotere blokken bijleggen.'),
    t('Zufuhr nach dem Anbrennen halb schließen für gleichmäßige Wärme.', 'Half-close air supply after igniting for even heat.', 'Cerrar a la mitad la entrada de aire para calor uniforme.', 'Chiudere a metà la presa d\'aria per un calore uniforme.', 'Fermer à moitié l\'arrivée d\'air pour une chaleur uniforme.', 'Luchttoevoer na het ontbranden half sluiten voor gelijkmatige warmte.'),
  ],
  fireplaceGuideNote: t('📌 Starterset (Anzünder, Anfeuerholz, Holz) als Erstausstattung vorhanden. Nur trockenes Holz verwenden. Asche erst kalt entsorgen.', '📌 Starter set (firelighters, kindling, wood) included. Only use dry wood. Dispose of ashes only when cold.', '📌 Kit de inicio incluido. Usar solo leña seca. Desechar cenizas solo cuando estén frías.', '📌 Kit di avviamento incluso. Usare solo legna secca. Smaltire ceneri solo quando fredde.', '📌 Kit de démarrage fourni. N\'utiliser que du bois sec. Ne jeter les cendres que refroidies.', '📌 Starterset aanwezig. Alleen droog hout gebruiken. As alleen koud weggooien.'),

  coffeeGuide: t('☕ Kaffeemaschine (Nespresso)', '☕ Coffee Machine (Nespresso)', '☕ Cafetera (Nespresso)', '☕ Macchina del caffè (Nespresso)', '☕ Machine à café (Nespresso)', '☕ Koffiezetapparaat (Nespresso)'),
  coffeeSteps: [
    t('Maschine am Knopf oben einschalten – Aufheizen abwarten.', 'Turn on machine at top button – wait to heat up.', 'Encender la máquina con el botón superior – esperar que caliente.', 'Accendere la macchina dal pulsante in alto – attendere il riscaldamento.', 'Allumer la machine au bouton du haut – attendre le chauffage.', 'Machine inschakelen met de knop bovenop – opwarmen afwachten.'),
    t('Kapsel einlegen und Hebel schließen.', 'Insert capsule and close lever.', 'Insertar cápsula y cerrar la palanca.', 'Inserire la capsula e chiudere la leva.', 'Insérer la capsule et fermer le levier.', 'Capsule plaatsen en hendel sluiten.'),
    t('Tasse unterstellen und gewünschte Größe drücken (klein/groß).', 'Place cup and press desired size (small/large).', 'Colocar taza y pulsar tamaño deseado (pequeño/grande).', 'Posizionare la tazza e premere la dimensione desiderata (piccolo/grande).', 'Placer la tasse et appuyer sur la taille souhaitée (petit/grand).', 'Kopje eronder plaatsen en gewenste grootte kiezen (klein/groot).'),
    t('Nach dem Brühen: Hebel öffnen, Kapsel fällt automatisch in den Behälter.', 'After brewing: open lever, capsule drops automatically.', 'Después de preparar: abrir palanca, la cápsula cae automáticamente.', 'Dopo l\'erogazione: aprire la leva, la capsula cade automaticamente.', 'Après infusion : ouvrir le levier, la capsule tombe automatiquement.', 'Na het zetten: hendel openen, capsule valt automatisch.'),
  ],
  coffeeNote: t('📌 Kapseln findet ihr in der Küchenschublade. Auffangbehälter bitte bei Bedarf leeren.', '📌 Capsules are in the kitchen drawer. Please empty the drip tray when needed.', '📌 Las cápsulas están en el cajón de la cocina. Vaciar el recipiente cuando sea necesario.', '📌 Le capsule sono nel cassetto della cucina. Svuotare il contenitore se necessario.', '📌 Les capsules sont dans le tiroir de la cuisine. Vider le bac si nécessaire.', '📌 Capsules zijn in de keukenlade. Opvangbak indien nodig legen.'),

  dishwasherGuide: t('🍽️ Geschirrspüler starten', '🍽️ Starting the dishwasher', '🍽️ Encender el lavavajillas', '🍽️ Avviare la lavastoviglie', '🍽️ Lancer le lave-vaisselle', '🍽️ Vaatwasser starten'),
  dishwasherSteps: [
    t('Tab in das Fach in der Innentür einlegen.', 'Place tab in the compartment on the inner door.', 'Colocar la pastilla en el compartimento de la puerta interior.', 'Inserire la pastiglia nel vano della porta interna.', 'Placer la pastille dans le compartiment de la porte intérieure.', 'Tab in het vakje in de binnendeur plaatsen.'),
    t('Tür schließen.', 'Close door.', 'Cerrar puerta.', 'Chiudere la porta.', 'Fermer la porte.', 'Deur sluiten.'),
    t('Einschaltknopf drücken und Programm wählen (Eco oder Auto empfohlen).', 'Press power button and select program (Eco or Auto recommended).', 'Pulsar encendido y elegir programa (Eco o Auto recomendado).', 'Premere il pulsante e selezionare il programma (Eco o Auto consigliato).', 'Appuyer sur le bouton et sélectionner le programme (Eco ou Auto recommandé).', 'Aan-knop indrukken en programma kiezen (Eco of Auto aanbevolen).'),
    t('Start drücken.', 'Press Start.', 'Pulsar Start.', 'Premere Start.', 'Appuyer sur Start.', 'Start indrukken.'),
  ],
  dishwasherNote: t('📌 Tabs befinden sich unter der Spüle.', '📌 Tabs are under the sink.', '📌 Las pastillas están debajo del fregadero.', '📌 Le pastiglie sono sotto il lavello.', '📌 Les pastilles sont sous l\'évier.', '📌 Tabs bevinden zich onder de gootsteen.'),

  heatingGuide: t('🌡️ Heizung & Thermostat', '🌡️ Heating & Thermostat', '🌡️ Calefacción y termostato', '🌡️ Riscaldamento e termostato', '🌡️ Chauffage et thermostat', '🌡️ Verwarming & Thermostaat'),
  heatingSteps: [
    t('Die Fußbodenheizung wird zentral gesteuert.', 'The underfloor heating is centrally controlled.', 'La calefacción por suelo radiante se controla centralmente.', 'Il riscaldamento a pavimento è controllato centralmente.', 'Le chauffage au sol est contrôlé centralement.', 'De vloerverwarming wordt centraal aangestuurd.'),
    t('Thermostat im Wohnbereich auf gewünschte Temperatur einstellen.', 'Set thermostat in living area to desired temperature.', 'Ajustar el termostato en la sala a la temperatura deseada.', 'Impostare il termostato nel soggiorno alla temperatura desiderata.', 'Régler le thermostat dans le salon à la température souhaitée.', 'Thermostaat in de woonkamer op gewenste temperatuur instellen.'),
    t('Änderungen wirken sich erst nach ca. 1–2 Stunden aus.', 'Changes take effect after approx. 1–2 hours.', 'Los cambios tardan aprox. 1–2 horas en surtir efecto.', 'I cambiamenti hanno effetto dopo circa 1–2 ore.', 'Les changements prennent effet après env. 1–2 heures.', 'Wijzigingen hebben pas na ca. 1–2 uur effect.'),
  ],
  heatingNote: t('📌 Bitte nicht über 23 °C einstellen – die Fußbodenheizung reagiert langsam.', '📌 Please don\'t set above 23 °C – the underfloor heating reacts slowly.', '📌 No ajustar por encima de 23 °C – la calefacción reacciona lentamente.', '📌 Non impostare oltre 23 °C – il riscaldamento a pavimento reagisce lentamente.', '📌 Ne pas régler au-dessus de 23 °C – le chauffage au sol réagit lentement.', '📌 Niet boven 23 °C instellen – de vloerverwarming reageert langzaam.'),

  // Notfall
  emergencyCall: t('Notruf', 'Emergency', 'Emergencia', 'Emergenza', 'Urgence', 'Noodoproep'),
  medicalService: t('Ärztl. Bereitschaftsdienst', 'Medical Service', 'Servicio médico', 'Servizio medico', 'Service médical', 'Huisartsenwacht'),
  firstAid: t('Erste-Hilfe-Set im Badezimmerschrank.', 'First aid kit in the bathroom cabinet.', 'Botiquín en el armario del baño.', 'Kit di pronto soccorso nell\'armadietto del bagno.', 'Trousse de secours dans l\'armoire de la salle de bain.', 'EHBO-set in de badkamerkast.'),
  fireExtinguisher: t('Feuerlöscher im Hauswirtschaftsraum.', 'Fire extinguisher in the utility room.', 'Extintor en el cuarto de servicio.', 'Estintore nella lavanderia.', 'Extincteur dans la buanderie.', 'Brandblusser in de bijkeuken.'),

  // Events
  eventsIntro: t(
    'Veranstaltungen, Führungen und Kurse in Fischen und den Hörnerdörfern.',
    'Events, tours and courses in Fischen and the Hörnerdörfer.',
    'Eventos, visitas guiadas y cursos en Fischen y los Hörnerdörfer.',
    'Eventi, visite guidate e corsi a Fischen e negli Hörnerdörfer.',
    'Événements, visites guidées et cours à Fischen et les Hörnerdörfer.',
    'Evenementen, rondleidingen en cursussen in Fischen en de Hörnerdörfer.',
  ),
  eventCalendar: t('Veranstaltungskalender', 'Event Calendar', 'Calendario de eventos', 'Calendario eventi', 'Calendrier des événements', 'Evenementenkalender'),
  eventSource: t('Quelle: Hörnerdörfer Tourismus', 'Source: Hörnerdörfer Tourism', 'Fuente: Turismo Hörnerdörfer', 'Fonte: Turismo Hörnerdörfer', 'Source : Tourisme Hörnerdörfer', 'Bron: Hörnerdörfer Toerisme'),

  // PIN entry
  pinTitle: t('Gästemappe', 'Guest Guide', 'Guía del huésped', 'Guida per gli ospiti', 'Guide de l\'hôte', 'Gastenboek'),
  pinInstruction: t(
    'Bitte gib die letzten 4 Ziffern deiner Telefonnummer ein.',
    'Please enter the last 4 digits of your phone number.',
    'Por favor, introduce los últimos 4 dígitos de tu número de teléfono.',
    'Inserisci le ultime 4 cifre del tuo numero di telefono.',
    'Veuillez entrer les 4 derniers chiffres de votre numéro de téléphone.',
    'Voer de laatste 4 cijfers van je telefoonnummer in.',
  ),
  pinInvalid: t('Ungültige PIN. Bitte versuche es erneut.', 'Invalid PIN. Please try again.', 'PIN inválido. Inténtelo de nuevo.', 'PIN non valido. Riprovare.', 'PIN invalide. Veuillez réessayer.', 'Ongeldige PIN. Probeer het opnieuw.'),
  pinAttemptsLeft: t('Versuch übrig', 'attempt left', 'intento restante', 'tentativo rimasto', 'tentative restante', 'poging over'),
  pinTooManyAttempts: t('Zu viele Fehlversuche.', 'Too many failed attempts.', 'Demasiados intentos fallidos.', 'Troppi tentativi falliti.', 'Trop de tentatives échouées.', 'Te veel mislukte pogingen.'),
  pinRetryIn: t('Bitte warte', 'Please wait', 'Por favor espera', 'Attendi', 'Veuillez patienter', 'Wacht'),
  pinRetryMinutes: t('Minute(n).', 'minute(s).', 'minuto(s).', 'minuto/i.', 'minute(s).', 'minuut/minuten.'),
  pinButton: t('Weiter', 'Continue', 'Continuar', 'Continua', 'Continuer', 'Verder'),
  pinChecking: t('Prüfe…', 'Checking…', 'Verificando…', 'Verifica…', 'Vérification…', 'Controleren…'),
  pinHint: t(
    'Die PIN entspricht den letzten 4 Ziffern der Telefonnummer, die bei der Buchung angegeben wurde.',
    'The PIN is the last 4 digits of the phone number provided at booking.',
    'El PIN son los últimos 4 dígitos del número de teléfono proporcionado en la reserva.',
    'Il PIN corrisponde alle ultime 4 cifre del numero di telefono fornito alla prenotazione.',
    'Le PIN correspond aux 4 derniers chiffres du numéro de téléphone fourni lors de la réservation.',
    'De PIN zijn de laatste 4 cijfers van het telefoonnummer dat bij de boeking is opgegeven.',
  ),

  // Chatbot
  chatTitle: t('ACHZEIT Concierge', 'ACHZEIT Concierge', 'ACHZEIT Concierge', 'ACHZEIT Concierge', 'ACHZEIT Concierge', 'ACHZEIT Concierge'),
  chatPlaceholder: t('Nachricht an ACHZEIT Concierge', 'Message to ACHZEIT Concierge', 'Mensaje a ACHZEIT Concierge', 'Messaggio a ACHZEIT Concierge', 'Message à ACHZEIT Concierge', 'Bericht aan ACHZEIT Concierge'),
  chatWelcome: t('Wie kann ich behilflich sein?', 'How can I help you?', '¿En qué puedo ayudarte?', 'Come posso aiutarti?', 'Comment puis-je vous aider ?', 'Hoe kan ik helpen?'),
  chatError: t(
    'Entschuldigung, es gab ein technisches Problem. Bitte versuche es erneut oder kontaktiere den [Gastgeber per WhatsApp](https://wa.me/4915679656368).',
    'Sorry, there was a technical problem. Please try again or contact the [host via WhatsApp](https://wa.me/4915679656368).',
    'Lo siento, hubo un problema técnico. Por favor, inténtelo de nuevo o contacte al [anfitrión por WhatsApp](https://wa.me/4915679656368).',
    'Spiacenti, si è verificato un problema tecnico. Riprovare o contattare l\'[host su WhatsApp](https://wa.me/4915679656368).',
    'Désolé, un problème technique est survenu. Veuillez réessayer ou contacter l\'[hôte via WhatsApp](https://wa.me/4915679656368).',
    'Sorry, er was een technisch probleem. Probeer het opnieuw of neem contact op met de [gastheer via WhatsApp](https://wa.me/4915679656368).',
  ),
  chatSuggestions: {
    sauna: t('Wie funktioniert die Sauna?', 'How does the sauna work?', '¿Cómo funciona la sauna?', 'Come funziona la sauna?', 'Comment fonctionne le sauna ?', 'Hoe werkt de sauna?'),
    supermarket: t('Wo ist der nächste Supermarkt?', 'Where is the nearest supermarket?', '¿Dónde está el supermercado más cercano?', 'Dov\'è il supermercato più vicino?', 'Où est le supermarché le plus proche ?', 'Waar is de dichtstbijzijnde supermarkt?'),
    fireplace: t('Wie zünde ich den Kamin an?', 'How do I light the fireplace?', '¿Cómo enciendo la chimenea?', 'Come si accende il camino?', 'Comment allumer la cheminée ?', 'Hoe steek ik de haard aan?'),
    wifi: t('WLAN Passwort?', 'WiFi password?', '¿Contraseña WiFi?', 'Password WiFi?', 'Mot de passe WiFi ?', 'WiFi-wachtwoord?'),
  },
  chatOpenLabel: t('Fragen? Chat öffnen', 'Questions? Open chat', '¿Preguntas? Abrir chat', 'Domande? Apri chat', 'Questions ? Ouvrir le chat', 'Vragen? Chat openen'),
  micStart: t('Spracheingabe', 'Voice input', 'Entrada de voz', 'Input vocale', 'Saisie vocale', 'Spraakinvoer'),
  micStop: t('Aufnahme stoppen', 'Stop recording', 'Detener grabación', 'Interrompi registrazione', 'Arrêter l\'enregistrement', 'Opname stoppen'),

  // Allgäu Walser Pass
  awpassTitle: t('Euer Allgäu Walser Pass', 'Your Allgäu Walser Pass', 'Tu Allgäu Walser Pass', 'Il tuo Allgäu Walser Pass', 'Votre Allgäu Walser Pass', 'Jullie Allgäu Walser Pass'),
  awpassDescription: t('Kostenlose Bergbahnen, Bäder & mehr', 'Free cable cars, pools & more', 'Teleféricos, piscinas y más gratis', 'Funivie, piscine e altro gratis', 'Remontées, piscines et plus gratuits', 'Gratis bergbanen, zwembaden & meer'),
  awpassButton: t('Pass öffnen', 'Open Pass', 'Abrir pase', 'Apri pass', 'Ouvrir le pass', 'Pass openen'),

  // Footer
  footerText: t('Eure Gästemappe · ACHZEIT Family & Friends Retreat. Fischen im Allgäu.', 'Your Guest Guide · ACHZEIT Family & Friends Retreat. Fischen im Allgäu.', 'Tu guía del huésped · ACHZEIT Family & Friends Retreat. Fischen im Allgäu.', 'La tua guida ospiti · ACHZEIT Family & Friends Retreat. Fischen im Allgäu.', 'Votre guide · ACHZEIT Family & Friends Retreat. Fischen im Allgäu.', 'Jullie gastenboek · ACHZEIT Family & Friends Retreat. Fischen im Allgäu.'),

  // Status screens
  noReservationTitle: t('Aktuell kein aktiver Aufenthalt', 'No Active Stay', 'Sin estancia activa', 'Nessun soggiorno attivo', 'Pas de séjour actif', 'Geen actief verblijf'),
  noReservationText: t(
    'Die digitale Gästemappe ist nur während eures Aufenthalts verfügbar.',
    'The digital guest guide is only available during your stay.',
    'La guía digital solo está disponible durante tu estancia.',
    'La guida digitale è disponibile solo durante il soggiorno.',
    'Le guide numérique n\'est disponible que pendant votre séjour.',
    'Het digitale gastenboek is alleen beschikbaar tijdens jullie verblijf.',
  ),
  errorTitle: t('Fehler', 'Error', 'Error', 'Errore', 'Erreur', 'Fout'),
} as const;

export function useT(locale: GuestGuideLocale) {
  return <K extends keyof typeof translations>(key: K): (typeof translations)[K] extends T ? string : (typeof translations)[K] => {
    const val = translations[key];
    if (val && typeof val === 'object' && locale in val && typeof (val as any)[locale] === 'string') {
      return (val as any)[locale];
    }
    return val as any;
  };
}
