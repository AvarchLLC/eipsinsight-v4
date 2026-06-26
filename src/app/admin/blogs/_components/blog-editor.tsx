"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Loader2,
  Upload,
  X,
  Eye,
  Settings,
  Globe,
  Clock,
  Calendar,
  Star,
  Send,
  MessageSquare,
  TrendingUp,
  User,
  ImageIcon,
  CheckCircle2,
  Circle,
  ChevronDown,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

const fieldClass =
  "w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all outline-none";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

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
  const [readingTimeMinutes, setReadingTimeMinutes] = useState<number | null>(
    initialData.readingTimeMinutes ?? null
  );
  const [tags, setTags] = useState<string[]>(initialData.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [featured, setFeatured] = useState(initialData.featured ?? false);
  const [publicationDate, setPublicationDate] = useState<string>(
    formatDateInput(initialData.publicationDate)
  );
  const [upgradeId, setUpgradeId] = useState<number | null>(initialData.upgradeId ?? null);

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(mode === "edit" ? new Date() : null);
  const [uploading, setUploading] = useState(false);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [upgrades, setUpgrades] = useState<Array<{ id: number; name: string | null; slug: string }>>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<AuthorProfile>>({});

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"post" | "collaboration" | "analytics">("post");
  const [internalComments, setInternalComments] = useState<any[]>([]);
  const [commentInput, setInternalCommentInput] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);

  const titleRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-save every 15s of inactivity
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
      } catch {
        // silent auto-save failure
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [postId, slug, title, excerpt, content, coverImage, published, categoryId, readingTimeMinutes, tags, featured, publicationDate, mode, upgradeId, saving]);

  const handleSlugFromTitle = () => {
    setSlug(
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
    );
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const response = await fetch("/api/blog/upload-cover", { method: "POST", body: formData });
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
        toast.success("Saved");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save");
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    const next = !published;
    setPublished(next);
    if (mode === "edit" && postId) {
      try {
        await client.blog.update({ id: postId, published: next });
        setLastSaved(new Date());
        toast.success(next ? "Published" : "Moved to draft");
      } catch {
        setPublished(!next);
        toast.error("Failed to update status");
      }
    }
  };

  const missingProfileFields = authorProfile
    ? (["linkedin", "x", "facebook", "telegram"] as const).filter(
        (k) => !authorProfile[k] || authorProfile[k] === ""
      )
    : [];

  return (
    /* Ghost-style fullscreen overlay — above navbar (z-50), Sheet/dialogs raised to z-[200] */
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background">

      {/* ── Ghost minimal header ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background px-5">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin?tab=blogs"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={handlePublishToggle}
              disabled={saving || (!slug && !title)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold transition-colors",
                published
                  ? "text-emerald-500 hover:text-emerald-400"
                  : "text-amber-500 hover:text-amber-400"
              )}
            >
              {published ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              {published ? "Published" : "Draft"}
            </button>

            {lastSaved && (
              <span className="text-[11px] text-muted-foreground/60">
                · Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          {mode === "edit" && slug && (
            <Link
              href={`/resources/blogs/${slug}`}
              target="_blank"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Link>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !slug || !title || !content}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-all",
              "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Post settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Writing canvas ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[740px] px-6 py-10 md:py-16">

          {error && (
            <div className="mb-8 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <X className="h-4 w-4 shrink-0 cursor-pointer" onClick={() => setError(null)} />
              {error}
            </div>
          )}

          {/* Feature image — Ghost puts it above the title */}
          <div className="mb-10">
            {coverImage ? (
              <div className="group relative aspect-[2/1] w-full overflow-hidden rounded-2xl border border-border">
                <Image src={coverImage} alt="Feature" fill className="object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <label className="cursor-pointer rounded-lg bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background">
                    {uploading ? "Uploading…" : "Change image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={uploading}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="group flex cursor-pointer items-center gap-3 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
                <ImageIcon className="h-5 w-5" />
                <span className="text-sm">
                  {uploading ? "Uploading…" : "Add feature image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Title */}
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post Title"
            rows={1}
            className="mb-2 w-full resize-none border-none bg-transparent text-[2.5rem] font-bold leading-tight tracking-tight text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0"
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />

          {/* Divider */}
          <div className="mb-10 h-px bg-border/50" />

          {/* Body */}
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Begin writing… type / to insert a block"
            imageUploadEndpoint="/api/blog/upload-cover"
          />
        </div>
      </main>

      {/* ── Settings Sheet (Ghost-style right panel) ── */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="right"
          className="w-[420px] max-w-full overflow-y-auto bg-background p-0 sm:max-w-[420px]"
        >
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle className="text-sm font-semibold">Post Settings</SheetTitle>
          </SheetHeader>

          {/* Tab nav */}
          <div className="flex border-b border-border">
            {(["post", "collaboration", "analytics"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-6 p-6">
            {/* POST TAB */}
            {activeTab === "post" && (
              <>
                {/* SEO preview card */}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className={labelClass}>SEO Preview</p>
                  <div className="mt-3 space-y-1">
                    <div className="text-[10px] text-[#202124] dark:text-muted-foreground">
                      eipsinsight.com › resources › blogs › {slug || "…"}
                    </div>
                    <div className="text-sm text-[#1a0dab] dark:text-blue-400 font-medium line-clamp-1">
                      {title || "Post Title"}
                    </div>
                    <div className="text-[11px] text-[#4d5156] dark:text-muted-foreground line-clamp-2 leading-relaxed">
                      {excerpt || "Add an excerpt to see how it appears in search results…"}
                    </div>
                  </div>
                  {coverImage && (
                    <div className="mt-3 overflow-hidden rounded-lg border border-border">
                      <div className="relative aspect-[1.91/1]">
                        <Image src={coverImage} alt="Social" fill className="object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                {/* URL Slug */}
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
                      type="button"
                      onClick={handleSlugFromTitle}
                      title="Generate from title"
                      className="rounded-lg border border-border bg-muted/40 px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    /resources/blogs/{slug || "…"}
                  </p>
                </div>

                {/* Excerpt */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Excerpt</label>
                    <button
                      type="button"
                      onClick={handleGenerateMeta}
                      disabled={generatingMeta || (!title.trim() && !content.trim())}
                      className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-40"
                    >
                      {generatingMeta ? "Generating…" : "Auto-generate"}
                    </button>
                  </div>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Brief summary for search & social…"
                    rows={3}
                    className={cn(fieldClass, "resize-none")}
                  />
                </div>

                {/* Publication details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={categoryId ?? ""}
                      onChange={(e) => setCategoryId(e.target.value || null)}
                      className={fieldClass}
                    >
                      <option value="">None</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Upgrade</label>
                    <select
                      value={upgradeId ?? ""}
                      onChange={(e) =>
                        setUpgradeId(e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                      className={fieldClass}
                    >
                      <option value="">None</option>
                      {upgrades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.slug}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Reading time</label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="number"
                        value={readingTimeMinutes ?? ""}
                        onChange={(e) =>
                          setReadingTimeMinutes(
                            e.target.value ? parseInt(e.target.value, 10) : null
                          )
                        }
                        placeholder="mins"
                        className={cn(fieldClass, "pl-8")}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Publish date</label>
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
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Type tag and press Enter"
                    className={fieldClass}
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3 border-t border-border pt-4">
                  <label className="flex cursor-pointer items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Featured post</p>
                      <p className="text-[10px] text-muted-foreground">
                        Pin to top of the blog listing
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-border bg-muted/40 text-primary accent-primary"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Publish locally</p>
                      <p className="text-[10px] text-muted-foreground">
                        Make visible on the site
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="h-4 w-4 rounded border-border bg-muted/40 text-primary accent-primary"
                    />
                  </label>
                </div>

                {/* Incomplete profile warning */}
                {missingProfileFields.length > 0 && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-amber-500">
                      <User className="h-3.5 w-3.5" />
                      Profile incomplete
                    </div>
                    <p className="mb-3 text-[10px] leading-relaxed text-muted-foreground">
                      Missing {missingProfileFields.length} social link
                      {missingProfileFields.length > 1 ? "s" : ""}. Complete your profile to
                      show social buttons on your posts.
                    </p>
                    <div className="space-y-2">
                      {missingProfileFields.includes("x") && (
                        <input
                          type="url"
                          placeholder="X (Twitter) URL"
                          className="w-full rounded-md border border-border bg-background/50 px-2 py-1.5 text-[10px] outline-none focus:ring-1 focus:ring-amber-500/30"
                          value={profileForm.x || ""}
                          onChange={(e) => setProfileForm((p) => ({ ...p, x: e.target.value }))}
                        />
                      )}
                      {missingProfileFields.includes("linkedin") && (
                        <input
                          type="url"
                          placeholder="LinkedIn URL"
                          className="w-full rounded-md border border-border bg-background/50 px-2 py-1.5 text-[10px] outline-none focus:ring-1 focus:ring-amber-500/30"
                          value={profileForm.linkedin || ""}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, linkedin: e.target.value }))
                          }
                        />
                      )}
                      <textarea
                        placeholder="Your author bio…"
                        rows={2}
                        className="w-full resize-none rounded-md border border-border bg-background/50 px-2 py-1.5 text-[10px] outline-none focus:ring-1 focus:ring-amber-500/30"
                        value={profileForm.bio || ""}
                        onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* COLLABORATION TAB */}
            {activeTab === "collaboration" && (
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Editor comments</label>
                  <p className="mb-4 text-[10px] text-muted-foreground">
                    Internal notes for other editors and contributors.
                  </p>
                  <div className="relative">
                    <textarea
                      value={commentInput}
                      onChange={(e) => setInternalCommentInput(e.target.value)}
                      placeholder="Leave a note…"
                      rows={3}
                      className={cn(fieldClass, "resize-none pr-12")}
                    />
                    <button
                      type="button"
                      onClick={handleAddInternalComment}
                      disabled={!commentInput.trim()}
                      className="absolute bottom-2 right-2 rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-40 transition-all hover:scale-105"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4 border-t border-border pt-4">
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
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold">{c.user.name}</span>
                            <span className="text-[8px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1 rounded-lg border border-border/50 bg-muted/20 p-2 text-[11px] leading-relaxed text-muted-foreground">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    {internalComments.length === 0 && (
                      <div className="py-10 text-center">
                        <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
                        <p className="text-[10px] text-muted-foreground">
                          No comments yet. Start a discussion!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Views
                    </div>
                    <div className="mt-1 text-2xl font-bold">{analytics?.views ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      EIP Clicks
                    </div>
                    <div className="mt-1 text-2xl font-bold text-primary">
                      {analytics?.clicks ?? 0}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-primary">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Persona Insights
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Most popular among{" "}
                    <strong className="text-foreground">Protocol Researchers</strong> and{" "}
                    <strong className="text-foreground">Core Devs</strong>. Average reading
                    time: 4.2 mins.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Conversion rate</label>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${
                            ((analytics?.conversions ?? 0) / (analytics?.views || 1)) * 100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold">
                      {analytics?.conversions ?? 0} signups
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] italic text-muted-foreground">
                    Readers who joined the newsletter after this post.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sheet footer — save button */}
          <div className="sticky bottom-0 border-t border-border bg-background p-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !slug || !title || !content}
              className={cn(
                "w-full rounded-xl py-2.5 text-sm font-bold transition-all",
                "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {saving ? "Saving…" : mode === "create" ? "Create post" : "Save changes"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
