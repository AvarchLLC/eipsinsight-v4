"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Share2,
  Calendar,
  MessageCircle,
  Bookmark,
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

function ReadingProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-1 origin-left bg-primary"
      style={{ scaleX }}
    />
  );
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
      .then((result) => {
        if (!cancelled) setPost(result);
      })
      .catch(() => {
        if (!cancelled) setError("Post not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!post?.id || !likeKey) return;
    
    // Track view event once per post load
    const sessionId = localStorage.getItem("blog-session-id") || `sess:${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("blog-session-id", sessionId);
    client.blog.trackEvent({ blogId: post.id, type: "view", sessionId }).catch(() => {});

    client.blog.getLikeCount({ blogId: post.id }).then(setLikeCount);
    client.blog.checkLiked({ blogId: post.id, likeKey }).then((res) => setLiked(res.liked));
  }, [post?.id, likeKey]);

  useEffect(() => {
    if (!post?.id) return;
    client.blog.list({
      publishedOnly: true,
      limit: 4,
      categorySlug: post.category?.slug,
    }).then(res => {
      setRelatedPosts(res.posts.filter(p => p.id !== post.id).slice(0, 3));
    }).catch(() => setRelatedPosts([]));
  }, [post?.id, post?.category?.slug]);

  useEffect(() => {
    if (!post?.content) return;
    const collect = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(".prose h2[id], .prose h3[id]"));
      setHeadings(nodes.map(n => ({
        id: n.id,
        text: n.textContent?.trim() || "",
        level: n.tagName.toLowerCase() === "h3" ? 3 : 2
      })));
    };
    setTimeout(collect, 500);
  }, [post?.content]);

  const handleLike = async () => {
    if (!post || !likeKey) return;
    try {
      const res = await client.blog.toggleLike({ blogId: post.id, likeKey });
      setLiked(res.liked);
      setLikeCount(c => res.liked ? c + 1 : c - 1);
    } catch {
      toast.error("Could not update like");
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = post ? `${post.title} — EIPsInsight` : "";

    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
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
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <Link href="/resources/blogs" className="mt-4 inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blogs
        </Link>
      </div>
    );
  }

  const profile = post.author.blog_editor_profile;

  return (
    <div className="min-h-screen bg-background pb-20">
      <ReadingProgressBar />

      {/* Hero Header */}
      <header className="relative w-full border-b border-border bg-card/20 pt-12 lg:pt-20">
        <div className="page-shell max-w-4xl px-4 sm:px-6">
          <Link
            href="/resources/blogs"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editorial
          </Link>

          {post.category && (
            <Link
              href={`/resources/blogs?category=${post.category.slug}`}
              className="mb-6 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"
            >
              {post.category.name}
            </Link>
          )}

          <h1 className="font-libre-baskerville text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1] text-balance">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-6 text-xl leading-relaxed text-muted-foreground/90 max-w-3xl">
              {post.excerpt}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-6 pb-12">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border shadow-sm">
                {post.author.image ? (
                  <Image src={post.author.image} alt={post.author.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-sm font-bold">
                    {post.author.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{post.author.name}</span>
                <span className="text-xs text-muted-foreground">Editor @ EIPsInsight</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground border-l border-border pl-6">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatPublishedDate(post.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {post.readingTimeMinutes || 5} min read
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="page-shell max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          {/* Main Content */}
          <article className="min-w-0 flex-1 max-w-4xl mx-auto lg:mx-0">
            {post.coverImage && (
              <div className="relative mb-12 aspect-video overflow-hidden rounded-3xl border border-border bg-muted shadow-2xl">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1200px) 100vw, 800px"
                />
              </div>
            )}

            <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-libre-baskerville prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-pre:bg-muted/40 prose-pre:border prose-pre:border-border">
              <MarkdownRenderer content={post.content} skipPreamble />
            </div>

            {/* Post Footer */}
            <footer className="mt-16 space-y-12 border-t border-border pt-12">
              {/* Engagement */}
              <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-card/40 p-6 border border-border">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-bold text-sm",
                      liked
                        ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-rose-500/50 hover:text-rose-500"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                    {likeCount}
                  </button>
                  <button
                    onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 transition-all font-bold text-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Discuss
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-2">Share</span>
                  <button onClick={() => handleShare("twitter")} className="p-2 rounded-full border border-border hover:bg-muted text-muted-foreground transition-all">
                    <Twitter className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleShare("linkedin")} className="p-2 rounded-full border border-border hover:bg-muted text-muted-foreground transition-all">
                    <Linkedin className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleShare("copy")} className="p-2 rounded-full border border-border hover:bg-muted text-muted-foreground transition-all">
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full border border-border bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Author Bio */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center rounded-3xl bg-linear-to-br from-primary/5 via-transparent to-transparent p-8 border border-border">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border shadow-lg">
                  {post.author.image ? (
                    <Image src={post.author.image} alt={post.author.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-bold">
                      {post.author.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">Written by {post.author.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mb-4">
                    {profile?.bio || `${post.author.name} is a core editor and contributor at EIPsInsight, focused on documenting the evolution of Ethereum standards.`}
                  </p>
                  <div className="flex items-center gap-3">
                    {profile?.x && (
                      <a href={profile.x} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {profile?.linkedin && (
                      <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {profile?.telegram && (
                      <a href={`https://t.me/${profile.telegram}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Send className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </footer>

            {/* Comments Section */}
            <section id="comments" className="mt-20">
              <h2 className="text-2xl font-bold mb-8">Community Discussion</h2>
              <PageComments />
            </section>
          </article>

          {/* Sidebar */}
          <aside className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-24 space-y-12">
              {/* Table of Contents */}
              {headings.length > 0 && (
                <div className="rounded-2xl border border-border bg-card/20 p-6 backdrop-blur-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">On this page</h3>
                  <nav className="space-y-1">
                    {headings.map(h => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        className={cn(
                          "block py-2 text-sm transition-all hover:text-primary",
                          h.level === 3 ? "pl-4 border-l border-border text-xs" : "font-medium"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Continue Reading</h3>
                  <div className="space-y-4">
                    {relatedPosts.map(rp => (
                      <Link
                        key={rp.id}
                        href={`/resources/blogs/${rp.slug}`}
                        className="group block rounded-2xl border border-border bg-card/20 p-4 transition-all hover:border-primary/50"
                      >
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">
                          {rp.category?.name || "Insights"}
                        </span>
                        <h4 className="text-sm font-bold leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {rp.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Newsletter Nudge */}
              <div className="rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 p-6 border border-primary/20">
                <h3 className="text-lg font-bold mb-2 leading-tight">Stay ahead of the curve</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Get the latest Ethereum standards updates and analysis delivered directly to your inbox.
                </p>
                <Link
                  href="/newsletter"
                  className="inline-flex w-full h-9 items-center justify-center rounded-lg bg-foreground text-background text-xs font-bold hover:bg-foreground/90 transition-all"
                >
                  Join Newsletter
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
