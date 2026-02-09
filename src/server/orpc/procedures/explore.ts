import { os, checkAPIToken, type Ctx, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const exploreProcedures = {
  // ============================================
  // YEAR-BASED QUERIES
  // ============================================

  // Get available years with counts
  getYearsOverview: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      // Get years from eips table
      const eipYears = await prisma.$queryRaw<Array<{
        year: number;
        count: bigint;
      }>>`
        SELECT 
          EXTRACT(YEAR FROM created_at)::int as year,
          COUNT(*) as count
        FROM eips
        WHERE created_at IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM created_at)
        ORDER BY year DESC
      `;

      // Get status changes per year
      const statusYears = await prisma.$queryRaw<Array<{
        year: number;
        count: bigint;
      }>>`
        SELECT 
          EXTRACT(YEAR FROM changed_at)::int as year,
          COUNT(*) as count
        FROM eip_status_events
        GROUP BY EXTRACT(YEAR FROM changed_at)
      `;

      // Get PRs per year
      const prYears = await prisma.$queryRaw<Array<{
        year: number;
        count: bigint;
      }>>`
        SELECT 
          EXTRACT(YEAR FROM created_at)::int as year,
          COUNT(*) as count
        FROM pull_requests
        WHERE created_at IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM created_at)
      `;

      const statusMap = new Map(statusYears.map(s => [s.year, Number(s.count)]));
      const prMap = new Map(prYears.map(p => [p.year, Number(p.count)]));

      return eipYears.map(y => ({
        year: y.year,
        newEIPs: Number(y.count),
        statusChanges: statusMap.get(y.year) || 0,
        activePRs: prMap.get(y.year) || 0,
      }));
    }),

  // Get monthly activity sparkline for a year
  getYearSparkline: os
    .$context<Ctx>()
    .input(z.object({
      year: z.number().min(2015).max(2030),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const startDate = new Date(`${input.year}-01-01`);
      const endDate = new Date(`${input.year}-12-31`);

      const monthlyData = await prisma.$queryRaw<Array<{
        month: number;
        count: bigint;
      }>>`
        SELECT 
          EXTRACT(MONTH FROM changed_at)::int as month,
          COUNT(DISTINCT eip_id) as count
        FROM eip_status_events
        WHERE changed_at >= ${startDate} AND changed_at <= ${endDate}
        GROUP BY EXTRACT(MONTH FROM changed_at)
        ORDER BY month
      `;

      // Fill in missing months with 0
      const result = Array.from({ length: 12 }, (_, i) => {
        const found = monthlyData.find(m => m.month === i + 1);
        return {
          month: i + 1,
          count: found ? Number(found.count) : 0,
        };
      });

      return result;
    }),

  // Get detailed stats for a specific year
  getYearStats: os
    .$context<Ctx>()
    .input(z.object({
      year: z.number().min(2015).max(2030),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const startDate = new Date(`${input.year}-01-01`);
      const endDate = new Date(`${input.year}-12-31`);

      // Total new EIPs
      const newEIPsCount = await prisma.eips.count({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Most common status
      const statusCounts = await prisma.eip_snapshots.groupBy({
        by: ['status'],
        _count: { status: true },
        orderBy: { _count: { status: 'desc' } },
        take: 1,
      });

      // Most active category
      const categoryCounts = await prisma.eip_snapshots.groupBy({
        by: ['category'],
        where: { category: { not: null } },
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 1,
      });

      // Total PRs for that year
      const totalPRs = await prisma.pull_requests.count({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      return {
        totalNewEIPs: newEIPsCount,
        mostCommonStatus: statusCounts[0]?.status || null,
        mostActiveCategory: categoryCounts[0]?.category || null,
        totalPRs,
      };
    }),

  // Get EIPs created in a specific year
  getEIPsByYear: os
    .$context<Ctx>()
    .input(z.object({
      year: z.number().min(2015).max(2030),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const startDate = new Date(`${input.year}-01-01`);
      const endDate = new Date(`${input.year}-12-31`);

      const eips = await prisma.eips.findMany({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          eip_snapshots: true,
        },
        orderBy: { created_at: 'desc' },
        take: input.limit,
        skip: input.offset,
      });

      const total = await prisma.eips.count({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      return {
        items: eips.map(eip => ({
          id: eip.id,
          number: eip.eip_number,
          title: eip.title || `EIP-${eip.eip_number}`,
          type: eip.eip_snapshots?.type || null,
          status: eip.eip_snapshots?.status || 'Unknown',
          category: eip.eip_snapshots?.category || null,
          createdAt: eip.created_at?.toISOString() || null,
          updatedAt: eip.eip_snapshots?.updated_at?.toISOString() || null,
        })),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get monthly activity bar chart data for a year
  getYearActivityChart: os
    .$context<Ctx>()
    .input(z.object({
      year: z.number().min(2015).max(2030),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const startDate = new Date(`${input.year}-01-01`);
      const endDate = new Date(`${input.year}-12-31`);

      // Get EIPs touched per month
      const eipsTouched = await prisma.$queryRaw<Array<{
        month: number;
        count: bigint;
      }>>`
        SELECT 
          EXTRACT(MONTH FROM changed_at)::int as month,
          COUNT(DISTINCT eip_id) as count
        FROM eip_status_events
        WHERE changed_at >= ${startDate} AND changed_at <= ${endDate}
        GROUP BY EXTRACT(MONTH FROM changed_at)
      `;

      // Get new EIPs per month
      const newEips = await prisma.$queryRaw<Array<{
        month: number;
        count: bigint;
      }>>`
        SELECT 
          EXTRACT(MONTH FROM created_at)::int as month,
          COUNT(*) as count
        FROM eips
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY EXTRACT(MONTH FROM created_at)
      `;

      // Get status changes per month
      const statusChanges = await prisma.$queryRaw<Array<{
        month: number;
        count: bigint;
      }>>`
        SELECT 
          EXTRACT(MONTH FROM changed_at)::int as month,
          COUNT(*) as count
        FROM eip_status_events
        WHERE changed_at >= ${startDate} AND changed_at <= ${endDate}
        GROUP BY EXTRACT(MONTH FROM changed_at)
      `;

      const eipsTouchedMap = new Map(eipsTouched.map(e => [e.month, Number(e.count)]));
      const newEipsMap = new Map(newEips.map(e => [e.month, Number(e.count)]));
      const statusChangesMap = new Map(statusChanges.map(s => [s.month, Number(s.count)]));

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Fill in all 12 months
      return months.map((name, i) => ({
        month: name,
        eipsTouched: eipsTouchedMap.get(i + 1) || 0,
        newEIPs: newEipsMap.get(i + 1) || 0,
        statusChanges: statusChangesMap.get(i + 1) || 0,
      }));
    }),

  // ============================================
  // STATUS-BASED QUERIES
  // ============================================

  // Get status counts
  getStatusCounts: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const statusCounts = await prisma.eip_snapshots.groupBy({
        by: ['status'],
        _count: { status: true },
      });

      // Get last updated date per status
      const lastUpdated = await prisma.$queryRaw<Array<{
        status: string;
        last_updated: Date;
      }>>`
        SELECT 
          status,
          MAX(updated_at) as last_updated
        FROM eip_snapshots
        GROUP BY status
      `;

      const lastUpdatedMap = new Map(lastUpdated.map(l => [l.status, l.last_updated]));

      return statusCounts.map(s => ({
        status: s.status,
        count: s._count.status,
        lastUpdated: lastUpdatedMap.get(s.status)?.toISOString() || null,
      }));
    }),

  // Get category counts
  getCategoryCounts: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const categoryCounts = await prisma.eip_snapshots.groupBy({
        by: ['category'],
        where: { category: { not: null } },
        _count: { category: true },
      });

      return categoryCounts.map(c => ({
        category: c.category!,
        count: c._count.category,
      }));
    }),

  // Get EIPs by status with filters
  getEIPsByStatus: os
    .$context<Ctx>()
    .input(z.object({
      status: z.string().optional(),
      category: z.string().optional(),
      type: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const where: {
        status?: string;
        category?: string;
        type?: string;
      } = {};

      if (input.status) where.status = input.status;
      if (input.category) where.category = input.category;
      if (input.type) where.type = input.type;

      const snapshots = await prisma.eip_snapshots.findMany({
        where,
        include: {
          eips: true,
        },
        orderBy: { updated_at: 'desc' },
        take: input.limit,
        skip: input.offset,
      });

      const total = await prisma.eip_snapshots.count({ where });

      // Get days in status for each EIP
      const eipIds = snapshots.map(s => s.eip_id);
      const lastStatusChanges = await prisma.$queryRaw<Array<{
        eip_id: number;
        changed_at: Date;
      }>>`
        SELECT DISTINCT ON (eip_id) 
          eip_id,
          changed_at
        FROM eip_status_events
        WHERE eip_id = ANY(${eipIds})
        ORDER BY eip_id, changed_at DESC
      `;

      const statusChangeMap = new Map(
        lastStatusChanges.map(l => [l.eip_id, l.changed_at])
      );

      return {
        items: snapshots.map(snapshot => {
          const lastChange = statusChangeMap.get(snapshot.eip_id);
          const daysInStatus = lastChange
            ? Math.floor((Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return {
            id: snapshot.eip_id,
            number: snapshot.eips.eip_number,
            title: snapshot.eips.title || `EIP-${snapshot.eips.eip_number}`,
            type: snapshot.type,
            status: snapshot.status,
            category: snapshot.category,
            updatedAt: snapshot.updated_at?.toISOString() || null,
            daysInStatus,
          };
        }),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get status flow data for pipeline visual
  getStatusFlow: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const statusOrder = ['Draft', 'Review', 'Last Call', 'Final', 'Stagnant', 'Withdrawn'];
      
      const statusCounts = await prisma.eip_snapshots.groupBy({
        by: ['status'],
        _count: { status: true },
      });

      const countMap = new Map(statusCounts.map(s => [s.status, s._count.status]));

      return statusOrder.map(status => ({
        status,
        count: countMap.get(status) || 0,
      }));
    }),

  // ============================================
  // ROLE-BASED QUERIES (Editors, Reviewers, Contributors)
  // ============================================

  // Get role leaderboard
  getRoleLeaderboard: os
    .$context<Ctx>()
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      // Common bot patterns to exclude
      const botExcludeCondition = `
        AND actor NOT LIKE '%[bot]%'
        AND actor NOT LIKE '%-bot'
        AND actor NOT LIKE '%bot'
        AND actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
      `;

      // Use contributor_activity for role-based stats (has proper role data)
      if (input.role) {
        const roleLeaderboard = await prisma.$queryRaw<Array<{
          actor: string;
          total_actions: bigint;
          last_activity: Date | null;
          distinct_prs: bigint;
        }>>`
          SELECT 
            ca.actor,
            COUNT(*) as total_actions,
            COUNT(DISTINCT ca.pr_number) as distinct_prs,
            MAX(ca.occurred_at) as last_activity
          FROM contributor_activity ca
          WHERE ca.role = ${input.role}
            AND ca.actor NOT LIKE '%[bot]%'
            AND ca.actor NOT LIKE '%-bot'
            AND LOWER(ca.actor) NOT LIKE '%bot'
            AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          GROUP BY ca.actor
          ORDER BY total_actions DESC
          LIMIT ${input.limit}
        `;

        return roleLeaderboard.map((entry, index) => ({
          rank: index + 1,
          actor: entry.actor,
          totalScore: Number(entry.total_actions),
          prsReviewed: Number(entry.distinct_prs || 0),  // PRs touched
          comments: Number(entry.total_actions || 0),    // Total contributions
          prsCreated: 0,
          prsMerged: 0,
          avgResponseHours: null,
          lastActivity: entry.last_activity?.toISOString() || null,
          role: input.role,
        }));
      }

      // When no role selected, use contributor_activity for all actors
      const leaderboard = await prisma.$queryRaw<Array<{
        actor: string;
        primary_role: string | null;
        total_actions: bigint;
        last_activity: Date | null;
        distinct_prs: bigint;
      }>>`
        SELECT 
          ca.actor,
          (SELECT role FROM contributor_activity ca2 WHERE ca2.actor = ca.actor ORDER BY occurred_at DESC LIMIT 1) as primary_role,
          COUNT(*) as total_actions,
          COUNT(DISTINCT ca.pr_number) as distinct_prs,
          MAX(ca.occurred_at) as last_activity
        FROM contributor_activity ca
        WHERE ca.actor NOT LIKE '%[bot]%'
          AND ca.actor NOT LIKE '%-bot'
          AND LOWER(ca.actor) NOT LIKE '%bot'
          AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
        GROUP BY ca.actor
        ORDER BY total_actions DESC
        LIMIT ${input.limit}
      `;

      return leaderboard.map((entry, index) => ({
        rank: index + 1,
        actor: entry.actor,
        totalScore: Number(entry.total_actions),
        prsReviewed: Number(entry.distinct_prs || 0),  // PRs touched
        comments: Number(entry.total_actions || 0),    // Total contributions
        prsCreated: 0,
        prsMerged: 0,
        avgResponseHours: null,
        lastActivity: entry.last_activity?.toISOString() || null,
        role: entry.primary_role,
      }));
    }),

  // Get top actors by role
  getTopActorsByRole: os
    .$context<Ctx>()
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']),
      limit: z.number().min(1).max(10).default(3),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const topActors = await prisma.$queryRaw<Array<{
        actor: string;
        actions: bigint;
      }>>`
        SELECT 
          actor,
          COUNT(*) as actions
        FROM contributor_activity
        WHERE role = ${input.role}
        GROUP BY actor
        ORDER BY actions DESC
        LIMIT ${input.limit}
      `;

      return topActors.map(a => ({
        actor: a.actor,
        actions: Number(a.actions),
      }));
    }),

  // Get role counts summary
  getRoleCounts: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const roleCounts = await prisma.$queryRaw<Array<{
        role: string;
        unique_actors: bigint;
        total_actions: bigint;
      }>>`
        SELECT 
          role,
          COUNT(DISTINCT actor) as unique_actors,
          COUNT(*) as total_actions
        FROM contributor_activity
        WHERE role IS NOT NULL
        GROUP BY role
      `;

      return roleCounts.map(r => ({
        role: r.role,
        uniqueActors: Number(r.unique_actors),
        totalActions: Number(r.total_actions),
      }));
    }),

  // Get recent activity timeline for a role
  getRoleActivityTimeline: os
    .$context<Ctx>()
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      // Exclude bots from the timeline
      const botPatterns = ['%[bot]%', '%-bot'];
      const botNames = ['dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot'];

      const events = await prisma.pr_events.findMany({
        where: {
          ...(input.role ? { actor_role: input.role } : {}),
          NOT: [
            { actor: { contains: '[bot]' } },
            { actor: { endsWith: '-bot' } },
            { actor: { in: botNames } },
          ],
        },
        orderBy: { created_at: 'desc' },
        take: input.limit,
        select: {
          id: true,
          actor: true,
          actor_role: true,
          event_type: true,
          pr_number: true,
          created_at: true,
          github_id: true,
          repositories: {
            select: {
              name: true,
            },
          },
        },
      });

      return events.map(e => ({
        id: e.id.toString(),
        actor: e.actor,
        role: e.actor_role,
        eventType: e.event_type,
        prNumber: e.pr_number,
        createdAt: e.created_at.toISOString(),
        githubId: e.github_id,
        repoName: e.repositories?.name || 'ethereum/EIPs',
      }));
    }),

  // Get role activity sparkline (last 6 months)
  getRoleActivitySparkline: os
    .$context<Ctx>()
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyData = input.role
        ? await prisma.$queryRaw<Array<{
            year_month: string;
            count: bigint;
          }>>`
            SELECT 
              TO_CHAR(occurred_at, 'YYYY-MM') as year_month,
              COUNT(*) as count
            FROM contributor_activity
            WHERE occurred_at >= ${sixMonthsAgo} AND role = ${input.role}
            GROUP BY TO_CHAR(occurred_at, 'YYYY-MM')
            ORDER BY year_month
          `
        : await prisma.$queryRaw<Array<{
            year_month: string;
            count: bigint;
          }>>`
            SELECT 
              TO_CHAR(occurred_at, 'YYYY-MM') as year_month,
              COUNT(*) as count
            FROM contributor_activity
            WHERE occurred_at >= ${sixMonthsAgo}
            GROUP BY TO_CHAR(occurred_at, 'YYYY-MM')
            ORDER BY year_month
          `;

      return monthlyData.map(m => ({
        month: m.year_month,
        count: Number(m.count),
      }));
    }),

  // ============================================
  // TRENDING QUERIES
  // ============================================

  // Get trending proposals
  getTrendingProposals: os
    .$context<Ctx>()
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Calculate trending score:
      // (# of pr_events in last 7 days * 2) + (# of comments) + (if status changed in last 7 days ? 10 : 0)
      const trendingData = await prisma.$queryRaw<Array<{
        eip_id: number;
        eip_number: number;
        title: string | null;
        status: string;
        pr_events_count: bigint;
        comments_count: bigint;
        had_status_change: boolean;
        last_activity: Date;
      }>>`
        WITH recent_pr_events AS (
          SELECT 
            pre.eip_id,
            COUNT(*) as pr_events_count
          FROM pull_request_eips pre
          JOIN pr_events pe ON pre.pr_id = pe.pr_number
          WHERE pe.created_at >= ${sevenDaysAgo}
          GROUP BY pre.eip_id
        ),
        pr_comments AS (
          SELECT 
            pre.eip_id,
            SUM(COALESCE(pr.num_comments, 0)) as comments_count
          FROM pull_request_eips pre
          JOIN pull_requests pr ON pre.pr_id = pr.id
          GROUP BY pre.eip_id
        ),
        recent_status_changes AS (
          SELECT DISTINCT eip_id
          FROM eip_status_events
          WHERE changed_at >= ${sevenDaysAgo}
        )
        SELECT 
          e.id as eip_id,
          e.eip_number,
          e.title,
          COALESCE(es.status, 'Unknown') as status,
          COALESCE(rpe.pr_events_count, 0) as pr_events_count,
          COALESCE(pc.comments_count, 0) as comments_count,
          rsc.eip_id IS NOT NULL as had_status_change,
          COALESCE(es.updated_at, e.created_at) as last_activity
        FROM eips e
        LEFT JOIN eip_snapshots es ON e.id = es.eip_id
        LEFT JOIN recent_pr_events rpe ON e.id = rpe.eip_id
        LEFT JOIN pr_comments pc ON e.id = pc.eip_id
        LEFT JOIN recent_status_changes rsc ON e.id = rsc.eip_id
        WHERE (rpe.pr_events_count > 0 OR pc.comments_count > 0 OR rsc.eip_id IS NOT NULL)
        ORDER BY (
          COALESCE(rpe.pr_events_count, 0) * 2 + 
          COALESCE(pc.comments_count, 0) + 
          CASE WHEN rsc.eip_id IS NOT NULL THEN 10 ELSE 0 END
        ) DESC
        LIMIT ${input.limit}
      `;

      return trendingData.map(t => {
        const score = Number(t.pr_events_count) * 2 + Number(t.comments_count) + (t.had_status_change ? 10 : 0);
        
        let trendingReason = [];
        if (Number(t.pr_events_count) > 0) {
          trendingReason.push(`${t.pr_events_count} PR events this week`);
        }
        if (t.had_status_change) {
          trendingReason.push('Status changed this week');
        }
        if (Number(t.comments_count) > 0) {
          trendingReason.push(`${t.comments_count} comments`);
        }

        return {
          eipId: t.eip_id,
          number: t.eip_number,
          title: t.title || `EIP-${t.eip_number}`,
          status: t.status,
          score,
          trendingReason: trendingReason.join(', ') || 'Recent activity',
          lastActivity: t.last_activity?.toISOString() || null,
        };
      });
    }),

  // Get trending heatmap data (last 30 days)
  getTrendingHeatmap: os
    .$context<Ctx>()
    .input(z.object({
      topN: z.number().min(5).max(20).default(10),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get top N most active EIPs in last 30 days
      const topEIPs = await prisma.$queryRaw<Array<{
        eip_id: number;
        eip_number: number;
        title: string | null;
        total_activity: bigint;
      }>>`
        WITH activity_counts AS (
          SELECT 
            eip_id,
            COUNT(*) as activity
          FROM eip_status_events
          WHERE changed_at >= ${thirtyDaysAgo}
          GROUP BY eip_id
        )
        SELECT 
          e.id as eip_id,
          e.eip_number,
          e.title,
          COALESCE(ac.activity, 0) as total_activity
        FROM eips e
        LEFT JOIN activity_counts ac ON e.id = ac.eip_id
        WHERE ac.activity > 0
        ORDER BY ac.activity DESC
        LIMIT ${input.topN}
      `;

      const eipIds = topEIPs.map(e => e.eip_id);

      // Get daily activity for these EIPs
      const dailyActivity = await prisma.$queryRaw<Array<{
        eip_id: number;
        day: Date;
        activity: bigint;
      }>>`
        SELECT 
          eip_id,
          DATE(changed_at) as day,
          COUNT(*) as activity
        FROM eip_status_events
        WHERE eip_id = ANY(${eipIds}) AND changed_at >= ${thirtyDaysAgo}
        GROUP BY eip_id, DATE(changed_at)
        ORDER BY day
      `;

      // Build heatmap data structure
      const heatmapData = topEIPs.map(eip => {
        const eipActivity = dailyActivity.filter(d => d.eip_id === eip.eip_id);
        const dailyData: { date: string; value: number }[] = [];
        
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dateStr = date.toISOString().split('T')[0];
          const found = eipActivity.find(a => a.day.toISOString().split('T')[0] === dateStr);
          dailyData.push({
            date: dateStr,
            value: found ? Number(found.activity) : 0,
          });
        }

        return {
          eipNumber: eip.eip_number,
          title: eip.title || `EIP-${eip.eip_number}`,
          totalActivity: Number(eip.total_activity),
          dailyActivity: dailyData,
        };
      });

      return heatmapData;
    }),

  // ============================================
  // UTILITY QUERIES
  // ============================================

  // Get all unique types
  getTypes: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const types = await prisma.eip_snapshots.groupBy({
        by: ['type'],
        where: { type: { not: null } },
        _count: { type: true },
      });

      return types.map(t => ({
        type: t.type!,
        count: t._count.type,
      }));
    }),

  // Get all unique categories
  getCategories: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const categories = await prisma.eip_snapshots.groupBy({
        by: ['category'],
        where: { category: { not: null } },
        _count: { category: true },
      });

      return categories.map(c => ({
        category: c.category!,
        count: c._count.category,
      }));
    }),
}
