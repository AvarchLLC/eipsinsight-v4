"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft, Download, Copy, Check, Loader2, Search,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Info,
  Bold, Italic, Heading1, Heading2, Heading3, Code, Quote,
  List, ListOrdered, CheckSquare, Link2, Table, Minus, Columns2,
  Pencil, Eye, X, FileCode, BookOpen,
} from "lucide-react";
import NextLink from "next/link";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type EipType = "eip" | "erc" | "rip";
type ViewMode = "edit" | "output" | "split";
type TabMode = "new" | "import";

interface TemplateData {
  eip: string; title: string; description: string; author: string;
  discussionsTo: string; status: string; lastCallDeadline: string;
  type: string; category: string; created: string; requires: string;
  abstract: string; motivation: string; specification: string;
  rationale: string; backwardsCompatibility: string; testCases: string;
  referenceImplementation: string; securityConsiderations: string;
}

type TemplateKey = keyof TemplateData;

interface ValidationItem { summary: string; detail?: string; code?: string }

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const INITIAL_DATA: TemplateData = {
  eip: "<TBD>", title: "", description: "", author: "", discussionsTo: "",
  status: "Draft", lastCallDeadline: "", type: "", category: "", created: "",
  requires: "", abstract: "", motivation: "", specification: "",
  rationale: "TBD", backwardsCompatibility: "No backward compatibility issues found.",
  testCases: "", referenceImplementation: "", securityConsiderations: "Needs discussion.",
};

const INSTRUCTIONS: Record<string, string> = {
  eip: "EIP number",
  title: "The EIP title is a few words, not a complete sentence",
  description: "Description is one full (short) sentence",
  author: "Comma separated list: FirstName LastName (@GitHubUsername), FirstName LastName <foo@bar.com>, FirstName (@GitHubUsername)",
  discussionsTo: "The URL pointing to the official discussion thread",
  status: "Draft, Review, Last Call, Final, Stagnant, Withdrawn, Living",
  lastCallDeadline: "The date last call period ends on (only needed when status is Last Call)",
  type: "One of Standards Track, Meta, or Informational",
  category: "One of Core, Networking, Interface, or ERC (only for Standards Track EIPs)",
  created: "Date the EIP was created on (YYYY-MM-DD)",
  requires: "EIP number(s), comma-separated (Optional)",
  abstract: "A multi-sentence (short paragraph) technical summary. Someone should be able to read only the abstract to get the gist of what this specification does.",
  motivation: "(Optional) Clearly explain why the existing protocol specification is inadequate to address the problem that the EIP solves.",
  specification: "The technical specification should describe the syntax and semantics of any new feature in detail.",
  rationale: "Describe what motivated the design and why particular design decisions were made. Discuss alternate designs and related work.",
  backwardsCompatibility: "(Optional) Describe incompatibilities and their consequences. Explain how you propose to deal with them.",
  testCases: "(Optional) Test cases for consensus changes. Include input/expected output pairs.",
  referenceImplementation: "(Optional) Example implementation to assist understanding.",
  securityConsiderations: "Discuss security implications, risks, and how they are being addressed. Required for Final status.",
};

const STATUS_OPTIONS = ["Draft", "Review", "Last Call", "Final", "Stagnant", "Withdrawn", "Living"];

const TYPE_OPTIONS: Record<EipType, string[]> = {
  eip: ["Standards Track", "Meta", "Informational"],
  erc: ["Standards Track", "Meta"],
  rip: ["Standards Track", "Meta"],
};

const CATEGORY_OPTIONS: Record<EipType, string[]> = {
  eip: ["Core", "Networking", "Interface"],
  erc: ["ERC", "Interface"],
  rip: ["Core", "RRC", "Others"],
};

const SECTION_DEFS: Array<{ key: TemplateKey; label: string; heading: string }> = [
  { key: "abstract", label: "Abstract", heading: "Abstract" },
  { key: "motivation", label: "Motivation", heading: "Motivation" },
  { key: "specification", label: "Specification", heading: "Specification" },
  { key: "rationale", label: "Rationale", heading: "Rationale" },
  { key: "backwardsCompatibility", label: "Backwards Compatibility", heading: "Backwards Compatibility" },
  { key: "testCases", label: "Test Cases", heading: "Test Cases" },
  { key: "referenceImplementation", label: "Reference Implementation", heading: "Reference Implementation" },
  { key: "securityConsiderations", label: "Security Considerations", heading: "Security Considerations" },
];

const PARSE_PATTERNS: Record<string, RegExp> = {
  eip: /eip:\s*(\d+)/i,
  title: /title:\s*["']?(.*?)["']?$/im,
  description: /description:\s*(.*)/i,
  author: /author:\s*(.*)/i,
  discussionsTo: /discussions-to:\s*(.*)/i,
  status: /status:\s*(.*)/i,
  lastCallDeadline: /last-call-deadline:\s*(.*)/i,
  type: /type:\s*(.*)/i,
  category: /category:\s*(.*)/i,
  created: /created:\s*(.*)/i,
  requires: /requires:\s*(.*)/i,
  abstract: /## Abstract\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  motivation: /## Motivation\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  specification: /## Specification\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  rationale: /## Rationale\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  backwardsCompatibility: /## Backwards Compatibility\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  testCases: /## Test Cases\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  referenceImplementation: /## Reference Implementation\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  securityConsiderations: /## Security Considerations\s*\n([\s\S]*?)(?=\n##\s|$)/i,
};

// ──────────────────────────────────────────────
// Markdown toolbar buttons
// ──────────────────────────────────────────────
const MD_TOOLBAR = [
  { icon: Bold, label: "Bold", syntax: "**bold** " },
  { icon: Italic, label: "Italic", syntax: "*italic* " },
  { icon: Heading1, label: "H1", syntax: "# Heading 1\n" },
  { icon: Heading2, label: "H2", syntax: "## Heading 2\n" },
  { icon: Heading3, label: "H3", syntax: "### Heading 3\n" },
  { icon: Code, label: "Code", syntax: "`code` " },
  { icon: Quote, label: "Quote", syntax: "> quote\n" },
  { icon: List, label: "List", syntax: "- \n" },
  { icon: ListOrdered, label: "Numbered", syntax: "1. \n" },
  { icon: CheckSquare, label: "Checklist", syntax: "- [ ] item\n" },
  { icon: Link2, label: "Link", syntax: "[link](url) " },
  { icon: Table, label: "Table", syntax: "| Header | Header |\n|-------|-------|\n| Cell  | Cell  |\n" },
  { icon: Minus, label: "Divider", syntax: "---\n" },
];

// ──────────────────────────────────────────────
// Auto-linking helper
// ──────────────────────────────────────────────
function autoLinkReferences(text: string, repoType: EipType): string {
  let result = text;
  if (repoType === "eip") {
    result = result.replace(/\[EIP-(\d+)\]\(.*?eip-\d+\.md\)/gi, "EIP-$1");
    result = result.replace(/\b(EIP-(\d+))\b(?!\]\()/gi, (_, _full, num) => `[EIP-${num}](./eip-${num}.md)`);
  } else if (repoType === "erc") {
    // Auto-link EIP refs as external
    if (/\bEIP-\d+\b/i.test(result)) {
      result = result.replace(/(^|[^./\[\]])\b(EIP-(\d+))\b(?!\]\()/gi, (_, pre, _full, num) => `${pre}[EIP-${num}]`);
    }
    result = result.replace(/\[ERC-(\d+)\]\(.*?eip-\d+\.md\)/gi, "ERC-$1");
    result = result.replace(/\b(ERC-(\d+))\b(?!\]\()/gi, (_, _full, num) => `[ERC-${num}](./eip-${num}.md)`);
  } else {
    // RIP: external links for EIP/ERC refs
    if (/\bEIP-\d+\b/i.test(result)) {
      result = result.replace(/(^|[^./\[\]])\b(EIP-(\d+))\b(?!\]\()/gi, (_, pre, _full, num) => `${pre}[EIP-${num}](https://eips.ethereum.org/EIPS/eip-${num})`);
    }
    if (/\bERC-\d+\b/i.test(result)) {
      result = result.replace(/(^|[^./\[\]])\b(ERC-(\d+))\b(?!\]\()/gi, (_, pre, _full, num) => `${pre}[ERC-${num}](https://eips.ethereum.org/ERCS/erc-${num})`);
    }
    result = result.replace(/\[RIP-(\d+)\]\(.*?Rip-\d+\.md\)/gi, "RIP-$1");
    result = result.replace(/\b(RIP-(\d+))\b(?!\]\()/gi, (_, _full, num) => `[RIP-${num}](./Rip-${num}.md)`);
  }
  return result;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export default function EIPBuilderPage() {
  // ── State ──
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [repoType, setRepoType] = useState<EipType>("eip");
  const [tabMode, setTabMode] = useState<TabMode>("new");
  const [preview, setPreview] = useState(true);
  const [data, setData] = useState<TemplateData>({ ...INITIAL_DATA });
  const [markdownRaw, setMarkdownRaw] = useState("");
  const [lastEdited, setLastEdited] = useState<"form" | "code">("form");
  const [expandedSections, setExpandedSections] = useState<string[]>(["abstract"]);

  // Import
  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Validation
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationItem[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  // Clipboard
  const [copied, setCopied] = useState(false);

  // Refs for cursor-based markdown insert
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const codeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── URL hash state ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const parts = hash.split("#").filter(Boolean);
    if (parts[0]) setViewMode(parts[0] as ViewMode);
    if (parts[1]) setRepoType(parts[1] as EipType);
    if (parts[2]) setTabMode(parts[2] as TabMode);
    if (parts[3]) setImportQuery(parts[3]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.location.hash = `#${viewMode}#${repoType}#${tabMode}${importQuery ? `#${importQuery}` : ""}`;
  }, [viewMode, repoType, tabMode, importQuery]);

  // ── Reset on tab change ──
  useEffect(() => {
    if (tabMode === "new") {
      setData({ ...INITIAL_DATA });
      setValidated(false);
    }
    setImportQuery("");
    setImportError(null);
  }, [repoType, tabMode]);

  // ── Generate markdown from form data ──
  const generateMarkdown = useCallback((d: TemplateData): string => {
    const lines: string[] = ["---"];
    lines.push(`eip: ${d.eip}`);
    lines.push(`title: ${d.title}`);
    lines.push(`description: ${d.description}`);
    lines.push(`author: ${d.author}`);
    lines.push(`discussions-to: ${d.discussionsTo || "null"}`);
    lines.push(`status: ${d.status}`);
    if (d.lastCallDeadline) lines.push(`last-call-deadline: ${d.lastCallDeadline}`);
    lines.push(`type: ${d.type}`);
    if (d.type === "Standards Track" && d.category) lines.push(`category: ${d.category}`);
    lines.push(`created: ${d.created}`);

    // Requires
    const reqs = d.requires.split(",").map((s) => s.trim()).filter(Boolean);
    if (reqs.length === 1) {
      lines.push(`requires: ${reqs[0]}`);
    } else if (reqs.length > 1) {
      lines.push(`requires: ${reqs.join(", ")}`);
    }

    lines.push("---");
    lines.push("");

    for (const sec of SECTION_DEFS) {
      if (d[sec.key]?.trim()) {
        lines.push(`## ${sec.heading}`);
        lines.push("");
        lines.push(d[sec.key].trim());
        lines.push("");
      }
    }

    lines.push("## Copyright");
    lines.push("");
    lines.push("Copyright and related rights waived via [CC0](../LICENSE.md).");
    lines.push("");

    return lines.join("\n").replace(/\n{3,}/g, "\n\n");
  }, []);

  // ── Parse markdown back to form ──
  const parseMarkdownToForm = useCallback((md: string): Partial<TemplateData> => {
    const result: Partial<TemplateData> = {};
    for (const [key, pattern] of Object.entries(PARSE_PATTERNS)) {
      const match = md.match(pattern);
      if (match?.[1]) {
        let val = match[1].trim();
        if (key === "title") val = val.replace(/^["']|["']$/g, "").trim();
        if (key === "discussionsTo" && val === "null") val = "";
        result[key as TemplateKey] = val;
      }
    }
    return result;
  }, []);

  // ── Sync: form → markdown ──
  useEffect(() => {
    if (lastEdited === "form") {
      setMarkdownRaw(generateMarkdown(data));
    }
  }, [data, lastEdited, generateMarkdown]);

  // ── Sync: markdown → form (debounced) ──
  useEffect(() => {
    if (lastEdited !== "code") return;
    if (codeSyncTimer.current) clearTimeout(codeSyncTimer.current);
    codeSyncTimer.current = setTimeout(() => {
      const parsed = parseMarkdownToForm(markdownRaw);
      setData((prev) => ({ ...prev, ...parsed }));
    }, 400);
    return () => { if (codeSyncTimer.current) clearTimeout(codeSyncTimer.current); };
  }, [markdownRaw, lastEdited, parseMarkdownToForm]);

  // ── Form input change ──
  const handleInput = (key: TemplateKey, value: string) => {
    setLastEdited("form");
    setData((prev) => ({ ...prev, [key]: value }));
    setValidated(false);
  };

  // ── Markdown toolbar insert at cursor ──
  const insertMarkdown = (key: TemplateKey, syntax: string) => {
    const ref = textareaRefs.current[key];
    if (ref && ref.selectionStart !== undefined) {
      const start = ref.selectionStart;
      const end = ref.selectionEnd;
      const current = data[key] || "";
      const newVal = current.substring(0, start) + syntax + current.substring(end);
      setLastEdited("form");
      setData((prev) => ({ ...prev, [key]: newVal }));
      requestAnimationFrame(() => { ref.selectionStart = ref.selectionEnd = start + syntax.length; ref.focus(); });
    } else {
      setLastEdited("form");
      setData((prev) => ({ ...prev, [key]: `${prev[key] || ""}${syntax}` }));
    }
  };

  // ── Auto-link on space/period/tab ──
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, key: TemplateKey) => {
    if (e.key === " " || e.key === "." || e.key === "Tab") {
      const val = (e.target as HTMLTextAreaElement).value;
      const linked = autoLinkReferences(val, repoType);
      if (linked !== val) handleInput(key, linked);
    }
  };

  // ── Import ──
  const handleImport = async () => {
    const num = importQuery.replace(/[^0-9]/g, "");
    if (!num) { setImportError("Enter a valid number"); return; }

    setImporting(true); setImportError(null);
    const urls: Record<EipType, string> = {
      eip: `https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-${num}.md`,
      erc: `https://raw.githubusercontent.com/ethereum/ERCs/master/ERCS/erc-${num}.md`,
      rip: `https://raw.githubusercontent.com/ethereum/RIPs/master/RIPS/rip-${num}.md`,
    };

    try {
      const res = await fetch(urls[repoType]);
      if (!res.ok) throw new Error("not found");
      const md = await res.text();
      const parsed = parseMarkdownToForm(md);
      setData({ ...INITIAL_DATA, ...parsed });
      setLastEdited("form");
      setExpandedSections(SECTION_DEFS.filter((s) => parsed[s.key]?.trim()).map((s) => s.key));
    } catch {
      setImportError(`Could not find ${repoType.toUpperCase()}-${num}`);
    } finally { setImporting(false); }
  };

  // ── Validate ──
  const handleValidate = async () => {
    setValidating(true);
    const errors: ValidationItem[] = [];

    try {
      const res = await fetch("/api/validate-eip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownContent: markdownRaw }),
      });
      const result = await res.json();
      if (!result.success && result.messages) {
        for (const msg of result.messages) {
          errors.push({ summary: msg.message, detail: msg.message, code: msg.level });
        }
      }
    } catch (err) {
      errors.push({ summary: "Validation failed to run.", detail: String(err) });
    }

    setValidating(false);
    if (errors.length > 0) {
      setValidated(false);
      setValidationErrors(errors);
      setShowValidationDialog(true);
    } else {
      setValidated(true);
      setValidationErrors([]);
    }
  };

  // ── Download ──
  const handleDownload = () => {
    const blob = new Blob([markdownRaw], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repoType}-${data.eip === "<TBD>" ? "draft" : data.eip}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Copy ──
  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdownRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Toggle section ──
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  };

  // ── Preview: parse frontmatter into table rows ──
  const previewTableRows = useMemo(() => {
    const fmMatch = markdownRaw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return [];
    return fmMatch[1].split("\n").filter((l) => l.trim()).map((row) => {
      const m = row.match(/^([^:]+):\s*(.+)$/);
      return m ? [m[1].trim(), m[2].trim()] : [row.trim(), ""];
    });
  }, [markdownRaw]);

  const previewBody = useMemo(() => {
    const parts = markdownRaw.split(/---\n/);
    return parts.length > 2 ? parts.slice(2).join("---\n").trim() : "";
  }, [markdownRaw]);

  // ── Preamble fields ──
  const preambleFields = useMemo(() => [
    { key: "eip" as TemplateKey, label: "EIP", type: "input" as const, disabled: tabMode === "import", wide: false },
    { key: "title" as TemplateKey, label: "Title", type: "input" as const, disabled: false, wide: true },
    { key: "description" as TemplateKey, label: "Description", type: "input" as const, disabled: false, wide: true },
    { key: "author" as TemplateKey, label: "Author", type: "input" as const, disabled: false, wide: true },
    { key: "discussionsTo" as TemplateKey, label: "Discussions-To", type: "input" as const, disabled: false, wide: true },
    { key: "status" as TemplateKey, label: "Status", type: "select" as const, options: STATUS_OPTIONS, disabled: false, wide: false },
    { key: "lastCallDeadline" as TemplateKey, label: "Last-Call-Deadline", type: "input" as const, disabled: data.status !== "Last Call", wide: false },
    { key: "type" as TemplateKey, label: "Type", type: "select" as const, options: TYPE_OPTIONS[repoType], disabled: false, wide: false },
    { key: "category" as TemplateKey, label: "Category", type: "select" as const, options: CATEGORY_OPTIONS[repoType], disabled: data.type !== "Standards Track", wide: false },
    { key: "created" as TemplateKey, label: "Created", type: "input" as const, disabled: false, wide: false },
    { key: "requires" as TemplateKey, label: "Requires", type: "input" as const, disabled: false, wide: false },
  ], [tabMode, data.status, data.type, repoType]);

  const showEdit = viewMode === "edit" || viewMode === "split";
  const showOutput = viewMode === "output" || viewMode === "split";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-full px-4 py-2 sm:px-6 lg:px-8 xl:px-12">
          <NextLink href="/tools" className="mb-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />Tools
          </NextLink>
          <div className="flex flex-wrap items-center gap-2">
            {/* New / Import toggle */}
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button onClick={() => setTabMode("new")} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", tabMode === "new" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                New {repoType.toUpperCase()}
              </button>
              <button onClick={() => setTabMode("import")} className={cn("border-l border-border px-3 py-1.5 text-xs font-medium transition-colors", tabMode === "import" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                Import {repoType.toUpperCase()}
              </button>
            </div>

            {/* Import search */}
            {tabMode === "import" && (
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <input type="text" value={importQuery} onChange={(e) => setImportQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleImport()}
                    placeholder={`Enter ${repoType.toUpperCase()} number`}
                    className="w-40 rounded-lg border border-border bg-muted/60 py-1.5 pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  <button onClick={handleImport} disabled={importing} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Search className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />}
                  </button>
                </div>
                {importError && <span className="text-xs text-red-500">{importError}</span>}
              </div>
            )}

            {/* Repo selector */}
            <div className="ml-auto flex overflow-hidden rounded-lg border border-border">
              {(["eip", "erc", "rip"] as EipType[]).map((r) => (
                <button key={r} onClick={() => setRepoType(r)}
                  className={cn("px-3 py-1.5 text-xs font-medium transition-colors", r !== "eip" && "border-l border-border", repoType === r ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  {r.toUpperCase()}s
                </button>
              ))}
            </div>

            {/* View mode */}
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button onClick={() => setViewMode("split")} className={cn("px-2.5 py-1.5 text-xs transition-colors", viewMode === "split" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")} title="Split">
                <Columns2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode("edit")} className={cn("border-l border-border px-2.5 py-1.5 text-xs transition-colors", viewMode === "edit" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode("output")} className={cn("border-l border-border px-2.5 py-1.5 text-xs transition-colors", viewMode === "output" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")} title="Output">
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Split View ─── */}
      <div className={cn("flex flex-1 overflow-hidden", viewMode === "split" ? "flex-row" : "flex-col")}>
        {/* LEFT: Editor */}
        {showEdit && (
          <div className={cn("overflow-y-auto p-4 space-y-3", viewMode === "split" ? "w-1/2 border-r border-border" : "w-full")}>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
              Document {repoType === "eip" ? "an EIP" : repoType === "erc" ? "an ERC" : "a RIP"}
            </h2>

            {/* Preamble */}
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preamble</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {preambleFields.map((field) => (
                  <div key={field.key} className={cn(field.wide ? "md:col-span-2" : "")}>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      {field.label}
                      {INSTRUCTIONS[field.key] && (
                        <span title={INSTRUCTIONS[field.key]} className="cursor-help"><Info className="h-3 w-3 text-slate-500" /></span>
                      )}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={data[field.key]} onChange={(e) => handleInput(field.key, e.target.value)}
                        disabled={field.disabled}
                        className={cn("w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30", field.disabled && "opacity-40 cursor-not-allowed")}>
                        <option value="">Select...</option>
                        {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={data[field.key]} onChange={(e) => handleInput(field.key, e.target.value)}
                        disabled={field.disabled}
                        placeholder={
                          field.key === "created" ? "YYYY-MM-DD" :
                          field.key === "requires" ? "2537, 2935, ..." :
                          field.key === "author" ? "FirstName LastName (@GitHubUsername)" :
                          field.key === "discussionsTo" ? "https://ethereum-magicians.org/t/..." :
                          field.key === "lastCallDeadline" ? "YYYY-MM-DD" :
                          `Enter ${field.label.toLowerCase()}`
                        }
                        className={cn("w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30", field.disabled && "opacity-40 cursor-not-allowed")} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sections with markdown toolbar */}
            {SECTION_DEFS.map((sec) => {
              const isExpanded = expandedSections.includes(sec.key);
              return (
                <div key={sec.key} className="overflow-hidden rounded-xl border border-border bg-card/60">
                  <button onClick={() => toggleSection(sec.key)}
                    className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-primary/5">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {sec.label}
                      {data[sec.key]?.trim() && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    </span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <p className="mb-2 text-xs text-muted-foreground">{INSTRUCTIONS[sec.key]}</p>
                      {/* Toolbar */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {MD_TOOLBAR.map((btn) => {
                          const Icon = btn.icon;
                          return (
                            <button key={btn.label} onClick={() => insertMarkdown(sec.key, btn.syntax)} title={btn.label}
                              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        ref={(el) => { textareaRefs.current[sec.key] = el; }}
                        value={data[sec.key]}
                        onChange={(e) => handleInput(sec.key, e.target.value)}
                        onKeyDown={(e) => handleTextareaKeyDown(e, sec.key)}
                        rows={8}
                        placeholder={`Write your ${sec.label.toLowerCase()} here (markdown supported)...`}
                        className="w-full resize-y rounded-lg border border-border bg-muted/60 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* RIGHT: Output */}
        {showOutput && (
          <div className={cn("flex flex-col overflow-y-auto bg-muted/20", viewMode === "split" ? "w-1/2" : "w-full")}>
            {/* Toggle: Code / Preview */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm">
              <div className="flex overflow-hidden rounded-lg border border-border">
                <button onClick={() => setPreview(false)} className={cn("flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors", !preview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  <FileCode className="h-3.5 w-3.5" />Code
                </button>
                <button onClick={() => setPreview(true)} className={cn("border-l border-border px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-colors", preview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  <BookOpen className="h-3.5 w-3.5" />Preview
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <span className="text-[10px] text-muted-foreground">{markdownRaw.length} chars</span>
              </div>
            </div>

            <div className="flex-1 p-4">
              {preview ? (
                /* ── Preview mode ── */
                <div className="max-w-2xl mx-auto space-y-4">
                  {previewTableRows.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40">
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Field</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewTableRows.map(([field, value], i) => (
                            <tr key={i} className="border-t border-border/60 hover:bg-primary/5">
                              <td className="px-4 py-2 text-xs font-medium text-foreground/90">{field}</td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-card/60 p-6">
                    {previewBody.split("\n").map((line, i) => {
                      if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-2 first:mt-0">{line.replace("## ", "")}</h2>;
                      if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-slate-900 dark:text-white mt-4 mb-1">{line.replace("### ", "")}</h3>;
                      if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-2">{line.replace("# ", "")}</h1>;
                      if (line.startsWith("> ")) return <blockquote key={i} className="border-l-2 border-cyan-500/40 pl-3 text-slate-600 dark:text-slate-400 italic">{line.replace("> ", "")}</blockquote>;
                      if (line.startsWith("- ")) return <li key={i} className="text-sm text-slate-700 dark:text-slate-300 ml-4 list-disc">{line.replace("- ", "")}</li>;
                      if (line.startsWith("---")) return <hr key={i} className="border-slate-200 dark:border-slate-700/50 my-4" />;
                      if (!line.trim()) return <br key={i} />;
                      return <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{line}</p>;
                    })}
                  </div>
                </div>
              ) : (
                /* ── Code editor mode ── */
                <textarea
                  value={markdownRaw}
                  onChange={(e) => { setLastEdited("code"); setMarkdownRaw(e.target.value); setValidated(false); }}
                  className="h-full min-h-[600px] w-full resize-none rounded-xl border border-border bg-card/60 px-4 py-3 font-mono text-sm leading-relaxed text-foreground/90 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom Action Bar ─── */}
      <div className="border-t border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8 xl:px-12">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            {validated && <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Validated</span>}
            {validationErrors.length > 0 && !validated && (
              <button onClick={() => setShowValidationDialog(true)} className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />{validationErrors.length} error{validationErrors.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleValidate} disabled={validating}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50">
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Validate
            </button>
            <button onClick={handleDownload} disabled={!validated}
              className={cn("inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                validated ? "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15" : "cursor-not-allowed border border-border bg-muted/60 text-muted-foreground"
              )}>
              <Download className="h-4 w-4" />Download
            </button>
          </div>
        </div>
      </div>

      {/* ─── Validation Error Dialog ─── */}
      {showValidationDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowValidationDialog(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
              <h3 className="text-base font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />Validation Errors
              </h3>
              <button onClick={() => setShowValidationDialog(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {validationErrors.map((err, i) => (
                <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{err.summary}</p>
                      {err.detail && err.detail !== err.summary && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{err.detail}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end px-5 py-3 border-t border-slate-200 dark:border-slate-700/50">
              <button onClick={() => setShowValidationDialog(false)}
                className="px-4 py-2 text-sm font-medium text-slate-900 dark:text-white bg-red-500/20 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
