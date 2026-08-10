import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = "https://eipsinsight.com";

const STATIC_PUBLIC_PATHS = [
  "/",
  "/landing",
  "/explore",
  "/explore/status",
  "/explore/trending",
  "/explore/roles",
  "/explore/years",
  "/analytics",
  "/analytics/eips",
  "/analytics/prs",
  "/analytics/editors",
  "/analytics/reviewers",
  "/analytics/authors",
  "/analytics/contributors",
  "/insights",
  "/insights/commentary",
  "/resources",
  "/resources/blogs",
  "/resources/docs",
  "/resources/faq",
  "/resources/news",
  "/resources/videos",
  "/standards",
  "/recap",
  "/tools",
  "/board",
  "/dependencies",
  "/eip-builder",
  "/timeline",
  "/lucid",
  "/officehours",
  "/upgrade",
  "/upgrade/archive",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const [blogs, upgrades, dbEips, dbRips] = await Promise.all([
    prisma.blog
      .findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.upgrades
      .findMany({
        select: { slug: true, created_at: true },
      })
      .catch(() => []),
    prisma.eips
      .findMany({
        select: {
          eip_number: true,
          created_at: true,
          eip_snapshots: {
            select: {
              repositories: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })
      .catch(() => []),
    prisma.rips
      .findMany({
        select: {
          rip_number: true,
          created_at: true,
        },
      })
      .catch(() => []),
  ]);

  const blogEntries: MetadataRoute.Sitemap = blogs.map((post) => ({
    url: `${SITE_URL}/resources/blogs/${post.slug}`,
    lastModified: post.updatedAt ?? now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const upgradeEntries: MetadataRoute.Sitemap = upgrades
    .filter((upgrade) => Boolean(upgrade.slug))
    .map((upgrade) => ({
      url: `${SITE_URL}/upgrade/${upgrade.slug}`,
      lastModified: upgrade.created_at ?? now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const eipEntries: MetadataRoute.Sitemap = dbEips.map((eip) => {
    const repoName = eip.eip_snapshots?.repositories?.name;
    const folder = repoName?.toLowerCase().includes("erc") ? "ercs" : "eips";
    return {
      url: `${SITE_URL}/${folder}/${eip.eip_number}`,
      lastModified: eip.created_at ?? now,
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  const ripEntries: MetadataRoute.Sitemap = dbRips.map((rip) => ({
    url: `${SITE_URL}/rips/${rip.rip_number}`,
    lastModified: rip.created_at ?? now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries, ...upgradeEntries, ...eipEntries, ...ripEntries];
}
