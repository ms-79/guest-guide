export interface PropertyConfig {
  slug: string;
  displayName: string;
  whatsappNumber: string;
  logo: string;
  /** Path to the favicon used while this property's guide is open */
  favicon: string;
  primaryColor: string;
  hostawayListingId: number;

  // Property-specific operational details
  /** WiFi network name shown in the guide */
  wifiName: string;
  /** Standard check-in time, 24h format e.g. '16:00' */
  checkinTime: string;
  /** Standard check-out time, 24h format e.g. '11:00' */
  checkoutTime: string;
  /** Whether pets are allowed */
  petsAllowed: boolean;
  /** Whether an outdoor grill is available */
  grillAvailable: boolean;
  /** Coffee machine type present in the property */
  coffeeType: 'nespresso' | 'filter' | 'vollautomat';
  /** Whether dishwasher tabs are stocked */
  dishwasherTabsIncluded: boolean;
  /** Show the Kurtaxe/tourist-tax section; amounts live in translations.ts. undefined/false = hidden */
  showKurtaxe?: boolean;
  /** Google Analytics Measurement ID (e.g. 'G-XXXXXXXXXX'); undefined = no GA */
  googleAnalyticsId?: string;
}

const PROPERTIES: Record<string, PropertyConfig> = {
  '463607-achzeit': {
    slug: '463607-achzeit',
    displayName: 'ACHZEIT Family & Friends Retreat',
    whatsappNumber: '4915679656368',
    logo: '/logos/achzeit.webp', // ACHZEIT keeps its own logo
    favicon: '/favicon.png',     // ACHZEIT keeps its own favicon
    primaryColor: '#2F4F3E',
    hostawayListingId: 463607,
    wifiName: 'ACHZEIT',
    checkinTime: '16:00',
    checkoutTime: '11:00',
    petsAllowed: false,
    grillAvailable: true,
    coffeeType: 'nespresso',
    dishwasherTabsIncluded: true,
    showKurtaxe: true,
    googleAnalyticsId: 'G-ZT13CVSF52',
  },
  '464732-felders-boutique-appartement': {
    slug: '464732-felders-boutique-appartement',
    displayName: "Felder's Boutique Appartement",
    whatsappNumber: '', // TODO: add WhatsApp number
    logo: '/logos/allgaeu-stays.svg',
    favicon: '/favicon-allgaeu.svg',
    primaryColor: '#2F4F3E',
    hostawayListingId: 464732,
    wifiName: "Felder's Appartement",
    checkinTime: '15:00',
    checkoutTime: '11:00',
    petsAllowed: false,
    grillAvailable: false,
    coffeeType: 'nespresso',
    dishwasherTabsIncluded: true,
  },
  '464733-felders-boutique-house': {
    slug: '464733-felders-boutique-house',
    displayName: "Felder's Boutique House",
    whatsappNumber: '', // TODO: add WhatsApp number
    logo: '/logos/allgaeu-stays.svg',
    favicon: '/favicon-allgaeu.svg',
    primaryColor: '#2F4F3E',
    hostawayListingId: 464733,
    wifiName: "Felder's House",
    checkinTime: '15:00',
    checkoutTime: '11:00',
    petsAllowed: true,
    grillAvailable: false,
    coffeeType: 'nespresso',
    dishwasherTabsIncluded: true,
  },
  '507092-phils-apartment': {
    slug: '507092-phils-apartment',
    displayName: 'Phils Apartment',
    whatsappNumber: '', // TODO: add WhatsApp number
    logo: '/logos/allgaeu-stays.svg',
    favicon: '/favicon-allgaeu.svg',
    primaryColor: '#2F4F3E',
    hostawayListingId: 507092,
    wifiName: 'PhilsApartment',
    checkinTime: '15:00',
    checkoutTime: '10:00',
    petsAllowed: false,
    grillAvailable: true,
    coffeeType: 'filter',
    dishwasherTabsIncluded: true,
  },
};

export function getProperty(slug: string): PropertyConfig | null {
  return PROPERTIES[slug] ?? null;
}

export function getListingIdFromSlug(slug: string): string | null {
  const id = slug.split('-')[0];
  return /^\d+$/.test(id) ? id : null;
}

// ---------------------------------------------------------------------------
// Brands / domains (multi-property)
// ---------------------------------------------------------------------------
// Each brand owns one canonical host and the set of property slugs served
// under it. This is the single source of truth for which property lives on
// which domain. All hosts point at the same Vercel project (`guest-guide`);
// GuestGuide.tsx redirects a property to its canonical host so branding and
// guest links stay consistent.
export interface BrandConfig {
  /** Canonical host (no protocol), e.g. 'guide.achzeit.de' */
  host: string;
  /** Brand display name */
  name: string;
  /** Property slugs served under this brand */
  propertySlugs: string[];
}

export const BRANDS: BrandConfig[] = [
  {
    host: 'guide.achzeit.de',
    name: 'ACHZEIT',
    propertySlugs: ['463607-achzeit'],
  },
  {
    host: 'guide.felders-escapes.com',
    name: "Felder's Escapes",
    propertySlugs: [
      '464733-felders-boutique-house',
      '464732-felders-boutique-appartement',
    ],
  },
  {
    host: 'guide.allgaeu-stays.com',
    name: 'Allgäu Stays',
    propertySlugs: ['507092-phils-apartment'],
  },
];

/** Find the brand that owns a given host (case-insensitive, port-stripped). */
export function getBrandForHost(host: string): BrandConfig | null {
  const h = host.toLowerCase().split(':')[0];
  return BRANDS.find(b => b.host === h) ?? null;
}

/** Canonical host a property slug belongs to, or null if unassigned. */
export function getCanonicalHostForSlug(slug: string): string | null {
  return BRANDS.find(b => b.propertySlugs.includes(slug))?.host ?? null;
}
