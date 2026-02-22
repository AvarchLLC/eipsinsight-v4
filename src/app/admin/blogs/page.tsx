"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    published: boolean;
    createdAt: Date | string;
    author: { id: string; name: string; image: string | null };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = () => {
    setLoading(true);
    client.blog
      .list({ publishedOnly: false, limit: 100 })
      .then((res) => setPosts(res.posts))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    setDeletingId(id);
    try {
      await client.blog.delete({ id });
      setPosts((p) => p.filter((x) => x.id !== id));
    } catch {
      alert("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/resources/blogs"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blogs
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="dec-title text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-1">
                Manage Blogs
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create, edit, and publish blog posts.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/editors"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50"
              >
                Editors
              </Link>
              <Link
                href="/admin/blogs/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
              >
                <Plus className="h-4 w-4" />
                New Post
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center max-w-lg mx-auto py-24">
            <FileText className="h-16 w-16 text-slate-400 dark:text-slate-600 mx-auto mb-6" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              No blog posts yet
            </h2>
            <Link
              href="/admin/blogs/new"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Create first post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4"
              >
                <div className="relative h-16 w-24 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 dark:text-white truncate">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    /{post.slug} · {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                      post.published
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-slate-500/20 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {post.published ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                    {post.published ? "Published" : "Draft"}
                  </span>
                  <Link
                    href={`/admin/blogs/${post.id}/edit`}
                    className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
