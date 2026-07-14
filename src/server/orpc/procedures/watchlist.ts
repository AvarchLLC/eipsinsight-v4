import * as z from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { protectedProcedure, ORPCError } from "./types";
import { resolveProposal, resolveRepository, resolveUpgrade, getProposalPath, getRepositoryPath } from "@/lib/subscriptions";

async function requireSessionUser(headers: Record<string, string>) {
  const session = await auth.api.getSession({
    headers: new Headers(headers),
  });

  if (!session?.user?.id) {
    throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
  }

  return session.user;
}

export const watchlistProcedures = {
  getWatchlist: protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      const user = await requireSessionUser(context.headers);

      const [proposalSubscriptions, repositorySubscriptions, upgradeSubscriptions, authorSubscriptions] = await Promise.all([
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
        prisma.authorSubscription.findMany({
          where: { user_id: user.id },
          orderBy: { created_at: "desc" },
        }),
      ]);

      return {
        proposals: proposalSubscriptions.map((sub) => {
          const repo = sub.repositories.name === "ethereum/ERCs" ? "erc" : sub.repositories.name === "ethereum/RIPs" ? "rip" : "eip";
          return {
            id: sub.id,
            type: "proposal" as const,
            repo,
            number: sub.eips.eip_number,
            title: sub.eips.title || "",
            status: sub.eips.eip_snapshots?.status || null,
            createdAt: sub.created_at.toISOString(),
            path: getProposalPath(repo, sub.eips.eip_number),
          };
        }),
        repositories: repositorySubscriptions.map((sub) => {
          const repo = sub.repositories.name === "ethereum/ERCs" ? "erc" : sub.repositories.name === "ethereum/RIPs" ? "rip" : "eip";
          return {
            id: sub.id,
            type: "repository" as const,
            repo,
            label: repo === "erc" ? "All ERCs" : repo === "rip" ? "All RIPs" : "All EIPs",
            createdAt: sub.created_at.toISOString(),
            path: getRepositoryPath(repo as "eip" | "erc" | "rip"),
          };
        }),
        upgrades: upgradeSubscriptions.map((sub) => ({
          id: sub.id,
          type: "upgrade" as const,
          slug: sub.upgrades.slug,
          name: sub.upgrades.name || sub.upgrades.slug,
          createdAt: sub.created_at.toISOString(),
          path: `/upgrade/${sub.upgrades.slug}`,
        })),
        authors: authorSubscriptions.map((sub) => ({
          id: sub.id,
          type: "author" as const,
          name: sub.author_name,
          createdAt: sub.created_at.toISOString(),
          path: `/author/${encodeURIComponent(sub.author_name)}`,
        })),
      };
    }),

  toggleWatch: protectedProcedure
    .input(z.object({
      itemType: z.enum(["proposal", "repository", "upgrade", "author"]),
      itemId: z.string(), // for proposal: "repo-number", for repository: "repo", for upgrade: "slug", for author: "name"
    }))
    .handler(async ({ context, input }) => {
      const user = await requireSessionUser(context.headers);
      
      switch (input.itemType) {
        case "proposal": {
          const [repoStr, numberStr] = input.itemId.split("-");
          const repo = repoStr as "eip" | "erc" | "rip";
          const number = parseInt(numberStr, 10);
          
          const proposal = await resolveProposal(repo, number);
          if (!proposal) throw new ORPCError("NOT_FOUND", { message: "Proposal not found" });
          
          const existing = await prisma.proposalSubscription.findUnique({
            where: { user_id_eip_id_repository_id: { user_id: user.id, eip_id: proposal.eipId, repository_id: proposal.repositoryId } }
          });
          
          if (existing) {
            await prisma.proposalSubscription.delete({ where: { id: existing.id } });
            return { watched: false };
          } else {
            await prisma.proposalSubscription.create({
              data: { user_id: user.id, eip_id: proposal.eipId, repository_id: proposal.repositoryId }
            });
            return { watched: true };
          }
        }
        
        case "repository": {
          const repo = input.itemId as "eip" | "erc" | "rip";
          const repository = await resolveRepository(repo);
          if (!repository) throw new ORPCError("NOT_FOUND", { message: "Repository not found" });
          
          const existing = await prisma.repositorySubscription.findUnique({
            where: { user_id_repository_id: { user_id: user.id, repository_id: repository.repositoryId } }
          });
          
          if (existing) {
            await prisma.repositorySubscription.delete({ where: { id: existing.id } });
            return { watched: false };
          } else {
            await prisma.repositorySubscription.create({
              data: { user_id: user.id, repository_id: repository.repositoryId }
            });
            return { watched: true };
          }
        }
        
        case "upgrade": {
          const slug = input.itemId;
          const upgrade = await resolveUpgrade(slug);
          if (!upgrade) throw new ORPCError("NOT_FOUND", { message: "Upgrade not found" });
          
          const existing = await prisma.upgradeSubscription.findUnique({
            where: { user_id_upgrade_id: { user_id: user.id, upgrade_id: upgrade.id } }
          });
          
          if (existing) {
            await prisma.upgradeSubscription.delete({ where: { id: existing.id } });
            return { watched: false };
          } else {
            await prisma.upgradeSubscription.create({
              data: { user_id: user.id, upgrade_id: upgrade.id }
            });
            return { watched: true };
          }
        }
        
        case "author": {
          const author_name = input.itemId;
          
          const existing = await prisma.authorSubscription.findUnique({
            where: { user_id_author_name: { user_id: user.id, author_name } }
          });
          
          if (existing) {
            await prisma.authorSubscription.delete({ where: { id: existing.id } });
            return { watched: false };
          } else {
            await prisma.authorSubscription.create({
              data: { user_id: user.id, author_name }
            });
            return { watched: true };
          }
        }
      }
    })
};
