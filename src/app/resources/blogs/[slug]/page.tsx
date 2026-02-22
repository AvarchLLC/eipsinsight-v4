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
  MessageCircle,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { MarkdownRenderer } from "@/components/markdown-renderer";
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

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<{
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
    author: Author;
    category: Category;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: Date | string;
    user?: { id: string; name: string; image: string | null } | null;
  }>>([]);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [likeKey, setLikeKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("blog-like-key");
    if (stored) {
      setLikeKey(stored);
      return;
    }
    const key = "anon:" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("blog-like-key", key);
    setLikeKey(key);
  }, []);

  useEffect(() => {
    client.account
      .getMe()
      .then((u) => {
        setCurrentUser(u ? { name: u.name, email: u.email } : null);
        setIsAdmin(u?.role === "admin");
      })
      .catch(() => {
        setCurrentUser(null);
        setIsAdmin(false);
      });
  }, []);

  const headings = useMemo(() => (post?.content ? extractHeadings(post.content) : []), [post?.content]);
  const profile = post?.author?.blog_editor_profile;
  const hasSocial = profile && (profile.linkedin || profile.x || profile.facebook || profile.telegram);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    client.blog
      .getBySlug({ slug })
      .then((p) => {
        if (!cancelled) setPost(p);
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
    client.blog.getLikeCount({ blogId: post.id }).then(setLikeCount);
    client.blog.checkLiked({ blogId: post.id, likeKey }).then((r) => setLiked(r.liked));
    client.blog.getComments({ blogId: post.id }).then(setComments);
  }, [post?.id, likeKey]);

  const handleLike = async () => {
    if (!post || !likeKey) return;
    try {
      const res = await client.blog.toggleLike({ blogId: post.id, likeKey });
      setLiked(res.liked);
      setLikeCount((c) => (res.liked ? c + 1 : c - 1));
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
    const u = urls[platform];
    if (u) window.open(u, "_blank", "width=600,height=400");
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !commentContent.trim()) return;
    setSubmittingComment(true);
    try {
      const c = await client.blog.addComment({
        blogId: post.id,
        content: commentContent.trim(),
      });
      setComments((prev) => [...prev, c]);
      setCommentContent("");
      toast.success("Comment posted");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Could not post comment";
      toast.error(msg);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    setDeletingId(id);
    try {
      await client.blog.deleteComment({ id });
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast.success("Comment deleted");
    } catch {
      toast.error("Could not delete comment");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Post not found</h1>
          <Link
            href="/resources/blogs"
            className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto">
          {/* Main content */}
          <article className="flex-1 min-w-0 max-w-3xl">
            <Link
              href="/resources/blogs"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blogs
            </Link>

            {post.category && (
              <nav className="mb-6 text-sm">
                <Link
                  href={`/resources/blogs?category=${post.category.slug}`}
                  className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium"
                >
                  {post.category.name}
                </Link>
              </nav>
            )}

            {post.coverImage && (
              <div className="relative h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden mb-10 bg-slate-200 dark:bg-slate-800">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
            )}

            <header className="mb-10">
              <h1 className="dec-title text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
              )}

              {/* Share + Like bar */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Share</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleShare("twitter")}
                      className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      title="Share on X"
                    >
                      <Twitter className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleShare("linkedin")}
                      className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      title="Share on LinkedIn"
                    >
                      <Linkedin className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleShare("facebook")}
                      className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      title="Share on Facebook"
                    >
                      <Facebook className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleShare("copy")}
                      className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      title="Copy link"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      liked
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        : "text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                    {likeCount}
                  </button>
                </div>
              </div>

              {/* Author card - always visible, Binance-style */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-4">
                <div className="flex items-start gap-4">
                  <div className="relative h-14 w-14 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                    {post.author.image ? (
                      <Image src={post.author.image} alt={post.author.name} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xl font-semibold">
                        {post.author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Author</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{post.author.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <time dateTime={new Date(post.createdAt).toISOString()}>
                        {new Date(post.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      {post.readingTimeMinutes != null && post.readingTimeMinutes > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {post.readingTimeMinutes} min read
                          </span>
                        </>
                      )}
                    </div>
                    {hasSocial && (
                      <div className="flex items-center gap-2 mt-3">
                        {profile!.linkedin && (
                          <a
                            href={profile!.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                            title="LinkedIn"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {profile!.x && (
                          <a
                            href={profile!.x}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                            title="X"
                          >
                            <Twitter className="h-4 w-4" />
                          </a>
                        )}
                        {profile!.facebook && (
                          <a
                            href={profile!.facebook}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                            title="Facebook"
                          >
                            <Facebook className="h-4 w-4" />
                          </a>
                        )}
                        {profile!.telegram && (
                          <a
                            href={`https://t.me/${profile!.telegram.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                            title="Telegram"
                          >
                            <Send className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-cyan-600 dark:prose-a:text-cyan-400 prose-img:rounded-xl [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24">
              <MarkdownRenderer content={post.content} skipPreamble />
            </div>

            {/* Comments section */}
            <section className="mt-16 pt-10 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Comments ({comments.length})
              </h2>

              {currentUser ? (
                <form onSubmit={handleSubmitComment} className="space-y-4 mb-8">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Commenting as {currentUser.name}</p>
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Write a comment..."
                    required
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm resize-y"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="px-4 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-medium text-sm hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {submittingComment ? "Posting..." : "Post comment"}
                  </button>
                </form>
              ) : (
                <div className="mb-8 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 p-6 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Sign in to leave a comment.</p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-medium text-sm hover:bg-cyan-500/30"
                  >
                    Sign in
                  </Link>
                </div>
              )}

              <div className="space-y-4">
                {comments.map((c) => {
                  const displayName = c.user?.name ?? c.authorName;
                  const avatarUrl = c.user?.image ?? null;
                  return (
                    <div
                      key={c.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                          {avatarUrl ? (
                            <Image src={avatarUrl} alt="" fill className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-semibold">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{displayName}</p>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                disabled={deletingId === c.id}
                                className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                title="Delete comment"
                              >
                                {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.content}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                            {new Date(c.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {comments.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-6">No comments yet. Be the first to share your thoughts!</p>
                )}
              </div>
            </section>
          </article>

          {/* Sidebar - Table of contents */}
          {headings.length > 0 && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-24">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  On this page
                </h3>
                <nav className="space-y-1">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      onClick={(e) => handleTocClick(e, h.id)}
                      className={`block text-sm text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors ${
                        h.level === 3 ? "pl-3" : ""
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
