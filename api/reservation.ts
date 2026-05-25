export const config = { runtime: 'edge' };

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
// Per-listing caches keyed by listingId
const cachedReservations: Record<string, { data: any[]; fetchedAt: number }> = {};
const cachedListings: Record<string, { doorCode: string; wifiPassword: string; fetchedAt: number }> = {};
const RESERVATION_CACHE_TTL = 30_000;
const LISTING_CACHE_TTL = 120_000;

function getListingIdFromSlug(slug: string): string | null {
  const id = (slug || '').split('-')[0];
  return /^\d+$/.test(id) ? id : null;
}

async function getHostawayToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken!;
  const accountId = process.env.HOSTAWAY_CLIENT_ID;
  const apiKey = process.env.HOSTAWAY_API_TOKEN;
  const baseUrl = process.env.HOSTAWAY_BASE_URL || 'https://api.hostaway.com/v1';
  if (!accountId || !apiKey) throw new Error('Missing Hostaway credentials');
  const res = await fetch(`${baseUrl}/accessTokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: accountId, client_secret: apiKey, scope: 'general' }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${await res.text()}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + 3500_000;
  return data.access_token;
}

async function getActiveReservations(accessToken: string, listingId: string): Promise<any[]> {
  const now = Date.now();
  const cached = cachedReservations[listingId];
  if (cached && (now - cached.fetchedAt) < RESERVATION_CACHE_TTL) return cached.data;
  const baseUrl = process.env.HOSTAWAY_BASE_URL || 'https://api.hostaway.com/v1';
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const threeDaysAhead = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const res = await fetch(
    `${baseUrl}/reservations?listingId=${listingId}&arrivalStartDate=${thirtyDaysAgo}&arrivalEndDate=${threeDaysAhead}&departureStartDate=${today}&limit=5&sortOrder=arrivalDate&sortDirection=desc&includeResources=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Hostaway error: ${res.status}`);
  const data = await res.json();
  const all = data.result || [];
  const active = all.filter((r: any) => {
    if (r.status === 'cancelled' || r.status === 'declined') return false;
    const arrival = r.arrivalDate?.slice(0, 10);
    const departure = r.departureDate?.slice(0, 10);
    if (!arrival || !departure) return false;
    return (today >= arrival && today <= departure) || (arrival > today && arrival <= threeDaysAhead);
  });
  cachedReservations[listingId] = { data: active, fetchedAt: now };
  return active;
}

async function getListingDetails(accessToken: string, listingId: string): Promise<{ doorCode: string; wifiPassword: string }> {
  const now = Date.now();
  const cached = cachedListings[listingId];
  if (cached && (now - cached.fetchedAt) < LISTING_CACHE_TTL) return cached;
  const baseUrl = process.env.HOSTAWAY_BASE_URL || 'https://api.hostaway.com/v1';
  try {
    const res = await fetch(`${baseUrl}/listings/${listingId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) {
      const data = await res.json();
      const l = data.result;
      const result = { doorCode: l.doorCode || l.doorSecurityCode || '', wifiPassword: l.wifiPassword || '', fetchedAt: now };
      cachedListings[listingId] = result;
      return result;
    }
  } catch { /* ignore */ }
  return { doorCode: '', wifiPassword: '' };
}

const FIXED_TOKEN = 'ABC321';

function extractCustomField(reservation: any, fieldId: number): string {
  const cfv = reservation.customFieldValues;
  if (!Array.isArray(cfv)) return '';
  const field = cfv.find((f: any) => f.customFieldId === fieldId || f.id === fieldId);
  return field?.value || '';
}

function buildGuestResponse(reservation: any, doorCode: string, wifiPassword: string) {
  const guestName = reservation.guestName || [reservation.guestFirstName, reservation.guestLastName].filter(Boolean).join(' ') || 'Gast';
  return {
    status: 'ok',
    guestName,
    guestLanguage: reservation.guestLanguage || reservation.language || 'de',
    checkin: reservation.arrivalDate || '',
    checkout: reservation.departureDate || '',
    numberOfGuests: reservation.numberOfGuests || 0,
    doorCode,
    wifiPassword,
    awpassLink: extractCustomField(reservation, 89486),
  };
}

export default async function handler(req: Request): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const url = new URL(req.url);
    const pin = url.searchParams.get('pin');
    const reservationId = url.searchParams.get('reservationId');
    const token = url.searchParams.get('token');
    const propertySlug = url.searchParams.get('property') || '';

    // Extract listing ID from slug (format: "{listingId}-{name}")
    const listingId = getListingIdFromSlug(propertySlug);
    if (!listingId) return json({ error: 'invalid_property', message: 'Unbekannte Property.' }, 400);

    const accessToken = await getHostawayToken();

    if (reservationId && token) {
      if (token !== FIXED_TOKEN) return json({ error: 'invalid_token', message: 'Ungültiger Zugangslink.' }, 403);
      const baseUrl = process.env.HOSTAWAY_BASE_URL || 'https://api.hostaway.com/v1';
      const resRes = await fetch(`${baseUrl}/reservations/${reservationId}?includeResources=1`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!resRes.ok) return json({ error: 'reservation_not_found' }, 404);
      const resData = await resRes.json();
      const reservation = resData.result;
      // Verify reservation belongs to this listing
      if (String(reservation.listingMapId) !== listingId && String(reservation.listingId) !== listingId) {
        return json({ error: 'reservation_not_found' }, 404);
      }
      const listing = await getListingDetails(accessToken, listingId);
      const resp = buildGuestResponse(reservation, reservation.doorCode || reservation.doorSecurityCode || listing.doorCode, listing.wifiPassword);
      return json({ ...resp, reservationId, token });
    }

    const [activeReservations, listing] = await Promise.all([
      getActiveReservations(accessToken, listingId),
      getListingDetails(accessToken, listingId),
    ]);
    if (activeReservations.length === 0) return json({ error: 'no_active_reservation', message: 'Aktuell kein aktiver Aufenthalt.' }, 404);
    if (!pin) return json({ status: 'pin_required' });

    const matched = activeReservations.find((r: any) => {
      const digits = (r.guestPhone || r.phone || '').replace(/\D/g, '');
      const expectedPin = digits.slice(-4);
      return expectedPin && pin === expectedPin;
    });

    if (!matched) return json({ error: 'invalid_pin', message: 'Ungültige PIN.' }, 403);
    const resp = buildGuestResponse(matched, matched.doorCode || matched.doorSecurityCode || listing.doorCode, listing.wifiPassword);
    return json({ ...resp, reservationId: String(matched.id), token: FIXED_TOKEN });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
}
