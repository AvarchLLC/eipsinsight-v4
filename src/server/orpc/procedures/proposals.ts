import { optionalAuthProcedure, publicProcedure, checkAPIToken, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

// ─── Helper: Fetch and parse EIP/ERC/RIP markdown from GitHub ────────────────

interface FrontmatterData {
  discussions_to: string | null;
  requires: number[];
}

/**
 * Fetch markdown content from GitHub and parse frontmatter
 */
async function fetchProposalContent(
  repo: string,
  number: number
): Promise<{ content: string; frontmatter: FrontmatterData }> {
  const repoName = repo.toLowerCase().replace(/s$/, '');
  const repoPath =
    repoName === 'eip' ? 'EIPs' :
    repoName === 'erc' ? 'ERCs' :
    'RIPs';

  const filePath =
    repoName === 'eip' ? 'EIPS' :
    repoName === 'erc' ? 'ERCS' :
    'RIPS';

  const fileName = `${repoName}-${number}.md`;
  const rawUrl = `https://raw.githubusercontent.com/ethereum/${repoPath}/master/${filePath}/${fileName}`;

  const res = await fetch(rawUrl);
  if (!res.ok) {
    throw new ORPCError('NOT_FOUND', {
      message: `Proposal content not found at ${rawUrl}`,
    });
  }

  const content = await res.text();

  // Parse frontmatter
  let discussions_to: string | null = null;
  let requires: number[] = [];

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];

    const discussionsMatch = fm.match(/^discussions-to:\s*(.+)$/im);
    if (discussionsMatch) {
      discussions_to = discussionsMatch[1]
        .trim()
        .replace(/^["']|["']$/g, '');
    }

    const requiresMatch = fm.match(/^requires:\s*(.+)$/im);
    if (requiresMatch) {
      requires = requiresMatch[1]
        .trim()
        .split(/[,\s\n\[\]]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n));
    }
  }

  return {
    content,
    frontmatter: { discussions_to, requires },
  };
}

export const proposalsProcedures = {
  // A. Proposal Overview
  getProposal: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ input }) => {
// Normalize repo name
      const repoName = input.repo.toLowerCase().replace(/s$/, '');
      const repoMap: Record<string, string> = {
        'eip': 'ethereum/EIPs',
        'erc': 'ethereum/ERCs',
        'rip': 'ethereum/RIPs',
      };
      const repositoryName = repoMap[repoName] || `ethereum/${input.repo}`;

      // Find repository
      const repository = await prisma.repositories.findUnique({
        where: { name: repositoryName },
      });

      if (!repository) {
        throw new ORPCError('NOT_FOUND', { 
          message: `Repository ${repositoryName} not found` 
        });
      }

      // Find EIP by number
      const eip = await prisma.eips.findUnique({
        where: { eip_number: input.number },
        include: {
          eip_snapshots: {
            include: {
              repositories: true,
            },
          },
        },
      });

      if (!eip) {
        throw new ORPCError('NOT_FOUND', { 
          message: `${repoName.toUpperCase()}-${input.number} not found` 
        });
      }

      const snapshot = eip.eip_snapshots;

      // Parse authors (assuming comma-separated in author field)
      const authors = eip.author 
        ? eip.author.split(',').map(a => a.trim()).filter(Boolean)
        : [];

      // Fetch discussions_to and requires from GitHub frontmatter
      let discussions_to: string | null = null;
      let requires: number[] = [];

      try {
        const { frontmatter } = await fetchProposalContent(repoName, input.number);
        discussions_to = frontmatter.discussions_to;
        requires = frontmatter.requires;
      } catch (error) {
        // Fail silently if markdown fetch fails, keep discussions_to as null
        console.error(`Failed to fetch discussions_to for ${repoName}-${input.number}:`, error);
      }

      return {
        repo: repoName,
        number: eip.eip_number,
        title: eip.title || '',
        authors,
        created: eip.created_at?.toISOString().split('T')[0] || null,
        type: snapshot?.type || null,
        category: snapshot?.category || null,
        status: snapshot?.status || 'Unknown',
        last_call_deadline: snapshot?.deadline?.toISOString().split('T')[0] || null,
        discussions_to,
        requires,
      };
    }),

  // B. Status Timeline
  getStatusEvents: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ input }) => {
const eip = await prisma.eips.findUnique({
        where: { eip_number: input.number },
      });

      if (!eip) {
        throw new ORPCError('NOT_FOUND', { 
          message: `EIP-${input.number} not found` 
        });
      }

      const events = await prisma.eip_status_events.findMany({
        where: { eip_id: eip.id },
        orderBy: { changed_at: 'asc' },
        select: {
          from_status: true,
          to_status: true,
          changed_at: true,
          commit_sha: true,
        },
      });

      return events.map(e => ({
        from: e.from_status || null,
        to: e.to_status,
        changed_at: e.changed_at.toISOString(),
        commit_sha: e.commit_sha && e.commit_sha.trim() !== '' ? e.commit_sha : undefined,
      }));
    }),

  // C. Type Timeline
  getTypeEvents: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ input }) => {
const eip = await prisma.eips.findUnique({
        where: { eip_number: input.number },
      });

      if (!eip) {
        throw new ORPCError('NOT_FOUND', { 
          message: `EIP-${input.number} not found` 
        });
      }

      const events = await prisma.eip_type_events.findMany({
        where: { eip_id: eip.id },
        orderBy: { changed_at: 'asc' },
        select: {
          from_type: true,
          to_type: true,
          changed_at: true,
        },
      });

      return events.map(e => ({
        from: e.from_type || null,
        to: e.to_type,
        changed_at: e.changed_at.toISOString(),
      }));
    }),

  // D. Upgrade Inclusion
  getUpgrades: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ input }) => {
// Get all events for this proposal number (eip_number field stores the proposal number regardless of type)
      // Query directly by proposal number - no need to verify proposal exists first
      const events = await prisma.upgrade_composition_events.findMany({
        where: { 
          eip_number: input.number,
          bucket: { in: ['considered', 'scheduled', 'proposed', 'declined'] },
        },
        orderBy: { commit_date: 'desc' },
        select: {
          upgrade_id: true,
          bucket: true,
          commit_date: true,
        },
      });

      if (events.length === 0) {
        return [];
      }

      // Get unique upgrade_ids and their latest bucket
      const upgradeMap = new Map<number, { bucket: string; commit_date: Date | null }>();
      
      for (const event of events) {
        if (!event.upgrade_id) continue;
        
        if (!upgradeMap.has(event.upgrade_id)) {
          upgradeMap.set(event.upgrade_id, {
            bucket: event.bucket || '',
            commit_date: event.commit_date,
          });
        }
      }

      const upgradeIds = Array.from(upgradeMap.keys());
      
      // Get upgrade details
      const upgradesData = await prisma.upgrades.findMany({
        where: { id: { in: upgradeIds } },
        select: {
          id: true,
          name: true,
        },
      });

      // Combine data
      return Array.from(upgradeMap.entries()).map(([upgradeId, eventData]) => {
        const upgrade = upgradesData.find(u => u.id === upgradeId);
        
        return {
          upgrade_id: upgradeId,
          name: upgrade?.name || '',
          bucket: eventData.bucket,
        };
      });
    }),

  // E. Markdown Content (fetched from GitHub raw)
  getContent: publicProcedure
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const repoName = input.repo.toLowerCase().replace(/s$/, '');
      const filePath =
        repoName === 'eip' ? 'EIPS' :
        repoName === 'erc' ? 'ERCS' :
        'RIPS';

      const fileName = `${repoName}-${input.number}.md`;

      const { content, frontmatter } = await fetchProposalContent(repoName, input.number);

      return {
        content,
        file_path: `${filePath}/${fileName}`,
        updated_at: null as string | null,
        discussions_to: frontmatter.discussions_to,
        requires: frontmatter.requires,
      };
    }),

  // Governance Signals
  getGovernanceState: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ input }) => {
const emptyState = {
        current_pr_state: null as string | null,
        waiting_on: null as string | null,
        days_since_last_action: null as number | null,
        review_velocity: null as number | null,
      };

      // Find the most recent PR linked to this proposal number
      const linkedPRs = await prisma.pull_request_eips.findMany({
        where: { eip_number: input.number },
        orderBy: { pr_number: 'desc' },
        take: 1,
        select: {
          pr_number: true,
          repository_id: true,
        },
      });

      if (!linkedPRs.length) return emptyState;

      const { pr_number, repository_id } = linkedPRs[0];

      // Fetch the actual PR data
      const pr = await prisma.pull_requests.findFirst({
        where: { pr_number, repository_id },
        select: { state: true, updated_at: true, pr_number: true, repository_id: true },
      });

      if (!pr) return emptyState;

      // Fetch governance state
      const governanceState = pr.repository_id
        ? await prisma.pr_governance_state.findUnique({
            where: {
              repository_id_pr_number: {
                repository_id: pr.repository_id,
                pr_number: pr.pr_number,
              },
            },
          })
        : null;

      if (!governanceState) {
        return {
          current_pr_state: pr.state || null,
          waiting_on: null,
          days_since_last_action: pr.updated_at
            ? Math.floor((Date.now() - new Date(pr.updated_at).getTime()) / (1000 * 60 * 60 * 24))
            : null,
          review_velocity: null,
        };
      }

      return {
        current_pr_state: pr.state || null,
        waiting_on: governanceState.current_state || null,
        days_since_last_action: governanceState.waiting_since
          ? Math.floor((Date.now() - new Date(governanceState.waiting_since).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        review_velocity: null,
      };
    }),
}

