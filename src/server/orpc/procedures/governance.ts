import { protectedProcedure, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const governanceProcedures = {
  getWaitingStates: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {

      const results = await prisma.$queryRaw<Array<{
        current_state: string;
        count: bigint;
      }>>`
        SELECT 
          current_state,
          COUNT(*) as count
        FROM pr_governance_state
        WHERE current_state IS NOT NULL
        GROUP BY current_state
        ORDER BY count DESC
      `;

      const total = results.reduce((sum, row) => sum + Number(row.count), 0);

      return results.map(row => ({
        state: row.current_state,
        count: Number(row.count),
        percentage: total > 0 ? Math.round((Number(row.count) / total) * 100) : 0
      }));
    }),

  getResponsibilityMetrics: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {

      const [editorMetrics, authorMetrics] = await Promise.all([
        // Editor metrics
        prisma.$queryRaw<Array<{
          count: bigint;
          median_wait_days: number;
        }>>`
          SELECT 
            COUNT(*) as count,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (NOW() - waiting_since))) as median_wait_days
          FROM pr_governance_state
          WHERE current_state = 'WAITING_EDITOR'
        `,
        // Author metrics
        prisma.$queryRaw<Array<{
          count: bigint;
          median_wait_days: number;
        }>>`
          SELECT 
            COUNT(*) as count,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (NOW() - waiting_since))) as median_wait_days
          FROM pr_governance_state
          WHERE current_state = 'WAITING_AUTHOR'
        `
      ]);

      const totalPRs = await prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) as total
        FROM pr_governance_state
        WHERE current_state IS NOT NULL
      `;

      const total = Number(totalPRs[0]?.total || 0);

      return {
        editor: {
          count: Number(editorMetrics[0]?.count || 0),
          percentage: total > 0 ? Math.round((Number(editorMetrics[0]?.count || 0) / total) * 100) : 0,
          medianWaitDays: Math.round(editorMetrics[0]?.median_wait_days || 0)
        },
        author: {
          count: Number(authorMetrics[0]?.count || 0),
          percentage: total > 0 ? Math.round((Number(authorMetrics[0]?.count || 0) / total) * 100) : 0,
          medianWaitDays: Math.round(authorMetrics[0]?.median_wait_days || 0)
        }
      };
    }),

  getWaitingTimeline: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {

      const results = await prisma.$queryRaw<Array<{
        bucket: string;
        current_state: string;
        count: bigint;
      }>>`
        SELECT 
          CASE 
            WHEN EXTRACT(DAY FROM (NOW() - waiting_since)) < 7 THEN '< 7 days'
            WHEN EXTRACT(DAY FROM (NOW() - waiting_since)) < 30 THEN '7-30 days'
            WHEN EXTRACT(DAY FROM (NOW() - waiting_since)) < 90 THEN '30-90 days'
            ELSE '90+ days'
          END as bucket,
          current_state,
          COUNT(*) as count
        FROM pr_governance_state
        WHERE current_state IN ('WAITING_AUTHOR', 'WAITING_EDITOR')
        GROUP BY bucket, current_state
        ORDER BY 
          CASE bucket
            WHEN '< 7 days' THEN 1
            WHEN '7-30 days' THEN 2
            WHEN '30-90 days' THEN 3
            ELSE 4
          END
      `;

      // Transform to the format needed by the frontend
      const buckets = ['< 7 days', '7-30 days', '30-90 days', '90+ days'];
      return buckets.map(bucket => {
        const authorRow = results.find(r => r.bucket === bucket && r.current_state === 'WAITING_AUTHOR');
        const editorRow = results.find(r => r.bucket === bucket && r.current_state === 'WAITING_EDITOR');
        
        return {
          bucket,
          waitingOnAuthor: Number(authorRow?.count || 0),
          waitingOnEditor: Number(editorRow?.count || 0)
        };
      });
    }),

  getNeedsAttention: protectedProcedure
    .input(z.object({
      minDays: z.number().optional(),
      state: z.enum(['WAITING_AUTHOR', 'WAITING_EDITOR', 'WAITING_COMMUNITY', 'IDLE']).optional()
    }))
    .handler(async ({ input, context }) => {// Build WHERE clause safely
      const conditions: string[] = ['pgs.current_state IS NOT NULL'];
      
      if (input.minDays !== undefined) {
        conditions.push(`EXTRACT(DAY FROM (NOW() - pgs.waiting_since)) >= ${input.minDays}`);
      }
      
      if (input.state) {
        conditions.push(`pgs.current_state = '${input.state.replace(/'/g, "''")}'`);
      }

      const sql = `
        SELECT 
          pgs.pr_number,
          r.name as repository,
          pgs.current_state,
          pgs.waiting_since,
          EXTRACT(DAY FROM (NOW() - pgs.waiting_since))::int as days_waiting,
          pgs.last_actor,
          pgs.last_event_type,
          'https://github.com/' || r.name || '/pull/' || pgs.pr_number as pr_url
        FROM pr_governance_state pgs
        JOIN repositories r ON pgs.repository_id = r.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY days_waiting DESC
        LIMIT 50
      `;

      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repository: string;
        current_state: string;
        waiting_since: Date | null;
        days_waiting: number;
        last_actor: string | null;
        last_event_type: string | null;
        pr_url: string;
      }>>(sql);

      return results.map(row => ({
        prNumber: row.pr_number,
        repository: row.repository,
        currentState: row.current_state,
        waitingSince: row.waiting_since ? row.waiting_since.toISOString().split('T')[0] : '',
        daysWaiting: row.days_waiting,
        responsibleParty: row.current_state === 'WAITING_AUTHOR' ? 'Author' : 
                         row.current_state === 'WAITING_EDITOR' ? 'Editor' :
                         row.current_state === 'WAITING_COMMUNITY' ? 'Community' : 'Unknown',
        lastEvent: row.last_event_type || 'No recent activity',
        url: row.pr_url
      }));
    }),

  getLongestWaitingPR: protectedProcedure
    .input(z.object({
      state: z.enum(['WAITING_AUTHOR', 'WAITING_EDITOR']).optional()
    }))
    .handler(async ({ input, context }) => {const stateCondition = input.state 
        ? `pgs.current_state = '${input.state.replace(/'/g, "''")}'`
        : `pgs.current_state IN ('WAITING_AUTHOR', 'WAITING_EDITOR')`;

      const sql = `
        SELECT 
          pgs.pr_number,
          r.name as repository,
          EXTRACT(DAY FROM (NOW() - pgs.waiting_since))::int as days_waiting,
          'https://github.com/' || r.name || '/pull/' || pgs.pr_number as pr_url
        FROM pr_governance_state pgs
        JOIN repositories r ON pgs.repository_id = r.id
        WHERE ${stateCondition}
        ORDER BY pgs.waiting_since ASC
        LIMIT 1
      `;

      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repository: string;
        days_waiting: number;
        pr_url: string;
      }>>(sql);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        prNumber: row.pr_number,
        repository: row.repository,
        daysWaiting: row.days_waiting,
        url: row.pr_url
      };
    }),
}

