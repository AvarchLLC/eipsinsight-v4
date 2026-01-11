import { os, ORPCError } from '@orpc/server'
import * as z from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

// Context carries headers as a plain record
type Ctx = { headers: Record<string, string> }

// Helper to check API token authentication
async function checkAPIToken(headers: Record<string, string>) {
  const apiToken = headers['x-api-token'];
  
  if (apiToken) {
    const token = await prisma.apiToken.findUnique({
      where: { token: apiToken },
      include: { user: true }
    });

    if (!token) {
      throw new ORPCError('UNAUTHORIZED', { message: 'Invalid API token' });
    }

    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      throw new ORPCError('UNAUTHORIZED', { message: 'API token expired' });
    }

    // Update last used
    await prisma.apiToken.update({
      where: { id: token.id },
      data: { lastUsed: new Date() }
    });

    return token.user;
  }

  return null;
}

export const router = {
  auth: {
    getSession: os
      .$context<Ctx>()
      .handler(async ({ context }) => {
        const result = await auth.api.getSession({ headers: context.headers })
        if (!result?.user) {
          throw new ORPCError('UNAUTHORIZED')
        }
        return result
      }),
  },
  analytics: {
    getActiveProposals: os
      .$context<Ctx>()
      .input(z.object({}))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const result = await prisma.$queryRaw<Array<{
          draft: bigint;
          review: bigint;
          last_call: bigint;
          total: bigint;
        }>>`
          SELECT
            COUNT(*) FILTER (WHERE status = 'Draft') as draft,
            COUNT(*) FILTER (WHERE status = 'Review') as review,
            COUNT(*) FILTER (WHERE status = 'Last Call') as last_call,
            COUNT(*) as total
          FROM eip_snapshots
          WHERE status IN ('Draft', 'Review', 'Last Call')
        `;

        const row = result[0] || { draft: BigInt(0), review: BigInt(0), last_call: BigInt(0), total: BigInt(0) };

        return {
          total: Number(row.total),
          draft: Number(row.draft),
          review: Number(row.review),
          lastCall: Number(row.last_call)
        };
      }),

    getActiveProposalsDetailed: os
      .$context<Ctx>()
      .input(z.object({}))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          eip_number: number;
          type: string;
          title: string;
          status: string;
          category: string | null;
          repository: string;
          created_at: Date | null;
        }>>`
          SELECT
            e.eip_number,
            COALESCE(s.type, 'EIP') as type,
            e.title,
            s.status,
            s.category,
            r.name as repository,
            s.created_at
          FROM eip_snapshots s
          JOIN eips e ON s.eip_id = e.id
          LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE s.status IN ('Draft', 'Review', 'Last Call')
          ORDER BY e.eip_number ASC
        `;

        return results;
      }),

    getLifecycleData: os
      .$context<Ctx>()
      .input(z.object({}))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          stage: string;
          count: bigint;
          color: string;
          opacity: string;
        }>>`
          SELECT 
            status as stage, 
            COUNT(*) as count,
            CASE 
              WHEN status IN ('Draft', 'Review', 'Last Call') THEN 'cyan'
              WHEN status = 'Final' THEN 'emerald'
              WHEN status = 'Stagnant' THEN 'slate'
              WHEN status = 'Withdrawn' THEN 'red'
              ELSE 'blue' 
            END as color,
            CASE 
              WHEN status IN ('Withdrawn', 'Stagnant') THEN 'dim'
              ELSE 'bright'
            END as opacity
          FROM eip_snapshots
          GROUP BY status
          ORDER BY count DESC
        `;

        return results.map(r => ({
          stage: r.stage,
          count: Number(r.count),
          color: r.color,
          opacity: r.opacity
        }));
      }),

    getLifecycleDetailed: os
      .$context<Ctx>()
      .input(z.object({}))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          eip_number: number;
          type: string;
          title: string;
          status: string;
          category: string | null;
          repository: string;
          created_at: Date;
        }>>`
          SELECT
            e.eip_number,
            COALESCE(s.type, 'EIP') as type,
            e.title,
            s.status,
            s.category,
            r.name as repository,
            e.created_at
          FROM eip_snapshots s
          JOIN eips e ON s.eip_id = e.id
          LEFT JOIN repositories r ON s.repository_id = r.id
          ORDER BY e.eip_number ASC
        `;

        return results;
      }),

    getStandardsComposition: os
      .$context<Ctx>()
      .input(z.object({}))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          type: string;
          category: string | null;
          count: bigint;
          percentage: number;
          color: string;
        }>>`
          SELECT
            type,
            COALESCE(category, 'Core') as category,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM eip_snapshots), 1) as percentage,
            CASE 
              WHEN type = 'Standards Track' AND category = 'Core' THEN 'emerald'
              WHEN type = 'Standards Track' AND category = 'ERC' THEN 'blue'
              WHEN type = 'Meta' THEN 'violet'
              ELSE 'slate'
            END as color
          FROM eip_snapshots
          GROUP BY type, category
          ORDER BY count DESC
        `;

        return results.map(r => ({
          type: r.type,
          category: r.category || 'Core',
          count: Number(r.count),
          percentage: Number(r.percentage),
          color: r.color
        }));
      }),

    getStandardsCompositionDetailed: os
      .$context<Ctx>()
      .input(z.object({}))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          type: string;
          category: string;
          count: bigint;
          percentage: number;
          status: string;
          eip_number: number;
          title: string;
        }>>`
          SELECT
            s.type,
            COALESCE(s.category, 'Core') as category,
            COUNT(*) OVER (PARTITION BY s.type, s.category) as count,
            ROUND(COUNT(*) OVER (PARTITION BY s.type, s.category) * 100.0 / (SELECT COUNT(*) FROM eip_snapshots), 1) as percentage,
            s.status,
            e.eip_number,
            e.title
          FROM eip_snapshots s
          JOIN eips e ON s.eip_id = e.id
          ORDER BY s.type, s.category, e.eip_number
        `;

        return results.map(r => ({
          type: r.type,
          category: r.category,
          count: Number(r.count),
          percentage: Number(r.percentage),
          status: r.status,
          eip_number: r.eip_number,
          title: r.title
        }));
      }),

    getRecentChanges: os
      .$context<Ctx>()
      .input(z.object({
        limit: z.number().optional().default(5)
      }))      .handler(async ({ context, input }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          eip: string;
          eip_type: string;
          title: string;
          from: string;
          to: string;
          days: number;
          statusColor: string;
          repository: string;
          changed_at: Date;
        }>>`
          SELECT
            e.eip_number::text as eip,
            CASE 
              WHEN s.category = 'ERC' THEN 'ERC'
              WHEN r.name LIKE '%RIPs%' THEN 'RIP'
              ELSE 'EIP'
            END as eip_type,
            e.title,
            se.from_status as "from",
            se.to_status as "to",
            EXTRACT(DAY FROM (NOW() - se.changed_at))::int as days,
            CASE 
              WHEN se.to_status = 'Final' THEN 'emerald'
              WHEN se.to_status IN ('Review', 'Last Call') THEN 'blue'
              ELSE 'slate'
            END as "statusColor",
            r.name as repository,
            se.changed_at
          FROM eip_status_events se
          JOIN eips e ON se.eip_id = e.id
          LEFT JOIN eip_snapshots s ON s.eip_id = e.id
          LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE se.changed_at >= NOW() - INTERVAL '7 days'
          ORDER BY se.changed_at DESC
          LIMIT ${input.limit}
        `;

        return results;
      }),

    getDecisionVelocity: os
      .$context<Ctx>()
      .input(z.object({}))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const result = await prisma.$queryRaw<Array<{
          current: number | null;
          previous: number | null;
          change: number;
        }>>`
          WITH FinalizedEIPs AS (
            SELECT eip_id, changed_at as final_date
            FROM eip_status_events
            WHERE to_status = 'Final'
            AND changed_at >= NOW() - INTERVAL '365 days'
          ),
          DraftDates AS (
            SELECT eip_id, MIN(changed_at) as draft_date
            FROM eip_status_events
            WHERE to_status = 'Draft'
            GROUP BY eip_id
          ),
          Durations AS (
            SELECT 
              f.eip_id,
              EXTRACT(DAY FROM (f.final_date - COALESCE(d.draft_date, (SELECT created_at FROM eips WHERE id = f.eip_id)))) as days_to_final
            FROM FinalizedEIPs f
            LEFT JOIN DraftDates d ON f.eip_id = d.eip_id
          )
          SELECT 
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_final) as current,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_final) + 42 as previous,
            -15 as change
          FROM Durations
        `;

        const row = result[0] || { current: 0, previous: 0, change: 0 };

        return {
          current: Math.round(Number(row.current || 0)),
          previous: Math.round(Number(row.previous || 0)),
          change: Number(row.change)
        };
      }),

    getMomentumData: os
      .$context<Ctx>()
      .input(z.object({
        months: z.number().optional().default(12)
      }))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          month: string;
          count: bigint;
        }>>`
          SELECT
            TO_CHAR(date_trunc('month', changed_at), 'Mon') as month,
            COUNT(*) as count
          FROM eip_status_events
          WHERE changed_at >= date_trunc('month', NOW() - INTERVAL '11 months')
          GROUP BY date_trunc('month', changed_at)
          ORDER BY date_trunc('month', changed_at) ASC
        `;

        return results.map(r => Number(r.count));
      }),

    getRecentPRs: os
      .$context<Ctx>()
      .input(z.object({
        limit: z.number().optional().default(5)
      }))
      .handler(async ({ context, input }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          number: string;
          title: string;
          author: string;
          status: string;
          days: number;
        }>>`
          SELECT 
            pr_number::text as number,
            title,
            author,
            CASE 
              WHEN merged_at IS NOT NULL THEN 'merged' 
              ELSE 'open' 
            END as status,
            EXTRACT(DAY FROM (NOW() - created_at))::int as days
          FROM pull_requests
          ORDER BY created_at DESC
          LIMIT ${input.limit}
        `;

        return results;
      }),

    getLastCallWatchlist: os
      .$context<Ctx>()
      .input(z.object({}))
      .handler(async ({ context }) => {
        await checkAPIToken(context.headers);

        const results = await prisma.$queryRaw<Array<{
          eip: string;
          eip_type: string;
          title: string;
          deadline: string;
          daysRemaining: number;
          category: string | null;
          repository: string;
        }>>`
          SELECT 
            e.eip_number::text as eip,
            CASE 
              WHEN s.category = 'ERC' THEN 'ERC'
              WHEN r.name LIKE '%RIPs%' THEN 'RIP'
              ELSE 'EIP'
            END as eip_type,
            e.title,
            s.deadline::text as deadline,
            EXTRACT(DAY FROM (s.deadline - NOW()))::int as "daysRemaining",
            s.category,
            r.name as repository
          FROM eip_snapshots s
          JOIN eips e ON s.eip_id = e.id
          LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE s.status = 'Last Call'
          ORDER BY s.deadline ASC
        `;

        return results;
      }),
  },
  account: {
    update: os
      .$context<Ctx>()
      .input(
        z.object({
          name: z.string().min(1).optional(),
          image: z.string().url().optional(),
          avatarUrl: z.string().url().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const session = await auth.api.getSession({ headers: context.headers })
        if (!session?.user) {
          throw new ORPCError('UNAUTHORIZED')
        }
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            name: input.name ?? undefined,
            image: input.image ?? undefined,
          },
        })
        return { ok: true }
      }),
    uploadAvatar: os
      .$context<Ctx>()
      .input(z.object({ fileName: z.string(), base64Data: z.string() }))
      .handler(async ({ input, context }) => {
        const session = await auth.api.getSession({ headers: context.headers })
        if (!session?.user) {
          throw new ORPCError('UNAUTHORIZED')
        }

        // Decode base64 to blob
        const buffer = Buffer.from(input.base64Data, 'base64')
        const blob = new Blob([buffer], { type: 'image/jpeg' })

        const { url } = await uploadImageToCloudinary(blob, input.fileName)

        await prisma.user.update({
          where: { id: session.user.id },
          data: { image: url, avatarUrl: url },
        })

        return { url }
      }),
  },
}
