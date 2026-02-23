import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

const SITE_URL = (process.env.BETTER_AUTH_URL || "https://eipsinsight.com").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = "/eipsinsight.png";

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = `/resources/blogs/${slug}`;

  try {
    const post = await prisma.blog.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        content: true,
        coverImage: true,
        tags: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { name: true } },
      },
    });

    if (!post || !post.published) {
      return buildMetadata({
        title: "Blog Post",
        description: "Read Ethereum standards analysis, updates, and editorial coverage.",
        path,
        keywords: ["Ethereum blog", "EIP analysis", "standards commentary"],
        noIndex: true,
      });
    }

    const description =
      post.excerpt?.trim() ||
      stripMarkdown(post.content).slice(0, 160) ||
      "Read Ethereum standards analysis, updates, and editorial coverage.";
    const image = toAbsoluteUrl(post.coverImage || DEFAULT_OG_IMAGE);

    const base = buildMetadata({
      title: post.title,
      description,
      path,
      keywords: ["Ethereum blog", "EIP analysis", "standards commentary", ...(post.tags || [])],
      image,
    });

    return {
      ...base,
      openGraph: {
        ...base.openGraph,
        type: "article",
        url: `${SITE_URL}${path}`,
        title: post.title,
        description,
        images: [{ url: image, width: 1200, height: 630, alt: post.title }],
        publishedTime: post.createdAt.toISOString(),
        modifiedTime: post.updatedAt.toISOString(),
        authors: post.author?.name ? [post.author.name] : undefined,
        tags: post.tags,
      },
      twitter: {
        ...base.twitter,
        title: post.title,
        description,
        images: [image],
      },
    };
  } catch {
    return buildMetadata({
      title: "Blog Post",
      description: "Read Ethereum standards analysis, updates, and editorial coverage.",
      path,
      keywords: ["Ethereum blog", "EIP analysis", "standards commentary"],
    });
  }
}

export default async function BlogSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  let jsonLd: Record<string, unknown> | null = null;

  try {
    const post = await prisma.blog.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        content: true,
        coverImage: true,
        published: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { name: true } },
      },
    });

    if (post?.published) {
      const path = `/resources/blogs/${slug}`;
      const description =
        post.excerpt?.trim() ||
        stripMarkdown(post.content).slice(0, 160) ||
        "Read Ethereum standards analysis, updates, and editorial coverage.";

      jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description,
        image: [toAbsoluteUrl(post.coverImage || DEFAULT_OG_IMAGE)],
        url: `${SITE_URL}${path}`,
        mainEntityOfPage: `${SITE_URL}${path}`,
        datePublished: post.createdAt.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        author: {
          "@type": "Person",
          name: post.author?.name || "EIPsInsight",
        },
        publisher: {
          "@type": "Organization",
          name: "EIPsInsight",
          logo: {
            "@type": "ImageObject",
            url: toAbsoluteUrl(DEFAULT_OG_IMAGE),
          },
        },
        keywords: post.tags?.join(", "),
      };
    }
  } catch {
    jsonLd = null;
  }

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}
