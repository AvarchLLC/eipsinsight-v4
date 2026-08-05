import { ImageResponse } from 'next/og';
import { createRouterClient } from '@orpc/server';
import { router } from '@/server/orpc/router';
import { ogCard, ogFallback, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/**
 * Per-proposal social card (EIP / ERC / RIP). The detail page is a client
 * component with no metadata, so without this a shared proposal link showed only
 * the static site logo. Now each renders its title, status, and authors.
 */

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIPsInsight proposal';

type Props = { params: Promise<{ repo: string; number: string }> };

// Anonymous client (empty header context) — these reads need no auth.
const publicClient = createRouterClient(router, {
  context: () => ({ headers: {} as Record<string, string> }),
});

const REPO_TONE: Record<string, string> = {
  eip: '#34D399', // green
  erc: '#60A5FA', // blue
  rip: '#C084FC', // violet
};

export default async function Image({ params }: Props) {
  const { repo, number } = await params;
  const repoKey = repo.toLowerCase().replace(/s$/, '');
  const num = Number(number);

  if (!Number.isFinite(num)) return new ImageResponse(ogFallback(), size);

  let proposal:
    | Awaited<ReturnType<typeof publicClient.proposals.getProposal>>
    | null = null;
  try {
    proposal = await publicClient.proposals.getProposal({
      repo: repoKey as 'eip' | 'erc' | 'rip',
      number: num,
    });
  } catch {
    return new ImageResponse(ogFallback(`${repoKey.toUpperCase()}-${num}`), size);
  }

  const prefix = repoKey.toUpperCase();
  const authorCount = proposal.authors?.length ?? 0;
  const chips = [
    proposal.status,
    proposal.category ?? proposal.type ?? null,
    authorCount > 0 ? `${authorCount} author${authorCount === 1 ? '' : 's'}` : null,
    proposal.created ? `Created ${proposal.created}` : null,
  ].filter(Boolean) as string[];

  // First author (or two) as a body row for a little more context.
  const rows = proposal.authors?.length
    ? [proposal.authors.slice(0, 3).join(', ').slice(0, 110)]
    : [];

  return new ImageResponse(
    ogCard({
      badge: `${prefix}-${num}`,
      badgeTone: REPO_TONE[repoKey] ?? REPO_TONE.eip,
      meta: proposal.status,
      title: proposal.title,
      rows,
      chips,
    }),
    size
  );
}
