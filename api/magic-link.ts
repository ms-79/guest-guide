export const config = { runtime: 'edge' };

/** Strip UTF-8 BOM (U+FEFF) and surrounding whitespace from an env var value. */
const env = (name: string): string => (process.env[name] || '').replace(/^﻿/, '').trim();

// Static mapping: Hostaway listingId → property slug.
// Update when adding new properties.
const LISTING_SLUGS: Record<string, string> = {
  '463607': '463607-achzeit-family-retreat',
  '464732': '464732-felders-boutique-appartement',
  '464733': '464733-felders-boutique-house',
  '507092': '507092-phils-apartment',
};

// Encode the first 8 bytes of an HMAC into exactly 6 base62 chars.
// Must stay byte-for-byte identical to the copy in reservation.ts.
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

// Generates the same HMAC token as reservation.ts — must stay in sync.
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

export default async function handler(req: Request): Promise<Response> {
  const redirect = (url: string, status = 302) =>
    new Response(null, { status, headers: { Location: url } });
  const error = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const url = new URL(req.url, `https://${req.headers.get('host') ?? 'localhost'}`);
    const reservationId = url.searchParams.get('r');
    const listingId = url.searchParams.get('p');   // accepts listingId (e.g. "463607")
    const key = url.searchParams.get('k');

    // Short shared secret — prevents reservation ID enumeration.
    // Guests never see this key (they receive the HMAC token URL after redirect).
    const expectedKey = env('MAGIC_LINK_KEY');
    if (!expectedKey || key !== expectedKey) {
      return error('Unauthorized', 403);
    }

    if (!reservationId || !listingId) {
      return error('Missing required params: r (reservationId) and p (listingId)');
    }

    if (!/^\d+$/.test(reservationId) || !/^\d+$/.test(listingId)) {
      return error('Invalid params');
    }

    const propertySlug = LISTING_SLUGS[listingId];
    if (!propertySlug) {
      return error('Unknown listing', 404);
    }

    const token = await generateToken(reservationId);
    const host = req.headers.get('host') ?? 'localhost';
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const destination = `${proto}://${host}/${propertySlug}?t=${reservationId}.${token}`;

    return redirect(destination);
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Unknown error', 500);
  }
}
