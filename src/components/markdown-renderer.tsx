'use client';

import React, { type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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
  skipPreamble?: boolean;
  stripDuplicateHeaders?: boolean;
  collapsibleSections?: boolean;
}

interface MarkdownSection {
  title: string;
  body: string;
}

function parseMarkdown(markdown: string): { body: string; frontmatter: Record<string, string> } {
  const frontmatter: Record<string, string> = {};
  let body = markdown;

  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const frontmatterText = frontmatterMatch[1];
    body = frontmatterMatch[2];

    frontmatterText.split('\n').forEach((line) => {
      const match = line.match(/^([\w-]+):\s*(.+)$/);
      if (!match) return;

      const key = match[1].toLowerCase().replace(/-/g, '_');
      let value = match[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    });
  }

  return { body, frontmatter };
}

function convertProposalLinks(markdown: string): string {
  return markdown.replace(
    /\[([^\]]*)\]\((\.\/)?(eip|erc|rip)-(\d+)\.md\)/gi,
    (_match, linkText, _dotSlash, repoType, number) => {
      const repo = repoType.toLowerCase();
      const internalRoute = `/${repo}/${number}`;
      const text = linkText || `${repoType.toUpperCase()}-${number}`;
      return `[${text}](${internalRoute})`;
    }
  );
}

function stripTitleHeaders(markdown: string, title?: string): string {
  if (!title) return markdown;
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titleRegex = new RegExp(`^#{1,2}\\s+${escapedTitle}\\s*$`, 'gim');
  return markdown.replace(titleRegex, '');
}

function splitByH2Sections(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: MarkdownSection[] = [];
  let currentTitle = 'Overview';
  let currentLines: string[] = [];
  let hasH2 = false;

  const pushCurrent = () => {
    const body = currentLines.join('\n').trim();
    if (!body) return;
    sections.push({ title: currentTitle, body });
  };

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)\s*$/);
    if (match) {
      hasH2 = true;
      pushCurrent();
      currentTitle = match[1].trim();
      currentLines = [];
      continue;
    }
    currentLines.push(line);
  }

  pushCurrent();

  if (!hasH2 || sections.length === 0) {
    const fallback = markdown.trim();
    if (!fallback) return [];
    return [{ title: 'Specification', body: fallback }];
  }

  return sections;
}

function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (React.isValidElement<{ children?: ReactNode }>(children)) {
    return extractText(children.props.children);
  }
  return '';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseHeadingTextAndId(children: ReactNode) {
  const rawText = extractText(children).trim();
  const customIdMatch = rawText.match(/^(.*?)\s*\{#([a-zA-Z0-9_-]+)\}\s*$/);
  if (customIdMatch) {
    return {
      text: customIdMatch[1].trim(),
      id: customIdMatch[2].trim(),
    };
  }
  return { text: rawText, id: slugify(rawText) };
}

const markdownComponents: Components = {
  h1: ({ children, ...props }) => {
    const parsed = parseHeadingTextAndId(children);
    return (
      <h1 id={parsed.id} className="dec-title mt-8 mb-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl" {...props}>
        {parsed.text}
      </h1>
    );
  },
  h2: ({ children, ...props }) => {
    const parsed = parseHeadingTextAndId(children);
    return (
      <h2
        id={parsed.id}
        className="dec-title mt-10 mb-3 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        {...props}
      >
        {parsed.text}
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    const parsed = parseHeadingTextAndId(children);
    return (
      <h3 id={parsed.id} className="mt-8 mb-2 text-lg font-semibold text-foreground" {...props}>
        {parsed.text}
      </h3>
    );
  },
  h4: ({ children, ...props }) => {
    const parsed = parseHeadingTextAndId(children);
    return (
      <h4 id={parsed.id} className="mt-6 mb-2 text-base font-semibold text-foreground" {...props}>
        {parsed.text}
      </h4>
    );
  },
  p: ({ children, ...props }) => (
    <p className="mb-4 text-sm leading-relaxed text-foreground/90 sm:text-base" {...props}>
      {children}
    </p>
  ),
  a: ({ href, children, ...props }) => {
    const url = href ?? '';
    const isInternalRoute = /^\/(eip|erc|rip)\/\d+$/.test(url);
    const isExternal = /^(https?:\/\/|mailto:)/.test(url);
    const isHashLink = url.startsWith('#');
    const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isHashLink) return;
      const id = url.slice(1);
      const element = document.getElementById(id);
      if (!element) return;
      event.preventDefault();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
    };

    return (
      <a
        href={url}
        className="text-primary underline transition-colors hover:text-primary/80"
        target={isExternal && !isInternalRoute ? '_blank' : undefined}
        rel={isExternal && !isInternalRoute ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        {...props}
      >
        {children}
      </a>
    );
  },
  ul: ({ children, ...props }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-sm text-foreground/90 sm:text-base" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1 text-sm text-foreground/90 sm:text-base" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-4 border-l-2 border-primary/40 pl-4 text-sm italic text-muted-foreground sm:text-base"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="my-8 border-border" {...props} />,
  code: ({ className, children, ...props }) => {
    const language = className?.replace('language-', '');
    const value = String(children).replace(/\n$/, '');

    if (!language) {
      return (
        <code
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="my-6 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
        <code className="font-mono text-sm leading-relaxed text-foreground" {...props}>
          {value}
        </code>
      </pre>
    );
  },
  table: ({ children, ...props }) => (
    <div className="my-6 w-full overflow-x-auto rounded-xl border border-border bg-card/60">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/40" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border-b border-border px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-b border-border/60 px-4 py-2 text-sm text-foreground" {...props}>
      {children}
    </td>
  ),
};

export function MarkdownRenderer({
  content,
  preamble,
  skipPreamble = false,
  stripDuplicateHeaders = false,
  collapsibleSections = false,
}: MarkdownRendererProps) {
  const { body, frontmatter } = parseMarkdown(content);
  const titleToStrip = preamble?.title || frontmatter.title;
  const processedContent = convertProposalLinks(
    stripDuplicateHeaders ? stripTitleHeaders(body, titleToStrip) : body
  );

  const metadata = { ...frontmatter, ...preamble };

  return (
    <div className="max-w-none">
      {!skipPreamble && metadata && (
        <div className="mb-10 overflow-hidden rounded-xl border border-border bg-card/60">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-border/70">
              {metadata.eip && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">EIP</td>
                  <td className="px-5 py-3.5 font-mono text-sm text-foreground">{metadata.eip}</td>
                </tr>
              )}
              {metadata.title && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{metadata.title}</td>
                </tr>
              )}
              {metadata.status && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{metadata.status}</td>
                </tr>
              )}
              {metadata.type && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{metadata.type}</td>
                </tr>
              )}
              {metadata.category && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{metadata.category}</td>
                </tr>
              )}
              {metadata.author && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Author</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{metadata.author}</td>
                </tr>
              )}
              {metadata.created && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{metadata.created}</td>
                </tr>
              )}
              {metadata.requires && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Requires</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{metadata.requires}</td>
                </tr>
              )}
              {metadata.discussionsTo && (
                <tr>
                  <td className="w-36 align-top bg-muted/50 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Discussions-To</td>
                  <td className="px-5 py-3.5 text-sm">
                    <a
                      href={metadata.discussionsTo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-primary transition-colors hover:text-primary/80"
                    >
                      {metadata.discussionsTo}
                    </a>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {collapsibleSections ? (
        <div className="space-y-3">
          {splitByH2Sections(processedContent).map((section, index) => (
            <details
              key={`${section.title}-${index}`}
              open={index === 0}
              className="overflow-hidden rounded-xl border border-border bg-card/45"
            >
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{index + 1}.</span>
                  {section.title}
                </span>
              </summary>
              <article className="markdown-content max-w-none border-t border-border/70 px-4 py-4" style={{ lineHeight: "1.75" }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                >
                  {section.body}
                </ReactMarkdown>
              </article>
            </details>
          ))}
        </div>
      ) : (
        <article className="markdown-content max-w-none" style={{ lineHeight: "1.75" }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {processedContent}
          </ReactMarkdown>
        </article>
      )}

      <style jsx>{`
        .markdown-content :global(h2[id]),
        .markdown-content :global(h3[id]),
        .markdown-content :global(h4[id]) {
          position: relative;
        }
        .markdown-content :global(h2[id]:hover::before),
        .markdown-content :global(h3[id]:hover::before),
        .markdown-content :global(h4[id]:hover::before) {
          content: '#';
          position: absolute;
          left: -1.5rem;
          color: hsl(var(--muted-foreground) / 0.55);
          font-weight: normal;
        }
      `}</style>
    </div>
  );
}
