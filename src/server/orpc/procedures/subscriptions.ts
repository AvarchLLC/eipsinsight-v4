import * as z from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PROPOSAL_FILTERS,
  PROPOSAL_REPOS,
  REPOSITORY_FILTERS,
  UPGRADE_FILTERS,
  getProposalPath,
  getRepositoryLabel,
  getRepositoryPath,
  resolveRepository,
  resolveUpgrade,
  resolveProposal,
  type ProposalFilter,
  type RepositoryFilter,
  type UpgradeFilter,
} from "@/lib/subscriptions";
import { protectedProcedure, optionalAuthProcedure, ORPCError } from "./types";
import { PQ_EIPS } from "@/data/pq-registry";

const repoSchema = z.enum(PROPOSAL_REPOS);
const PQ_EIP_NUMBERS = PQ_EIPS.map((e) => e.number);
const filterSchema = z.enum(PROPOSAL_FILTERS);
const repositoryFilterSchema = z.enum(REPOSITORY_FILTERS);
const upgradeFilterSchema = z.enum(UPGRADE_FILTERS);

async function requireSessionUser(headers: Record<string, string>) {
  const session = await auth.api.getSession({
    headers: new Headers(headers),
  });

  if (!session?.user?.id) {
    throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
  }

  return session.user;
}

/** Resolve the tracked PQ EIP set to {eipId, repositoryId} rows, skipping any
 *  not yet indexed. Used by the batched PQ subscription procedures. */
async function resolvePqProposals() {
  const resolved = await Promise.all(PQ_EIP_NUMBERS.map((n) => resolveProposal("eip", n)));
  return resolved.filter((p): p is NonNullable<typeof p> => p != null);
}

export const subscriptionsProcedures = {
  getProposalSubscription: protectedProcedure
    .input(
      z.object({
        repo: repoSchema,
        number: z.number().int().positive(),
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const proposal = await resolveProposal(input.repo, input.number);

      if (!proposal) {
        throw new ORPCError("NOT_FOUND", {
          message: "Proposal not found",
        });
      }

      const subscription = await prisma.proposalSubscription.findUnique({
        where: {
          user_id_eip_id_repository_id: {
            user_id: user.id,
            eip_id: proposal.eipId,
            repository_id: proposal.repositoryId,
          },
        },
        select: {
          id: true,
          filter: true,
          created_at: true,
        },
      });

      return {
        subscribed: !!subscription,
        subscription: subscription
          ? {
              id: subscription.id,
              filter: subscription.filter as ProposalFilter,
              createdAt: subscription.created_at.toISOString(),
            }
          : null,
      };
    }),

  listMyProposalSubscriptions: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      const user = await requireSessionUser(context.headers);

      const subscriptions = await prisma.proposalSubscription.findMany({
        where: {
          user_id: user.id,
        },
        orderBy: {
          created_at: "desc",
        },
        include: {
          eips: {
            select: {
              eip_number: true,
              title: true,
              eip_snapshots: {
                select: {
                  status: true,
                },
              },
            },
          },
          repositories: {
            select: {
              name: true,
            },
          },
        },
      });

      return subscriptions.map((subscription) => {
        const repo =
          subscription.repositories.name === "ethereum/ERCs"
            ? "erc"
            : subscription.repositories.name === "ethereum/RIPs"
              ? "rip"
              : "eip";

        return {
          id: subscription.id,
          repo,
          number: subscription.eips.eip_number,
          title: subscription.eips.title || "",
          status: subscription.eips.eip_snapshots?.status || null,
          filter: subscription.filter as ProposalFilter,
          createdAt: subscription.created_at.toISOString(),
          path: getProposalPath(repo, subscription.eips.eip_number),
        };
      });
    }),

  subscribeToProposal: protectedProcedure
    .input(
      z.object({
        repo: repoSchema,
        number: z.number().int().positive(),
        filter: filterSchema.default("all"),
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const proposal = await resolveProposal(input.repo, input.number);

      if (!proposal) {
        throw new ORPCError("NOT_FOUND", {
          message: "Proposal not found",
        });
      }

      const subscription = await prisma.proposalSubscription.upsert({
        where: {
          user_id_eip_id_repository_id: {
            user_id: user.id,
            eip_id: proposal.eipId,
            repository_id: proposal.repositoryId,
          },
        },
        update: {
          filter: input.filter,
        },
        create: {
          user_id: user.id,
          eip_id: proposal.eipId,
          repository_id: proposal.repositoryId,
          filter: input.filter,
        },
        select: {
          id: true,
          filter: true,
          created_at: true,
        },
      });

      return {
        success: true,
        subscription: {
          id: subscription.id,
          filter: subscription.filter as ProposalFilter,
          createdAt: subscription.created_at.toISOString(),
        },
      };
    }),

  updateProposalSubscriptionFilter: protectedProcedure
    .input(
      z.object({
        repo: repoSchema,
        number: z.number().int().positive(),
        filter: filterSchema,
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const proposal = await resolveProposal(input.repo, input.number);

      if (!proposal) {
        throw new ORPCError("NOT_FOUND", {
          message: "Proposal not found",
        });
      }

      const subscription = await prisma.proposalSubscription.findUnique({
        where: {
          user_id_eip_id_repository_id: {
            user_id: user.id,
            eip_id: proposal.eipId,
            repository_id: proposal.repositoryId,
          },
        },
        select: { id: true },
      });

      if (!subscription) {
        throw new ORPCError("NOT_FOUND", {
          message: "Subscription not found",
        });
      }

      const updated = await prisma.proposalSubscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          filter: input.filter,
        },
        select: {
          id: true,
          filter: true,
          created_at: true,
        },
      });

      return {
        success: true,
        subscription: {
          id: updated.id,
          filter: updated.filter as ProposalFilter,
          createdAt: updated.created_at.toISOString(),
        },
      };
    }),

  unsubscribeFromProposal: protectedProcedure
    .input(
      z.object({
        repo: repoSchema,
        number: z.number().int().positive(),
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const proposal = await resolveProposal(input.repo, input.number);

      if (!proposal) {
        throw new ORPCError("NOT_FOUND", {
          message: "Proposal not found",
        });
      }

      await prisma.proposalSubscription.deleteMany({
        where: {
          user_id: user.id,
          eip_id: proposal.eipId,
          repository_id: proposal.repositoryId,
        },
      });

      return {
        success: true,
      };
    }),

  // ─── PQ readiness: subscribe to the whole tracked PQ EIP set at once ───────
  // Backed by the same proposal_subscription table + scheduler proposal-status
  // notifier, so no new subscription type or scheduler change is needed — this
  // just batches the set behind one RPC and reports aggregate state.
  getPqSubscription: protectedProcedure.input(z.object({})).handler(async ({ context }) => {
    const user = await requireSessionUser(context.headers);
    const proposals = await resolvePqProposals();
    if (proposals.length === 0) return { total: 0, subscribed: 0 };
    const subscribed = await prisma.proposalSubscription.count({
      where: {
        user_id: user.id,
        OR: proposals.map((p) => ({ eip_id: p.eipId, repository_id: p.repositoryId })),
      },
    });
    return { total: proposals.length, subscribed };
  }),

  subscribeToPq: protectedProcedure
    .input(z.object({ filter: filterSchema.default("status") }))
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const proposals = await resolvePqProposals();
      if (proposals.length === 0) return { total: 0, subscribed: 0 };
      await prisma.proposalSubscription.createMany({
        data: proposals.map((p) => ({
          user_id: user.id,
          eip_id: p.eipId,
          repository_id: p.repositoryId,
          filter: input.filter,
        })),
        skipDuplicates: true,
      });
      const subscribed = await prisma.proposalSubscription.count({
        where: {
          user_id: user.id,
          OR: proposals.map((p) => ({ eip_id: p.eipId, repository_id: p.repositoryId })),
        },
      });
      return { total: proposals.length, subscribed };
    }),

  unsubscribeFromPq: protectedProcedure.input(z.object({})).handler(async ({ context }) => {
    const user = await requireSessionUser(context.headers);
    const proposals = await resolvePqProposals();
    if (proposals.length === 0) return { total: 0, subscribed: 0 };
    await prisma.proposalSubscription.deleteMany({
      where: {
        user_id: user.id,
        OR: proposals.map((p) => ({ eip_id: p.eipId, repository_id: p.repositoryId })),
      },
    });
    return { total: proposals.length, subscribed: 0 };
  }),

  getRepositorySubscription: protectedProcedure
    .input(
      z.object({
        repo: repoSchema,
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const repository = await resolveRepository(input.repo);

      if (!repository) {
        throw new ORPCError("NOT_FOUND", { message: "Repository not found" });
      }

      const subscription = await prisma.repositorySubscription.findUnique({
        where: {
          user_id_repository_id: {
            user_id: user.id,
            repository_id: repository.repositoryId,
          },
        },
        select: {
          id: true,
          filter: true,
          created_at: true,
        },
      });

      return {
        subscribed: !!subscription,
        scopeLabel: getRepositoryLabel(input.repo),
        path: getRepositoryPath(input.repo),
        subscription: subscription
          ? {
              id: subscription.id,
              filter: subscription.filter as RepositoryFilter,
              createdAt: subscription.created_at.toISOString(),
            }
          : null,
      };
    }),

  subscribeToRepository: protectedProcedure
    .input(
      z.object({
        repo: repoSchema,
        filter: repositoryFilterSchema.default("status"),
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const repository = await resolveRepository(input.repo);

      if (!repository) {
        throw new ORPCError("NOT_FOUND", { message: "Repository not found" });
      }

      const subscription = await prisma.repositorySubscription.upsert({
        where: {
          user_id_repository_id: {
            user_id: user.id,
            repository_id: repository.repositoryId,
          },
        },
        update: {
          filter: input.filter,
        },
        create: {
          user_id: user.id,
          repository_id: repository.repositoryId,
          filter: input.filter,
        },
        select: {
          id: true,
          filter: true,
          created_at: true,
        },
      });

      return {
        success: true,
        scopeLabel: getRepositoryLabel(input.repo),
        subscription: {
          id: subscription.id,
          filter: subscription.filter as RepositoryFilter,
          createdAt: subscription.created_at.toISOString(),
        },
      };
    }),

  updateRepositorySubscriptionFilter: protectedProcedure
    .input(
      z.object({
        repo: repoSchema,
        filter: repositoryFilterSchema,
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const repository = await resolveRepository(input.repo);

      if (!repository) {
        throw new ORPCError("NOT_FOUND", { message: "Repository not found" });
      }

      const updated = await prisma.repositorySubscription.update({
        where: {
          user_id_repository_id: {
            user_id: user.id,
            repository_id: repository.repositoryId,
          },
        },
        data: {
          filter: input.filter,
        },
        select: {
          id: true,
          filter: true,
          created_at: true,
        },
      }).catch(() => null);

      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Subscription not found" });
      }

      return {
        success: true,
        subscription: {
          id: updated.id,
          filter: updated.filter as RepositoryFilter,
          createdAt: updated.created_at.toISOString(),
        },
      };
    }),

  unsubscribeFromRepository: protectedProcedure
    .input(
      z.object({
        repo: repoSchema,
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const repository = await resolveRepository(input.repo);

      if (!repository) {
        throw new ORPCError("NOT_FOUND", { message: "Repository not found" });
      }

      await prisma.repositorySubscription.deleteMany({
        where: {
          user_id: user.id,
          repository_id: repository.repositoryId,
        },
      });

      return { success: true };
    }),

  getUpgradeSubscription: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const upgrade = await resolveUpgrade(input.slug);

      if (!upgrade) {
        throw new ORPCError("NOT_FOUND", { message: "Upgrade not found" });
      }

      const subscription = await prisma.upgradeSubscription.findUnique({
        where: {
          user_id_upgrade_id: {
            user_id: user.id,
            upgrade_id: upgrade.id,
          },
        },
        select: {
          id: true,
          filter: true,
          created_at: true,
        },
      });

      return {
        subscribed: !!subscription,
        upgrade: {
          slug: upgrade.slug,
          name: upgrade.name,
        },
        subscription: subscription
          ? {
              id: subscription.id,
              filter: subscription.filter as UpgradeFilter,
              createdAt: subscription.created_at.toISOString(),
            }
          : null,
      };
    }),

  subscribeToUpgrade: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        filter: upgradeFilterSchema.default("stage"),
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const upgrade = await resolveUpgrade(input.slug);

      if (!upgrade) {
        throw new ORPCError("NOT_FOUND", { message: "Upgrade not found" });
      }

      const subscription = await prisma.upgradeSubscription.upsert({
        where: {
          user_id_upgrade_id: {
            user_id: user.id,
            upgrade_id: upgrade.id,
          },
        },
        update: {
          filter: input.filter,
        },
        create: {
          user_id: user.id,
          upgrade_id: upgrade.id,
          filter: input.filter,
        },
        select: {
          id: true,
          filter: true,
          created_at: true,
        },
      });

      return {
        success: true,
        upgrade: {
          slug: upgrade.slug,
          name: upgrade.name,
        },
        subscription: {
          id: subscription.id,
          filter: subscription.filter as UpgradeFilter,
          createdAt: subscription.created_at.toISOString(),
        },
      };
    }),

  unsubscribeFromUpgrade: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      const upgrade = await resolveUpgrade(input.slug);

      if (!upgrade) {
        throw new ORPCError("NOT_FOUND", { message: "Upgrade not found" });
      }

      await prisma.upgradeSubscription.deleteMany({
        where: {
          user_id: user.id,
          upgrade_id: upgrade.id,
        },
      });

      return { success: true };
    }),

  listMySubscriptions: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      const user = await requireSessionUser(context.headers);

      const [proposalSubscriptions, repositorySubscriptions, upgradeSubscriptions] = await Promise.all([
        prisma.proposalSubscription.findMany({
          where: { user_id: user.id },
          orderBy: { created_at: "desc" },
          include: {
            eips: {
              select: {
                eip_number: true,
                title: true,
                eip_snapshots: { select: { status: true } },
              },
            },
            repositories: { select: { name: true } },
          },
        }),
        prisma.repositorySubscription.findMany({
          where: { user_id: user.id },
          orderBy: { created_at: "desc" },
          include: {
            repositories: { select: { name: true } },
          },
        }),
        prisma.upgradeSubscription.findMany({
          where: { user_id: user.id },
          orderBy: { created_at: "desc" },
          include: {
            upgrades: { select: { slug: true, name: true } },
          },
        }),
      ]);

      return {
        proposals: proposalSubscriptions.map((subscription) => {
          const repo =
            subscription.repositories.name === "ethereum/ERCs"
              ? "erc"
              : subscription.repositories.name === "ethereum/RIPs"
                ? "rip"
                : "eip";

          return {
            id: subscription.id,
            scope: "proposal" as const,
            repo,
            number: subscription.eips.eip_number,
            title: subscription.eips.title || "",
            status: subscription.eips.eip_snapshots?.status || null,
            filter: subscription.filter as ProposalFilter,
            createdAt: subscription.created_at.toISOString(),
            path: getProposalPath(repo, subscription.eips.eip_number),
          };
        }),
        repositories: repositorySubscriptions.map((subscription) => ({
          id: subscription.id,
          scope: "repository" as const,
          repo:
            subscription.repositories.name === "ethereum/ERCs"
              ? "erc"
              : subscription.repositories.name === "ethereum/RIPs"
                ? "rip"
                : "eip",
          label:
            subscription.repositories.name === "ethereum/ERCs"
              ? "All ERCs"
              : subscription.repositories.name === "ethereum/RIPs"
                ? "All RIPs"
                : "All EIPs",
          path:
            subscription.repositories.name === "ethereum/ERCs"
              ? getRepositoryPath("erc")
              : subscription.repositories.name === "ethereum/RIPs"
                ? getRepositoryPath("rip")
                : getRepositoryPath("eip"),
          filter: subscription.filter as RepositoryFilter,
          createdAt: subscription.created_at.toISOString(),
        })),
        upgrades: upgradeSubscriptions.map((subscription) => ({
          id: subscription.id,
          scope: "upgrade" as const,
          slug: subscription.upgrades.slug,
          name: subscription.upgrades.name || subscription.upgrades.slug,
          filter: subscription.filter as UpgradeFilter,
          createdAt: subscription.created_at.toISOString(),
          path: `/upgrade/${subscription.upgrades.slug}`,
        })),
      };
    }),

  getCallSubscriptions: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      const user = await requireSessionUser(context.headers);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS call_series_subscription (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          email TEXT,
          series TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await prisma.$executeRawUnsafe(`ALTER TABLE call_series_subscription ADD COLUMN IF NOT EXISTS email TEXT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE call_series_subscription ALTER COLUMN user_id DROP NOT NULL`);
      const rows = await prisma.$queryRawUnsafe<Array<{ series: string }>>(
        `SELECT series FROM call_series_subscription WHERE user_id = $1 ORDER BY series ASC`,
        user.id,
      );
      return { series: rows.map((r) => r.series) };
    }),

  subscribeToCalls: optionalAuthProcedure
    .input(z.object({
      series: z.array(z.string().min(1)).min(1),
      email: z.string().email().optional(),
    }))
    .handler(async ({ context, input }) => {
      const session = await auth.api.getSession({ headers: context.headers });
      const userId = session?.user?.id ?? null;
      const targetEmail = (session?.user?.email ?? input.email ?? "").trim().toLowerCase();
      if (!userId && !targetEmail) {
        throw new ORPCError("BAD_REQUEST", { message: "Please enter a valid email address." });
      }

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS call_series_subscription (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          email TEXT,
          series TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await prisma.$executeRawUnsafe(`ALTER TABLE call_series_subscription ADD COLUMN IF NOT EXISTS email TEXT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE call_series_subscription ALTER COLUMN user_id DROP NOT NULL`);

      const normalized = Array.from(new Set(input.series.map((s) => s.trim().toLowerCase()).filter(Boolean)));
      const finalList = normalized.includes("all") ? ["all"] : normalized;

      if (userId) {
        await prisma.$executeRawUnsafe(`DELETE FROM call_series_subscription WHERE user_id = $1`, userId);
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM call_series_subscription WHERE user_id IS NULL AND LOWER(email) = $1`, targetEmail);
      }

      for (const s of finalList) {
        const keyPart = userId ?? targetEmail.replace(/[^a-z0-9]/gi, "_");
        const id = `callsub_${keyPart}_${s}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO call_series_subscription (id, user_id, email, series) VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()`,
          id,
          userId,
          targetEmail || null,
          s,
        );
      }
      return { success: true, series: finalList };
    }),

  unsubscribeFromCalls: protectedProcedure
    .input(z.object({ series: z.string().optional() }))
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      if (input.series) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM call_series_subscription WHERE user_id = $1 AND series = $2`,
          user.id,
          input.series.toLowerCase(),
        );
      } else {
        await prisma.$executeRawUnsafe(`DELETE FROM call_series_subscription WHERE user_id = $1`, user.id);
      }
      return { success: true };
    }),
};
