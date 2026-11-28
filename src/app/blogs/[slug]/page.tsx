"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { cloudinaryLoader } from "@/lib/cloudinary-loader";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ListTree,
  Heart,
  Linkedin,
  Loader2,
  MessageCircle,
  Send,
  Twitter,
  X,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PageComments } from "@/components/page-comments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, useScroll, useSpring } from "framer-motion";

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
  category: { id: string; slug: string; name: string } | null;
};

type Heading = { id: string; text: string; level: number };

function useArticleReadProgress(rootRef: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!ready) return;
    const el = rootRef.current;
    if (!el) return;

    // Find the actual scrollable ancestor (layout main/SidebarInset) or fall back to window
    let scrollParent: HTMLElement | Window = window;
    let cur: HTMLElement | null = el.parentElement;
    while (cur) {
      const style = getComputedStyle(cur);
      if (/(auto|scroll)/.test(style.overflowY) && cur.scrollHeight > cur.clientHeight + 2) {
        scrollParent = cur;
        break;
      }
      cur = cur.parentElement;
    }

    const update = () => {
      if (scrollParent === window) {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        setPct(max > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100))) : 0);
      } else {
        const box = scrollParent as HTMLElement;
        const max = box.scrollHeight - box.clientHeight;
        setPct(max > 0 ? Math.min(100, Math.max(0, Math.round((box.scrollTop / max) * 100))) : 0);
      }
    };

    update();
    scrollParent.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      scrollParent.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [rootRef, ready]);

  return pct;
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
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const readPct = useArticleReadProgress(pageRef, !loading && Boolean(post));

  useEffect(() => {
    const stored = localStorage.getItem("blog-like-key");
    if (stored) {
      setLikeKey(stored);
    } else {
      const key = `anon:${Math.random().toString(36).slice(2)}${Date.now()}`;
      localStorage.setItem("blog-like-key", key);
      setLikeKey(key);
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    client.blog.getBySlug({ slug })
      .then((r) => { if (!cancelled) setPost(r); })
      .catch(() => { if (!cancelled) setError("Post not found"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!post?.id || !likeKey) return;
    const sessionId = localStorage.getItem("blog-session-id") || `sess:${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("blog-session-id", sessionId);
    client.blog.trackEvent({ blogId: post.id, type: "view", sessionId }).catch(() => {});
    client.blog.getLikeCount({ blogId: post.id }).then(setLikeCount);
    client.blog.checkLiked({ blogId: post.id, likeKey }).then((r) => setLiked(r.liked));
  }, [post?.id, likeKey]);

  useEffect(() => {
    if (!post?.id) return;
    client.blog.list({ publishedOnly: true, limit: 4, categorySlug: post.category?.slug })
      .then((r) => setRelatedPosts(r.posts.filter((p) => p.id !== post.id).slice(0, 3)))
      .catch(() => setRelatedPosts([]));
  }, [post?.id, post?.category?.slug]);

  useEffect(() => {
    if (!post?.content) return;
    const collect = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(".prose h2[id], .prose h3[id]"));
      setHeadings(nodes.map((n) => ({ id: n.id, text: n.textContent?.trim() || "", level: n.tagName === "H3" ? 3 : 2 })));
    };
    setTimeout(collect, 500);
  }, [post?.content]);

  // Scrollspy: highlight the heading currently being read. We use "the last
  // heading whose top has crossed a line just below the sticky navbar" rather
  // than an IntersectionObserver band — headings are single points, so a band
  // leaves gaps (nothing active while you read the body between two headings).
  //
  // The app content scrolls inside an inner `overflow-y-auto` element, not the
  // window, and scroll events don't bubble (nor reach document in the capture
  // phase reliably), so we find that container and listen on it directly. That's
  // why the scrollspy looked frozen before: nothing was ever listening.
  useEffect(() => {
    if (headings.length === 0) return;
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const findScroller = (node: HTMLElement): HTMLElement | null => {
      let el: HTMLElement | null = node.parentElement;
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        if (
          (cs.overflowY === "auto" || cs.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight + 4
        ) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };
    const scroller = findScroller(els[0]);

    let ticking = false;
    const compute = () => {
      ticking = false;
      const line = 120; // px from the top of the viewport
      let current = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top - line <= 0) current = el.id;
        else break;
      }
      setActiveHeadingId(current);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    requestAnimationFrame(compute);
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  const handleLike = async () => {
    if (!post || !likeKey) return;
    try {
      const r = await client.blog.toggleLike({ blogId: post.id, likeKey });
      setLiked(r.liked);
      setLikeCount((c) => (r.liked ? c + 1 : c - 1));
    } catch { toast.error("Could not update like"); }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = post ? `${post.title} - EIPsInsight` : "";
    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    if (urls[platform]) window.open(urls[platform], "_blank", "width=600,height=400");
  };

  if (loading) {
    return (
      <div data-ledger className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--ink-muted)]" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div data-ledger className="wrap py-24 text-center">
        <h1 className="font-serif text-xl font-bold text-[var(--ink)]">Post not found</h1>
        <Link href="/blogs" className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--brand-strong)] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Journal
        </Link>
      </div>
    );
  }

  const profile = post.author.blog_editor_profile;
  const activeHeadingText = headings.find((h) => h.id === activeHeadingId)?.text ?? headings[0]?.text ?? "Contents";

  return (
    <div ref={pageRef} data-ledger className="min-h-screen pb-24">

      {/* ── Article masthead ── */}
      <header className="masthead">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/blogs"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              The Journal
            </Link>
            {post.category && (
              <Link
                href={`/blogs?category=${post.category.slug}`}
                className="chip px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--brand-strong)] hover:border-[var(--ink)]"
              >
                {post.category.name}
              </Link>
            )}
          </div>

          <h1 className="t-h1 text-balance">{post.title}</h1>

          {post.excerpt && (
            <p className="t-lead mt-3 max-w-3xl text-pretty">{post.excerpt}</p>
          )}

          {/* Meta + actions bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                  {post.author.image ? (
                    <Image src={post.author.image} alt={post.author.name} fill sizes="32px" unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-xs font-bold text-[var(--ink-muted)]">
                      {post.author.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">{post.author.name}</p>
                  <p className="font-mono text-[10px] text-[var(--ink-muted)]">
                    {new Date(post.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · {post.readingTimeMinutes ?? 5} min read
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleLike}
                className={cn(
                  "chip h-8 cursor-pointer gap-1.5 px-2.5 font-mono text-[11px]",
                  liked
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-500"
                    : "hover:border-[var(--ink)]"
                )}
              >
                <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                {likeCount}
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })}
                className="chip h-8 cursor-pointer gap-1.5 px-2.5 font-mono text-[11px] hover:border-[var(--ink)]"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Discuss
              </button>
              {[
                { id: "twitter", icon: Twitter, label: "Share on X" },
                { id: "linkedin", icon: Linkedin, label: "Share on LinkedIn" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  onClick={() => handleShare(id)}
                  className="chip h-8 w-8 cursor-pointer justify-center p-0 hover:border-[var(--ink)]"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
              <button
                type="button"
                aria-label="Copy link"
                onClick={() => handleShare("copy")}
                className="chip h-8 w-8 cursor-pointer justify-center p-0 hover:border-[var(--ink)]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[var(--brand-strong)]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Top overlay TOC bar (flush under navbar, solid Ledger surface) ── */}
      {headings.length > 0 && (
        <div className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="h-0.5 w-full bg-[var(--surface-2)]">
            <div
              className="h-full bg-[var(--brand-strong)] transition-[width] duration-150"
              style={{ width: `${readPct}%` }}
            />
          </div>
          <div className="relative mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <button
              type="button"
              onClick={() => setTocOpen((o) => !o)}
              className="inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-left text-xs transition-colors hover:border-[var(--ink)]"
            >
              <ListTree className="h-3.5 w-3.5 shrink-0 text-[var(--brand-strong)]" />
              <span className="truncate font-medium text-[var(--ink)]">{activeHeadingText}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)] transition-transform", tocOpen && "rotate-180")} />
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-[var(--ink-muted)]">
                {readPct >= 98 ? "Done · 100%" : `${readPct}% read`}
              </span>
              <Link
                href="/newsletter"
                className="chip px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--brand-strong)] hover:border-[var(--ink)]"
              >
                Subscribe
              </Link>
            </div>

            {tocOpen && (
              <div className="absolute left-4 right-4 top-full z-40 mt-1.5 max-h-[60vh] overflow-y-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg sm:left-6 sm:right-auto sm:w-96">
                <div className="mb-2 flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    On this page
                  </span>
                  <button
                    type="button"
                    onClick={() => setTocOpen(false)}
                    className="rounded p-0.5 text-[var(--ink-faint)] hover:text-[var(--ink)]"
                    aria-label="Close contents"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <nav className="space-y-0.5">
                  {headings.map((h) => {
                    const active = activeHeadingId === h.id;
                    return (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
                          setActiveHeadingId(h.id);
                          setTocOpen(false);
                        }}
                        className={cn(
                          "block rounded-[var(--l-radius-control)] py-1.5 pr-2 text-xs transition-colors",
                          h.level === 3 ? "pl-5" : "pl-2.5",
                          active
                            ? "bg-[var(--surface-2)] font-semibold text-[var(--brand-strong)]"
                            : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                        )}
                      >
                        {h.text}
                      </a>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cover image ── */}
      {post.coverImage && (
        <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)]">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              loader={cloudinaryLoader}
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
          </div>
        </div>
      )}

      {/* ── Full-page centered article body (no sidebar) ── */}
      <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
        <article className="min-w-0">
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none
            prose-headings:font-serif prose-headings:font-bold prose-headings:tracking-tight
            prose-p:text-[var(--ink)]/90 prose-p:leading-relaxed
            prose-a:text-[var(--brand-strong)] prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-[var(--l-radius)] prose-img:border prose-img:border-[var(--border)]
            prose-pre:rounded-[var(--l-radius)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:bg-[var(--surface-2)]
            prose-code:text-[var(--brand-strong)] prose-code:bg-[var(--surface-2)] prose-code:rounded prose-code:px-1 prose-code:py-0.5">
            <MarkdownRenderer content={post.content} skipPreamble />
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-6">
              {post.tags.map((tag) => (
                <span key={tag} className="chip px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Author bio */}
          <div className="mt-8 flex flex-col gap-5 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-start">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)]">
              {post.author.image ? (
                <Image src={post.author.image} alt={post.author.name} fill sizes="64px" unoptimized className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-xl font-bold text-[var(--ink-muted)]">
                  {post.author.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">Author</p>
              <h3 className="mt-0.5 font-serif text-lg font-bold text-[var(--ink)]">{post.author.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">
                {profile?.bio ?? `${post.author.name} is a contributor at EIPsInsight, documenting the evolution of Ethereum standards and protocol governance.`}
              </p>
              {(profile?.x || profile?.linkedin || profile?.telegram) && (
                <div className="mt-3 flex items-center gap-2">
                  {profile.x && (
                    <a href={profile.x} target="_blank" rel="noreferrer" className="chip h-8 w-8 justify-center p-0 hover:border-[var(--ink)]">
                      <Twitter className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {profile.linkedin && (
                    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="chip h-8 w-8 justify-center p-0 hover:border-[var(--ink)]">
                      <Linkedin className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {profile.telegram && (
                    <a href={`https://t.me/${profile.telegram}`} target="_blank" rel="noreferrer" className="chip h-8 w-8 justify-center p-0 hover:border-[var(--ink)]">
                      <Send className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Continue reading (moved from sidebar to bottom grid) */}
          {relatedPosts.length > 0 && (
            <section className="mt-12 border-t border-[var(--border)] pt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-[var(--ink)]">Continue reading</h2>
                <Link href="/blogs" className="font-mono text-xs text-[var(--brand-strong)] hover:underline">
                  All articles →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.id}
                    href={`/blogs/${rp.slug}`}
                    className="group flex flex-col justify-between rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--ink)]"
                  >
                    <div>
                      {rp.category && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--brand-strong)]">
                          {rp.category.name}
                        </span>
                      )}
                      <h3 className="mt-1.5 line-clamp-2 font-serif text-sm font-bold leading-snug text-[var(--ink)] group-hover:text-[var(--brand-strong)]">
                        {rp.title}
                      </h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5 font-mono text-[10px] text-[var(--ink-muted)]">
                      <span>{rp.readingTimeMinutes ?? 5} min read</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)] group-hover:text-[var(--ink)]" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Comments */}
          <section id="comments" className="mt-12 border-t border-[var(--border)] pt-8">
            <h2 className="mb-5 font-serif text-xl font-bold text-[var(--ink)]">Discussion</h2>
            <PageComments />
          </section>
        </article>
      </div>
    </div>
  );
}
