import { getGhostClient } from "@/lib/ghost";
import NewsClient from "./NewsClient";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 1800; // 30 min cache
export const metadata: Metadata = buildMetadata({
  title: "News",
  description:
    "Latest Ethereum standards and ecosystem news aggregated from trusted sources.",
  path: "/resources/news",
  keywords: ["Ethereum news", "EIP ecosystem news", "governance updates"],
});

// ── Add or remove Ghost sources here ────────────────────────────────────────
const GHOST_SOURCES: { label: string }[] = [
  { label: "EtherWorld" },
  // Future-ready: add more Ghost sites if needed
];

async function fetchFromGhost(source: { label: string }) {
  const client = getGhostClient();
  if (!client) return [];

  try {
    const posts = await client.posts.browse({
      limit: 100,
      include: "tags,authors",
      order: "published_at DESC",
    });

    return (posts as any[]).map((post: any, index: number) => ({

      id: `${source.label}-${index}`,
      title: post.title ?? "",
      summary:
        post.excerpt ??
        post.plaintext?.slice(0, 300) ??
        "",
      date: post.published_at ?? new Date().toISOString(),
      link: post.url ?? "#",
      categories:
        post.tags?.map((t: any) => t.slug.toLowerCase()) ?? [],
      source: source.label,
      thumbnail: post.feature_image ?? null,
    }));
  } catch (err) {
    console.error("Ghost fetch failed:", err);
    return [];
  }
}

export default async function NewsPage() {
  // Fetch all sources in parallel
  const results = await Promise.all(
    GHOST_SOURCES.map(fetchFromGhost)
  );

  const allItems = results.flat();

  // Deduplicate by title
  const seen = new Set<string>();
  const updates = allItems
    .filter((item) => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item, i) => ({ ...item, id: i }));

  return <NewsClient updates={updates} />;
}
