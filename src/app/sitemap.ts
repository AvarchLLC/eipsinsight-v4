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
  "/insights/editorial-commentary",
  "/insights/governance-and-process",
  "/insights/upgrade-insights",
  "/insights/year-month-analysis",
  "/resources",
  "/resources/blogs",
  "/resources/docs",
  "/resources/faq",
  "/resources/news",
  "/resources/videos",
  "/standards",
  "/tools",
  "/tools/board",
  "/tools/dependencies",
  "/tools/eip-builder",
  "/tools/timeline",
  "/upgrade",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const [blogs, upgrades] = await Promise.all([
    prisma.blog
      .findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.upgrades
      .findMany({
        select: { slug: true, updated_at: true },
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
      lastModified: upgrade.updated_at ?? now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [...staticEntries, ...blogEntries, ...upgradeEntries];
}
