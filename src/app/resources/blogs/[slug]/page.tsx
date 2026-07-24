"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { cloudinaryLoader } from "@/lib/cloudinary-loader";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Copy,
  Heart,
  Linkedin,
  Loader2,
  MessageCircle,
  Send,
  Twitter,
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

function ReadingProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return <motion.div className="fixed top-0 left-0 right-0 z-50 h-0.5 origin-left bg-primary" style={{ scaleX }} />;
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="page-shell py-24 text-center">
        <h1 className="dec-title text-xl font-semibold text-foreground">Post not found</h1>
        <Link href="/resources/blogs" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Journal
        </Link>
      </div>
    );
  }

  const profile = post.author.blog_editor_profile;

  return (
    <div className="min-h-screen bg-background pb-24">
      <ReadingProgressBar />

      {/* ── Article header ── */}
      <header className="page-shell pt-10 pb-0">
        {/* Back link */}
        <Link
          href="/resources/blogs"
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Journal
        </Link>

        <div className="max-w-3xl space-y-5">
          {/* Category */}
          {post.category && (
            <Link
              href={`/resources/blogs?category=${post.category.slug}`}
              className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
            >
              {post.category.name}
            </Link>
          )}

          {/* Title */}
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {post.excerpt}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-6 border-t border-border/60 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                {post.author.image ? (
                  <Image src={post.author.image} alt={post.author.name} fill sizes="36px" unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                    {post.author.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{post.author.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Author</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {post.readingTimeMinutes ?? 5} min read
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Cover image ── */}
      {post.coverImage && (
        <div className="page-shell pt-8">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted shadow-lg lg:aspect-[21/9]">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              loader={cloudinaryLoader}
              className="object-cover"
              sizes="100vw"
            />
          </div>
        </div>
      )}

      {/* ── Body: article + sidebar ── */}
      <div className="page-shell pt-12">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start">

          {/* Article */}
          <article className="min-w-0 flex-1 max-w-3xl">
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none
              prose-headings:dec-title prose-headings:font-semibold prose-headings:tracking-tight
              prose-p:text-foreground/90 prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:border prose-img:border-border
              prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-muted/40
              prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded prose-code:px-1 prose-code:py-0.5">
              <MarkdownRenderer content={post.content} skipPreamble />
            </div>

            {/* ── Tags ── */}
            {post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-border/60 pt-8">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-md border border-border bg-muted/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* ── Engagement ── */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/60 px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLike}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md border px-4 text-xs font-semibold uppercase tracking-wider transition-all",
                    liked
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-500"
                      : "border-border bg-muted/60 text-muted-foreground hover:border-rose-500/30 hover:text-rose-500"
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                  {likeCount}
                </button>
                <button
                  onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/60 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Discuss
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Share</span>
                {[
                  { id: "twitter", icon: Twitter },
                  { id: "linkedin", icon: Linkedin },
                ].map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleShare(id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
                <button
                  onClick={() => handleShare("copy")}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* ── Author bio ── */}
            <div className="mt-8 flex flex-col gap-6 rounded-xl border border-border bg-card/60 p-6 sm:flex-row sm:items-start">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                {post.author.image ? (
                  <Image src={post.author.image} alt={post.author.name} fill sizes="64px" unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                    {post.author.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="dec-title text-lg font-semibold text-foreground">
                  Written by {post.author.name}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {profile?.bio ?? `${post.author.name} is a contributor at EIPsInsight, documenting the evolution of Ethereum standards and protocol governance.`}
                </p>
                {(profile?.x || profile?.linkedin || profile?.telegram) && (
                  <div className="mt-4 flex items-center gap-2">
                    {profile.x && (
                      <a href={profile.x} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary">
                        <Twitter className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {profile.linkedin && (
                      <a href={profile.linkedin} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary">
                        <Linkedin className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {profile.telegram && (
                      <a href={`https://t.me/${profile.telegram}`} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary">
                        <Send className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Comments ── */}
            <section id="comments" className="mt-12">
              <div className="mb-6 flex items-center gap-4">
                <h2 className="dec-title text-xl font-semibold text-foreground sm:text-2xl">Discussion</h2>
                <div className="flex-1 border-t border-border/60" />
              </div>
              <PageComments />
            </section>
          </article>

          {/* ── Sidebar ── */}
          <aside className="hidden w-64 shrink-0 lg:sticky lg:top-28 lg:block">
            <div className="space-y-8">

              {/* Table of contents */}
              {headings.length > 0 && (
                <div className="rounded-xl border border-border bg-card/60 p-5">
                  <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    On this page
                  </h3>
                  <nav className="space-y-0.5">
                    {headings.map((h) => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        className={cn(
                          "block border-l-2 py-1.5 pl-3 text-xs transition-all hover:text-primary",
                          h.level === 3 && "pl-5",
                          activeHeadingId === h.id
                            ? "border-primary font-semibold text-primary"
                            : "border-transparent text-muted-foreground hover:border-border"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
                          setActiveHeadingId(h.id);
                        }}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Related posts */}
              {relatedPosts.length > 0 && (
                <div className="rounded-xl border border-border bg-card/60 p-5">
                  <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Continue reading
                  </h3>
                  <div className="space-y-4">
                    {relatedPosts.map((rp) => (
                      <Link
                        key={rp.id}
                        href={`/resources/blogs/${rp.slug}`}
                        className="group block border-t border-border/40 pt-4 first:border-t-0 first:pt-0"
                      >
                        {rp.category && (
                          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {rp.category.name}
                          </span>
                        )}
                        <h4 className="dec-title line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {rp.title}
                        </h4>
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {rp.readingTimeMinutes ?? 5} min
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Newsletter nudge */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h3 className="dec-title text-base font-semibold text-foreground">Stay updated</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Ethereum upgrades & EIP analysis straight to your inbox.
                </p>
                <Link
                  href="/newsletter"
                  className="mt-4 inline-flex w-full h-9 items-center justify-center rounded-md persona-gradient text-xs font-semibold uppercase tracking-wider text-black shadow-sm transition hover:opacity-90"
                >
                  Subscribe
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
