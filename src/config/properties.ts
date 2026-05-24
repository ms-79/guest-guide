export interface PropertyConfig {
  slug: string;
  displayName: string;
  whatsappNumber: string;
  logo: string;
  primaryColor: string;
  hostawayListingId?: number;
}

const PROPERTIES: Record<string, PropertyConfig> = {
  achzeit: {
    slug: 'achzeit',
    displayName: 'ACHZEIT',
    whatsappNumber: '4915679656368',
    logo: '/logos/achzeit.webp',
    primaryColor: '#363330',
    hostawayListingId: 463607,
  },
};

export function getProperty(slug: string): PropertyConfig | null {
  return PROPERTIES[slug] ?? null;
}
