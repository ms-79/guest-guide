export const config = { runtime: 'edge' };

// Generates the same HMAC token as reservation.ts — must stay in sync.
async function generateToken(reservationId: string): Promise<string> {
  const secret = process.env.REDIRECT_HMAC_SECRET;
  if (!secret) throw new Error('REDIRECT_HMAC_SECRET not configured');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(reservationId));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req: Request): Promise<Response> {
  const redirect = (url: string, status = 302) =>
    new Response(null, { status, headers: { Location: url } });
  const error = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const url = new URL(req.url, `https://${req.headers.get('host') ?? 'localhost'}`);
    const reservationId = url.searchParams.get('r');
    const propertySlug = url.searchParams.get('p');
    const key = url.searchParams.get('k');

    // Shared secret — prevents enumeration of reservation IDs.
    // Must match MAGIC_LINK_KEY env var. Guests never see this key (they get the HMAC token URL).
    const expectedKey = process.env.MAGIC_LINK_KEY;
    if (!expectedKey || key !== expectedKey) {
      return error('Unauthorized', 403);
    }

    if (!reservationId || !propertySlug) {
      return error('Missing required params: r (reservationId) and p (propertySlug)');
    }

    // Validate reservationId is numeric to prevent token generation for arbitrary input
    if (!/^\d+$/.test(reservationId)) {
      return error('Invalid reservationId');
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
