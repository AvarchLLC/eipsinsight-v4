/**
 * Distinguishing EIP numbers from GitHub PR numbers.
 *
 * Call summaries (from the EF's ACDbot tldr) sometimes label a GitHub PR as an
 * "EIP" — e.g. ACDC #183 says "EIP-11905 (Bundled Attestation Propagation)", but
 * 11905 is `ethereum/EIPs` PR #11905, not an EIP. Linking those to /eip/11905
 * sends people to a nonexistent proposal, which is exactly what confused readers.
 *
 * Heuristic: real EIP/ERC numbers are ≤4 digits today (the highest is in the low
 * 8000s), while open PR numbers in ethereum/EIPs are five digits (~11000+). So a
 * reference at or above this threshold that's styled as an EIP is really a PR.
 * The gap is large enough that this stays correct for years; revisit if EIP
 * numbers ever approach five digits.
 */
export const MAX_PLAUSIBLE_EIP = 9999;

export type ProposalRefKind = 'eip' | 'pr';

/** 'pr' when the number is too large to be a real EIP (so it's a mislabeled PR). */
export function classifyProposalRef(n: number): ProposalRefKind {
  return n > MAX_PLAUSIBLE_EIP ? 'pr' : 'eip';
}

/** Route for a reference: the proposal page for real EIPs, the PR page otherwise. */
export function proposalRefHref(n: number, repo: 'eips' | 'ercs' | 'rips' = 'eips'): string {
  return classifyProposalRef(n) === 'pr' ? `/pr/${repo}/${n}` : `/eip/${n}`;
}

/** Display label: "EIP-1234" for real EIPs, "PR-11905" for mislabeled PRs. */
export function proposalRefLabel(n: number): string {
  return classifyProposalRef(n) === 'pr' ? `PR-${n}` : `EIP-${n}`;
}

/**
 * Rewrite mislabeled "EIP-11905" → "PR-11905" inside a free-text string.
 *
 * For plain-text surfaces (the call summary) that show the EF's verbatim tldr,
 * where a bare relabel is the fix — no link, just an accurate label.
 */
export function relabelMislabeledPrs(text: string): string {
  return text.replace(/\bEIP-(\d+)\b/g, (whole, digits: string) => {
    const n = Number(digits);
    return classifyProposalRef(n) === 'pr' ? `PR-${n}` : whole;
  });
}
