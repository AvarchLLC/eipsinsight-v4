'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  preamble?: {
    eip?: string;
    title?: string;
    status?: string;
    type?: string;
    category?: string;
    author?: string;
    created?: string;
    requires?: string;
    discussionsTo?: string;
  };
  skipPreamble?: boolean; // If true, don't render preamble table
  stripDuplicateHeaders?: boolean; // If true, remove headers matching the title
}

// Simple markdown parser (basic implementation)
function parseMarkdown(markdown: string): { body: string; frontmatter: Record<string, string> } {
  const frontmatter: Record<string, string> = {};
  let body = markdown;

  // Extract YAML frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const frontmatterText = frontmatterMatch[1];
    body = frontmatterMatch[2];

    // Parse YAML-like key-value pairs (handle hyphens in keys like "discussions-to")
    frontmatterText.split('\n').forEach(line => {
      const match = line.match(/^([\w-]+):\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/-/g, '_'); // Convert "discussions-to" to "discussions_to"
        let value = match[2].trim();
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        frontmatter[key] = value;
      }
    });
  }

  return { body, frontmatter };
}

// Convert proposal file links to internal routes
function convertProposalLinks(markdown: string): string {
  // Match patterns in markdown links: [text](./eip-5920.md) or [text](eip-5920.md)
  // Pattern: [optional text](optional ./)(eip|erc|rip)-(number).md
  return markdown.replace(
    /\[([^\]]*)\]\((\.\/)?(eip|erc|rip)-(\d+)\.md\)/gi,
    (match, linkText, dotSlash, repoType, number) => {
      const repo = repoType.toLowerCase();
      const internalRoute = `/${repo}/${number}`;
      // Preserve link text or use default
      const text = linkText || `${repoType.toUpperCase()}-${number}`;
      return `[${text}](${internalRoute})`;
    }
  );
}

// Convert markdown to HTML (improved implementation)
function markdownToHtml(markdown: string, stripDuplicateHeaders?: boolean, titleToStrip?: string): string {
  let html = markdown;
  
  // Convert proposal file links to internal routes first
  html = convertProposalLinks(html);
  
  // Strip duplicate title header if present
  if (stripDuplicateHeaders && titleToStrip) {
    // Remove # Title or ## Title that matches the proposal title
    const titleRegex = new RegExp(`^#+\\s+${titleToStrip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'gmi');
    html = html.replace(titleRegex, '');
  }

  // Theme-aware classes: light mode (readable on light bg) + dark mode
  const body = 'text-slate-700 dark:text-slate-300';
  const heading = 'text-slate-900 dark:text-white';
  const muted = 'text-slate-600 dark:text-slate-400';
  const link = 'text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200';
  const codeInline = 'bg-slate-200 dark:bg-slate-800/80 text-cyan-700 dark:text-cyan-300';
  const codeBlock = 'text-slate-800 dark:text-slate-300';
  const border = 'border-slate-300 dark:border-slate-700/50';

  // Code blocks first (to avoid processing inside code)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const escaped = code
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre class="bg-slate-100 dark:bg-slate-950/50 border ${border} rounded-lg p-4 overflow-x-auto my-6"><code class="text-sm ${codeBlock} font-mono leading-relaxed">${escaped}</code></pre>`;
  });

  // Inline code (after code blocks)
  html = html.replace(/`([^`\n]+)`/g, `<code class="${codeInline} px-1.5 py-0.5 rounded text-sm font-mono">$1</code>`);

  // Headers (with anchor IDs for navigation and section separators)
  const sectionHeaders = ['Abstract', 'Motivation', 'Specification', 'Rationale', 'Security Considerations', 'Backwards Compatibility', 'Test Cases', 'Reference Implementation'];
  
  html = html.replace(/^#### (.*$)/gim, (match, text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `<h4 id="${id}" class="text-lg font-semibold ${heading} mt-6 mb-3">${text}</h4>`;
  });
  html = html.replace(/^### (.*$)/gim, (match, text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `<h3 id="${id}" class="text-xl font-semibold ${heading} mt-8 mb-4">${text}</h3>`;
  });
  html = html.replace(/^## (.*$)/gim, (match, text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const isMajorSection = sectionHeaders.some(h => text.toLowerCase().includes(h.toLowerCase()));
    const separatorClass = isMajorSection ? 'mt-12 pt-8 border-t border-slate-300 dark:border-slate-700/30' : 'mt-10';
    return `<h2 id="${id}" class="text-2xl font-semibold ${heading} ${separatorClass} mb-5 border-b ${border} pb-2">${text}</h2>`;
  });
  html = html.replace(/^# (.*$)/gim, (match, text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `<h1 id="${id}" class="text-3xl font-bold ${heading} mt-12 mb-6">${text}</h1>`;
  });

  // Bold (process before italic to avoid conflicts)
  html = html.replace(/\*\*([^*]+)\*\*/g, `<strong class="font-semibold ${heading}">$1</strong>`);
  html = html.replace(/__(.+?)__/g, `<strong class="font-semibold ${heading}">$1</strong>`);

  // Italic - match single asterisks/underscores (simple approach)
  // Only match if not preceded/followed by same character
  html = html.replace(/\b\*([^*\n]+?)\*\b/g, `<em class="italic ${body}">$1</em>`);
  html = html.replace(/\b_([^_\n]+?)_\b/g, `<em class="italic ${body}">$1</em>`);

  // Links - convert proposal links to internal routes, external links open in new tab
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // Check if it's an internal proposal route (already converted)
    const isInternalRoute = /^\/(eip|erc|rip)\/\d+$/.test(url);
    // Check if it's an external URL
    const isExternal = /^(https?:\/\/|mailto:)/.test(url);
    
    if (isInternalRoute) {
      // Internal route - use Next.js Link behavior (client-side navigation)
      return `<a href="${url}" class="${link} underline transition-colors">${linkText}</a>`;
    } else if (isExternal) {
      // External link - open in new tab
      return `<a href="${url}" class="${link} underline transition-colors" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    } else {
      // Relative link or other - treat as external for safety
      return `<a href="${url}" class="${link} underline transition-colors" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    }
  });

  // Ordered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gim, `<li class="ml-6 ${body} mb-1">$2</li>`);
  
  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gim, `<li class="ml-6 ${body} mb-1">$1</li>`);

  // Wrap consecutive list items
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
    if (match.includes('</li>')) {
      return `<ul class="list-disc space-y-1 my-4 ml-4">${match}</ul>`;
    }
    return match;
  });

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gim, `<blockquote class="border-l-4 border-cyan-500/50 pl-4 my-4 italic ${muted}">$1</blockquote>`);

  // Horizontal rules
  html = html.replace(/^---$/gim, `<hr class="${border} my-8" />`);

  // Paragraphs (split by double newlines, but preserve existing HTML)
  const lines = html.split('\n');
  const processed: string[] = [];
  let currentPara: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // If line is empty, flush current paragraph
    if (!trimmed) {
      if (currentPara.length > 0) {
        const paraText = currentPara.join(' ');
        if (paraText && !paraText.match(/^<[h|u|o|l|p|d|b|t]/)) {
          processed.push(`<p class="${body} leading-relaxed mb-4">${paraText}</p>`);
        } else {
          processed.push(paraText);
        }
        currentPara = [];
      }
      continue;
    }

    // If line starts with HTML tag, flush and add as-is
    if (trimmed.match(/^<[h|u|o|l|p|d|b|t|h]/)) {
      if (currentPara.length > 0) {
        const paraText = currentPara.join(' ');
        if (paraText && !paraText.match(/^<[h|u|o|l|p|d|b|t]/)) {
          processed.push(`<p class="${body} leading-relaxed mb-4">${paraText}</p>`);
        } else {
          processed.push(paraText);
        }
        currentPara = [];
      }
      processed.push(trimmed);
    } else {
      currentPara.push(trimmed);
    }
  }

  // Flush remaining paragraph
  if (currentPara.length > 0) {
    const paraText = currentPara.join(' ');
    if (paraText && !paraText.match(/^<[h|u|o|l|p|d|b|t]/)) {
      processed.push(`<p class="${body} leading-relaxed mb-4">${paraText}</p>`);
    } else {
      processed.push(paraText);
    }
  }

  return processed.join('\n');
}

export function MarkdownRenderer({ content, preamble, skipPreamble = false, stripDuplicateHeaders = false }: MarkdownRendererProps) {
  const { body, frontmatter } = parseMarkdown(content);
  const titleToStrip = preamble?.title || frontmatter.title;
  const html = markdownToHtml(body, stripDuplicateHeaders, titleToStrip);

  // Merge preamble with frontmatter (preamble takes precedence)
  const metadata = { ...frontmatter, ...preamble };

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      {/* Preamble Table */}
      {!skipPreamble && metadata && (
        <div className="mb-10 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-950/30">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {metadata.eip && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">EIP</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-white font-mono">{metadata.eip}</td>
                </tr>
              )}
              {metadata.title && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">Title</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-white">{metadata.title}</td>
                </tr>
              )}
              {metadata.status && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">Status</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-white">{metadata.status}</td>
                </tr>
              )}
              {metadata.type && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">Type</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-white">{metadata.type}</td>
                </tr>
              )}
              {metadata.category && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">Category</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-white">{metadata.category}</td>
                </tr>
              )}
              {metadata.author && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">Author</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-white">{metadata.author}</td>
                </tr>
              )}
              {metadata.created && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">Created</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-white">{metadata.created}</td>
                </tr>
              )}
              {metadata.requires && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">Requires</td>
                  <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-white">{metadata.requires}</td>
                </tr>
              )}
              {metadata.discussionsTo && (
                <tr>
                  <td className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-900/50 w-36 align-top">Discussions-To</td>
                  <td className="px-5 py-3.5 text-sm">
                    <a href={metadata.discussionsTo} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200 transition-colors break-all">
                      {metadata.discussionsTo}
                    </a>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Markdown Body - Article Format */}
      <article 
        className="markdown-content max-w-4xl mx-auto"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          lineHeight: '1.75',
        }}
      />
      
      {/* Section anchor links - visible in both light and dark */}
      <style jsx>{`
        .markdown-content h2[id],
        .markdown-content h3[id],
        .markdown-content h4[id] {
          position: relative;
        }
        .markdown-content h2[id]:hover::before,
        .markdown-content h3[id]:hover::before,
        .markdown-content h4[id]:hover::before {
          content: '#';
          position: absolute;
          left: -1.5rem;
          color: rgba(100, 116, 139, 0.55);
          font-weight: normal;
        }
      `}</style>
    </div>
  );
}
