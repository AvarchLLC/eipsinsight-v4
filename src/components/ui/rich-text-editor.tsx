"use client";

import React, { useCallback, useMemo } from "react";
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
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Type,
  Minus,
  MessageSquare,
  Highlighter,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

const MenuButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
  className,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "p-2 rounded-md transition-all duration-200",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm scale-95"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
      disabled && "opacity-30 cursor-not-allowed",
      className
    )}
  >
    {children}
  </button>
);

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write something...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      BubbleMenuExtension,
      FloatingMenuExtension,
      CharacterCount,
      EIPSmartEmbed,
      EIPLink,
      Image.configure({
        HTMLAttributes: {
          class: "rounded-2xl max-w-full h-auto border border-border shadow-lg my-8",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline font-medium decoration-primary/30 underline-offset-4 hover:decoration-primary transition-all",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: true,
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
          "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] py-10 px-4 sm:px-0",
          "prose-headings:font-bold prose-p:leading-relaxed prose-li:my-1",
          className
        ),
      },
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt("Enter image URL");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

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

  const stats = useMemo(() => {
    if (!editor) return { words: 0, characters: 0 };
    return {
      words: editor.storage.characterCount.words(),
      characters: editor.storage.characterCount.characters(),
    };
  }, [editor?.state.doc.textContent]);

  const insertEIPCard = useCallback(() => {
    const input = window.prompt("Enter standard (e.g., EIP-1559 or ERC-721)");
    if (input) {
      const match = input.match(/(EIP|ERC|RIP)-?(\d+)/i);
      if (match) {
        const type = match[1].toUpperCase();
        const number = match[2];
        editor?.chain().focus().insertContent({
          type: "eipSmartEmbed",
          attrs: { type, number },
        }).run();
      }
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-border rounded-2xl bg-muted/10 h-[600px] animate-pulse" />
    );
  }

  return (
    <div className="group/editor flex flex-col w-full relative">
      {/* Sticky Toolbar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-1 border border-border bg-background/90 backdrop-blur-md p-1.5 rounded-xl mb-8 shadow-sm transition-all group-focus-within/editor:border-primary/30 group-focus-within/editor:shadow-md">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-6 bg-border mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-6 bg-border mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus className="h-4 w-4" />
        </MenuButton>

        <div className="w-px h-6 bg-border mx-1" />

        <MenuButton onClick={setLink} isActive={editor.isActive("link")} title="Link">
          <LinkIcon className="h-4 w-4" />
        </MenuButton>
        <MenuButton onClick={addImage} title="Image">
          <ImageIcon className="h-4 w-4" />
        </MenuButton>
        <MenuButton onClick={insertEIPCard} title="Insert EIP Card">
          <FileText className="h-4 w-4" />
        </MenuButton>

        <div className="ml-auto flex items-center gap-1 pr-1">
          <div className="flex items-center gap-3 px-3 mr-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 border-r border-border h-6">
            <span>{stats.words} words</span>
          </div>
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </MenuButton>
        </div>
      </div>

      {/* Bubble Menu (Inline Formatting) */}
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-0.5 border border-border bg-background rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in duration-200">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
          >
            <Bold className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
          >
            <Italic className="h-3.5 w-3.5" />
          </MenuButton>
          <MenuButton onClick={setLink} isActive={editor.isActive("link")}>
            <LinkIcon className="h-3.5 w-3.5" />
          </MenuButton>
          <div className="w-px h-4 bg-border mx-1" />
          <MenuButton
             onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
             isActive={editor.isActive("heading", { level: 2 })}
          >
            <Type className="h-3.5 w-3.5" />
          </MenuButton>
        </div>
      </BubbleMenu>

      {/* Floating Menu (Block selection on empty lines) */}
      <FloatingMenu editor={editor}>
        <div className="flex items-center gap-1 border border-border bg-background/80 backdrop-blur-md rounded-2xl shadow-xl p-1.5 animate-in slide-in-from-left-2 duration-300">
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className="rounded-xl px-3 hover:bg-primary/10 hover:text-primary"
          >
            <div className="flex items-center gap-2">
              <Heading2 className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Heading</span>
            </div>
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="rounded-xl px-3 hover:bg-primary/10 hover:text-primary"
          >
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">List</span>
            </div>
          </MenuButton>
          <MenuButton
            onClick={addImage}
            className="rounded-xl px-3 hover:bg-primary/10 hover:text-primary"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Image</span>
            </div>
          </MenuButton>
          <MenuButton
            onClick={insertEIPCard}
            className="rounded-xl px-3 hover:bg-primary/10 hover:text-primary"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">EIP Card</span>
            </div>
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className="rounded-xl px-3 hover:bg-primary/10 hover:text-primary"
          >
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Quote</span>
            </div>
          </MenuButton>
        </div>
      </FloatingMenu>

      <EditorContent editor={editor} />
    </div>
  );
}
