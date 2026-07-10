export const config = { runtime: 'edge' };

import { constantTimeStringEqual, createSessionToken, sessionCookie } from '../../src/server/session';

const env = (name: string): string => (process.env[name] || '').replace(/^\uFEFF/, '').trim();

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extraHeaders } });

// ── Minimal in-memory brute-force guard (per Edge instance, per IP) ──────────
// The passcode is the only gate, so slow down guessing. Ephemeral per instance
// is acceptable for this low-traffic admin surface.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now - e.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  e.count += 1;
  return e.count > MAX_ATTEMPTS;
}

function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = env('ADMIN_SESSION_SECRET');
  const passcode = env('ADMIN_PASSCODE');
  // Never log the passcode or secret.
  if (!secret || !passcode) return json({ error: 'Admin-Bereich ist nicht konfiguriert.' }, 500);

  if (rateLimited(clientIp(req))) {
    return json({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' }, 429);
  }

  let input = '';
  try {
    const body = (await req.json()) as { passcode?: unknown };
    input = typeof body.passcode === 'string' ? body.passcode : '';
  } catch {
    return json({ error: 'Ungültige Anfrage.' }, 400);
  }

  const ok = await constantTimeStringEqual(input, passcode, secret);
  // Slow down every failed attempt slightly.
  if (!ok) {
    await new Promise((r) => setTimeout(r, 500));
    return json({ error: 'Falscher Zugangscode.' }, 401);
  }

  const token = await createSessionToken(secret);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(req, token) });
}
