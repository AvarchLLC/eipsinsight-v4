"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  UserPlus,
  UserMinus,
  Users,
  Search,
  Linkedin,
  Twitter,
  Facebook,
  Send,
  Video,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  published: boolean;
  createdAt: Date | string;
  author: { id: string; name: string; image: string | null };
};

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

type VideoItem = {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  displayOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export default function AdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const [editors, setEditors] = useState<EditorUser[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; email: string; image: string | null; role: string }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const fetchPosts = () => {
    setBlogsLoading(true);
    client.blog
      .list({ publishedOnly: false, limit: 100 })
      .then((res) => setPosts(res.posts))
      .catch(() => setPosts([]))
      .finally(() => setBlogsLoading(false));
  };

  const fetchEditors = () => {
    setEditorsLoading(true);
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
      .finally(() => setEditorsLoading(false));
  };

  const fetchVideos = () => {
    setVideosLoading(true);
    client.video
      .list({ publishedOnly: false, limit: 100 })
      .then((res) => setVideos(res.videos as VideoItem[]))
      .catch(() => setVideos([]))
      .finally(() => setVideosLoading(false));
  };

  useEffect(() => {
    fetchPosts();
    fetchEditors();
    fetchVideos();
    client.blog.listCategories().then(setCategories).catch(() => []);
  }, []);

  useEffect(() => {
    // Enable smooth scrolling for this page
    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = originalScrollBehavior;
    };
  }, []);

  useEffect(() => {
    // Scroll spy - update hash based on which section is at the top
    const sections = ['blogs', 'editors', 'videos'];
    
    const updateActiveSection = () => {
      const scrollPosition = window.scrollY + window.innerHeight * 0.3; // Check at 30% from top
      
      // Find which section we're currently in
      let currentSection = 'blogs'; // Default to first section
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = window.scrollY + rect.top;
          
          // If we've scrolled past this section's top, it becomes active
          if (scrollPosition >= elementTop) {
            currentSection = sectionId;
          }
        }
      }
      
      // Update hash if it changed
      const newHash = `#${currentSection}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    };
    
    // Update on scroll
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    
    // Initial update
    updateActiveSection();
    
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
    };
  }, []);

  const handleDeletePost = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    setDeletingPostId(id);
    try {
      await client.blog.delete({ id });
      setPosts((p) => p.filter((x) => x.id !== id));
    } catch {
      alert("Failed to delete");
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const slug =
      newCatSlug.trim() ||
      newCatName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    if (!slug) return;
    setCreatingCat(true);
    setEditorError(null);
    try {
      await client.blog.createCategory({
        slug,
        name: newCatName.trim(),
      });
      setNewCatName("");
      setNewCatSlug("");
      client.blog.listCategories().then(setCategories);
      toast.success("Category created", {
        description: `${newCatName.trim()} has been added.`,
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to create category";
      setEditorError(msg);
      toast.error("Failed to create category", { description: msg });
    } finally {
      setCreatingCat(false);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setEditorError(null);
    try {
      const users = await client.blog.searchUsers({ email: searchEmail.trim() });
      setSearchResults(users);
    } catch {
      setEditorError("Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddEditor = async (userId: string) => {
    const user = searchResults.find((u) => u.id === userId);
    setAddingId(userId);
    setEditorError(null);
    try {
      await client.blog.addEditor({ userId });
      fetchEditors();
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Editor added", {
        description: user
          ? `${user.name} can now create and edit blog posts. An email has been sent.`
          : "An email notification has been sent.",
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to add editor";
      setEditorError(msg);
      toast.error("Failed to add editor", { description: msg });
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveEditor = async (userId: string) => {
    if (
      !confirm(
        "Remove this user's editor access? They will no longer be able to create or edit blog posts."
      )
    )
      return;
    const user = editors.find((e) => e.id === userId);
    setRemovingId(userId);
    setEditorError(null);
    try {
      await client.blog.removeEditor({ userId });
      fetchEditors();
      toast.success("Editor removed", {
        description: user
          ? `${user.name} no longer has access to create or edit blog posts.`
          : "Editor access has been removed.",
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to remove editor";
      setEditorError(msg);
      toast.error("Failed to remove editor", { description: msg });
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    setDeletingVideoId(id);
    try {
      await client.video.delete({ id });
      setVideos((v) => v.filter((x) => x.id !== id));
    } catch {
      alert("Failed to delete");
    } finally {
      setDeletingVideoId(null);
    }
  };

  const moveVideo = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === videos.length - 1)
    )
      return;

    const newVideos = [...videos];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newVideos[index], newVideos[targetIndex]] = [
      newVideos[targetIndex],
      newVideos[index],
    ];

    setVideos(newVideos);
    setReordering(true);

    try {
      await client.video.reorder({
        videoIds: newVideos.map((v) => v.id),
      });
    } catch {
      alert("Failed to reorder");
      fetchVideos();
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Admin
          </div>
          <h1 className="dec-title text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2">
            Admin Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Manage blogs, editors, and videos from a single workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="#blogs"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            >
              Blogs
            </a>
            <a
              href="#editors"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            >
              Editors
            </a>
            <a
              href="#videos"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            >
              Videos
            </a>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-12">
        <section id="blogs" className="scroll-mt-24 border-t-4 border-emerald-500 pt-8">
          <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex gap-3 items-start justify-between">
              <div className="flex gap-3 items-start flex-1">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex-shrink-0">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="dec-title text-2xl font-bold text-slate-800 dark:text-white">
                    Manage Blogs
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Create, edit, and publish blog posts.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/blogs/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Post
              </Link>
            </div>
          </div>

          {blogsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center max-w-lg mx-auto py-16">
              <FileText className="h-14 w-14 text-slate-400 dark:text-slate-600 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                No blog posts yet
              </h3>
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
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-4"
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
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletingPostId === post.id}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingPostId === post.id ? (
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
        </section>

        <section id="editors" className="scroll-mt-24 border-t-4 border-cyan-500 pt-8">
          <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex gap-3 items-start">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="dec-title text-2xl font-bold text-slate-800 dark:text-white">
                  Blog Editors
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add or remove users who can create and edit blog posts.
                </p>
              </div>
            </div>
          </div>

          {isAdmin === false && (
            <div className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm">
              Only admins can manage editors. <Link href="/admin#blogs" className="underline hover:no-underline">Go to Manage Blogs</Link>
            </div>
          )}
          {editorError && (
            <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
              {editorError}
            </div>
          )}

          {isAdmin !== false && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-6 mb-8">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Add Editor
              </h3>
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
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
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
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                              {u.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {u.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddEditor(u.id)}
                          disabled={isEditor || addingId === u.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          {isEditor ? "Already editor" : "Add as editor"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isAdmin !== false && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-6 mb-8">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
                Blog Categories
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-xs font-medium"
                  >
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
                    if (!newCatSlug)
                      setNewCatSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, "")
                      );
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

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-6">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Current Editors ({editors.length})
            </h3>

            {editorsLoading ? (
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
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {e.name}
                          </p>
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {e.email}
                        </p>
                        {e.blog_editor_profile && (
                          <div className="flex items-center gap-2 mt-2">
                            {e.blog_editor_profile.linkedin && (
                              <a
                                href={e.blog_editor_profile.linkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-cyan-500"
                                title="LinkedIn"
                              >
                                <Linkedin className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {e.blog_editor_profile.x && (
                              <a
                                href={e.blog_editor_profile.x}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-cyan-500"
                                title="X"
                              >
                                <Twitter className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {e.blog_editor_profile.facebook && (
                              <a
                                href={e.blog_editor_profile.facebook}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-cyan-500"
                                title="Facebook"
                              >
                                <Facebook className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {e.blog_editor_profile.telegram && (
                              <a
                                href={`https://t.me/${e.blog_editor_profile.telegram.replace(/^@/, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-cyan-500"
                                title="Telegram"
                              >
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
                        {removingId === e.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="h-3.5 w-3.5" />
                        )}
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="videos" className="scroll-mt-24 border-t-4 border-purple-500 pt-8">
          <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex gap-3 items-start justify-between">
              <div className="flex gap-3 items-start flex-1">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex-shrink-0">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="dec-title text-2xl font-bold text-slate-800 dark:text-white">
                    Manage Videos
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Create, edit, and organize your video collection.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/videos/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add New Video
              </Link>
            </div>
          </div>

          {videosLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
              <p className="text-slate-600 dark:text-slate-400">Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-6">
                <Video className="h-10 w-10 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                No Videos Yet
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Start building your video library by adding your first video.
              </p>
              <Link
                href="/admin/videos/new"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
              >
                <Plus className="h-4 w-4" />
                Add First Video
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {videos.length}
                  </span>{" "}
                  video{videos.length !== 1 ? "s" : ""} in your library
                </p>
              </div>

              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className="group relative rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-5"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveVideo(index, "up")}
                          disabled={index === 0 || reordering}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => moveVideo(index, "down")}
                          disabled={index === videos.length - 1 || reordering}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </button>
                      </div>
                      <div className="relative h-20 w-32 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md">
                        <Image
                          src={
                            video.thumbnail ??
                            `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`
                          }
                          alt={video.title}
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate text-lg mb-1">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                        <span>
                          Order:{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {video.displayOrder}
                          </span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          video.published
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30"
                        }`}
                      >
                        {video.published ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {video.published ? "Published" : "Draft"}
                      </span>

                      <Link
                        href={`/admin/videos/${video.id}/edit`}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>

                      <button
                        onClick={() => handleDeleteVideo(video.id)}
                        disabled={deletingVideoId === video.id}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingVideoId === video.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
