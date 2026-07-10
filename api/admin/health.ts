export const config = { runtime: 'edge' };

// Diagnostic endpoint — reports whether the admin env vars are visible to the
// Edge runtime WITHOUT leaking their values (only presence + length + the names
// of ADMIN_* keys, to catch typos). Safe to keep; exposes no secrets.

const env = (name: string): string => (process.env[name] || '').replace(/^\uFEFF/, '').trim();

export default async function handler(): Promise<Response> {
  let adminKeys: string[] = [];
  try {
    adminKeys = Object.keys(process.env).filter((k) => /admin/i.test(k));
  } catch {
    adminKeys = [];
  }

  const body = {
    hasPasscode: env('ADMIN_PASSCODE').length > 0,
    hasSecret: env('ADMIN_SESSION_SECRET').length > 0,
    passcodeLen: env('ADMIN_PASSCODE').length,
    secretLen: env('ADMIN_SESSION_SECRET').length,
    adminKeysSeen: adminKeys, // names only (best-effort; may be empty on Edge)
    vercelEnv: env('VERCEL_ENV') || null, // 'production' | 'preview' | 'development'
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
