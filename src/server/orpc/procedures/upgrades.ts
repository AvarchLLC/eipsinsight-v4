import { protectedProcedure, type Ctx, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const upgradesProcedures = {
  // List all upgrades with statistics
  listUpgrades: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {

      const upgrades = await prisma.upgrades.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          slug: true,
          name: true,
          meta_eip: true,
          created_at: true,
        },
      });

      if (upgrades.length === 0) return [];

      const upgradeIds = upgrades.map(u => u.id);

      // Batch: total EIPs per upgrade + core EIPs per upgrade in 2 queries (not N)
      const [totalCounts, coreCounts] = await Promise.all([
        prisma.$queryRaw<Array<{ upgrade_id: number; count: bigint }>>`
          SELECT upgrade_id, COUNT(*)::bigint AS count
          FROM upgrade_composition_current
          WHERE upgrade_id = ANY(${upgradeIds})
          GROUP BY upgrade_id
        `,
        prisma.$queryRaw<Array<{ upgrade_id: number; count: bigint }>>`
          SELECT ucc.upgrade_id, COUNT(DISTINCT ucc.eip_number)::bigint AS count
          FROM upgrade_composition_current ucc
          JOIN eips e ON e.eip_number = ucc.eip_number
          JOIN eip_snapshots s ON s.eip_id = e.id
          WHERE ucc.upgrade_id = ANY(${upgradeIds}) AND s.category = 'Core'
          GROUP BY ucc.upgrade_id
        `,
      ]);

      const totalMap = new Map(totalCounts.map(r => [r.upgrade_id, Number(r.count)]));
      const coreMap = new Map(coreCounts.map(r => [r.upgrade_id, Number(r.count)]));

      return upgrades.map(u => ({
        id: u.id,
        slug: u.slug,
        name: u.name || '',
        meta_eip: u.meta_eip,
        created_at: u.created_at?.toISOString() || null,
        stats: {
          totalEIPs: totalMap.get(u.id) || 0,
          executionLayer: u.meta_eip ? 1 : 0,
          consensusLayer: u.meta_eip ? 0 : 1,
          coreEIPs: coreMap.get(u.id) || 0,
        },
      }));
    }),

  // Get aggregate statistics across all upgrades
  getUpgradeStats: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {

      const [totalUpgrades, totalEIPs, executionUpgrades, consensusUpgrades, totalCoreEIPs] = await Promise.all([
        prisma.upgrades.count(),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
          SELECT COUNT(DISTINCT eip_number)::bigint as count
          FROM upgrade_composition_current
        `).then(r => Number(r[0]?.count || 0)),
        prisma.upgrades.count({
          where: { meta_eip: { not: null } },
        }),
        prisma.upgrades.count({
          where: { meta_eip: null },
        }),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
          SELECT COUNT(DISTINCT ucc.eip_number)::bigint as count
          FROM upgrade_composition_current ucc
          JOIN eips e ON e.eip_number = ucc.eip_number
          JOIN eip_snapshots s ON s.eip_id = e.id
          WHERE s.category = 'Core'
        `).then(r => Number(r[0]?.count || 0)),
      ]);

      return {
        totalUpgrades,
        totalEIPs,
        executionLayer: executionUpgrades,
        consensusLayer: consensusUpgrades,
        totalCoreEIPs,
      };
    }),

  // Get upgrade by slug
  getUpgrade: protectedProcedure
    .input(z.object({
      slug: z.string(),
    }))
    .handler(async ({ context, input }) => {const upgrade = await prisma.upgrades.findUnique({
        where: { slug: input.slug },
      });

      if (!upgrade) {
        throw new ORPCError('NOT_FOUND', { 
          message: `Upgrade ${input.slug} not found` 
        });
      }

      return {
        id: upgrade.id,
        slug: upgrade.slug,
        name: upgrade.name || '',
        meta_eip: upgrade.meta_eip,
        created_at: upgrade.created_at?.toISOString() || null,
      };
    }),

  // Get current EIP composition for an upgrade
  getUpgradeCompositionCurrent: protectedProcedure
    .input(z.object({
      slug: z.string(),
    }))
    .handler(async ({ context, input }) => {const upgrade = await prisma.upgrades.findUnique({
        where: { slug: input.slug },
      });

      if (!upgrade) {
        throw new ORPCError('NOT_FOUND', { 
          message: `Upgrade ${input.slug} not found` 
        });
      }

      // Get current composition
      const composition = await prisma.upgrade_composition_current.findMany({
        where: { upgrade_id: upgrade.id },
        orderBy: [
          { bucket: 'asc' },
          { eip_number: 'asc' },
        ],
      });

      // Get EIP details for each composition entry
      const eipNumbers = composition.map(c => c.eip_number);
      const eips = await prisma.eips.findMany({
        where: { eip_number: { in: eipNumbers } },
        include: {
          eip_snapshots: {
            select: {
              status: true,
              updated_at: true,
            },
          },
        },
      });

      // Combine data
      return composition.map(comp => {
        const eip = eips.find(e => e.eip_number === comp.eip_number);
        return {
          eip_number: comp.eip_number,
          bucket: comp.bucket || null,
          title: eip?.title || '',
          status: eip?.eip_snapshots?.status || null,
          updated_at: comp.updated_at?.toISOString() || null,
        };
      });
    }),

  // Get upgrade composition events (activity feed)
  getUpgradeCompositionEvents: protectedProcedure
    .input(z.object({
      slug: z.string(),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {const upgrade = await prisma.upgrades.findUnique({
        where: { slug: input.slug },
      });

      if (!upgrade) {
        throw new ORPCError('NOT_FOUND', { 
          message: `Upgrade ${input.slug} not found` 
        });
      }

      // Get events
      const events = await prisma.upgrade_composition_events.findMany({
        where: { upgrade_id: upgrade.id },
        orderBy: { commit_date: 'desc' },
        take: input.limit,
        select: {
          commit_date: true,
          eip_number: true,
          event_type: true,
          bucket: true,
          commit_sha: true,
        },
      });

      return events.map(event => ({
        commit_date: event.commit_date?.toISOString() || null,
        eip_number: event.eip_number,
        event_type: event.event_type || null,
        bucket: event.bucket || null,
        commit_sha: event.commit_sha || null,
      }));
    }),

  // Get timeline data for upgrade (grouped by date with bucket statuses)
  getUpgradeTimeline: protectedProcedure
    .input(z.object({
      slug: z.string(),
    }))
    .handler(async ({ context, input }) => {const upgrade = await prisma.upgrades.findUnique({
        where: { slug: input.slug },
      });

      if (!upgrade) {
        throw new ORPCError('NOT_FOUND', {
          message: `Upgrade ${input.slug} not found`,
        });
      }

      // Get all events for this upgrade, ordered by date
      const events = await prisma.upgrade_composition_events.findMany({
        where: { upgrade_id: upgrade.id },
        orderBy: { commit_date: 'asc' },
        select: {
          commit_date: true,
          eip_number: true,
          bucket: true,
          event_type: true,
        },
      });

      // Get current composition to use as final state
      const currentComposition = await prisma.upgrade_composition_current.findMany({
        where: { upgrade_id: upgrade.id },
        select: { eip_number: true, bucket: true },
      });

      // Build timeline by processing events chronologically
      // Track state changes per date
      const dateChanges = new Map<string, Array<{ eipNumber: number; bucket: string | null; type: string }>>();
      const allDates = new Set<string>();

      // Process events to track changes per date
      events.forEach((event) => {
        if (!event.commit_date || !event.eip_number) return;

        const dateStr = new Date(event.commit_date).toISOString().split('T')[0];
        allDates.add(dateStr);

        if (!dateChanges.has(dateStr)) {
          dateChanges.set(dateStr, []);
        }

        dateChanges.get(dateStr)!.push({
          eipNumber: event.eip_number,
          bucket: event.bucket ? event.bucket.toLowerCase() : null,
          type: event.event_type || 'added',
        });
      });

      // Add current composition as final state
      const today = new Date().toISOString().split('T')[0];
      allDates.add(today);

      // Build cumulative state (each date includes all EIPs up to that point)
      const sortedDates = Array.from(allDates).sort();
      const result: Array<{
        date: string;
        included: string[];
        scheduled: string[];
        declined: string[];
        considered: string[];
        proposed: string[];
      }> = [];

      const cumulativeState = new Map<number, string>();

      sortedDates.forEach((date) => {
        // Apply changes for this date
        const changes = dateChanges.get(date) || [];

        changes.forEach((change) => {
          if (change.type === 'added' || change.type === 'moved') {
            if (change.bucket) {
              cumulativeState.set(change.eipNumber, change.bucket);
            }
          } else if (change.type === 'removed') {
            cumulativeState.delete(change.eipNumber);
          }
        });

        // For the final date (today), use current composition
        if (date === today) {
          currentComposition.forEach((comp) => {
            if (comp.bucket) {
              cumulativeState.set(comp.eip_number, comp.bucket.toLowerCase());
            }
          });
        }

        // Group EIPs by bucket
        const dayData = {
          date,
          included: [] as number[],
          scheduled: [] as number[],
          considered: [] as number[],
          declined: [] as number[],
          proposed: [] as number[],
        };

        cumulativeState.forEach((bucket, eipNumber) => {
          if (bucket === 'included') {
            dayData.included.push(eipNumber);
          } else if (bucket === 'scheduled') {
            dayData.scheduled.push(eipNumber);
          } else if (bucket === 'considered') {
            dayData.considered.push(eipNumber);
          } else if (bucket === 'declined') {
            dayData.declined.push(eipNumber);
          } else if (bucket === 'proposed') {
            dayData.proposed.push(eipNumber);
          }
        });

        result.push({
          date,
          included: dayData.included.map(String),
          scheduled: dayData.scheduled.map(String),
          considered: dayData.considered.map(String),
          declined: dayData.declined.map(String),
          proposed: dayData.proposed.map(String),
        });
      });

      return result;
    }),
}

