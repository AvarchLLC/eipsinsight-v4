import { protectedProcedure, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const historicalProcedures = {
  getHistoricalGrowth: protectedProcedure
    .input(z.object({
      mode: z.enum(['category', 'status']).default('category'),
      includeRIPs: z.boolean().optional().default(true)
    }))
    .handler(async ({ input, context }) => {
let results;
      if (input.mode === 'category') {
        results = await prisma.$queryRawUnsafe<Array<{
          year: number;
          category: string;
          count: bigint;
        }>>(`
          WITH CombinedProposals AS (
              SELECT 
                  EXTRACT(YEAR FROM e.created_at)::int as year,
                  COALESCE(s.category, 'Core') as dimension
              FROM eips e
              JOIN eip_snapshots s ON e.id = s.eip_id
              WHERE e.created_at IS NOT NULL
              ${!input.includeRIPs ? 'AND s.category != \'RIP\'' : ''}
              UNION ALL
              SELECT 
                  EXTRACT(YEAR FROM created_at)::int as year,
                  'RIP' as dimension
              FROM rips
              WHERE created_at IS NOT NULL
              ${!input.includeRIPs ? 'AND 1=0' : ''}
          )
          SELECT 
              year,
              dimension as category,
              COUNT(*) as count
          FROM CombinedProposals
          GROUP BY year, dimension
          ORDER BY year ASC, count DESC;
        `);
      } else {
        results = await prisma.$queryRawUnsafe<Array<{
          year: number;
          status: string;
          count: bigint;
        }>>(`
          WITH CombinedProposals AS (
              SELECT 
                  EXTRACT(YEAR FROM e.created_at)::int as year,
                  s.status as dimension
              FROM eips e
              JOIN eip_snapshots s ON e.id = s.eip_id
              WHERE e.created_at IS NOT NULL
              ${!input.includeRIPs ? 'AND s.category != \'RIP\'' : ''}
              UNION ALL
              SELECT 
                  EXTRACT(YEAR FROM created_at)::int as year,
                  status as dimension
              FROM rips
              WHERE created_at IS NOT NULL
              ${!input.includeRIPs ? 'AND 1=0' : ''}
          )
          SELECT 
              year,
              dimension as status,
              COUNT(*) as count
          FROM CombinedProposals
          GROUP BY year, dimension
          ORDER BY year ASC, count DESC;
        `);
      }
      // Group by year for frontend
      const timelineMap = new Map<number, { year: number; total: number; breakdown: Array<{ key: string; count: number }> }>();
      for (const row of results) {
        const year = row.year;
        if (!timelineMap.has(year)) {
          timelineMap.set(year, { year, total: 0, breakdown: [] });
        }
        const entry = timelineMap.get(year)!;
        const count = Number(row.count);
        entry.total += count;
        const key = input.mode === 'category' 
          ? (row as { year: number; category: string; count: bigint }).category
          : (row as { year: number; status: string; count: bigint }).status;
        entry.breakdown.push({ key, count });
      }
      return Array.from(timelineMap.values()).sort((a, b) => a.year - b.year);
    }),
}

