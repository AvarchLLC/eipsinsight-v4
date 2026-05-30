import { optionalAuthProcedure, publicProcedure, checkAPIToken, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import { getUpgradeTimelineData } from '@/data/upgrade-timelines'
import { rawData, pairedUpgradeNames } from '@/data/network-upgrades'
import * as z from 'zod'

// ─── Helper: Fetch and parse EIP/ERC/RIP markdown from GitHub ────────────────

interface FrontmatterData {
  discussions_to: string | null;
  requires: number[];
  title: string | null;
  author: string | null;
  status: string | null;
  type: string | null;
  category: string | null;
  created: string | null;
  last_call_deadline: string | null;
}

function getConstantUpgradeOverrides(eipNumber: number): Map<string, { bucket: string; date: string }> {
  const slugs = ['pectra', 'fusaka'] as const;
  const overrides = new Map<string, { bucket: string; date: string }>();
  const eipLabel = `EIP-${eipNumber}`;

  for (const slug of slugs) {
    const timeline = getUpgradeTimelineData(slug);
    if (!timeline || timeline.length === 0) continue;

    const lastEntry = timeline[timeline.length - 1];
    if (lastEntry.included.includes(eipLabel)) {
      overrides.set(slug, { bucket: 'included', date: lastEntry.date });
      continue;
    }
    if (lastEntry.scheduled.includes(eipLabel)) {
      overrides.set(slug, { bucket: 'scheduled', date: lastEntry.date });
      continue;
    }
    if (lastEntry.considered.includes(eipLabel)) {
      overrides.set(slug, { bucket: 'considered', date: lastEntry.date });
      continue;
    }
    if (lastEntry.declined.includes(eipLabel)) {
      overrides.set(slug, { bucket: 'declined', date: lastEntry.date });
      continue;
    }
    if (lastEntry.proposed.includes(eipLabel)) {
      overrides.set(slug, { bucket: 'proposed', date: lastEntry.date });
    }
  }

  return overrides;
}

function getHistoricalUpgradeSlug(name: string, date: string): string {
  const pairedName = pairedUpgradeNames[date];
  if (pairedName === 'Shapella') return 'shanghai';
  if (pairedName === 'Dencun') return 'cancun';
  if (pairedName === 'Pectra') return 'pectra';
  if (pairedName === 'Fusaka') return 'fusaka';

  const directMap: Record<string, string> = {
    'frontier thawing': 'frontier-thawing',
    frontier: 'frontier',
    homestead: 'homestead',
    'dao fork': 'dao-fork',
    'tangerine whistle': 'tangerine-whistle',
    'spurious dragon': 'spurious-dragon',
    byzantium: 'byzantium',
    constantinople: 'constantinople',
    petersburg: 'petersburg',
    istanbul: 'istanbul',
    'muir glacier': 'muir-glacier',
    berlin: 'berlin',
    london: 'london',
    altair: 'altair',
    'arrow glacier': 'arrow-glacier',
    'gray glacier': 'gray-glacier',
    bellatrix: 'bellatrix',
    paris: 'paris',
    shanghai: 'shanghai',
    capella: 'capella',
    cancun: 'cancun',
    deneb: 'deneb',
    prague: 'pectra',
    electra: 'pectra',
    osaka: 'fusaka',
    fulu: 'fusaka',
  };

  return directMap[name.toLowerCase()] ?? name.toLowerCase().replace(/\s+/g, '-');
}

function getHistoricalIncludedUpgrades(eipNumber: number): Array<{
  name: string;
  slug: string;
  bucket: string;
  commit_date: string;
}> {
  const normalized = String(eipNumber);
  const mergeTimestamp = new Date('2022-09-15').getTime();
  const entries = new Map<string, { name: string; slug: string; bucket: string; commit_date: string }>();

  rawData.forEach((item) => {
    const includesEip = item.eips.some((value) => value.replace('EIP-', '').replace('-removed', '') === normalized);
    if (!includesEip) return;

    const itemTime = new Date(item.date).getTime();
    const displayName =
      itemTime > mergeTimestamp && pairedUpgradeNames[item.date]
        ? pairedUpgradeNames[item.date]
        : item.upgrade;
    const slug = getHistoricalUpgradeSlug(displayName, item.date);
    const key = `${item.date}:${slug}`;
    if (!entries.has(key)) {
      entries.set(key, {
        name: displayName,
        slug,
        bucket: 'included',
        commit_date: new Date(item.date).toISOString(),
      });
    }
  });

  return Array.from(entries.values());
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
  const fm_data: FrontmatterData = {
    discussions_to: null,
    requires: [],
    title: null,
    author: null,
    status: null,
    type: null,
    category: null,
    created: null,
    last_call_deadline: null,
  };

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];

    const str = (pattern: RegExp) => {
      const m = fm.match(pattern);
      return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
    };

    fm_data.discussions_to = str(/^discussions-to:\s*(.+)$/im);
    fm_data.title          = str(/^title:\s*(.+)$/im);
    fm_data.author         = str(/^author:\s*(.+)$/im);
    fm_data.status         = str(/^status:\s*(.+)$/im);
    fm_data.type           = str(/^type:\s*(.+)$/im);
    fm_data.category       = str(/^category:\s*(.+)$/im);
    fm_data.created        = str(/^created:\s*(.+)$/im);
    fm_data.last_call_deadline = str(/^last-call-deadline:\s*(.+)$/im);

    const requiresMatch = fm.match(/^requires:\s*(.+)$/im);
    if (requiresMatch) {
      fm_data.requires = requiresMatch[1]
        .trim()
        .split(/[,\s\n\[\]]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n));
    }
  }

  return {
    content,
    frontmatter: fm_data,
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
        // DB row missing — fall back to parsing the GitHub markdown directly.
        // This handles proposals that exist on GitHub but haven't been synced yet.
        try {
          const { frontmatter } = await fetchProposalContent(repoName, input.number);
          if (!frontmatter.title) {
            throw new ORPCError('NOT_FOUND', {
              message: `${repoName.toUpperCase()}-${input.number} not found`,
            });
          }
          const authors = frontmatter.author
            ? frontmatter.author.split(',').map((a) => a.trim()).filter(Boolean)
            : [];
          return {
            repo: repoName,
            number: input.number,
            title: frontmatter.title,
            authors,
            created: frontmatter.created ?? null,
            type: frontmatter.type ?? null,
            category: frontmatter.category ?? null,
            status: frontmatter.status ?? 'Unknown',
            last_call_deadline: frontmatter.last_call_deadline ?? null,
            discussions_to: frontmatter.discussions_to,
            requires: frontmatter.requires,
          };
        } catch (err) {
          if (err instanceof ORPCError) throw err;
          throw new ORPCError('NOT_FOUND', {
            message: `${repoName.toUpperCase()}-${input.number} not found`,
          });
        }
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
      const repoName = input.repo.toLowerCase().replace(/s$/, '');
      const eip = await prisma.eips.findUnique({
        where: { eip_number: input.number },
      });

      if (!eip) {
        // Proposal exists on GitHub but hasn't been synced — no events yet.
        console.warn(`${repoName.toUpperCase()}-${input.number} not in DB; returning empty status events`);
        return [];
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
      const repoName = input.repo.toLowerCase().replace(/s$/, '');
      const eip = await prisma.eips.findUnique({
        where: { eip_number: input.number },
      });

      if (!eip) {
        console.warn(`${repoName.toUpperCase()}-${input.number} not in DB; returning empty type events`);
        return [];
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
      const historicalIncluded = getHistoricalIncludedUpgrades(input.number);
      const constantUpgradeOverrides = getConstantUpgradeOverrides(input.number);

      const currentComposition = await prisma.upgrade_composition_current.findMany({
        where: { eip_number: input.number },
        select: {
          upgrade_id: true,
          bucket: true,
          updated_at: true,
        },
      });

      const currentUpgradeIds = currentComposition
        .map((entry) => entry.upgrade_id)
        .filter((value): value is number => value !== null);

      const constantUpgradeSlugs = Array.from(constantUpgradeOverrides.keys());
      const constantUpgrades = constantUpgradeSlugs.length > 0
        ? await prisma.upgrades.findMany({
            where: { slug: { in: constantUpgradeSlugs } },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          })
        : [];

      const currentUpgradeMap = new Map<number, { bucket: string; commit_date: Date | null }>();
      for (const entry of currentComposition) {
        if (!entry.upgrade_id || !entry.bucket) continue;
        currentUpgradeMap.set(entry.upgrade_id, {
          bucket: entry.bucket.toLowerCase(),
          commit_date: entry.updated_at,
        });
      }

      // Get all historical events for this proposal number (eip_number stores the proposal number regardless of type)
      const events = await prisma.upgrade_composition_events.findMany({
        where: { 
          eip_number: input.number,
          ...(currentUpgradeIds.length > 0
            ? { upgrade_id: { notIn: currentUpgradeIds } }
            : {}),
          bucket: { in: ['included', 'considered', 'scheduled', 'proposed', 'declined'] },
        },
        orderBy: { commit_date: 'desc' },
        select: {
          upgrade_id: true,
          bucket: true,
          commit_date: true,
        },
      });

      if (events.length === 0) {
        if (currentUpgradeMap.size === 0) return [];
      }

      // Get unique upgrade_ids and their latest bucket from historical events
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

      currentUpgradeMap.forEach((value, key) => {
        upgradeMap.set(key, value);
      });

      for (const upgrade of constantUpgrades) {
        const override = constantUpgradeOverrides.get(upgrade.slug);
        if (!override) continue;
        upgradeMap.set(upgrade.id, {
          bucket: override.bucket,
          commit_date: new Date(override.date),
        });
      }

      const upgradeIds = Array.from(upgradeMap.keys());
      
      // Get upgrade details
      const upgradesData = await prisma.upgrades.findMany({
        where: { id: { in: upgradeIds } },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      // Combine DB + constants first
      const combined = Array.from(upgradeMap.entries())
        .map(([upgradeId, eventData]) => {
        const upgrade = upgradesData.find(u => u.id === upgradeId);
        
        return {
          upgrade_id: upgradeId,
          name: upgrade?.name || '',
          slug: upgrade?.slug || '',
          bucket: eventData.bucket,
          commit_date: eventData.commit_date?.toISOString() || null,
        };
      });

      // Merge historical dataset fallback for legacy upgrades
      const bySlug = new Map<string, {
        upgrade_id: number;
        name: string;
        slug: string;
        bucket: string;
        commit_date: string | null;
      }>();
      combined.forEach((item) => bySlug.set(item.slug || item.name.toLowerCase(), item));
      historicalIncluded.forEach((item, index) => {
        const key = item.slug || item.name.toLowerCase();
        if (bySlug.has(key)) return;
        bySlug.set(key, {
          upgrade_id: -(index + 1),
          name: item.name,
          slug: item.slug,
          bucket: item.bucket,
          commit_date: item.commit_date,
        });
      });

      return Array.from(bySlug.values()).sort((a, b) => {
        const aTime = a.commit_date ? new Date(a.commit_date).getTime() : 0;
        const bTime = b.commit_date ? new Date(b.commit_date).getTime() : 0;
        return bTime - aTime;
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
