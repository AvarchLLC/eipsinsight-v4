import { os, checkAPIToken, type Ctx, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const proposalsProcedures = {
  // A. Proposal Overview
  getProposal: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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
      const repo = snapshot?.repositories;

      // Parse authors (assuming comma-separated in author field)
      const authors = eip.author 
        ? eip.author.split(',').map(a => a.trim()).filter(Boolean)
        : [];

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
        discussions_to: null, // TODO: Add discussions_to field to schema
        requires: [], // TODO: Parse from markdown or add to schema
      };
    }),

  // B. Status Timeline
  getStatusEvents: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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
  getTypeEvents: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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
  getUpgrades: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  // E. Markdown Content (placeholder - eip_files may contain this)
  getContent: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const eip = await prisma.eips.findUnique({
        where: { eip_number: input.number },
        include: {
          eip_files: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });

      if (!eip) {
        throw new ORPCError('NOT_FOUND', { 
          message: `EIP-${input.number} not found` 
        });
      }

      // Return file path (content would need to be fetched from GitHub or stored separately)
      const latestFile = eip.eip_files[0];
      return {
        content: null, // TODO: Fetch from GitHub or add content field to eip_files
        file_path: latestFile?.file_path || null,
        updated_at: latestFile?.created_at?.toISOString() || null,
      };
    }),

  // Governance Signals
  getGovernanceState: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eip', 'erc', 'rip', 'eips', 'ercs', 'rips']),
      number: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const eip = await prisma.eips.findUnique({
        where: { eip_number: input.number },
      });

      if (!eip) {
        return {
          current_pr_state: null,
          waiting_on: null,
          days_since_last_action: null,
          review_velocity: null,
        };
      }

      // Query pull request eips separately
      const pullRequestEips = await prisma.pull_request_eips.findMany({
        where: { eip_id: eip.id },
        include: {
          pull_requests: {
            include: {
              repositories: true,
            },
          },
        },
        take: 1,
        orderBy: { pr_id: 'desc' },
      });

      if (!pullRequestEips.length) {
        return {
          current_pr_state: null,
          waiting_on: null,
          days_since_last_action: null,
          review_velocity: null,
        };
      }

      const pr = pullRequestEips[0].pull_requests;
      
      // Query pr_governance_state separately using pr_number and repository_id
      const governanceState = pr.repository_id && pr.pr_number
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
        review_velocity: null, // TODO: Calculate from events
      };
    }),
}
