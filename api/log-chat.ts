export const config = { runtime: 'edge' };

const env = (name: string): string => (process.env[name] || '').replace(/^﻿/, '').trim();

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { guestName, propertyName, question, answer } = await req.json() as {
      guestName?: string;
      propertyName?: string;
      question?: string;
      answer?: string;
    };

    const apiKey = env('RESEND_API_KEY');
    if (!apiKey) return new Response('Not configured', { status: 500 });

    const now = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

    const html = [
      `<p><strong>Zeit:</strong> ${now}</p>`,
      `<p><strong>Property:</strong> ${escHtml(propertyName ?? '–')}</p>`,
      `<p><strong>Gast:</strong> ${escHtml(guestName ?? '–')}</p>`,
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0">`,
      `<p><strong>❓ Frage:</strong></p>`,
      `<blockquote style="border-left:3px solid #d1d5db;padding:8px 16px;margin:0 0 16px">${escHtml(question ?? '')}</blockquote>`,
      `<p><strong>🤖 Antwort:</strong></p>`,
      `<blockquote style="border-left:3px solid #2F4F3E;padding:8px 16px;margin:0;white-space:pre-wrap">${escHtml(answer ?? '')}</blockquote>`,
    ].join('\n');

    const truncatedQ = (question ?? '').slice(0, 55);
    const suffix = (question ?? '').length > 55 ? '…' : '';
    const subject = guestName
      ? `💬 ${guestName} – ${truncatedQ}${suffix}`
      : `💬 Gast-Frage – ${truncatedQ}${suffix}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Gästemappe <info@allgaeu-stays.com>',
        to: ['markus.siegmann@gmail.com'],
        subject,
        html,
      }),
    });

    return new Response(res.ok ? 'ok' : 'email_failed', { status: res.ok ? 200 : 502 });
  } catch {
    return new Response('error', { status: 500 });
  }
}
