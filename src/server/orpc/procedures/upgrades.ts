import { os, checkAPIToken, type Ctx, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const upgradesProcedures = {
  // List all upgrades with statistics
  listUpgrades: os
    .$context<Ctx>()
    .input(z.object({}))
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

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

      // Get stats for each upgrade
      const statsPromises = upgrades.map(async (upgrade) => {
        const [totalEIPs, coreEIPs] = await Promise.all([
          // Total EIPs in upgrade
          prisma.upgrade_composition_current.count({
            where: { upgrade_id: upgrade.id },
          }),
          // Core EIPs (EIPs that are Core category)
          prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
            SELECT COUNT(DISTINCT ucc.eip_number)::bigint as count
            FROM upgrade_composition_current ucc
            JOIN eips e ON e.eip_number = ucc.eip_number
            JOIN eip_snapshots s ON s.eip_id = e.id
            WHERE ucc.upgrade_id = $1
              AND s.category = 'Core'
          `, upgrade.id).then(r => Number(r[0]?.count || 0)),
        ]);

        return {
          ...upgrade,
          stats: {
            totalEIPs,
            executionLayer: upgrade.meta_eip ? 1 : 0,
            consensusLayer: upgrade.meta_eip ? 0 : 1,
            coreEIPs,
          },
        };
      });

      const upgradesWithStats = await Promise.all(statsPromises);

      return upgradesWithStats.map(u => ({
        id: u.id,
        slug: u.slug,
        name: u.name || '',
        meta_eip: u.meta_eip,
        created_at: u.created_at?.toISOString() || null,
        stats: u.stats,
      }));
    }),

  // Get aggregate statistics across all upgrades
  getUpgradeStats: os
    .$context<Ctx>()
    .input(z.object({}))
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const [totalUpgrades, totalEIPs, executionUpgrades, consensusUpgrades, totalCoreEIPs] = await Promise.all([
        prisma.upgrades.count(),
        prisma.upgrade_composition_current.count({
          distinct: ['eip_number'],
        }),
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
  getUpgrade: os
    .$context<Ctx>()
    .input(z.object({
      slug: z.string(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const upgrade = await prisma.upgrades.findUnique({
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
  getUpgradeCompositionCurrent: os
    .$context<Ctx>()
    .input(z.object({
      slug: z.string(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const upgrade = await prisma.upgrades.findUnique({
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
  getUpgradeCompositionEvents: os
    .$context<Ctx>()
    .input(z.object({
      slug: z.string(),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const upgrade = await prisma.upgrades.findUnique({
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
}
