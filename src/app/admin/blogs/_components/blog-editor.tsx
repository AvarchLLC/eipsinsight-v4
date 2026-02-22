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
  };
}

type AuthorProfile = {
  linkedin: string | null;
  x: string | null;
  facebook: string | null;
  telegram: string | null;
  bio: string | null;
} | null;

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
    image: () => insertAtCursor("![", "](url)", "alt text"),
  };
}

export function BlogEditor({ mode, postId, initialData }: BlogEditorProps) {
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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile>(null);
  const [profileForm, setProfileForm] = useState<Partial<AuthorProfile>>({});
  const [profileExpanded, setProfileExpanded] = useState(true);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const toolbar = useMarkdownToolbar(contentRef, content, setContent);

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
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        if (!base64) return;
        const { url } = await client.blog.uploadCoverImage({ fileName: file.name, base64Data: base64 });
        setCoverImage(url);
      } catch {
        setError("Upload failed");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (Object.keys(profileForm).length > 0) {
        await client.blog.updateMyEditorProfile({
          linkedin: profileForm.linkedin ?? undefined,
          x: profileForm.x ?? undefined,
          facebook: profileForm.facebook ?? undefined,
          telegram: profileForm.telegram ?? undefined,
          bio: profileForm.bio ?? undefined,
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
        });
        window.location.href = "/admin/blogs";
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
        });
        window.location.href = "/admin/blogs";
      }
    } catch (err: unknown) {
      setError(err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to save");
    } finally {
      setSaving(false);
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
            Back to Manage Blogs
          </Link>
          <h1 className="dec-title text-2xl font-bold text-slate-800 dark:text-white">
            {mode === "create" ? "New Blog Post" : "Edit Blog Post"}
          </h1>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog post title"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Slug</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly-slug"
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 font-mono text-sm focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                type="button"
                onClick={handleSlugFromTitle}
                className="px-3 py-2.5 text-xs text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-cyan-500/30"
              >
                From title
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">/resources/blogs/{slug || "..."}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary for listing cards"
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-y focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cover Image</label>
            <div className="flex items-start gap-4">
              {coverImage && (
                <div className="relative h-24 w-32 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <Image src={coverImage} alt="Cover" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="absolute top-1 right-1 p-1 rounded bg-red-500/80 text-white text-xs hover:bg-red-500"
                  >
                    Remove
                  </button>
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-cyan-500/40 cursor-pointer text-sm">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload image"}
                <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploading} className="sr-only" />
              </label>
            </div>
          </div>

          {/* Category, tags, reading time, featured */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
              <select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
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
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Clock className="h-4 w-4" />
                Reading time (min)
              </label>
              <input
                type="number"
                min={0}
                value={readingTimeMinutes ?? ""}
                onChange={(e) => setReadingTimeMinutes(e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="e.g. 5"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Tag className="h-4 w-4" />
              Tags
            </label>
            <div className="flex gap-2 flex-wrap">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-medium"
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
                  className="w-24 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm"
                />
                <button type="button" onClick={addTag} className="px-2 py-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline">
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
              <span className="text-sm text-slate-700 dark:text-slate-300">Publish immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
              />
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Featured</span>
            </label>
          </div>

          {/* Author profile - only show when fields are missing */}
          {missingProfileFields.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
                <User className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Complete your author profile ({missingProfileFields.length} missing)
              </div>
              <div className="space-y-3">
                {missingProfileFields.includes("linkedin") && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={profileForm.linkedin ?? ""}
                      onChange={(e) => setProfileForm((p) => ({ ...p, linkedin: e.target.value || null }))}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm"
                    />
                  </div>
                )}
                {missingProfileFields.includes("x") && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">X (Twitter) URL</label>
                    <input
                      type="url"
                      value={profileForm.x ?? ""}
                      onChange={(e) => setProfileForm((p) => ({ ...p, x: e.target.value || null }))}
                      placeholder="https://x.com/username"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm"
                    />
                  </div>
                )}
                {missingProfileFields.includes("facebook") && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Facebook URL</label>
                    <input
                      type="url"
                      value={profileForm.facebook ?? ""}
                      onChange={(e) => setProfileForm((p) => ({ ...p, facebook: e.target.value || null }))}
                      placeholder="https://facebook.com/username"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm"
                    />
                  </div>
                )}
                {missingProfileFields.includes("telegram") && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Telegram</label>
                    <input
                      type="text"
                      value={profileForm.telegram ?? ""}
                      onChange={(e) => setProfileForm((p) => ({ ...p, telegram: e.target.value || null }))}
                      placeholder="@username or username"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Bio (optional)</label>
                  <textarea
                    value={profileForm.bio ?? ""}
                    onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value || null }))}
                    placeholder="Short author bio"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content with toolbar */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Content (Markdown)</label>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/50">
              <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <button type="button" onClick={toolbar.bold} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Bold">
                  <Bold className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.italic} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Italic">
                  <Italic className="h-4 w-4" />
                </button>
                <span className="w-px h-6 bg-slate-300 dark:bg-slate-600 my-1" />
                <button type="button" onClick={toolbar.h1} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Heading 1">
                  <Heading1 className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.h2} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Heading 2">
                  <Heading2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.h3} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Heading 3">
                  <Heading3 className="h-4 w-4" />
                </button>
                <span className="w-px h-6 bg-slate-300 dark:bg-slate-600 my-1" />
                <button type="button" onClick={toolbar.ul} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Bullet list">
                  <List className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.ol} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Numbered list">
                  <ListOrdered className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.quote} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Quote">
                  <Quote className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.code} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Inline code">
                  <Code className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.codeBlock} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Code block">
                  <Code className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.hr} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Horizontal rule">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-px h-6 bg-slate-300 dark:bg-slate-600 my-1" />
                <button type="button" onClick={toolbar.link} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Link">
                  <LinkIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={toolbar.image} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Image">
                  <ImageIcon className="h-4 w-4" />
                </button>
              </div>
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your blog post in Markdown..."
                rows={18}
                className="w-full px-4 py-3 font-mono text-sm resize-y bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0"
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
              href="/admin/blogs"
              className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
