export interface PropertyConfig {
  slug: string;
  displayName: string;
  whatsappNumber: string;
  logo: string;
  primaryColor: string;
  hostawayListingId: number;
}

const PROPERTIES: Record<string, PropertyConfig> = {
  '463607-achzeit-family-retreat': {
    slug: '463607-achzeit-family-retreat',
    displayName: 'ACHZEIT Family Retreat',
    whatsappNumber: '4915679656368',
    logo: '/logos/achzeit.webp',
    primaryColor: '#363330',
    hostawayListingId: 463607,
  },
  '464732-felders-boutique-appartement': {
    slug: '464732-felders-boutique-appartement',
    displayName: "Felder's Boutique Appartement",
    whatsappNumber: '', // TODO: add WhatsApp number
    logo: '/logos/felders-appartement.webp', // TODO: add logo
    primaryColor: '#363330',
    hostawayListingId: 464732,
  },
  '464733-felders-boutique-house': {
    slug: '464733-felders-boutique-house',
    displayName: "Felder's Boutique House",
    whatsappNumber: '', // TODO: add WhatsApp number
    logo: '/logos/felders-house.webp', // TODO: add logo
    primaryColor: '#363330',
    hostawayListingId: 464733,
  },
  '507092-phils-apartment': {
    slug: '507092-phils-apartment',
    displayName: "Phils Apartment",
    whatsappNumber: '', // TODO: add WhatsApp number
    logo: '/logos/phils-apartment.webp', // TODO: add logo
    primaryColor: '#363330',
    hostawayListingId: 507092,
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
    propertySlugs: ['463607-achzeit-family-retreat'],
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
