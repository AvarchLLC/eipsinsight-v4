"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  Loader2,
  Users,
  Search,
  Linkedin,
  Twitter,
  Facebook,
  Send,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type EditorUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  blog_editor_profile: {
    linkedin: string | null;
    x: string | null;
    facebook: string | null;
    telegram: string | null;
    bio: string | null;
  } | null;
};

export default function AdminEditorsPage() {
  const [editors, setEditors] = useState<EditorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; image: string | null; role: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const fetchEditors = () => {
    setLoading(true);
    client.blog
      .listEditors()
      .then((data) => {
        setEditors(data);
        setIsAdmin(true);
      })
      .catch(() => {
        setEditors([]);
        setIsAdmin(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEditors();
    client.blog.listCategories().then(setCategories).catch(() => []);
  }, []);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const slug = newCatSlug.trim() || newCatName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!slug) return;
    setCreatingCat(true);
    setError(null);
    try {
      await client.blog.createCategory({
        slug,
        name: newCatName.trim(),
      });
      setNewCatName("");
      setNewCatSlug("");
      client.blog.listCategories().then(setCategories);
      toast.success("Category created", { description: `${newCatName.trim()} has been added.` });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to create category";
      setError(msg);
      toast.error("Failed to create category", { description: msg });
    } finally {
      setCreatingCat(false);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const users = await client.blog.searchUsers({ email: searchEmail.trim() });
      setSearchResults(users);
    } catch {
      setError("Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddEditor = async (userId: string) => {
    const user = searchResults.find((u) => u.id === userId);
    setAddingId(userId);
    setError(null);
    try {
      await client.blog.addEditor({ userId });
      fetchEditors();
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Editor added", {
        description: user ? `${user.name} can now create and edit blog posts. An email has been sent.` : "An email notification has been sent.",
      });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to add editor";
      setError(msg);
      toast.error("Failed to add editor", { description: msg });
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveEditor = async (userId: string) => {
    if (!confirm("Remove this user's editor access? They will no longer be able to create or edit blog posts.")) return;
    const user = editors.find((e) => e.id === userId);
    setRemovingId(userId);
    setError(null);
    try {
      await client.blog.removeEditor({ userId });
      fetchEditors();
      toast.success("Editor removed", {
        description: user ? `${user.name} no longer has access to create or edit blog posts.` : "Editor access has been removed.",
      });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to remove editor";
      setError(msg);
      toast.error("Failed to remove editor", { description: msg });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/admin/blogs"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="dec-title text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-1">
                Blog Editors
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add or remove users who can create and edit blog posts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {isAdmin === false && (
          <div className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm">
            Only admins can manage editors. <Link href="/admin/blogs" className="underline hover:no-underline">Go to Manage Blogs</Link>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Add editor - admin only */}
        {isAdmin !== false && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Add Editor
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Search for a user by email to grant them editor access. They must have an existing account.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="user@example.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchEmail.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((u) => {
                const isEditor = editors.some((e) => e.id === u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                        {u.image ? (
                          <Image src={u.image} alt="" fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{u.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddEditor(u.id)}
                      disabled={isEditor || addingId === u.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                      {isEditor ? "Already editor" : "Add as editor"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* Create category - admin only */}
        {isAdmin !== false && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-6 mb-8">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">Blog Categories</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => (
              <span key={c.id} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-xs font-medium">
                {c.name}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => {
                setNewCatName(e.target.value);
                if (!newCatSlug) setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="Category name"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm"
            />
            <input
              type="text"
              value={newCatSlug}
              onChange={(e) => setNewCatSlug(e.target.value)}
              placeholder="slug"
              className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm font-mono"
            />
            <button
              onClick={handleCreateCategory}
              disabled={creatingCat || !newCatName.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {creatingCat ? "..." : "Add"}
            </button>
          </div>
        </div>
        )}

        {/* Current editors */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-6">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Current Editors ({editors.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
            </div>
          ) : editors.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              No editors yet. Add users above to grant blog editing access.
            </p>
          ) : (
            <div className="space-y-3">
              {editors.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                      {e.image ? (
                        <Image src={e.image} alt="" fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 text-lg font-medium">
                          {e.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{e.name}</p>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase",
                            e.role === "admin"
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              : "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
                          )}
                        >
                          {e.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{e.email}</p>
                      {e.blog_editor_profile && (
                        <div className="flex items-center gap-2 mt-2">
                          {e.blog_editor_profile.linkedin && (
                            <a href={e.blog_editor_profile.linkedin} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-500" title="LinkedIn">
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {e.blog_editor_profile.x && (
                            <a href={e.blog_editor_profile.x} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-500" title="X">
                              <Twitter className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {e.blog_editor_profile.facebook && (
                            <a href={e.blog_editor_profile.facebook} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-500" title="Facebook">
                              <Facebook className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {e.blog_editor_profile.telegram && (
                            <a href={`https://t.me/${e.blog_editor_profile.telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-500" title="Telegram">
                              <Send className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {e.role !== "admin" && (
                    <button
                      onClick={() => handleRemoveEditor(e.id)}
                      disabled={removingId === e.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {removingId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
