"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Loader2,
  Save,
  Upload,
  User,
  Tag,
  Clock,
  Calendar,
  Star,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Globe,
  FileText,
  Eye,
  Image as ImageIcon,
  Send,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";

interface BlogEditorProps {
  mode: "create" | "edit";
  postId?: string;
  initialData: {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage: string | null;
    published: boolean;
    categoryId?: string | null;
    readingTimeMinutes?: number | null;
    tags?: string[];
    featured?: boolean;
    publicationDate?: string;
    upgradeId?: number | null;
  };
}

type AuthorProfile = {
  linkedin: string | null;
  x: string | null;
  facebook: string | null;
  telegram: string | null;
  bio: string | null;
};

export function BlogEditor({ mode, postId, initialData }: BlogEditorProps) {
  const formatDateInput = (value?: string) => {
    if (!value) return new Date().toISOString().slice(0, 10);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  };

  const [slug, setSlug] = useState(initialData.slug);
  const [title, setTitle] = useState(initialData.title);
  const [excerpt, setExcerpt] = useState(initialData.excerpt);
  const [content, setContent] = useState(initialData.content);
  const [coverImage, setCoverImage] = useState<string | null>(initialData.coverImage);
  const [published, setPublished] = useState(initialData.published);
  const [categoryId, setCategoryId] = useState<string | null>(initialData.categoryId ?? null);
  const [readingTimeMinutes, setReadingTimeMinutes] = useState<number | null>(initialData.readingTimeMinutes ?? null);
  const [tags, setTags] = useState<string[]>(initialData.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [featured, setFeatured] = useState(initialData.featured ?? false);
  const [publicationDate, setPublicationDate] = useState<string>(formatDateInput(initialData.publicationDate));
  
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(mode === "edit" ? new Date() : null);
  const [uploading, setUploading] = useState(false);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<AuthorProfile>>({});
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"settings" | "collaboration" | "analytics">("settings");
  const [upgrades, setUpgrades] = useState<Array<{ id: number; name: string | null; slug: string }>>([]);
  const [upgradeId, setUpgradeId] = useState<number | null>(initialData.upgradeId ?? null);
  const [internalComments, setInternalComments] = useState<any[]>([]);
  const [commentInput, setInternalCommentInput] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);

  const fieldClass =
    "w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all";
  const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  useEffect(() => {
    client.blog.listCategories().then(setCategories).catch(() => setCategories([]));
    client.blog.listUpgrades().then(setUpgrades).catch(() => setUpgrades([]));
    client.blog.getMyEditorProfile().then((p) => {
      setAuthorProfile(p);
      if (p) setProfileForm(p);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!postId) return;
    if (activeTab === "collaboration") {
      client.blog.getInternalComments({ blogId: postId }).then(setInternalComments);
    }
    if (activeTab === "analytics") {
      client.blog.getAnalytics({ blogId: postId }).then(setAnalytics);
    }
  }, [postId, activeTab]);

  const handleAddInternalComment = async () => {
    if (!postId || !commentInput.trim()) return;
    try {
      const res = await client.blog.addInternalComment({ blogId: postId, content: commentInput });
      setInternalComments([res, ...internalComments]);
      setInternalCommentInput("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (mode !== "edit" || !postId || saving) return;

    const timer = setTimeout(async () => {
      try {
        await client.blog.update({
          id: postId,
          slug: slug || undefined,
          title: title || undefined,
          excerpt: excerpt || null,
          content: content || undefined,
          coverImage,
          published,
          categoryId,
          readingTimeMinutes,
          tags,
          featured,
          publicationDate: publicationDate || undefined,
          upgradeId: upgradeId || undefined,
        });
        setLastSaved(new Date());
      } catch (err) {
        console.warn("Auto-save failed", err);
      }
    }, 15000); // Auto-save every 15s of inactivity

    return () => clearTimeout(timer);
  }, [postId, slug, title, excerpt, content, coverImage, published, categoryId, readingTimeMinutes, tags, featured, publicationDate, mode, upgradeId]);

  const missingProfileFields = authorProfile
    ? (["linkedin", "x", "facebook", "telegram"] as const).filter((k) => !authorProfile[k] || authorProfile[k] === "")
    : [];

  const handleSlugFromTitle = () => {
    const s = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    setSlug(s);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const response = await fetch("/api/blog/upload-cover", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error("Missing URL");
      setCoverImage(data.url);
      toast.success("Cover image uploaded");
    } catch {
      setError("Upload failed. Try a smaller image.");
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleGenerateMeta = async () => {
    setGeneratingMeta(true);
    setError(null);
    try {
      const response = await fetch("/api/blog/generate-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = (await response.json()) as { excerpt?: string; readingTimeMinutes?: number };
      if (data.excerpt) setExcerpt(data.excerpt.trim());
      if (data.readingTimeMinutes) setReadingTimeMinutes(data.readingTimeMinutes);
      toast.success("Metadata generated");
    } catch {
      setError("Could not auto-generate metadata.");
    } finally {
      setGeneratingMeta(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const form = profileForm ?? {};
      if (Object.keys(form).length > 0) {
        await client.blog.updateMyEditorProfile({
          linkedin: form.linkedin ?? undefined,
          x: form.x ?? undefined,
          facebook: form.facebook ?? undefined,
          telegram: form.telegram ?? undefined,
          bio: form.bio ?? undefined,
        });
      }
      const data = {
        slug,
        title,
        excerpt: excerpt || undefined,
        content,
        coverImage: coverImage ?? undefined,
        published,
        categoryId: categoryId || undefined,
        readingTimeMinutes: readingTimeMinutes ?? undefined,
        tags,
        featured,
        publicationDate: publicationDate || undefined,
        upgradeId: upgradeId || undefined,
      };

      if (mode === "create") {
        const res = await client.blog.create(data);
        toast.success("Post created!");
        window.location.href = `/admin/blogs/${res.id}/edit`;
      } else if (postId) {
        await client.blog.update({ id: postId, ...data });
        setLastSaved(new Date());
        toast.success("Changes saved");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save");
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background font-space-grotesk">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Link
              href="/admin?tab=blogs"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  published ? "text-emerald-500" : "text-amber-500"
                )}>
                  {published ? "Published" : "Draft"}
                </span>
                {lastSaved && (
                  <span className="text-[10px] text-muted-foreground">
                    • Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <h1 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md">
                {title || "Untitled Post"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {mode === "edit" && (
                <Link
                  href={`/resources/blogs/${slug}`}
                  target="_blank"
                  className="inline-flex h-9 items-center gap-2 px-3 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Link>
             )}
            <button
              onClick={handleSave}
              disabled={saving || !slug || !title || !content}
              className={cn(
                "inline-flex h-9 items-center gap-2 px-4 rounded-lg text-sm font-bold transition-all shadow-sm",
                "bg-foreground text-background hover:bg-foreground/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : mode === "create" ? "Create Post" : "Save Changes"}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted",
                sidebarOpen ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 p-6 md:p-12">
          {error && (
            <div className="mb-8 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              <X className="h-4 w-4 shrink-0" onClick={() => setError(null)} />
              {error}
            </div>
          )}

          <div className="space-y-8">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title"
              rows={1}
              className="w-full resize-none border-none bg-transparent text-4xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 sm:text-5xl"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />

            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Tell your story... (Type / for commands)"
              className="text-lg leading-relaxed"
            />
          </div>
        </main>
      </div>

      {/* Sidebar Settings */}
      <aside
        className={cn(
          "z-30 h-screen border-l border-border bg-card/40 backdrop-blur-md transition-all duration-300",
          sidebarOpen ? "w-[360px]" : "w-0"
        )}
      >
        <div className={cn("flex h-full flex-col overflow-hidden", !sidebarOpen && "hidden")}>
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Post Editor</h2>
            <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-border p-1 mx-4 mt-4 bg-muted/40 rounded-xl">
            {(["settings", "collaboration", "analytics"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                  activeTab === t ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* SEO Preview */}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <label className={labelClass}>SEO Preview</label>
                  <div className="mt-2 space-y-3">
                    {/* Google Preview */}
                    <div className="space-y-1">
                      <div className="text-[10px] text-[#202124]">eipsinsight.com › resources › blogs › {slug || "..."}</div>
                      <div className="text-sm text-[#1a0dab] hover:underline cursor-pointer font-medium line-clamp-1">{title || "Post Title"}</div>
                      <div className="text-[11px] text-[#4d5156] line-clamp-2 leading-relaxed">
                        {excerpt || "Add an excerpt to see how this post will look in search results..."}
                      </div>
                    </div>
                    {/* Social Preview */}
                    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                      {coverImage ? (
                        <div className="relative aspect-[1.91/1] w-full">
                          <Image src={coverImage} alt="SEO" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-[1.91/1] w-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">EIPSINSIGHT.COM</div>
                        <div className="mt-0.5 text-xs font-bold line-clamp-1">{title || "Post Title"}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{excerpt}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <label className={labelClass}>Cover Image</label>
                  <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 transition-all hover:border-primary/50">
                    {coverImage ? (
                      <>
                        <Image src={coverImage} alt="Cover" fill className="object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setCoverImage(null)}
                            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center">
                        <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                          {uploading ? "Uploading..." : "Upload Cover Image"}
                        </span>
                        <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploading} className="sr-only" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Slug */}
                <div>
                  <label className={labelClass}>URL Slug</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="post-slug"
                      className={fieldClass}
                    />
                    <button
                      onClick={handleSlugFromTitle}
                      title="Generate from title"
                      className="rounded-lg border border-border bg-muted/40 px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                    <Globe className="h-3 w-3" />
                    /resources/blogs/{slug || "..." }
                  </p>
                </div>

                {/* Excerpt */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Excerpt</label>
                    <button
                      onClick={handleGenerateMeta}
                      disabled={generatingMeta || (!title.trim() && !content.trim())}
                      className="text-[10px] font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      Auto-gen
                    </button>
                  </div>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Brief summary..."
                    rows={3}
                    className={cn(fieldClass, "resize-none")}
                  />
                </div>

                {/* Publication details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={categoryId ?? ""}
                      onChange={(e) => setCategoryId(e.target.value || null)}
                      className={fieldClass}
                    >
                      <option value="">None</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Upgrade Sync</label>
                    <select
                      value={upgradeId ?? ""}
                      onChange={(e) => setUpgradeId(e.target.value ? parseInt(e.target.value, 10) : null)}
                      className={fieldClass}
                    >
                      <option value="">None</option>
                      {upgrades.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.slug}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Reading Time</label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="number"
                        value={readingTimeMinutes ?? ""}
                        onChange={(e) => setReadingTimeMinutes(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className={cn(fieldClass, "pl-8")}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Publish Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="date"
                        value={publicationDate}
                        onChange={(e) => setPublicationDate(e.target.value)}
                        className={cn(fieldClass, "pl-8")}
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className={labelClass}>Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground border border-border">
                        {t}
                        <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-red-500">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="Add tag..."
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="flex items-center justify-between group cursor-pointer">
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">Featured Post</span>
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="rounded border-border bg-muted/40 text-primary focus:ring-primary/30 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between group cursor-pointer">
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">Publish Locally</span>
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="rounded border-border bg-muted/40 text-primary focus:ring-primary/30 h-4 w-4"
                    />
                  </label>
                </div>

                {/* Author Profile Quick-Link */}
                {missingProfileFields.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mt-8">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 mb-1">
                      <User className="h-3.5 w-3.5" />
                      Profile Incomplete
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                      Your author profile is missing {missingProfileFields.length} social links. Complete it to show social buttons on your posts.
                    </p>
                    <div className="space-y-2">
                       {missingProfileFields.includes("x") && (
                         <input
                           type="url"
                           placeholder="X (Twitter) URL"
                           className="w-full bg-background/50 border border-border rounded-md px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                           value={profileForm.x || ""}
                           onChange={(e) => setProfileForm(p => ({ ...p, x: e.target.value }))}
                         />
                       )}
                       {missingProfileFields.includes("linkedin") && (
                         <input
                           type="url"
                           placeholder="LinkedIn URL"
                           className="w-full bg-background/50 border border-border rounded-md px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                           value={profileForm.linkedin || ""}
                           onChange={(e) => setProfileForm(p => ({ ...p, linkedin: e.target.value }))}
                         />
                       )}
                       <textarea
                         placeholder="Your Author Bio..."
                         rows={2}
                         className="w-full bg-background/50 border border-border rounded-md px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
                         value={profileForm.bio || ""}
                         onChange={(e) => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                       />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "collaboration" && (
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Editor Comments</label>
                  <p className="text-[10px] text-muted-foreground mb-4">Internal notes for other editors and contributors.</p>
                  <div className="space-y-4">
                    <div className="relative">
                      <textarea
                        value={commentInput}
                        onChange={(e) => setInternalCommentInput(e.target.value)}
                        placeholder="Leave a note..."
                        rows={3}
                        className={cn(fieldClass, "pr-12 resize-none")}
                      />
                      <button
                        onClick={handleAddInternalComment}
                        disabled={!commentInput.trim()}
                        className="absolute bottom-2 right-2 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 transition-all hover:scale-105"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                      {internalComments.map((c) => (
                        <div key={c.id} className="flex gap-3">
                          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border">
                             {c.user.image ? (
                               <Image src={c.user.image} alt={c.user.name} fill className="object-cover" />
                             ) : (
                               <div className="flex h-full w-full items-center justify-center bg-muted text-[8px] font-bold">
                                 {c.user.name.charAt(0)}
                               </div>
                             )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold">{c.user.name}</span>
                              <span className="text-[8px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/50">
                              {c.content}
                            </p>
                          </div>
                        </div>
                      ))}
                      {internalComments.length === 0 && (
                        <div className="py-12 text-center">
                          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
                          <p className="text-[10px] text-muted-foreground">No comments yet. Start a discussion!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
               <div className="space-y-6">
                 <div>
                   <label className={labelClass}>Engagement Overview</label>
                   <div className="grid grid-cols-2 gap-4 mt-4">
                     <div className="rounded-2xl border border-border bg-muted/20 p-4">
                       <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Views</div>
                       <div className="mt-1 text-2xl font-bold">{analytics?.views ?? 0}</div>
                     </div>
                     <div className="rounded-2xl border border-border bg-muted/20 p-4">
                       <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">EIP Clicks</div>
                       <div className="mt-1 text-2xl font-bold text-primary">{analytics?.clicks ?? 0}</div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="rounded-2xl border border-border bg-primary/5 p-4 border-dashed">
                   <div className="flex items-center gap-2 text-xs font-bold text-primary mb-2">
                     <TrendingUp className="h-3.5 w-3.5" />
                     Persona Insights
                   </div>
                   <p className="text-[10px] text-muted-foreground leading-relaxed">
                     Currently most popular among <b>Protocol Researchers</b> and <b>Core Devs</b>. Average reading time: 4.2 mins.
                   </p>
                 </div>

                 <div>
                   <label className={labelClass}>Conversion Rate</label>
                   <div className="mt-4 flex items-end gap-4">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(analytics?.conversions ?? 0) / (analytics?.views || 1) * 100}%` }} 
                        />
                      </div>
                      <span className="text-xs font-bold">{analytics?.conversions ?? 0} signups</span>
                   </div>
                   <p className="mt-2 text-[10px] text-muted-foreground italic">
                     Readers who joined the newsletter after this post.
                   </p>
                 </div>
               </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
