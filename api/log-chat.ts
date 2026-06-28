export const config = { runtime: 'edge' };

const env = (name: string): string => (process.env[name] || '').replace(/^﻿/, '').trim();

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Convert inline Markdown (bold, italic, links) to HTML. Escapes HTML entities first. */
function inlineMd(text: string): string {
  return escHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2F4F3E">$1</a>');
}

/** Convert a Markdown string to email-safe HTML. */
function markdownToHtml(md: string): string {
  const parts: string[] = [];
  let inList = false;

  for (const raw of md.split('\n')) {
    const line = raw.trim();

    if (!line) {
      if (inList) { parts.push('</ul>'); inList = false; }
      continue;
    }

    if (line.startsWith('### ')) {
      if (inList) { parts.push('</ul>'); inList = false; }
      parts.push(`<h3 style="font-size:14px;font-weight:600;margin:14px 0 4px;padding:0">${inlineMd(line.slice(4))}</h3>`);
    } else if (line === '---') {
      if (inList) { parts.push('</ul>'); inList = false; }
      parts.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0">');
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      if (!inList) { parts.push('<ul style="margin:6px 0;padding-left:18px">'); inList = true; }
      parts.push(`<li style="margin:2px 0">${inlineMd(line.slice(2))}</li>`);
    } else {
      if (inList) { parts.push('</ul>'); inList = false; }
      parts.push(`<p style="margin:5px 0">${inlineMd(line)}</p>`);
    }
  }

  if (inList) parts.push('</ul>');
  return parts.join('\n');
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
      `<div style="border-left:3px solid #2F4F3E;padding:8px 16px;margin:0;font-size:14px;line-height:1.6">${markdownToHtml(answer ?? '')}</div>`,
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
