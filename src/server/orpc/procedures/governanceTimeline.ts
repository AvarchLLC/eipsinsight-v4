import { protectedProcedure, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const governanceTimelineProcedures = {
  getTimelineByCategory: protectedProcedure
    .input(z.object({
      includeRIPs: z.boolean().optional().default(true)
    }))
    .handler(async ({ input, context }) => {
const sql = `
        WITH CombinedProposals AS (
          -- EIPs joined with their Snapshot for Category
          SELECT 
            EXTRACT(YEAR FROM e.created_at)::int as year,
            CASE
              WHEN s.category IS NOT NULL AND s.category != '' THEN s.category
              WHEN s.type = 'Meta' THEN 'Meta'
              WHEN s.type = 'Informational' THEN 'Informational'
              ELSE 'Core'
            END as dimension
          FROM eips e
          JOIN eip_snapshots s ON e.id = s.eip_id
          WHERE e.created_at IS NOT NULL
          UNION ALL
          -- RIPs (Category is always 'RIP')
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
        ORDER BY year ASC, count DESC
      `;

      const results = await prisma.$queryRawUnsafe<Array<{
        year: number | null;
        category: string;
        count: bigint;
      }>>(sql);

      console.log('[getTimelineByCategory] Raw results:', results.length, 'rows');

      // Group by year, filtering out NULL years
      const timelineMap = new Map<number, { year: number; total: number; breakdown: Array<{ key: string; count: number }> }>();
      for (const row of results) {
        const year = row.year;
        if (year === null || year === undefined) continue;
        
        if (!timelineMap.has(year)) {
          timelineMap.set(year, { year, total: 0, breakdown: [] });
        }
        const entry = timelineMap.get(year)!;
        const count = Number(row.count);
        entry.total += count;
        entry.breakdown.push({ key: row.category, count });
      }
      
      const final = Array.from(timelineMap.values()).sort((a, b) => a.year - b.year);
      console.log('[getTimelineByCategory] Final result:', final.length, 'years');
      return final;
    }),

  getTimelineByStatus: protectedProcedure
    .input(z.object({
      includeRIPs: z.boolean().optional().default(true)
    }))
    .handler(async ({ input, context }) => {
const sql = `
        WITH CombinedProposals AS (
          -- EIPs
          SELECT 
            EXTRACT(YEAR FROM e.created_at)::int as year,
            s.status as dimension
          FROM eips e
          JOIN eip_snapshots s ON e.id = s.eip_id
          WHERE e.created_at IS NOT NULL
          UNION ALL
          -- RIPs
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
        ORDER BY year ASC, count DESC
      `;

      const results = await prisma.$queryRawUnsafe<Array<{
        year: number | null;
        status: string;
        count: bigint;
      }>>(sql);

      console.log('[getTimelineByStatus] Raw results:', results.length, 'rows');

      // Group by year, filtering out NULL years
      const timelineMap = new Map<number, { year: number; total: number; breakdown: Array<{ key: string; count: number }> }>();
      for (const row of results) {
        const year = row.year;
        if (year === null || year === undefined) continue;
        
        if (!timelineMap.has(year)) {
          timelineMap.set(year, { year, total: 0, breakdown: [] });
        }
        const entry = timelineMap.get(year)!;
        const count = Number(row.count);
        entry.total += count;
        entry.breakdown.push({ key: row.status, count });
      }
      
      const final = Array.from(timelineMap.values()).sort((a, b) => a.year - b.year);
      console.log('[getTimelineByStatus] Final result:', final.length, 'years');
      return final;
    }),

  getDetailedDataByYear: protectedProcedure
    .input(z.object({
      year: z.number(),
      includeRIPs: z.boolean().optional().default(true)
    }))
    .handler(async ({ input, context }) => {
const sql = `
        WITH EIPData AS (
          SELECT 
            e.eip_number,
            e.title,
            e.author,
            e.created_at,
            COALESCE(s.type, 'EIP') as type,
            s.status,
            CASE
              WHEN s.category IS NOT NULL AND s.category != '' THEN s.category
              WHEN s.type = 'Meta' THEN 'Meta'
              WHEN s.type = 'Informational' THEN 'Informational'
              ELSE 'Core'
            END as category,
            r.name as repository,
            'https://eips.ethereum.org/EIPS/eip-' || e.eip_number as url
          FROM eips e
          JOIN eip_snapshots s ON e.id = s.eip_id
          LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE EXTRACT(YEAR FROM e.created_at) = ${input.year}
          ${!input.includeRIPs ? `AND (r.name IS NULL OR r.name NOT LIKE '%RIPs%')` : ''}
        ),
        RIPData AS (
          SELECT 
            rip_number as eip_number,
            title,
            author,
            created_at,
            'RIP' as type,
            status,
            'RIP' as category,
            'ethereum/RIPs' as repository,
            'https://github.com/ethereum/RIPs/blob/master/RIPS/rip-' || rip_number || '.md' as url
          FROM rips
          WHERE EXTRACT(YEAR FROM created_at) = ${input.year}
          ${!input.includeRIPs ? 'AND 1=0' : ''}
        )
        SELECT * FROM EIPData
        UNION ALL
        SELECT * FROM RIPData
        ORDER BY eip_number ASC
      `;

      const results = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        author: string | null;
        created_at: Date | null;
        type: string;
        status: string;
        category: string;
        repository: string | null;
        url: string;
      }>>(sql);

      return results.map(row => ({
        eipNumber: row.eip_number,
        title: row.title || '',
        author: row.author || '',
        createdAt: row.created_at ? row.created_at.toISOString().split('T')[0] : '',
        type: row.type,
        status: row.status,
        category: row.category,
        repository: row.repository || '',
        url: row.url
      }));
    }),

  getTrendingProposals: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(6)
    }))
    .handler(async ({ input, context }) => {
try {
        // Fetch latest topics from Ethereum Magicians
        const response = await fetch('https://ethereum-magicians.org/latest.json', {
          headers: {
            'User-Agent': 'EIPsInsight/1.0',
          },
          next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
          throw new Error(`Ethereum Magicians API returned ${response.status}`);
        }

        const data = await response.json();
        const topics = data.topic_list?.topics || [];

        // Parse and process topics
        const proposalRegex = /^(eip|erc|rip)-(\d+):\s+/i;
        const processed: Array<{
          proposalNumber: number;
          proposalType: 'EIP' | 'ERC' | 'RIP';
          title: string;
          status?: string;
          category?: string;
          author?: string;
          authorAvatar?: string;
          authorUsername?: string;
          replies: number;
          views?: number;
          likes?: number;
          tags?: string[];
          lastActivityAt: string;
          destination: 'internal' | 'magicians';
          url: string;
          magiciansUrl: string;
        }> = [];

        // Pre-parse all matching topics to collect proposal numbers
        const parsedTopics: Array<{
          topic: any;
          proposalType: 'EIP' | 'ERC' | 'RIP';
          proposalNumber: number;
          cleanTitle: string;
        }> = [];

        for (const topic of topics.slice(0, 40)) {
          const title = topic.title || '';
          const match = title.match(proposalRegex);
          if (!match) continue;
          const proposalType = match[1].toUpperCase() as 'EIP' | 'ERC' | 'RIP';
          const proposalNumber = parseInt(match[2], 10);
          if (!proposalNumber || proposalNumber <= 0) continue;
          parsedTopics.push({
            topic,
            proposalType,
            proposalNumber,
            cleanTitle: title.replace(proposalRegex, '').trim(),
          });
        }

        // Batch DB lookups: fetch all EIPs and RIPs at once
        const eipNumbers = parsedTopics.filter(t => t.proposalType !== 'RIP').map(t => t.proposalNumber);
        const ripNumbers = parsedTopics.filter(t => t.proposalType === 'RIP').map(t => t.proposalNumber);

        const [eipRows, ripRows] = await Promise.all([
          eipNumbers.length > 0
            ? prisma.eips.findMany({
                where: { eip_number: { in: eipNumbers } },
                include: { eip_snapshots: true },
              })
            : Promise.resolve([]),
          ripNumbers.length > 0
            ? prisma.rips.findMany({ where: { rip_number: { in: ripNumbers } } })
            : Promise.resolve([]),
        ]);

        const eipMap = new Map(eipRows.map(e => [e.eip_number, e]));
        const ripMap = new Map(ripRows.map(r => [r.rip_number, r]));

        for (const { topic, proposalType, proposalNumber, cleanTitle } of parsedTopics) {
          const replies = topic.reply_count || 0;
          const views = topic.views || 0;
          const likes = topic.like_count || 0;
          const tags = topic.tags || [];
          const lastActivityAt = topic.last_posted_at || topic.created_at || new Date().toISOString();
          const magiciansUrl = `https://ethereum-magicians.org/t/${topic.slug}/${topic.id}`;
          
          let authorInfo: { name?: string; username?: string; avatar?: string } = {};
          if (data.users && topic.posters && topic.posters.length > 0) {
            const originalPoster = topic.posters.find((p: any) => 
              p.description === 'Original Poster' || 
              p.description === 'Original Poster, Most Recent Poster' ||
              (p.extras === 'latest single' && p.description?.includes('Original Poster'))
            ) || topic.posters[0];
            const posterUserId = originalPoster?.user_id;
            if (posterUserId && posterUserId !== -1) {
              const user = data.users.find((u: any) => u.id === posterUserId);
              if (user) {
                const avatarSize = '45';
                const avatarUrl = user.avatar_template 
                  ? `https://ethereum-magicians.org${user.avatar_template.replace('{size}', avatarSize)}`
                  : undefined;
                authorInfo = {
                  name: user.name || user.username || 'Unknown',
                  username: user.username,
                  avatar: avatarUrl,
                };
              }
            }
          }

          let internalProposal: {
            status?: string; category?: string; url?: string; title?: string; author?: string;
          } | null = null;

          if (proposalType === 'RIP') {
            const rip = ripMap.get(proposalNumber);
            if (rip) {
              internalProposal = {
                status: rip.status || undefined,
                category: 'RIP',
                url: `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${proposalNumber}.md`,
                title: rip.title || undefined,
                author: rip.author || undefined,
              };
            }
          } else {
            const eip = eipMap.get(proposalNumber);
            const snapshot = eip?.eip_snapshots;
            if (eip && snapshot) {
              internalProposal = {
                status: snapshot.status || undefined,
                category: snapshot.category || (snapshot.type === 'Meta' ? 'Meta' : snapshot.type === 'Informational' ? 'Informational' : 'Core'),
                url: proposalType === 'ERC' 
                  ? `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-${proposalNumber}.md`
                  : `https://eips.ethereum.org/EIPS/eip-${proposalNumber}`,
                title: eip.title || undefined,
                author: eip.author || undefined,
              };
            }
          }

          processed.push({
            proposalNumber,
            proposalType,
            title: cleanTitle || internalProposal?.title || 'Untitled',
            status: internalProposal?.status,
            category: internalProposal?.category,
            author: authorInfo.name || internalProposal?.author,
            authorAvatar: authorInfo.avatar,
            authorUsername: authorInfo.username,
            replies,
            views,
            likes,
            tags: tags.slice(0, 3),
            lastActivityAt,
            destination: internalProposal ? 'internal' : 'magicians',
            url: internalProposal?.url || magiciansUrl,
            magiciansUrl,
          });
        }

        // Sort by: most recently active, then by reply count, prefer internal
        processed.sort((a, b) => {
          // Prefer internal proposals
          if (a.destination === 'internal' && b.destination !== 'internal') return -1;
          if (b.destination === 'internal' && a.destination !== 'internal') return 1;
          
          // Then by last activity
          const timeA = new Date(a.lastActivityAt).getTime();
          const timeB = new Date(b.lastActivityAt).getTime();
          if (timeB !== timeA) return timeB - timeA;
          
          // Finally by reply count
          return b.replies - a.replies;
        });

        return processed.slice(0, input.limit);
      } catch (error) {
        console.error('Failed to fetch trending proposals:', error);
        return [];
      }
    }),
}

