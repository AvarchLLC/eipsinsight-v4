import { optionalAuthProcedure } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

const filterSchema = z.object({
  repo: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all'),
  category: z.string().optional(),
})

export const velocityProcedures = {
  getStatusDurations: optionalAuthProcedure
    .input(filterSchema)
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        stage: string;
        avg_days: number;
      }>>(
        `
        WITH first_entered AS (
          SELECT 
            s.eip_id,
            s.to_status as status,
            MIN(s.changed_at) as entered_at
          FROM eip_status_events s
          GROUP BY s.eip_id, s.to_status
          
          UNION ALL
          
          SELECT 
            id as eip_id,
            'Draft' as status,
            created_at::timestamp as entered_at
          FROM eips
          WHERE created_at IS NOT NULL
        ),
        first_entered_deduped AS (
          SELECT eip_id, status, MIN(entered_at) as entered_at
          FROM first_entered
          GROUP BY eip_id, status
        ),
        filtered_eips AS (
          SELECT sn.eip_id
          FROM eip_snapshots sn
          LEFT JOIN repositories r ON sn.repository_id = r.id
          WHERE ($1::text IS NULL OR $1::text = 'all' OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND ($2::text IS NULL OR sn.category = $2)
        ),
        durations AS (
          SELECT 
            'Draft' as stage,
            f.eip_id,
            EXTRACT(EPOCH FROM (COALESCE(r.entered_at, lc.entered_at, fin.entered_at) - d.entered_at))/86400 as days
          FROM first_entered_deduped d
          JOIN filtered_eips f ON d.eip_id = f.eip_id
          LEFT JOIN first_entered_deduped r ON d.eip_id = r.eip_id AND r.status = 'Review'
          LEFT JOIN first_entered_deduped lc ON d.eip_id = lc.eip_id AND lc.status = 'Last Call'
          LEFT JOIN first_entered_deduped fin ON d.eip_id = fin.eip_id AND fin.status = 'Final'
          WHERE d.status = 'Draft' 
            AND COALESCE(r.entered_at, lc.entered_at, fin.entered_at) IS NOT NULL
            AND COALESCE(r.entered_at, lc.entered_at, fin.entered_at) >= d.entered_at
          
          UNION ALL
          
          SELECT 
            'Review' as stage,
            f.eip_id,
            EXTRACT(EPOCH FROM (COALESCE(lc.entered_at, fin.entered_at) - r.entered_at))/86400 as days
          FROM first_entered_deduped r
          JOIN filtered_eips f ON r.eip_id = f.eip_id
          LEFT JOIN first_entered_deduped lc ON r.eip_id = lc.eip_id AND lc.status = 'Last Call'
          LEFT JOIN first_entered_deduped fin ON r.eip_id = fin.eip_id AND fin.status = 'Final'
          WHERE r.status = 'Review' 
            AND COALESCE(lc.entered_at, fin.entered_at) IS NOT NULL
            AND COALESCE(lc.entered_at, fin.entered_at) >= r.entered_at
            
          UNION ALL
          
          SELECT 
            'Last Call' as stage,
            f.eip_id,
            EXTRACT(EPOCH FROM (fin.entered_at - lc.entered_at))/86400 as days
          FROM first_entered_deduped lc
          JOIN filtered_eips f ON lc.eip_id = f.eip_id
          JOIN first_entered_deduped fin ON lc.eip_id = fin.eip_id AND fin.status = 'Final'
          WHERE lc.status = 'Last Call'
            AND fin.entered_at >= lc.entered_at
        )
        SELECT 
          stage,
          AVG(days)::numeric as avg_days
        FROM durations
        GROUP BY stage
        `,
        input.repo === 'all' ? null : input.repo,
        input.category ?? null
      );

      return results.map((r) => ({
        stage: r.stage,
        avgDays: Math.round(Number(r.avg_days || 0)),
      }));
    }),

  getStagnancyProbability: optionalAuthProcedure
    .input(filterSchema)
    .handler(async ({ input }) => {
      // 1. Calculate historical probabilities per bucket
      const historicalBuckets = await prisma.$queryRawUnsafe<Array<{
        bucket: string;
        total: bigint;
        finalized: bigint;
      }>>(
        `
        WITH first_entered AS (
          SELECT 
            s.eip_id,
            s.to_status as status,
            MIN(s.changed_at) as entered_at
          FROM eip_status_events s
          GROUP BY s.eip_id, s.to_status
          
          UNION ALL
          
          SELECT 
            id as eip_id,
            'Draft' as status,
            created_at::timestamp as entered_at
          FROM eips
          WHERE created_at IS NOT NULL
        ),
        deduped_entered AS (
          SELECT eip_id, status, MIN(entered_at) as entered_at
          FROM first_entered
          GROUP BY eip_id, status
        ),
        draft_exits AS (
          SELECT 
            d.eip_id,
            d.entered_at as draft_entered_at,
            COALESCE(r.entered_at, lc.entered_at, fin.entered_at, stag.entered_at, wd.entered_at) as exit_entered_at,
            CASE WHEN fin.entered_at IS NOT NULL THEN 1 ELSE 0 END as reached_final
          FROM deduped_entered d
          LEFT JOIN deduped_entered r ON d.eip_id = r.eip_id AND r.status = 'Review'
          LEFT JOIN deduped_entered lc ON d.eip_id = lc.eip_id AND lc.status = 'Last Call'
          LEFT JOIN deduped_entered fin ON d.eip_id = fin.eip_id AND fin.status = 'Final'
          LEFT JOIN deduped_entered stag ON d.eip_id = stag.eip_id AND stag.status = 'Stagnant'
          LEFT JOIN deduped_entered wd ON d.eip_id = wd.eip_id AND wd.status = 'Withdrawn'
          WHERE d.status = 'Draft'
        ),
        resolved_drafts AS (
          SELECT 
            eip_id,
            EXTRACT(EPOCH FROM (exit_entered_at - draft_entered_at))/86400 as days_in_draft,
            reached_final
          FROM draft_exits
          WHERE exit_entered_at IS NOT NULL AND exit_entered_at >= draft_entered_at
        ),
        buckets AS (
          SELECT 
            CASE 
              WHEN days_in_draft <= 90 THEN '0-3m'
              WHEN days_in_draft <= 180 THEN '3-6m'
              WHEN days_in_draft <= 365 THEN '6-12m'
              ELSE '12m+'
            END as bucket,
            reached_final
          FROM resolved_drafts
        )
        SELECT 
          bucket,
          COUNT(*) as total,
          SUM(reached_final) as finalized
        FROM buckets
        GROUP BY bucket
        `
      );

      const bucketProbs: Record<string, number> = {
        '0-3m': 0,
        '3-6m': 0,
        '6-12m': 0,
        '12m+': 0
      };

      for (const row of historicalBuckets) {
        const total = Number(row.total);
        const finalized = Number(row.finalized);
        if (total > 0) {
          bucketProbs[row.bucket] = finalized / total;
        }
      }

      // 2. Fetch current drafts and assign probability based on their age
      const currentDrafts = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        repo: string | null;
        age_days: number;
      }>>(
        `
        SELECT 
          sn.eip_id as eip_number,
          e.title,
          r.name as repo,
          EXTRACT(EPOCH FROM (NOW() - COALESCE(d.entered_at, e.created_at::timestamp)))/86400 as age_days
        FROM eip_snapshots sn
        JOIN eips e ON sn.eip_id = e.id
        LEFT JOIN repositories r ON sn.repository_id = r.id
        LEFT JOIN (
          SELECT eip_id, MIN(changed_at) as entered_at 
          FROM eip_status_events 
          WHERE to_status = 'Draft' 
          GROUP BY eip_id
        ) d ON d.eip_id = sn.eip_id
        WHERE sn.status = 'Draft'
          AND ($1::text IS NULL OR $1::text = 'all' OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::text IS NULL OR sn.category = $2)
        ORDER BY age_days DESC
        `,
        input.repo === 'all' ? null : input.repo,
        input.category ?? null
      );

      return currentDrafts.map(d => {
        const ageDays = Number(d.age_days || 0);
        let bucket = '0-3m';
        if (ageDays > 90 && ageDays <= 180) bucket = '3-6m';
        else if (ageDays > 180 && ageDays <= 365) bucket = '6-12m';
        else if (ageDays > 365) bucket = '12m+';

        const probability = bucketProbs[bucket] || 0;

        return {
          eipNumber: d.eip_number,
          title: d.title || `Proposal ${d.eip_number}`,
          repo: d.repo ? d.repo.split('/')[1]?.toLowerCase() : 'unknown',
          ageDays: Math.round(ageDays),
          probability: Math.round(probability * 100)
        };
      });
    }),

  getVelocityComparison: optionalAuthProcedure
    .input(filterSchema)
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        repo: string;
        avg_days: number;
      }>>(
        `
        WITH first_entered AS (
          SELECT 
            s.eip_id,
            s.to_status as status,
            MIN(s.changed_at) as entered_at
          FROM eip_status_events s
          GROUP BY s.eip_id, s.to_status
          
          UNION ALL
          
          SELECT 
            id as eip_id,
            'Draft' as status,
            created_at::timestamp as entered_at
          FROM eips
          WHERE created_at IS NOT NULL
        ),
        deduped_entered AS (
          SELECT eip_id, status, MIN(entered_at) as entered_at
          FROM first_entered
          GROUP BY eip_id, status
        ),
        e2e AS (
          SELECT 
            d.eip_id,
            EXTRACT(EPOCH FROM (fin.entered_at - d.entered_at))/86400 as days,
            r.name as repo_name
          FROM deduped_entered d
          JOIN eip_snapshots sn ON d.eip_id = sn.eip_id
          LEFT JOIN repositories r ON sn.repository_id = r.id
          JOIN deduped_entered fin ON d.eip_id = fin.eip_id AND fin.status = 'Final'
          WHERE d.status = 'Draft'
            AND fin.entered_at >= d.entered_at
            AND ($1::text IS NULL OR sn.category = $1)
        )
        SELECT 
          LOWER(SPLIT_PART(repo_name, '/', 2)) as repo,
          AVG(days)::numeric as avg_days
        FROM e2e
        GROUP BY LOWER(SPLIT_PART(repo_name, '/', 2))
        `,
        input.category ?? null
      );

      return results.map(r => ({
        repo: r.repo || 'unknown',
        avgDays: Math.round(Number(r.avg_days || 0)),
      }));
    }),
}
