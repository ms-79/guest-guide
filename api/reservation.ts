export const config = { runtime: 'edge' };

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
// Per-listing caches keyed by listingId
const cachedReservations: Record<string, { data: any[]; fetchedAt: number }> = {};
const cachedListings: Record<string, { doorCode: string; wifiPassword: string; fetchedAt: number }> = {};
const RESERVATION_CACHE_TTL = 30_000;
const LISTING_CACHE_TTL = 120_000;

// ---------------------------------------------------------------------------
// PIN brute-force protection (in-memory, per-instance)
// Note: Vercel Edge may spawn multiple instances — this guards within one
// instance. Sufficient for low-traffic vacation rental use case.
// ---------------------------------------------------------------------------
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS   = 15 * 60 * 1000;  // 15 min rolling window
const PIN_LOCKOUT_MS  = 15 * 60 * 1000;  // 15 min lockout after max attempts
const PIN_FAILURE_DELAY_MS = 1_000;       // slow down each wrong guess

interface RateEntry { count: number; windowStart: number; lockedUntil: number; }
const pinRateMap = new Map<string, RateEntry>();

function getClientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function checkPinRate(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const e = pinRateMap.get(ip);
  if (!e) return { allowed: true };
  if (e.lockedUntil > now) return { allowed: false, retryAfter: Math.ceil((e.lockedUntil - now) / 1000) };
  if (now - e.windowStart > PIN_WINDOW_MS) { pinRateMap.delete(ip); return { allowed: true }; }
  return { allowed: e.count < PIN_MAX_ATTEMPTS };
}

function recordPinFailure(ip: string): void {
  const now = Date.now();
  const e = pinRateMap.get(ip);
  if (!e || now - e.windowStart > PIN_WINDOW_MS) {
    pinRateMap.set(ip, { count: 1, windowStart: now, lockedUntil: 0 });
  } else {
    e.count++;
    if (e.count >= PIN_MAX_ATTEMPTS) e.lockedUntil = now + PIN_LOCKOUT_MS;
  }
}

function clearPinRate(ip: string): void { pinRateMap.delete(ip); }

function getListingIdFromSlug(slug: string): string | null {
  const id = (slug || '').split('-')[0];
  return /^\d+$/.test(id) ? id : null;
}

/** Strip UTF-8 BOM (U+FEFF) and surrounding whitespace from an env var value. */
function env(name: string): string {
  return (process.env[name] || '').replace(/^﻿/, '').trim();
}

// Strip BOM / stray whitespace from env var value, then fall back to hardcoded default.
function getHostawayBaseUrl(): string {
  const raw = env('HOSTAWAY_BASE_URL');
  return raw.startsWith('https://') ? raw : 'https://api.hostaway.com/v1';
}

async function getHostawayToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken!;
  const accountId = env('HOSTAWAY_CLIENT_ID');
  const apiKey = env('HOSTAWAY_API_TOKEN');
  const baseUrl = getHostawayBaseUrl();
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
  const baseUrl = getHostawayBaseUrl();
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
  const baseUrl = getHostawayBaseUrl();
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

// Encode the first 8 bytes of an HMAC into exactly 6 base62 chars.
// 62^6 ≈ 5.68e10 (~36 bits) — short enough for a tidy URL, large enough that
// the token endpoint stays infeasible to brute-force even without rate limiting.
// Must stay byte-for-byte identical to the copy in magic-link.ts.
const TOKEN_B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function shortToken(sig: ArrayBuffer): string {
  const bytes = new Uint8Array(sig);
  let num = 0n;
  for (let i = 0; i < 8; i++) num = (num << 8n) | BigInt(bytes[i]);
  num %= 62n ** 6n;
  let out = '';
  for (let i = 0; i < 6; i++) { out = TOKEN_B62[Number(num % 62n)] + out; num /= 62n; }
  return out;
}

// Generate a deterministic, unforgeable token from reservationId using HMAC-SHA256.
// Web Crypto API is available in Vercel Edge Runtime (no Node crypto needed).
async function generateToken(reservationId: string): Promise<string> {
  const secret = env('REDIRECT_HMAC_SECRET');
  if (!secret) throw new Error('REDIRECT_HMAC_SECRET not configured');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(reservationId));
  return shortToken(sig);
}

async function verifyToken(reservationId: string, token: string): Promise<boolean> {
  try {
    const expected = await generateToken(reservationId);
    return expected === token;
  } catch {
    return false;
  }
}

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
    // Use host header as base — handles both absolute and relative req.url (Edge runtime quirk)
    const host = req.headers.get('host') ?? 'localhost';
    const url = new URL(req.url.startsWith('http') ? req.url : `https://${host}${req.url}`);
    const pin = url.searchParams.get('pin');
    const reservationId = url.searchParams.get('reservationId');
    const token = url.searchParams.get('token');
    const propertySlug = url.searchParams.get('property') || '';

    // Extract listing ID from slug (format: "{listingId}-{name}")
    const listingId = getListingIdFromSlug(propertySlug);
    if (!listingId) return json({ error: 'invalid_property', message: 'Unbekannte Property.' }, 400);

    const accessToken = await getHostawayToken();

    if (reservationId && token) {
      if (!await verifyToken(reservationId, token)) return json({ error: 'invalid_token', message: 'Ungültiger Zugangslink.' }, 403);
      const baseUrl = getHostawayBaseUrl();
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

    // Rate-limit PIN guesses per client IP
    const ip = getClientIp(req);
    const rateCheck = checkPinRate(ip);
    if (!rateCheck.allowed) {
      return json({ error: 'rate_limited', message: 'Zu viele Fehlversuche.', retryAfter: rateCheck.retryAfter }, 429);
    }

    const matched = activeReservations.find((r: any) => {
      const digits = (r.guestPhone || r.phone || '').replace(/\D/g, '');
      const expectedPin = digits.slice(-4);
      return expectedPin && pin === expectedPin;
    });

    if (!matched) {
      recordPinFailure(ip);
      await new Promise(r => setTimeout(r, PIN_FAILURE_DELAY_MS)); // slow-down on wrong PIN
      return json({ error: 'invalid_pin', message: 'Ungültige PIN.' }, 403);
    }
    clearPinRate(ip); // successful login → reset counter
    const resp = buildGuestResponse(matched, matched.doorCode || matched.doorSecurityCode || listing.doorCode, listing.wifiPassword);
    const reservationToken = await generateToken(String(matched.id));
    return json({ ...resp, reservationId: String(matched.id), token: reservationToken });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
}
