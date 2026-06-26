"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
// @ts-ignore
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import FloatingMenuExtension from "@tiptap/extension-floating-menu";
import CharacterCount from "@tiptap/extension-character-count";
import { Markdown } from "tiptap-markdown";
import { EIPSmartEmbed } from "./rich-text-editor/eip-extension";
import { EIPLink } from "./rich-text-editor/eip-link";
import { TweetEmbed } from "./rich-text-editor/tweet-extension";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Minus,
  Plus,
  AlignLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  /** REST endpoint that accepts multipart/form-data with field "file" and returns { url: string } */
  imageUploadEndpoint?: string;
}

const BubbleButton = ({
  onClick,
  isActive = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      "px-2 py-1.5 rounded text-sm transition-colors",
      isActive
        ? "bg-foreground text-background"
        : "text-foreground/70 hover:text-foreground hover:bg-muted"
    )}
  >
    {children}
  </button>
);

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your story… type / for blocks",
  className,
  imageUploadEndpoint,
}: RichTextEditorProps) {
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    enableInputRules: true,
    enablePasteRules: true,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      BubbleMenuExtension,
      FloatingMenuExtension,
      CharacterCount,
      EIPSmartEmbed,
      EIPLink,
      TweetEmbed,
      Image.configure({
        HTMLAttributes: {
          class: "rounded-2xl max-w-full h-auto border border-border shadow-lg my-8 mx-auto block",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline font-medium decoration-primary/30 underline-offset-4 hover:decoration-primary transition-all",
        },
      }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: true,
        transformPastedText: true,   // parse markdown when pasting plain text
        transformCopiedText: false,  // don't mangle copied rich text back to md
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      // @ts-ignore
      const markdown = editor.storage.markdown.getMarkdown();
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[500px] py-4",
          "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground",
          "prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg",
          "prose-p:leading-relaxed prose-p:text-foreground/90",
          "prose-li:my-0.5",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground prose-blockquote:italic",
          "prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
          "prose-a:text-primary prose-a:underline prose-a:underline-offset-4",
          "prose-hr:border-border",
          className
        ),
      },
    },
  });

  const addImage = useCallback(() => {
    if (imageUploadEndpoint) {
      // trigger the hidden file input — upload happens in handleImageFile
      imageInputRef.current?.click();
    } else {
      const url = window.prompt("Enter image URL");
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
    setBlockMenuOpen(false);
  }, [editor, imageUploadEndpoint]);

  const handleImageFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so the same file can be re-selected later
    if (e.target) e.target.value = "";
    if (!file || !imageUploadEndpoint) return;

    setImgUploading(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const res = await fetch(imageUploadEndpoint, { method: "POST", body: form });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { url?: string };
      if (data.url && editor) {
        editor.chain().focus().setImage({ src: data.url }).run();
      } else {
        throw new Error("No URL returned");
      }
    } catch (err) {
      console.error("[image-upload]", err);
      // fallback: ask for URL manually
      const url = window.prompt("Upload failed. Enter image URL instead:");
      if (url && editor) editor.chain().focus().setImage({ src: url }).run();
    } finally {
      setImgUploading(false);
    }
  }, [editor, imageUploadEndpoint]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertEIPCard = useCallback(() => {
    const input = window.prompt("Enter standard (e.g., EIP-1559 or ERC-721)");
    if (input) {
      const match = input.match(/(EIP|ERC|RIP)-?(\d+)/i);
      if (match) {
        editor?.chain().focus().insertContent({
          type: "eipSmartEmbed",
          attrs: { type: match[1].toUpperCase(), number: match[2] },
        }).run();
      }
    }
    setBlockMenuOpen(false);
  }, [editor]);

  const insertTweet = useCallback(() => {
    const input = window.prompt("Paste a Twitter / X post URL");
    if (input?.trim()) {
      editor?.chain().focus().insertContent({
        type: "tweetEmbed",
        attrs: { url: input.trim() },
      }).run();
    }
    setBlockMenuOpen(false);
  }, [editor]);

  const stats = useMemo(() => {
    if (!editor) return { words: 0 };
    return { words: editor.storage.characterCount.words() };
  }, [editor?.state.doc.textContent]);

  if (!editor) {
    return <div className="min-h-[500px] animate-pulse rounded-2xl bg-muted/10" />;
  }

  const BLOCK_OPTIONS = [
    {
      label: "Heading",
      icon: <span className="text-xs font-bold">H2</span>,
      action: () => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setBlockMenuOpen(false); },
    },
    {
      label: "Subheading",
      icon: <span className="text-xs font-bold">H3</span>,
      action: () => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setBlockMenuOpen(false); },
    },
    {
      label: "Bullet list",
      icon: <List className="h-4 w-4" />,
      action: () => { editor.chain().focus().toggleBulletList().run(); setBlockMenuOpen(false); },
    },
    {
      label: "Numbered list",
      icon: <ListOrdered className="h-4 w-4" />,
      action: () => { editor.chain().focus().toggleOrderedList().run(); setBlockMenuOpen(false); },
    },
    {
      label: "Quote",
      icon: <Quote className="h-4 w-4" />,
      action: () => { editor.chain().focus().toggleBlockquote().run(); setBlockMenuOpen(false); },
    },
    {
      label: "Code block",
      icon: <Code className="h-4 w-4" />,
      action: () => { editor.chain().focus().toggleCodeBlock().run(); setBlockMenuOpen(false); },
    },
    {
      label: "Divider",
      icon: <Minus className="h-4 w-4" />,
      action: () => { editor.chain().focus().setHorizontalRule().run(); setBlockMenuOpen(false); },
    },
    {
      label: "Image",
      icon: <ImageIcon className="h-4 w-4" />,
      action: addImage,
    },
    {
      label: "EIP Card",
      icon: <FileText className="h-4 w-4" />,
      action: insertEIPCard,
    },
    {
      label: "Tweet",
      icon: <span className="text-[10px] font-bold">𝕏</span>,
      action: insertTweet,
    },
  ];

  return (
    <div className="relative w-full">
      {/* Hidden file input for image uploads */}
      {imageUploadEndpoint && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFile}
          className="sr-only"
        />
      )}

      {/* Upload progress indicator */}
      {imgUploading && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground animate-in fade-in">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          Uploading image…
        </div>
      )}

      {/* Bubble Menu — appears on text selection */}
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-150">
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Code"
          >
            <Code className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={setLink}
            isActive={editor.isActive("link")}
            title="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </BubbleButton>
          <div className="w-px h-4 bg-border mx-0.5" />
          <BubbleButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </BubbleButton>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </BubbleButton>
          <div className="w-px h-4 bg-border mx-0.5" />
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
          </BubbleButton>
        </div>
      </BubbleMenu>

      {/* Floating Menu — appears on empty paragraphs */}
      <FloatingMenu editor={editor}>
        <div className="flex items-center -ml-10">
          {!blockMenuOpen ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setBlockMenuOpen(true);
              }}
              className="h-7 w-7 rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:border-primary/40 hover:text-primary flex items-center justify-center transition-all"
              title="Insert block"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-0.5 rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-xl p-1 animate-in slide-in-from-left-2 duration-150">
              {BLOCK_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    opt.action();
                  }}
                  title={opt.label}
                  className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-w-[40px]"
                >
                  {opt.icon}
                  <span className="text-[9px] font-medium leading-none truncate max-w-[36px]">{opt.label}</span>
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setBlockMenuOpen(false);
                }}
                className="ml-1 px-1.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </FloatingMenu>

      <EditorContent editor={editor} />

      {/* Word count — subtle bottom right */}
      <div className="mt-4 text-right text-[11px] text-muted-foreground/50 select-none">
        {stats.words} words
      </div>
    </div>
  );
}
