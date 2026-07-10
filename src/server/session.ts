// Server-only admin session helpers. Edge-safe: uses Web Crypto (crypto.subtle)
// and Web APIs only — NO Node built-ins — so it works in Vercel Edge Functions.
//
// This file lives under src/ (not api/) purely so the API routes can import it;
// it must never be imported by frontend code. It contains no secrets — the
// secret is read from the environment inside the API routes and passed in.

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
  const bin = atob(norm + '='.repeat(pad));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Constant-time comparison of two secret strings. HMAC'ing both with the same
 * key equalises length and hides the plaintext, so neither length nor content
 * leaks through timing.
 */
export async function constantTimeStringEqual(a: string, b: string, secret: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([hmac(secret, a), hmac(secret, b)]);
  return timingSafeEqual(ha, hb);
}

/** Create a signed, expiring session token (payload.signature, both base64url). */
export async function createSessionToken(secret: string): Promise<string> {
  const payload = bytesToB64url(encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })));
  const sig = bytesToB64url(await hmac(secret, payload));
  return `${payload}.${sig}`;
}

async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(b64urlToBytes(sig), expected)) return false;
  try {
    const parsed = JSON.parse(decoder.decode(b64urlToBytes(payload))) as { exp?: number };
    return typeof parsed.exp === 'number' && Date.now() < parsed.exp;
  } catch {
    return false;
  }
}

export function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/** True when the request carries a valid, unexpired admin session cookie. */
export async function hasValidSession(req: Request, secret: string): Promise<boolean> {
  const token = parseCookie(req.headers.get('cookie'), COOKIE_NAME);
  if (!token) return false;
  return verifySessionToken(token, secret);
}

/** Whether to add the `Secure` cookie flag — omitted on localhost so http dev works. */
function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  const host = (req.headers.get('host') || '').toLowerCase();
  return !(host.startsWith('localhost') || host.startsWith('127.0.0.1'));
}

export function sessionCookie(req: Request, token: string): string {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearSessionCookie(req: Request): string {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`;
}
