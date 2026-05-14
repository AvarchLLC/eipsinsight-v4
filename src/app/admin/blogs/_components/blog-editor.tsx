"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Loader2,
  Save,
  Upload,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  ImageIcon,
  Minus,
  User,
  Tag,
  Clock,
  Calendar,
  Star,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";

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
  };
}

type AuthorProfile = {
  linkedin: string | null;
  x: string | null;
  facebook: string | null;
  telegram: string | null;
  bio: string | null;
};

function useMarkdownToolbar(textareaRef: React.RefObject<HTMLTextAreaElement | null>, content: string, setContent: (v: string) => void) {
  const wrapSelection = useCallback(
    (before: string, after: string = before, placeholder?: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.slice(start, end);
      const text = selected || placeholder || "text";
      const newText = content.slice(0, start) + before + text + after + content.slice(end);
      setContent(newText);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + before.length, start + before.length + text.length);
      }, 0);
    },
    [content, setContent, textareaRef]
  );

  const insertAtCursor = useCallback(
    (insert: string, offset = 0) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const newText = content.slice(0, start) + insert + content.slice(start);
      setContent(newText);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + insert.length + offset, start + insert.length + offset);
      }, 0);
    },
    [content, setContent, textareaRef]
  );

  return {
    bold: () => wrapSelection("**", "**", "bold text"),
    italic: () => wrapSelection("_", "_", "italic text"),
    h1: () => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = content.indexOf("\n", start);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const newLine = line.startsWith("# ") ? line : `# ${line || "Heading"}`;
      const newText = content.slice(0, lineStart) + newLine + content.slice(lineEnd === -1 ? content.length : lineEnd);
      setContent(newText);
    },
    h2: () => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = content.indexOf("\n", start);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const newLine = line.startsWith("## ") ? line : `## ${line || "Heading"}`;
      const newText = content.slice(0, lineStart) + newLine + content.slice(lineEnd === -1 ? content.length : lineEnd);
      setContent(newText);
    },
    h3: () => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = content.indexOf("\n", start);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const newLine = line.startsWith("### ") ? line : `### ${line || "Heading"}`;
      const newText = content.slice(0, lineStart) + newLine + content.slice(lineEnd === -1 ? content.length : lineEnd);
      setContent(newText);
    },
    ul: () => insertAtCursor("\n- ", 2),
    ol: () => insertAtCursor("\n1. ", 4),
    quote: () => wrapSelection("\n> ", "\n", "quote"),
    code: () => wrapSelection("`", "`", "code"),
    codeBlock: () => insertAtCursor("\n```\n\n```\n", 5),
    hr: () => insertAtCursor("\n\n---\n\n"),
    link: () => wrapSelection("[", "](url)", "link text"),
    image: () => wrapSelection("![", "](url)", "alt text"),
  };
}

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
  const [uploading, setUploading] = useState(false);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<AuthorProfile>>({});
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const toolbar = useMarkdownToolbar(contentRef, content, setContent);
  const fieldClass =
    "w-full rounded-lg border border-border bg-muted/60 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30";
  const labelClass = "mb-2 block text-sm font-medium text-foreground";

  const optimizeImageForUpload = async (file: File): Promise<File> => {
    const imageBitmap = await createImageBitmap(file);
    const maxWidth = 1920;
    const maxHeight = 1080;
    const ratio = Math.min(maxWidth / imageBitmap.width, maxHeight / imageBitmap.height, 1);
    const targetWidth = Math.max(1, Math.floor(imageBitmap.width * ratio));
    const targetHeight = Math.max(1, Math.floor(imageBitmap.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );

    if (!blob) return file;

    const safeName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], safeName, { type: "image/jpeg" });
  };

  useEffect(() => {
    client.blog.listCategories().then(setCategories).catch(() => setCategories([]));
    client.blog.getMyEditorProfile().then((p) => {
      setAuthorProfile(p);
      if (p) setProfileForm(p);
    }).catch(() => {});
  }, []);

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
    const originalFile = e.target.files?.[0];
    let file = originalFile;
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setError(null);
    try {
      file = await optimizeImageForUpload(file);
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
      setUploading(false);
    } catch {
      setUploading(false);
      setError("Upload failed. Try a smaller image (recommended under 2MB).");
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
      if (typeof data.excerpt === "string" && data.excerpt.trim()) {
        setExcerpt(data.excerpt.trim());
      }
      if (typeof data.readingTimeMinutes === "number") {
        setReadingTimeMinutes(data.readingTimeMinutes);
      }
    } catch {
      setError("Could not auto-generate excerpt/reading time.");
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
      if (mode === "create") {
        await client.blog.create({
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
        });
        window.location.href = "/admin?tab=blogs";
      } else if (postId) {
        await client.blog.update({
          id: postId,
          slug,
          title,
          excerpt: excerpt || null,
          content,
          coverImage,
          published,
          categoryId,
          readingTimeMinutes,
          tags,
          featured,
          publicationDate: publicationDate || undefined,
        });
        window.location.href = "/admin?tab=blogs";
      }
    } catch (err: unknown) {
      setError(err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-card/40">
        <div className="page-shell py-8">
          <Link
            href="/admin?tab=blogs"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Manage Blogs
          </Link>
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            {mode === "create" ? "New Blog Post" : "Edit Blog Post"}
          </h1>
        </div>
      </section>

      <div className="page-shell max-w-4xl py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog post title"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Slug</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly-slug"
                className={cn(fieldClass, "flex-1 font-mono text-sm")}
              />
              <button
                type="button"
                onClick={handleSlugFromTitle}
                className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                From title
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">/resources/blogs/{slug || "..."}</p>
          </div>

          <div>
            <label className={labelClass}>Excerpt</label>
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={handleGenerateMeta}
                disabled={generatingMeta || (!title.trim() && !content.trim())}
                className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingMeta ? "Generating..." : "Auto-generate excerpt + reading time"}
              </button>
            </div>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary for listing cards"
              rows={2}
              className={cn(fieldClass, "resize-y")}
            />
          </div>

          <div>
            <label className={labelClass}>Cover Image</label>
            <div className="flex items-start gap-4">
              {coverImage && (
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image src={coverImage} alt="Cover" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="absolute right-1 top-1 rounded bg-red-500/80 p-1 text-xs text-white hover:bg-red-500"
                  >
                    Remove
                  </button>
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload image"}
                <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploading} className="sr-only" />
              </label>
            </div>
          </div>

          {/* Category, tags, reading time, featured */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className={cn(labelClass, "flex items-center gap-1.5")}>
                <Clock className="h-4 w-4" />
                Reading time (min)
              </label>
              <input
                type="number"
                min={0}
                value={readingTimeMinutes ?? ""}
                onChange={(e) => setReadingTimeMinutes(e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="e.g. 5"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={cn(labelClass, "flex items-center gap-1.5")}>
                <Calendar className="h-4 w-4" />
                Publication date
              </label>
              <input
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={cn(labelClass, "flex items-center gap-1.5")}>
              <Tag className="h-4 w-4" />
              Tags
            </label>
            <div className="flex gap-2 flex-wrap">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500">
                    ×
                  </button>
                </span>
              ))}
              <div className="flex gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag"
                  className="w-24 rounded border border-border bg-muted/60 px-2 py-1 text-sm text-foreground"
                />
                <button type="button" onClick={addTag} className="px-2 py-1 text-xs text-primary hover:underline">
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
              />
              <span className="text-sm text-foreground">Publish immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
              />
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-foreground">Featured</span>
            </label>
          </div>

          {/* Author profile - only show when fields are missing */}
          {missingProfileFields.length > 0 && (
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-primary" />
                Complete your author profile ({missingProfileFields.length} missing)
              </div>
              <div className="space-y-3">
                {missingProfileFields.includes("linkedin") && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">LinkedIn URL</label>
                    <input
                      type="url"
                      value={profileForm?.linkedin ?? ""}
                      onChange={(e) => setProfileForm((p) => ({ ...p, linkedin: e.target.value || null }))}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                )}
                {missingProfileFields.includes("x") && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">X (Twitter) URL</label>
                    <input
                      type="url"
                      value={profileForm?.x ?? ""}
                      onChange={(e) => setProfileForm((p) => ({ ...p, x: e.target.value || null }))}
                      placeholder="https://x.com/username"
                      className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                )}
                {missingProfileFields.includes("facebook") && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Facebook URL</label>
                    <input
                      type="url"
                      value={profileForm?.facebook ?? ""}
                      onChange={(e) => setProfileForm((p) => ({ ...p, facebook: e.target.value || null }))}
                      placeholder="https://facebook.com/username"
                      className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                )}
                {missingProfileFields.includes("telegram") && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Telegram</label>
                    <input
                      type="text"
                      value={profileForm?.telegram ?? ""}
                      onChange={(e) => setProfileForm((p) => ({ ...p, telegram: e.target.value || null }))}
                      placeholder="@username or username"
                      className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Bio (optional)</label>
                  <textarea
                    value={profileForm?.bio ?? ""}
                    onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value || null }))}
                    placeholder="Short author bio"
                    rows={2}
                    className="w-full resize-y rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content with toolbar */}
          <div>
            <label className={labelClass}>Content (Markdown)</label>
            <div className="overflow-hidden rounded-xl border border-border bg-card/60">
              <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-2">
                <button type="button" onClick={toolbar.bold} className="rounded p-2 hover:bg-muted" title="Bold">
                  <Bold className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.italic} className="rounded p-2 hover:bg-muted" title="Italic">
                  <Italic className="h-4 w-4" />
                </button>
                <span className="my-1 h-6 w-px bg-border" />
                <button type="button" onClick={toolbar.h1} className="rounded p-2 hover:bg-muted" title="Heading 1">
                  <Heading1 className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.h2} className="rounded p-2 hover:bg-muted" title="Heading 2">
                  <Heading2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.h3} className="rounded p-2 hover:bg-muted" title="Heading 3">
                  <Heading3 className="h-4 w-4" />
                </button>
                <span className="my-1 h-6 w-px bg-border" />
                <button type="button" onClick={toolbar.ul} className="rounded p-2 hover:bg-muted" title="Bullet list">
                  <List className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.ol} className="rounded p-2 hover:bg-muted" title="Numbered list">
                  <ListOrdered className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.quote} className="rounded p-2 hover:bg-muted" title="Quote">
                  <Quote className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.code} className="rounded p-2 hover:bg-muted" title="Inline code">
                  <Code className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.codeBlock} className="rounded p-2 hover:bg-muted" title="Code block">
                  <Code className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.hr} className="rounded p-2 hover:bg-muted" title="Horizontal rule">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="my-1 h-6 w-px bg-border" />
                <button type="button" onClick={toolbar.link} className="rounded p-2 hover:bg-muted" title="Link">
                  <LinkIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.image} className="rounded p-2 hover:bg-muted" title="Image">
                  <ImageIcon className="h-4 w-4" />
                </button>
              </div>
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your blog post in Markdown..."
                rows={18}
                className="w-full resize-y bg-transparent px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !slug || !title || !content}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors",
                "bg-linear-to-r from-emerald-500 to-cyan-500 text-black",
                "hover:from-emerald-400 hover:to-cyan-400",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </button>
            <Link
              href="/admin?tab=blogs"
              className="rounded-lg border border-border px-6 py-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
