"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Linkedin,
  Twitter,
  Facebook,
  Send,
  Clock,
  Heart,
  Copy,
  Check,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PageComments } from "@/components/page-comments";
import { toast } from "sonner";

type Author = {
  id: string;
  name: string;
  image: string | null;
  blog_editor_profile?: {
    linkedin: string | null;
    x: string | null;
    facebook: string | null;
    telegram: string | null;
    bio: string | null;
  } | null;
};

type Category = { id: string; slug: string; name: string } | null;

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  published: boolean;
  createdAt: Date | string;
  readingTimeMinutes: number | null;
  tags: string[];
  featured?: boolean;
  author: Author;
  category: Category;
};

type Heading = { id: string; text: string; level: number };

function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);

    if (h2) {
      const text = h2[1].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      headings.push({ id, text, level: 2 });
    } else if (h3) {
      const text = h3[1].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      headings.push({ id, text, level: 3 });
    }
  }

  return headings;
}

function formatPublishedDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [likeKey, setLikeKey] = useState<string | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  const headings = useMemo(() => (post?.content ? extractHeadings(post.content) : []), [post?.content]);
  const profile = post?.author?.blog_editor_profile;
  const hasSocial = profile && (profile.linkedin || profile.x || profile.facebook || profile.telegram);

  useEffect(() => {
    const stored = localStorage.getItem("blog-like-key");
    if (stored) {
      setLikeKey(stored);
      return;
    }

    const key = `anon:${Math.random().toString(36).slice(2)}${Date.now()}`;
    localStorage.setItem("blog-like-key", key);
    setLikeKey(key);
  }, []);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    client.blog
      .getBySlug({ slug })
      .then((result) => {
        if (!cancelled) {
          setPost(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Post not found");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!post?.id || !likeKey) return;

    client.blog.getLikeCount({ blogId: post.id }).then(setLikeCount);
    client.blog.checkLiked({ blogId: post.id, likeKey }).then((result) => setLiked(result.liked));
  }, [post?.id, likeKey]);

  useEffect(() => {
    if (!post?.id) return;

    let cancelled = false;

    const loadRelatedPosts = async () => {
      try {
        const scoped = await client.blog.list({
          publishedOnly: true,
          limit: 4,
          offset: 0,
          categorySlug: post.category?.slug,
        });

        let nextPosts = scoped.posts.filter((candidate) => candidate.id !== post.id);

        if (nextPosts.length < 3) {
          const fallback = await client.blog.list({
            publishedOnly: true,
            limit: 6,
            offset: 0,
          });

          const seen = new Set<string>([post.id, ...nextPosts.map((candidate) => candidate.id)]);
          for (const candidate of fallback.posts) {
            if (!seen.has(candidate.id)) {
              nextPosts.push(candidate);
              seen.add(candidate.id);
            }
            if (nextPosts.length >= 3) break;
          }
        }

        if (!cancelled) {
          setRelatedPosts(nextPosts.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setRelatedPosts([]);
        }
      }
    };

    void loadRelatedPosts();

    return () => {
      cancelled = true;
    };
  }, [post?.id, post?.category?.slug]);

  useEffect(() => {
    if (!headings.length) {
      setActiveHeadingId(null);
      return;
    }

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) return;

    let frameId: number | null = null;

    const updateActiveHeading = () => {
      const threshold = 140;
      const candidates = elements.map((element) => ({
        id: element.id,
        top: element.getBoundingClientRect().top,
      }));

      const passed = candidates.filter((candidate) => candidate.top <= threshold);
      const currentId =
        passed.length > 0
          ? passed.sort((a, b) => b.top - a.top)[0].id
          : candidates.sort((a, b) => Math.abs(a.top - threshold) - Math.abs(b.top - threshold))[0]?.id ?? elements[0].id;

      setActiveHeadingId((previous) => (previous === currentId ? previous : currentId));
      frameId = null;
    };

    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  const handleLike = async () => {
    if (!post || !likeKey) return;

    try {
      const result = await client.blog.toggleLike({ blogId: post.id, likeKey });
      setLiked(result.liked);
      setLikeCount((count) => (result.liked ? count + 1 : count - 1));
    } catch {
      toast.error("Could not update like");
    }
  };

  const handleShare = (platform: string) => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = post ? `${post.title} — EIPsInsight` : "";

    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    const nextUrl = urls[platform];
    if (nextUrl) {
      window.open(nextUrl, "_blank", "width=600,height=400");
    }
  };

  const handleTocClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setActiveHeadingId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
          <h1 className="dec-title text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Post not found</h1>
          <Link
            href="/resources/blogs"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          <article className="min-w-0 max-w-2xl flex-1">
            <Link
              href="/resources/blogs"
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blogs
            </Link>

            <header className="mb-8">
              {post.category && (
                <div className="mb-4">
                  <Link
                    href={`/resources/blogs?category=${post.category.slug}`}
                    className="inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary transition-colors hover:border-primary/50 hover:bg-primary/15"
                  >
                    {post.category.name}
                  </Link>
                </div>
              )}

              {post.coverImage && (
                <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover object-center"
                    priority
                    sizes="(max-width: 1024px) 100vw, 720px"
                  />
                </div>
              )}

              <h1 className="dec-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] text-foreground sm:text-4xl">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {post.excerpt}
                </p>
              )}
            </header>

            <section className="mb-8 rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                    {post.author.image ? (
                      <Image src={post.author.image} alt={post.author.name} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-muted-foreground">
                        {post.author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Published by</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{post.author.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <time dateTime={new Date(post.createdAt).toISOString()}>{formatPublishedDate(post.createdAt)}</time>
                      {post.readingTimeMinutes != null && post.readingTimeMinutes > 0 && (
                        <>
                          <span className="text-border">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {post.readingTimeMinutes} min read
                          </span>
                        </>
                      )}
                    </div>
                    {profile?.bio && (
                      <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
                    )}
                    {hasSocial && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {profile?.linkedin && (
                          <a
                            href={profile.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                            title="LinkedIn"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {profile?.x && (
                          <a
                            href={profile.x}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                            title="X"
                          >
                            <Twitter className="h-4 w-4" />
                          </a>
                        )}
                        {profile?.facebook && (
                          <a
                            href={profile.facebook}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                            title="Facebook"
                          >
                            <Facebook className="h-4 w-4" />
                          </a>
                        )}
                        {profile?.telegram && (
                          <a
                            href={`https://t.me/${profile.telegram.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                            title="Telegram"
                          >
                            <Send className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    onClick={handleLike}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all ${
                      liked
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                    {likeCount}
                  </button>
                  <button
                    onClick={() => handleShare("twitter")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    title="Share on X"
                  >
                    <Twitter className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleShare("linkedin")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    title="Share on LinkedIn"
                  >
                    <Linkedin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleShare("facebook")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    title="Share on Facebook"
                  >
                    <Facebook className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleShare("copy")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    title="Copy link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </section>

            <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary/80 prose-img:rounded-xl dark:prose-invert sm:prose-base [&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28">
              <MarkdownRenderer content={post.content} skipPreamble />
            </div>

            {relatedPosts.length > 0 && (
              <section className="mt-14 border-t border-border pt-8">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Related Reading</p>
                <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  More {post.category?.name ? `in ${post.category.name}` : "commentary"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Continue with adjacent writing on governance, standards, and protocol coordination.</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      href={`/resources/blogs/${relatedPost.slug}`}
                      className="group rounded-xl border border-border bg-card/60 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80"
                    >
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {relatedPost.category?.name && <span>{relatedPost.category.name}</span>}
                        <span>•</span>
                        <span>{formatPublishedDate(relatedPost.createdAt)}</span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                        {relatedPost.title}
                      </h3>
                      {relatedPost.excerpt && (
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{relatedPost.excerpt}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {post.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <section className="mt-16 border-t border-border pt-8">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Discussion</p>
              <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Comments</h2>
              <p className="mt-1 text-sm text-muted-foreground">Join the conversation around this post.</p>
              <div className="mt-6">
                <PageComments />
              </div>
            </section>
          </article>

          {headings.length > 0 && (
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-24 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
                <nav className="mt-3 border-l-2 border-border/70">
                  {headings.map((heading) => {
                    const isActive = activeHeadingId === heading.id;
                    return (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        onClick={(event) => handleTocClick(event, heading.id)}
                        className={`relative block py-2.5 pl-4 pr-2 text-[13px] transition-colors ${
                          isActive
                            ? "font-medium text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        } ${heading.level === 3 ? "pl-7" : ""}`}
                      >
                        {isActive && <span className="absolute -left-px top-0 h-full w-0.5 rounded-r bg-primary" />}
                        {heading.text}
                      </a>
                    );
                  })}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
