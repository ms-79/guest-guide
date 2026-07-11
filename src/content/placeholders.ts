// Allowed dynamic Hostaway placeholders for guest-facing content (hero, guide
// sections). Real values are injected at render time ONLY for an authenticated
// guest session — they are never stored in the content repo. This module is
// deliberately zod-free so it can be imported from Vercel Edge routes, the
// build-time generator, and the frontend alike.
//
// WHY a whitelist: the AI editorial helper and the admin editors may emit
// `{{token}}` placeholders. Restricting them to this list keeps typos and
// invented fields (which would silently render nothing) out of published copy.

export interface PlaceholderDef {
  token: string;
  /** Short German label shown in the admin. */
  label: string;
  /** Whether the resolved value requires a valid guest session (sensitive). */
  requiresGuestSession: boolean;
}

export const ALLOWED_GUEST_PLACEHOLDERS: PlaceholderDef[] = [
  { token: 'guestFirstName', label: 'Vorname des Gastes', requiresGuestSession: true },
  { token: 'wifiName', label: 'WLAN-Name', requiresGuestSession: false },
  { token: 'wifiPassword', label: 'WLAN-Passwort', requiresGuestSession: true },
  { token: 'accessPin', label: 'Zugangscode / PIN', requiresGuestSession: true },
  { token: 'checkInTime', label: 'Check-in-Zeit', requiresGuestSession: false },
  { token: 'checkOutTime', label: 'Check-out-Zeit', requiresGuestSession: false },
  { token: 'arrivalDate', label: 'Anreisedatum', requiresGuestSession: true },
  { token: 'departureDate', label: 'Abreisedatum', requiresGuestSession: true },
];

export const ALLOWED_PLACEHOLDER_TOKENS: string[] = ALLOWED_GUEST_PLACEHOLDERS.map((p) => p.token);

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Return the distinct placeholder tokens used in a text that are NOT on the
 * whitelist. Empty array = all placeholders (if any) are allowed.
 */
export function findUnknownPlaceholders(text: string): string[] {
  const unknown = new Set<string>();
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    const token = m[1];
    if (!ALLOWED_PLACEHOLDER_TOKENS.includes(token)) unknown.add(token);
  }
  return [...unknown];
}
