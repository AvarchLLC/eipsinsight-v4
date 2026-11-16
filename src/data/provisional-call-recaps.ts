/**
 * Provisional protocol-call recaps.
 *
 * Hand-written stop-gaps shown at /calls/<series>/<number> for calls that are
 * NOT yet indexed in `protocol_calls`. The page is DB-first: the moment the
 * ACDbot pipeline + scheduler ingest the call (with the real tldr, key
 * decisions, transcript and recording), `getCachedCall` returns a row and the
 * full DB-backed view takes over, so these entries are automatically replaced.
 *
 * Keep them short: a summary and the key decisions / takeaways, no timestamps.
 * Remove an entry once its call is live in the DB (harmless if left, but tidy).
 */

import type { KeyDecision } from '@/components/upgrade/key-decisions';

export type ProvisionalCallRecap = {
  series: string;
  /** Call number as it appears in the URL, e.g. "103". */
  number: string;
  title: string;
  /** yyyy-mm-dd */
  dateISO: string;
  displayDate: string;
  issueUrl?: string;
  videoUrl?: string | null;
  summary: string;
  keyDecisions: KeyDecision[];
};

export const PROVISIONAL_CALL_RECAPS: ProvisionalCallRecap[] = [
  {
    series: 'acdt',
    number: '103',
    title: 'All Core Devs - Testing (ACDT) #103',
    dateISO: '2026-11-16',
    displayDate: 'Nov 16, 2026',
    issueUrl: 'https://github.com/ethereum/pm/issues/2299',
    videoUrl: null,
    summary:
      'ACDT #103 brought core devs together with app teams and security auditors to assess how EIP-8037/8038 (the Glamsterdam gas repricing) break some smart-contract gas invariants. It was a findings and listening session, not a decision. The decision is deferred to Thursday’s ACDE #2285, and Glamsterdam still targets mainnet on 3 Dec 2026.',
    keyDecisions: [
      {
        original_text:
          'No decision on EIP-8037/8038 today. The call to decide is Thursday’s ACDE #2285; Glamsterdam still targets mainnet on 3 Dec 2026.',
      },
      {
        original_text:
          'EIP-8037/8038 reprice state creation and access upward (a new storage slot goes from ~22k to ~110k gas) so Ethereum can scale execution while keeping state growth safe. A side effect: gas refilled after a failed call can let failure handlers complete where they used to revert, breaking try/catch and hard-coded-gas assumptions.',
      },
      {
        original_text:
          'Across ChainSecurity, Dedaub and the EF, roughly 200 findings were reported, where one finding is a class of affected contracts, not a single contract. The EF confirmed 3 highs (one already fixed) and at least 25 mediums under triage; some OP-stack L2s are affected and OP has already fixed theirs.',
      },
      {
        original_text:
          'Marius (EF) estimated on the order of 10,000 to 15,000 affected contracts out of ~90M, with value at stake in the low hundreds of thousands. Removing EIP-8037 now would risk a 4 to 6 month delay to Glamsterdam and the post-quantum roadmap.',
      },
      {
        original_text:
          'App developers (Jango of Juicebox, Daniel of Uniswap) pushed back on the breakage to try/catch composability and the confidence cost for immutable contracts, which may need redeployment rather than a simple fix.',
      },
      {
        original_text:
          'Recurring action: clearly document which Ethereum invariants are guaranteed versus implementation details that may change, possibly as an EIP. The EF’s new Access Layer cluster will tighten app-to-protocol coordination.',
      },
    ],
  },
];

export function findProvisionalCallRecap(
  series: string,
  number: string,
): ProvisionalCallRecap | null {
  const n = String(parseInt(number, 10));
  return (
    PROVISIONAL_CALL_RECAPS.find(
      (r) => r.series === series && String(parseInt(r.number, 10)) === n,
    ) ?? null
  );
}
