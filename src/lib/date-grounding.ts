/**
 * Transcript grounding guard for AI-generated call summaries.
 *
 * The ACDbot pipeline summarizes calls with an LLM, which can hallucinate
 * concrete dates that were never spoken (e.g. ACDT #103's "Glamsterdam mainnet
 * targeting January 2026", a date absent from the transcript). This checks a
 * summary line's month/year tokens against the transcript text and returns any
 * that are not found there, so the UI can flag them for a human to verify.
 *
 * Scope is deliberately dates only: months and 4-digit years are reliably
 * checkable, and dates are the high-signal failure. A manual correction that
 * isn't in the transcript either (e.g. a fork date set by an editor) is flagged
 * too — which is correct: it means "not stated on the call, verify."
 */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Lowercase + collapse whitespace so transcript matching is stable. */
export function normalizeForGrounding(text: string | null | undefined): string {
  return (text ?? '').toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Date tokens (months, 20xx years) present in `text` but NOT in the normalized
 * transcript. Empty array means every date in the line is grounded, or there is
 * no transcript to check against (in which case we never flag).
 */
export function ungroundedDateTokens(
  text: string,
  transcriptNormalized: string | null,
): string[] {
  if (!text || !transcriptNormalized) return [];
  const lower = text.toLowerCase();
  const flagged = new Set<string>();

  for (const match of lower.matchAll(/\b(20\d{2})\b/g)) {
    const year = match[1];
    if (!transcriptNormalized.includes(year)) flagged.add(year);
  }

  for (const month of MONTHS) {
    const re = new RegExp(`\\b${month}\\b`);
    if (re.test(lower) && !re.test(transcriptNormalized)) {
      flagged.add(month.charAt(0).toUpperCase() + month.slice(1));
    }
  }

  return [...flagged];
}
