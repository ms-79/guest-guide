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
