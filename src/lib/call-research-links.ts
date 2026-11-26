export type ResearchLink = {
  label: string;
  href: string;
};

/**
 * Matches call notes/titles/decisions against EIPsInsight research hubs so
 * relevant meeting pages subtly link to deeper Account Abstraction, PQ, and
 * Glamsterdam research without cluttering unrelated calls.
 */
export function getCallResearchLinks(text: string): ResearchLink[] {
  if (!text) return [];
  const links: ResearchLink[] = [];

  if (/\b(account abstraction|aa|erc-?4337|eip-?7702|smart account|paymaster|userop)\b/i.test(text)) {
    links.push({ label: 'Account Abstraction Research', href: '/aa/overview' });
    links.push({ label: 'ERC-4337 On-Chain Adoption', href: '/adoption/erc-4337' });
  }
  if (/\b(post-quantum|pq|pqts|quantum|pqc|ml-dsa|falcon|eip-?7932)\b/i.test(text)) {
    links.push({ label: 'Post-Quantum Research', href: '/pq/overview' });
  }
  if (/\b(glamsterdam|eip-?8037|eip-?8038|state[- ]gas|repric(e|ing|er))\b/i.test(text)) {
    links.push({ label: 'Glamsterdam Repricer Audit', href: '/research/glamsterdam' });
  }

  return links;
}
