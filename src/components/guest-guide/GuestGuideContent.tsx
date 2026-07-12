import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Key, Wifi, Baby, Flame, Trash2, AlertTriangle, Car, Zap,
  UtensilsCrossed, Phone, MapPin, Star, Mountain,
  ShoppingCart, HelpCircle, Info,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { GuestData } from '@/pages/GuestGuide';
import type { PropertyConfig } from '@/config/properties';
import GuestGuideEvents from './GuestGuideEvents';
import { useGuestGuideLocale } from './GuestGuideLanguageContext';
import { translations, type GuestGuideLocale } from './translations';
import { getRecommendations } from '@/generated/recommendations';
import { getGuideSections } from '@/generated/guide';

// Keys already covered by the rich, bespoke accordion sections below (incl. the
// admin's known standard-section keys that map onto them). Content-layer guide
// sections with these keys are skipped so they don't duplicate the built-ins —
// only genuinely NEW sections (e.g. added in /admin) render additively.
const BUILT_IN_GUIDE_KEYS = new Set([
  'zugang', 'wlan', 'wifi', 'familie', 'kueche', 'faq', 'sauna', 'restaurants',
  'einkaufen', 'ausfluege', 'e-auto', 'checkout', 'checkin', 'parken', 'kontakt',
  'entsorgung', 'anleitungen', 'notfall',
]);

// Fill whitelisted {{placeholders}} with the authenticated guest's own values.
// Unknown or empty values fall back to '…' (never guess). WHY here: guests are
// already authenticated in this view, and these values come from Hostaway at
// runtime — they are never stored in the content repo.
function fillPlaceholders(text: string, g: GuestData): string {
  const first = (g.guestName || '').trim().split(/\s+/)[0] || '';
  const map: Record<string, string> = {
    guestFirstName: first,
    wifiPassword: g.wifiPassword || '',
    accessPin: g.boxCode || '',
    arrivalDate: g.checkin || '',
    departureDate: g.checkout || '',
  };
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, tok: string) => map[tok] || '…');
}

function formatTime(time: string, locale: GuestGuideLocale): string {
  const [hStr, mStr = '00'] = time.split(':');
  const h = parseInt(hStr, 10);
  if (locale === 'en') {
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${mStr} ${ampm}`;
  }
  if (locale === 'fr') return `${h}h${mStr}`;
  if (locale === 'de') return `${time} Uhr`;
  return time; // es, it, nl
}

// Shared card list for recommendations (restaurants, shopping, excursions …).
// Data comes from the Git-backed content layer (getRecommendations); the card
// links to Google Maps and shows an optional badge + localised text.
const RecommendationList = ({ slug, category }: { slug: string; category: string }) => {
  const { locale } = useGuestGuideLocale();
  const items = getRecommendations(slug, locale, category);
  if (items.length === 0) return null;
  return (
    <div className="space-y-4">
      {items.map((r) => (
        <a key={r.id} href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className="block bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-display text-base text-foreground">{r.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{[r.locationLabel, r.categoryLabel].filter(Boolean).join(' · ')}</p>
            </div>
            {r.badge && (
              <span className="flex items-center gap-1 text-xs text-alpine-wood whitespace-nowrap">
                <Star size={12} className="fill-alpine-wood" /> {r.badge}
              </span>
            )}
          </div>
          {r.descriptionMd && <p className="text-sm mt-2">{r.descriptionMd}</p>}
          <div className="flex justify-end mt-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold"><MapPin size={14} /> Google Maps</span>
          </div>
        </a>
      ))}
    </div>
  );
};

interface Props {
  guestData: GuestData;
  activeSection: string;
  onSectionChange: (section: string) => void;
  property: PropertyConfig;
}

const GuestGuideContent = ({ guestData, activeSection, onSectionChange, property }: Props) => {
  const { boxCode, wifiPassword } = guestData;
  const { locale } = useGuestGuideLocale();
  const t = translations;

  // Additional, content-driven sections maintained in /admin (guide/*.json).
  // Only sections whose key isn't already a built-in are shown (no duplication).
  const customSections = getGuideSections(property.slug, locale)
    .filter((s) => !BUILT_IN_GUIDE_KEYS.has(s.key));

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
      <Accordion type="single" collapsible value={activeSection} onValueChange={(val) => onSectionChange(val || '')} className="space-y-4">
        {/* Zugang & Anreise */}
        <AccordionItem value="zugang" id="zugang" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <Key size={20} className="text-alpine-wood" />
              {t.sectionZugang[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
            <p>{t.checkinFrom[locale]} <strong className="text-foreground">{formatTime(property.checkinTime, locale)}</strong> {t.possible[locale]}</p>

            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t.boxCodeLabel[locale]}</p>
              <p className="text-2xl font-mono font-bold text-foreground tracking-[0.3em]">{boxCode}</p>
            </div>

            <div className="space-y-2 text-sm">
              <p>{t.boxCodeNote1[locale]}</p>
              <p>{t.boxCodeNote2[locale]}</p>
            </div>

            <div className="pt-2">
              <h4 className="font-display text-base text-foreground mb-2 flex items-center gap-2">
                <Car size={16} className="text-alpine-wood" /> {t.parking[locale]}
              </h4>
              <ul className="space-y-1 text-sm">
                <li className="flex gap-2"><span className="shrink-0">•</span><span>{t.carportNote[locale]}</span></li>
                <li className="flex gap-2"><span className="shrink-0">•</span><span>{t.bikeNote[locale]}</span></li>
              </ul>
            </div>

            <p className="text-sm">🔒 {t.safeNote[locale]}</p>
          </AccordionContent>
        </AccordionItem>

        {/* WLAN */}
        <AccordionItem value="wlan" id="wlan" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <Wifi size={20} className="text-alpine-wood" />
              {t.sectionWlan[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
            <p className="text-sm text-muted-foreground">{t.wifiSpeed[locale]}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t.networkName[locale]}</p>
                <p className="text-lg font-mono font-bold text-foreground">{property.wifiName}</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t.password[locale]}</p>
                <p className="text-lg font-mono font-bold text-foreground">{wifiPassword || '– – – –'}</p>
              </div>
            </div>
            <div className="pt-2">
              <h4 className="font-display text-base text-foreground mb-2">{t.wifiTrouble[locale]}</h4>
              <ul className="space-y-1 text-sm">
                <li>• {t.wifiRouter[locale]}</li>
                <li>• {t.wifiRestart[locale]}</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Familie */}
        <AccordionItem value="familie" id="familie" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <Baby size={20} className="text-alpine-wood" />
              {t.sectionFamilie[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.bedroomsTitle[locale]}</h4>
              <ul className="space-y-1 text-sm">
                {[t.bedroom1, t.bedroom2, t.bedroom3].map((item, i) => (
                  <li key={i} className="flex gap-2"><span className="shrink-0">•</span><span>{item[locale]}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.comfortTitle[locale]}</h4>
              <ul className="space-y-1 text-sm">
                {[t.hairdryerNote, t.ironNote, t.dryingRackNote, t.extraBeddingNote, t.blackoutNote].map((item, i) => (
                  <li key={i} className="flex gap-2"><span className="shrink-0">•</span><span>{item[locale]}</span></li>
                ))}
              </ul>
            </div>

            <ul className="space-y-2 text-sm">
              {[t.familyItems.crib, t.familyItems.changingMat, t.familyItems.bedGuard, t.familyItems.games].map((item, i) => (
                <li key={i} className="flex gap-2"><span className="shrink-0">•</span><span>{item[locale]}</span></li>
              ))}
            </ul>
            <p className="text-sm italic text-muted-foreground">{t.familyNote[locale]}</p>
          </AccordionContent>
        </AccordionItem>

        {/* Küche & Technik */}
        <AccordionItem value="kueche" id="kueche" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <UtensilsCrossed size={20} className="text-alpine-wood" />
              {t.sectionKueche[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
            <ul className="space-y-2 text-sm">
              <li>• {t.kitchenItems.bora[locale]}</li>
              <li>• {t.kitchenItems.oven[locale]}</li>
              <li>• {t.kitchenItems.microwave[locale]}</li>
              <li>• {t.kitchenItems.toaster[locale]}</li>
              <li>• {t.kitchenItems.fridge[locale]}</li>
              <li>• {t.kitchenItems.coffee[locale]}</li>
              <li>• {t.kitchenItems.waste[locale]}</li>
              <li>• {t.washerDryerNote[locale]}</li>
            </ul>
            <p className="text-sm font-medium text-foreground">{t.kitchenDishwasherNote[locale]}</p>

            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.entertainmentTitle[locale]}</h4>
              <ul className="space-y-1 text-sm">
                <li>• {t.smartTvNote[locale]}</li>
                <li>• {t.soundSystemNote[locale]}</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Gut zu wissen */}
        <AccordionItem value="faq" id="faq" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <Info size={20} className="text-alpine-wood" />
              {t.sectionFaq[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-5">

            {/* Check-in Flexibilität */}
            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.faqCheckinTitle[locale]}</h4>
              <p className="text-sm">
                {t.faqCheckinBody[locale].replace('{time}', formatTime(property.checkinTime, locale))}
              </p>
              <p className="text-sm mt-1">{t.faqCheckinEarly[locale]}</p>
            </div>

            {/* Haustiere */}
            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.faqPetsTitle[locale]}</h4>
              <p className="text-sm">
                {property.petsAllowed ? t.faqPetsAllowed[locale] : t.faqPetsNotAllowed[locale]}
              </p>
            </div>

            {/* Küche & Kaffee */}
            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.faqKitchenTitle[locale]}</h4>
              <ul className="space-y-1 text-sm">
                <li>•{' '}
                  {property.coffeeType === 'nespresso' && t.faqCoffeeNespresso[locale]}
                  {property.coffeeType === 'filter' && t.faqCoffeeFilter[locale]}
                  {property.coffeeType === 'vollautomat' && t.faqCoffeeVollautomat[locale]}
                </li>
                {property.dishwasherTabsIncluded && (
                  <li>• {t.faqDishwasherTabsYes[locale]}</li>
                )}
              </ul>
            </div>

            {/* Grill */}
            {property.grillAvailable && (
              <div>
                <h4 className="font-display text-base text-foreground mb-2">{t.faqGrillTitle[locale]}</h4>
                <p className="text-sm">{t.faqGrillAvailable[locale]}</p>
              </div>
            )}

            {/* Kurtaxe */}
            {property.showKurtaxe && (
              <div>
                <h4 className="font-display text-base text-foreground mb-2">{t.faqKurtaxeTitle[locale]}</h4>
                <p className="text-sm">{t.faqKurtaxeBody[locale]}</p>
              </div>
            )}

            {/* Rechnung */}
            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.faqInvoiceTitle[locale]}</h4>
              <p className="text-sm">{t.faqInvoiceBody[locale]}</p>
            </div>

          </AccordionContent>
        </AccordionItem>

        {/* Sauna & Kamin */}
        <AccordionItem value="sauna" id="sauna" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <Flame size={20} className="text-alpine-wood" />
              {t.sectionSauna[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.sauna[locale]}</h4>
              <ul className="space-y-1 text-sm">
                <li>• {t.saunaNote1[locale]}</li>
                <li>• {t.saunaNote2[locale]}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-base text-foreground mb-2">{t.fireplace[locale]}</h4>
              <ul className="space-y-1 text-sm">
                <li>• {t.fireplaceNote1[locale]}</li>
                <li>• {t.fireplaceNote2[locale]}</li>
                <li>• {t.fireplaceNote3[locale]}</li>
              </ul>
            </div>
            <p className="text-sm">{t.terraceNote[locale]}</p>
            <p className="text-sm">{t.balconyNote[locale]}</p>
            <p className="text-sm italic text-muted-foreground pt-2">{t.saunaEnjoyNote[locale]}</p>
          </AccordionContent>
        </AccordionItem>

        {/* Restaurant-Empfehlungen */}
        <AccordionItem value="restaurants" id="restaurants" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <UtensilsCrossed size={20} className="text-alpine-wood" />
              {t.sectionRestaurants[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-5">
            <p className="text-sm">{t.restaurantsIntro[locale]}</p>

            <RecommendationList slug={property.slug} category="restaurant" />

            <p className="text-xs text-muted-foreground italic pt-1 flex items-center gap-1.5">
              <MapPin size={12} /> {t.allRestaurantsNote[locale]}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Einkaufen & Versorgung */}
        <AccordionItem value="einkaufen" id="einkaufen" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <ShoppingCart size={20} className="text-alpine-wood" />
              {t.sectionEinkaufen[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-5">
            <p className="text-sm">{t.shoppingIntro[locale]}</p>

            <RecommendationList slug={property.slug} category="shopping" />

            <p className="text-xs text-muted-foreground italic pt-1 flex items-center gap-1.5">
              <MapPin size={12} /> {t.allShopsNote[locale]}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Ausflüge & Veranstaltungen */}
        <AccordionItem value="ausfluege" id="ausfluege" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <Mountain size={20} className="text-alpine-wood" />
              {t.sectionAusfluege[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-5">
            <p className="text-sm">{t.excursionsIntro[locale]}</p>

            <div className="space-y-4">
              <GuestGuideEvents />

              <RecommendationList slug={property.slug} category="excursion" />
            </div>

            <p className="text-xs text-muted-foreground italic pt-1 flex items-center gap-1.5">
              <MapPin size={12} /> {t.allExcursionsNote[locale]}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* E-Auto Ladestationen */}
        <AccordionItem value="e-auto" id="e-auto" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <Zap size={20} className="text-alpine-wood" />
              {t.sectionEAuto[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-5">
            <p className="text-sm">{t.evIntro[locale]}</p>

            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-display text-base text-foreground">{t.fastestStations[locale]}</h4>
                <a href="https://maps.google.com/?q=Trigema+Langenwang+Fischen" target="_blank" rel="noopener noreferrer" className="block bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition">
                  <p className="text-sm"><strong className="text-foreground">150 kW {locale === 'de' ? 'Schnelllader' : 'Fast Charger'}</strong> – Trigema, Dorfstr. 25 (EnBW)</p>
                  <div className="flex justify-end mt-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold"><MapPin size={14} /> Google Maps</span></div>
                </a>
                <a href="https://maps.google.com/?q=McDonald's+Langenwang+Fischen" target="_blank" rel="noopener noreferrer" className="block bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition">
                  <p className="text-sm"><strong className="text-foreground">50 kW</strong> – McDonald's, An der Breitach 1 (AllgäuStrom)</p>
                  <div className="flex justify-end mt-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold"><MapPin size={14} /> Google Maps</span></div>
                </a>
                <a href="https://maps.google.com/?q=Parkplatz+P2+Sonthofener+Str+Oberstdorf" target="_blank" rel="noopener noreferrer" className="block bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition">
                  <p className="text-sm"><strong className="text-foreground">22 kW</strong> – Parkplatz P2 Oberstdorf, Sonthofener Str. 20 (AllgäuStrom)</p>
                  <div className="flex justify-end mt-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold"><MapPin size={14} /> Google Maps</span></div>
                </a>
              </div>

              <div className="space-y-3">
                <h4 className="font-display text-base text-foreground">{t.nearestStations[locale]}</h4>
                <a href="https://maps.google.com/?q=Kurhaus+Fiskina+Fischen" target="_blank" rel="noopener noreferrer" className="block bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition">
                  <p className="text-sm">Kurhaus Fiskina, Bahnhofstr. 3 – 22 kW (New Motion)</p>
                  <div className="flex justify-end mt-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold"><MapPin size={14} /> Google Maps</span></div>
                </a>
                <a href="https://maps.google.com/?q=Parkplatz+Fischen-Au+Illerstr+Fischen" target="_blank" rel="noopener noreferrer" className="block bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition">
                  <p className="text-sm">Parkplatz Fischen-Au, Illerstr. 11 – 11–22 kW (New Motion)</p>
                  <div className="flex justify-end mt-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold"><MapPin size={14} /> Google Maps</span></div>
                </a>
                <a href="https://maps.google.com/?q=Haus+des+Gastes+Langenwang+Fischen" target="_blank" rel="noopener noreferrer" className="block bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition">
                  <p className="text-sm">Haus des Gastes, Dorfstr. 19 – 11–22 kW (New Motion)</p>
                  <div className="flex justify-end mt-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold"><MapPin size={14} /> Google Maps</span></div>
                </a>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic pt-1 flex items-center gap-1.5">
              <MapPin size={12} /> {t.allStationsNote[locale]}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Check-out */}
        <AccordionItem value="checkout" id="checkout" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <Trash2 size={20} className="text-alpine-wood" />
              {t.sectionCheckout[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
            <p>{t.checkoutUntil[locale]} <strong className="text-foreground">{formatTime(property.checkoutTime, locale)}</strong>.</p>
            <ul className="space-y-2 text-sm">
              <li>• {t.checkoutItems.dishwasher[locale]}</li>
              <li>• {t.checkoutItems.yellowBag[locale]}</li>
              <li>• {t.checkoutItems.waste[locale]}</li>
              <li>• {t.checkoutItems.lights[locale]}</li>
              <li>• {t.checkoutItems.windows[locale]}</li>
              <li>• {t.checkoutItems.heating[locale]}</li>
              <li>• {t.checkoutItems.towels[locale]}</li>
              <li>• {t.checkoutItems.guestCards[locale]}</li>
              <li>• {t.checkoutItems.keys[locale]}</li>
            </ul>
            <p className="text-sm italic text-muted-foreground pt-2">{t.checkoutThanks[locale]}</p>
          </AccordionContent>
        </AccordionItem>

        {/* Anleitungen */}
        <AccordionItem value="anleitungen" id="anleitungen" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <HelpCircle size={20} className="text-alpine-wood" />
              {t.sectionAnleitungen[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-6">
            <p className="text-sm">{t.anleitungenIntro[locale]}</p>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-display text-base text-foreground">{t.boraCooktop[locale]}</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                {t.boraSteps.map((step, i) => <li key={i}>{step[locale]}</li>)}
              </ol>
              <p className="text-xs text-muted-foreground italic">{t.boraNote[locale]}</p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-display text-base text-foreground">{t.saunaGuide[locale]}</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                {t.saunaSteps.map((step, i) => <li key={i}>{step[locale]}</li>)}
              </ol>
              <p className="text-xs text-muted-foreground italic">{t.saunaGuideNote[locale]}</p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-display text-base text-foreground">{t.fireplaceGuide[locale]}</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                {t.fireplaceSteps.map((step, i) => <li key={i}>{step[locale]}</li>)}
              </ol>
              <p className="text-xs text-muted-foreground italic">{t.fireplaceGuideNote[locale]}</p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-display text-base text-foreground">{t.coffeeGuide[locale]}</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                {t.coffeeSteps.map((step, i) => <li key={i}>{step[locale]}</li>)}
              </ol>
              <p className="text-xs text-muted-foreground italic">{t.coffeeNote[locale]}</p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-display text-base text-foreground">{t.dishwasherGuide[locale]}</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                {t.dishwasherSteps.map((step, i) => <li key={i}>{step[locale]}</li>)}
              </ol>
              <p className="text-xs text-muted-foreground italic">{t.dishwasherNote[locale]}</p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-display text-base text-foreground">{t.heatingGuide[locale]}</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                {t.heatingSteps.map((step, i) => <li key={i}>{step[locale]}</li>)}
              </ol>
              <p className="text-xs text-muted-foreground italic">{t.heatingNote[locale]}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Weitere, im Admin gepflegte Sektionen (guide/*.json) */}
        {customSections.map((s) => (
          <AccordionItem key={s.key} value={s.key} id={s.key} className="border border-border rounded-lg px-6 overflow-hidden">
            <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
              <span className="flex items-center gap-3">
                <Info size={20} className="text-alpine-wood" />
                {s.title}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{fillPlaceholders(s.bodyMd, guestData)}</ReactMarkdown>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}

        {/* Notfall */}
        <AccordionItem value="notfall" id="notfall" className="border border-border rounded-lg px-6 overflow-hidden">
          <AccordionTrigger className="text-lg md:text-xl font-display hover:no-underline">
            <span className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-alpine-wood" />
              {t.sectionNotfall[locale]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a href="tel:112" className="flex items-center gap-3 bg-destructive/10 rounded-lg p-4 hover:bg-destructive/15 transition-colors">
                <Phone size={18} className="text-destructive" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.emergencyCall[locale]}</p>
                  <p className="text-lg font-bold text-foreground">112</p>
                </div>
              </a>
              <a href="tel:116117" className="flex items-center gap-3 bg-muted rounded-lg p-4 hover:brightness-95 hover:shadow-md transition">
                <Phone size={18} className="text-alpine-wood" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.medicalService[locale]}</p>
                  <p className="text-lg font-bold text-foreground">116 117</p>
                </div>
              </a>
            </div>
            <ul className="space-y-1 text-sm">
              <li>• {t.firstAid[locale]}</li>
              <li>• {t.fireExtinguisher[locale]}</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
};

export default GuestGuideContent;
