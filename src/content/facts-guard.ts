// Zod-free guard for chatbot facts. Kept separate from schemas.ts (which pulls
// in zod) so Edge routes can import it without bundling zod.
//
// Chatbot facts are free-form Markdown and must never contain sensitive /
// booking-specific data — those come from Hostaway at request time, never from
// the content repo. This is defence in depth, not a substitute for human review.

export const FORBIDDEN_FACT_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'Türcode', re: /\bt(?:ü|ue)rcode\b/i },
  { label: 'door code', re: /\bdoor\s?code\b/i },
  { label: 'PIN', re: /\bpin\b/i },
  { label: 'Zahlungsstatus', re: /\bzahlungsstatus\b/i },
  { label: 'payment status', re: /\bpayment\s?status\b/i },
  { label: 'Gastdaten', re: /\bgastdaten\b/i },
  { label: 'IBAN', re: /\biban\b/i },
  { label: 'Kreditkarte', re: /\bkreditkarte\b/i },
];

/** Returns the labels of any forbidden patterns found in a facts document. */
export function findForbiddenFactMatches(markdown: string): string[] {
  return FORBIDDEN_FACT_PATTERNS.filter((p) => p.re.test(markdown)).map((p) => p.label);
}
