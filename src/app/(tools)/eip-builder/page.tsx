/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft, Download, Copy, Check, Loader2, Search,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Info,
  Bold, Italic, Heading1, Heading2, Heading3, Code, Quote,
  List, ListOrdered, CheckSquare, Link2, Table, Minus, Columns2,
  Pencil, Eye, X, FileCode, BookOpen, GitPullRequest, ExternalLink,
} from "lucide-react";
import NextLink from "next/link";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown-renderer";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type EipType = "eip" | "erc" | "rip";
type ViewMode = "edit" | "output" | "split";
type TabMode = "new" | "import" | "pr";

interface ImportedPrInfo {
  prNumber: number;
  prTitle: string;
  prAuthor?: string;
  prUrl: string;
  filename: string;
}

interface TemplateData {
  eip: string; title: string; description: string; author: string;
  discussionsTo: string; status: string; lastCallDeadline: string;
  type: string; category: string; created: string; requires: string;
  withdrawalReason: string;
  abstract: string; motivation: string; specification: string;
  rationale: string; backwardsCompatibility: string; testCases: string;
  referenceImplementation: string; securityConsiderations: string;
}

interface ValidationItem { summary: string; detail?: string; code?: string; section?: string; field?: string }

// ── Validation Checklist Definitions ──
const VALIDATION_CHECKS = [
  { id: "preamble", label: "Preamble & Frontmatter", desc: "Checks field ordering, required keys, formatting, and constraints" },
  { id: "title_desc", label: "Title & Description", desc: "Title Case, length limits (≤44 & ≤140), and verb checks" },
  { id: "authors_disc", label: "Author & Discussions-To", desc: "Validates GitHub handle/email and Magicians URL" },
  { id: "sections", label: "Sections & Structure", desc: "Verifies section sequence, CC0 copyright, and completeness" },
  { id: "normative", label: "RFC 2119 / Normative Language", desc: "Checks keywords scope (MUST/SHOULD) and RFC boilerplate notice" },
  { id: "prose_links", label: "Prose, Links & Quality", desc: "Validates EIP-N format, disallowed links, no LaTeX, no TODO markers" },
];

type TemplateKey = keyof TemplateData;

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const INITIAL_DATA: TemplateData = {
  eip: "<TBD>", title: "", description: "", author: "", discussionsTo: "",
  status: "Draft", lastCallDeadline: "", type: "", category: "", created: "",
  requires: "", withdrawalReason: "",
  abstract: "", motivation: "", specification: "",
  rationale: "TBD", backwardsCompatibility: "No backward compatibility issues found.",
  testCases: "", referenceImplementation: "", securityConsiderations: "Needs discussion.",
};

const INSTRUCTIONS: Record<string, string> = {
  eip: "EIP number (use placeholder until editor assigns one)",
  title: "A few words in Title Case, ≤44 characters. No EIP number, no word \"standard\"",
  description: "One full (short) sentence, ≤140 characters. No colon, no \"standard\"",
  author: "Name (@GitHubUsername), Name <email@example.com> — at least one handle or email required",
  discussionsTo: "Must be an Ethereum Magicians topic URL (https://ethereum-magicians.org/t/...)",
  status: "Draft, Review, Last Call, Final, Stagnant, Withdrawn, Living",
  lastCallDeadline: "Required when status is Last Call (YYYY-MM-DD)",
  type: "One of Standards Track, Meta, or Informational",
  category: "One of Core, Networking, Interface, or ERC (only for Standards Track EIPs)",
  created: "Date the EIP was created on (YYYY-MM-DD)",
  requires: "EIP number(s), comma-separated, in ascending order (Optional)",
  withdrawalReason: "Required when status is Withdrawn — explain why",
  abstract: "A short technical paragraph. No normative keywords (MUST/SHOULD/MAY). Someone should grasp the gist from the abstract alone.",
  motivation: "(Optional) The problem, not the solution. Written for a reader years from now who needs to know why this change was made.",
  specification: "Everything an implementer needs. Start with RFC 2119 boilerplate if using MUST/SHOULD/MAY keywords.",
  rationale: "Why each design decision was made. Alternatives considered, prior art cited. \"TBD\" tolerated in Draft.",
  backwardsCompatibility: "(Optional) Required if the proposal introduces any incompatibility. Describe each one and how it is handled.",
  testCases: "(Optional, required for consensus changes before Final). Include input/expected output pairs.",
  referenceImplementation: "(Optional) Points at code in assets/ or at a permitted permalink.",
  securityConsiderations: "Must be specific to this proposal. Generic text like \"no new risks\" is insufficient. Required for Final.",
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
  withdrawalReason: /withdrawal-reason:\s*(.*)/i,
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
  const [importedPrInfo, setImportedPrInfo] = useState<ImportedPrInfo | null>(null);

  // Validation
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeCheckStep, setActiveCheckStep] = useState<number>(-1);
  const [validationErrors, setValidationErrors] = useState<ValidationItem[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  // Clipboard
  const [copied, setCopied] = useState(false);

  // Refs for cursor-based markdown insert
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const codeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group validation issues by field/section
  const issuesByTarget = useMemo(() => {
    const map: Record<string, ValidationItem[]> = {};
    for (const err of validationErrors) {
      if (err.field) {
        const k = err.field.toLowerCase();
        if (!map[k]) map[k] = [];
        map[k].push(err);
      }
      if (err.section) {
        const s = err.section.toLowerCase();
        if (!map[s]) map[s] = [];
        map[s].push(err);
      }
    }
    return map;
  }, [validationErrors]);

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

    // Withdrawal reason
    if (d.status === "Withdrawn" && d.withdrawalReason?.trim()) {
      lines.push(`withdrawal-reason: ${d.withdrawalReason.trim()}`);
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
      const selected = current.substring(start, end);

      let insertion = syntax;
      if (selected) {
        if (syntax === "**bold** ") insertion = `**${selected}**`;
        else if (syntax === "*italic* ") insertion = `*${selected}*`;
        else if (syntax === "`code` ") insertion = `\`${selected}\``;
        else if (syntax === "[link](url) ") insertion = `[${selected}](url)`;
      }

      const newVal = current.substring(0, start) + insertion + current.substring(end);
      setLastEdited("form");
      setData((prev) => ({ ...prev, [key]: newVal }));
      requestAnimationFrame(() => { ref.selectionStart = ref.selectionEnd = start + insertion.length; ref.focus(); });
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

  // ── Import PR ──
  const handleImportPR = async () => {
    const prNum = importQuery.replace(/[^0-9]/g, "");
    if (!prNum) { setImportError("Enter a valid PR number"); return; }

    setImporting(true); setImportError(null);
    try {
      const res = await fetch(`/api/eip-builder/import-pr?repo=${repoType}&pr=${prNum}`);
      const dataJson = await res.json();
      if (!res.ok || !dataJson.success) {
        throw new Error(dataJson.error || `Could not find PR #${prNum}`);
      }
      const parsed = parseMarkdownToForm(dataJson.markdownContent);
      setData({ ...INITIAL_DATA, ...parsed });
      setLastEdited("form");
      setExpandedSections(SECTION_DEFS.filter((s) => parsed[s.key]?.trim()).map((s) => s.key));
      setImportedPrInfo({
        prNumber: dataJson.prNumber,
        prTitle: dataJson.prTitle,
        prAuthor: dataJson.prAuthor,
        prUrl: dataJson.prUrl,
        filename: dataJson.filename,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to load PR #${prNum}`;
      setImportError(msg);
    } finally {
      setImporting(false);
    }
  };

  // ── Import standard by number ──
  const handleImport = async () => {
    if (tabMode === "pr") {
      return handleImportPR();
    }
    const num = importQuery.replace(/[^0-9]/g, "");
    if (!num) { setImportError("Enter a valid number"); return; }

    setImporting(true); setImportError(null);
    const urls: Record<EipType, string> = {
      eip: `https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-${num}.md`,
      erc: `https://raw.githubusercontent.com/ethereum/ERCs/master/ERCS/erc-${num}.md`,
      rip: `https://raw.githubusercontent.com/ethereum/RIPs/master/RIPS/rip-${num}.md`,
    };

    try {
      let activeRepo = repoType;
      let res = await fetch(urls[activeRepo]);

      // If in EIP mode, check if the standard was moved to ERC or 404s
      if (activeRepo === "eip") {
        if (res.ok) {
          const testText = await res.clone().text();
          // Detect moved stub: "status: Moved" or "This file was moved to ... ercs"
          if (/status:\s*Moved/i.test(testText) || /ethereum\/ercs/i.test(testText)) {
            const ercRes = await fetch(urls.erc);
            if (ercRes.ok) {
              res = ercRes;
              activeRepo = "erc";
              setRepoType("erc");
            }
          }
        } else {
          // If 404 in EIPs repo, check if it lives in ERCs
          const ercRes = await fetch(urls.erc);
          if (ercRes.ok) {
            res = ercRes;
            activeRepo = "erc";
            setRepoType("erc");
          }
        }
      }

      if (!res.ok) throw new Error("not found");
      const md = await res.text();
      const parsed = parseMarkdownToForm(md);
      setData({ ...INITIAL_DATA, ...parsed });
      setLastEdited("form");
      setExpandedSections(SECTION_DEFS.filter((s) => parsed[s.key]?.trim()).map((s) => s.key));
      setImportedPrInfo(null);
    } catch {
      setImportError(`Could not find ${repoType.toUpperCase()}-${num}`);
    } finally { setImporting(false); }
  };

  // ── Validate ──
  const handleValidate = async () => {
    setValidating(true);
    setShowValidationDialog(true);
    setActiveCheckStep(0);
    const errors: ValidationItem[] = [];

    // Step animation for clear visual inspection
    const stepInterval = setInterval(() => {
      setActiveCheckStep((prev) => (prev < VALIDATION_CHECKS.length - 1 ? prev + 1 : prev));
    }, 220);

    try {
      const res = await fetch("/api/validate-eip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownContent: markdownRaw }),
      });
      const result = await res.json();
      if (result.messages && result.messages.length > 0) {
        for (const msg of result.messages) {
          errors.push({
            summary: msg.message,
            detail: msg.field ? `Field / Scope: ${msg.field}` : msg.section,
            code: msg.level,
            section: msg.section,
            field: msg.field,
          });
        }
      }
    } catch (err) {
      errors.push({ summary: "Validation failed to run.", detail: String(err), code: "error" });
    } finally {
      clearInterval(stepInterval);
      setActiveCheckStep(VALIDATION_CHECKS.length);
      setValidating(false);
    }

    const hasHardErrors = errors.some((e) => e.code === "error");
    if (hasHardErrors) {
      setValidated(false);
      setValidationErrors(errors);
    } else {
      setValidated(true);
      setValidationErrors(errors);
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
    { key: "withdrawalReason" as TemplateKey, label: "Withdrawal Reason", type: "input" as const, disabled: data.status !== "Withdrawn", wide: true },
  ], [tabMode, data.status, data.type, repoType]);

  const showEdit = viewMode === "edit" || viewMode === "split";
  const showOutput = viewMode === "output" || viewMode === "split";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ─── Top Bar ─── */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-full px-4 py-2 sm:px-6 lg:px-8 xl:px-12">
          <NextLink href="/tools" className="mb-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />Tools
          </NextLink>
          <div className="flex flex-wrap items-center gap-2">
            {/* New / Import / PR toggle */}
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button onClick={() => setTabMode("new")} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", tabMode === "new" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                New {repoType.toUpperCase()}
              </button>
              <button onClick={() => setTabMode("import")} className={cn("border-l border-border px-3 py-1.5 text-xs font-medium transition-colors", tabMode === "import" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                Import {repoType.toUpperCase()}
              </button>
              <button onClick={() => setTabMode("pr")} className={cn("border-l border-border px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors", tabMode === "pr" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}>
                <GitPullRequest className="h-3 w-3" />
                Review PR
              </button>
            </div>

            {/* Import / PR search */}
            {(tabMode === "import" || tabMode === "pr") && (
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={importQuery}
                    onChange={(e) => setImportQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleImport()}
                    placeholder={tabMode === "pr" ? `Enter PR # (e.g. 12449)` : `Enter ${repoType.toUpperCase()} number`}
                    className="w-48 rounded-lg border border-border bg-muted/60 py-1.5 pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button onClick={handleImport} disabled={importing} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Search className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />}
                  </button>
                </div>
                {importError && <span className="text-xs text-red-500 max-w-xs truncate" title={importError}>{importError}</span>}
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

            {/* Validate & Download in Topbar */}
            <div className="flex items-center gap-2 pl-1 border-l border-border/80">
              {validationErrors.length > 0 && !validated && (
                <button
                  onClick={() => setShowValidationDialog(true)}
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{validationErrors.length} issue{validationErrors.length > 1 ? "s" : ""}</span>
                </button>
              )}
              {validated && validationErrors.length === 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Ready</span>
                </span>
              )}
              <button
                onClick={handleValidate}
                disabled={validating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>Validate</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={!validated}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  validated
                    ? "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                    : "cursor-not-allowed border border-border bg-muted/60 text-muted-foreground opacity-60"
                )}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Split View (Independent Fixed Scroll) ─── */}
      <div className={cn("flex flex-1 min-h-0 overflow-hidden", viewMode === "split" ? "flex-row" : "flex-col")}>
        {/* LEFT: Editor */}
        {showEdit && (
          <div className={cn("h-full overflow-y-auto p-4 space-y-3", viewMode === "split" ? "w-1/2 border-r border-border" : "w-full")}>
            <div className="flex items-center justify-between">
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
                Document {repoType === "eip" ? "an EIP" : repoType === "erc" ? "an ERC" : "a RIP"}
              </h2>
              {importedPrInfo && (
                <a
                  href={importedPrInfo.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  <span>PR #{importedPrInfo.prNumber}: {importedPrInfo.filename}</span>
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              )}
            </div>

            {/* Preamble */}
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preamble</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {preambleFields.map((field) => {
                  const fieldIssues = issuesByTarget[field.key.toLowerCase()] || [];
                  const hasError = fieldIssues.some((i) => i.code === "error");
                  const hasWarning = fieldIssues.some((i) => i.code === "warning");

                  return (
                    <div key={field.key} className={cn(field.wide ? "md:col-span-2" : "")}>
                      <div className="flex items-center justify-between mb-1">
                        <label className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          hasError ? "text-red-600 dark:text-red-400 font-semibold" : hasWarning ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                          {field.label}
                          {INSTRUCTIONS[field.key] && (
                            <span title={INSTRUCTIONS[field.key]} className="cursor-help"><Info className="h-3 w-3 text-slate-500" /></span>
                          )}
                          {hasError && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />}
                          {!hasError && hasWarning && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
                        </label>
                        {field.key === "title" && (
                          <span className={cn("text-[10px]", data.title.length > 44 ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                            {data.title.length}/44
                          </span>
                        )}
                        {field.key === "description" && (
                          <span className={cn("text-[10px]", data.description.length > 140 ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                            {data.description.length}/140
                          </span>
                        )}
                      </div>
                      {field.type === "select" ? (
                        <select
                          value={data[field.key]} onChange={(e) => handleInput(field.key, e.target.value)}
                          disabled={field.disabled}
                          className={cn(
                            "w-full rounded-lg border bg-muted/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1",
                            hasError
                              ? "border-red-500/60 ring-1 ring-red-500/20"
                              : hasWarning
                              ? "border-amber-500/60 ring-1 ring-amber-500/20"
                              : "border-border focus:ring-primary/30",
                            field.disabled && "opacity-40 cursor-not-allowed"
                          )}>
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
                            field.key === "withdrawalReason" ? "Reason for withdrawing this proposal..." :
                            `Enter ${field.label.toLowerCase()}`
                          }
                          className={cn(
                            "w-full rounded-lg border bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1",
                            hasError
                              ? "border-red-500/60 ring-1 ring-red-500/20"
                              : hasWarning
                              ? "border-amber-500/60 ring-1 ring-amber-500/20"
                              : "border-border focus:ring-primary/30",
                            field.disabled && "opacity-40 cursor-not-allowed"
                          )} />
                      )}
                      {fieldIssues.length > 0 && (
                        <p className={cn("text-[10px] mt-1 font-medium", hasError ? "text-red-500" : "text-amber-500")}>
                          {fieldIssues[0].summary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sections with markdown toolbar */}
            {SECTION_DEFS.map((sec) => {
              const isExpanded = expandedSections.includes(sec.key);
              const secIssues = issuesByTarget[sec.key.toLowerCase()] || issuesByTarget[sec.heading.toLowerCase()] || [];
              const hasError = secIssues.some((i) => i.code === "error");
              const hasWarning = secIssues.some((i) => i.code === "warning");

              return (
                <div
                  key={sec.key}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-card/60 transition-colors",
                    hasError
                      ? "border-red-500/50 bg-red-500/[0.02]"
                      : hasWarning
                      ? "border-amber-500/50 bg-amber-500/[0.02]"
                      : "border-border"
                  )}
                >
                  <button onClick={() => toggleSection(sec.key)}
                    className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-primary/5">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {sec.label}
                      {data[sec.key]?.trim() && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                      {hasError && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-semibold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                          <AlertCircle className="h-3 w-3" /> Issue
                        </span>
                      )}
                      {!hasError && hasWarning && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          <AlertCircle className="h-3 w-3" /> Advisory
                        </span>
                      )}
                    </span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <p className="mb-2 text-xs text-muted-foreground">{INSTRUCTIONS[sec.key]}</p>
                      {secIssues.length > 0 && (
                        <div className="mb-2.5 p-2 rounded-lg bg-muted/70 border border-border text-xs space-y-1">
                          {secIssues.map((issue, idx) => (
                            <p key={idx} className={cn("text-[11px] font-medium flex items-center gap-1.5", issue.code === "error" ? "text-red-500" : "text-amber-500")}>
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span>{issue.summary}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {/* Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                        <div className="flex flex-wrap gap-1">
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
                        {sec.key === "specification" && !data.specification.includes("RFC 2119") && (
                          <button
                            type="button"
                            onClick={() => {
                              const boilerplate = `The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174).\n\n`;
                              handleInput("specification", boilerplate + (data.specification || ""));
                            }}
                            className="text-[11px] font-medium text-primary hover:underline px-2 py-1 rounded bg-primary/10 border border-primary/20"
                          >
                            + Insert RFC 2119/8174 Notice
                          </button>
                        )}
                      </div>
                      <textarea
                        ref={(el) => { textareaRefs.current[sec.key] = el; }}
                        value={data[sec.key]}
                        onChange={(e) => handleInput(sec.key, e.target.value)}
                        onKeyDown={(e) => handleTextareaKeyDown(e, sec.key)}
                        rows={8}
                        placeholder={`Write your ${sec.label.toLowerCase()} here (markdown supported)...`}
                        className={cn(
                          "w-full resize-y rounded-lg border bg-muted/60 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1",
                          hasError
                            ? "border-red-500/60 ring-1 ring-red-500/20"
                            : hasWarning
                            ? "border-amber-500/60 ring-1 ring-amber-500/20"
                            : "border-border focus:ring-primary/30"
                        )}
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
          <div className={cn("h-full flex flex-col overflow-y-auto bg-muted/20", viewMode === "split" ? "w-1/2" : "w-full")}>
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
                  <div className="rounded-lg border border-border bg-card/60 p-6">
                    <MarkdownRenderer content={previewBody} skipPreamble />
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

      {/* ─── Validation Dialog & Real-Time Inspection ─── */}
      {showValidationDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => !validating && setShowValidationDialog(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                {validating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Running Compliance Checks...</h3>
                  </>
                ) : validationErrors.length > 0 ? (
                  <>
                    <AlertCircle className={cn("h-5 w-5", validationErrors.some(e => e.code === "error") ? "text-red-600 dark:text-red-400" : "text-amber-500")} />
                    <h3 className={cn("text-base font-semibold", validationErrors.some(e => e.code === "error") ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                      {validationErrors.some(e => e.code === "error") ? `Validation Issues (${validationErrors.length})` : `Advisories (${validationErrors.length})`}
                    </h3>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                      All Rules Passed
                    </h3>
                  </>
                )}
              </div>
              <button
                disabled={validating}
                onClick={() => setShowValidationDialog(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {/* Progress Checklist */}
              <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  EIP Standards & Editorial Checks
                </p>
                <div className="space-y-1.5">
                  {VALIDATION_CHECKS.map((chk, idx) => {
                    const isPassed = !validating || activeCheckStep > idx;
                    const isCurrent = validating && activeCheckStep === idx;
                    return (
                      <div key={chk.id} className="flex items-start gap-2 text-xs py-0.5">
                        {isCurrent ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0 mt-0.5" />
                        ) : isPassed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium", isCurrent ? "text-primary" : isPassed ? "text-foreground" : "text-muted-foreground")}>
                            {chk.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{chk.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error list once checks finish */}
              {!validating && validationErrors.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                    Flagged Items ({validationErrors.length})
                  </p>
                  {validationErrors.map((err, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg border p-3",
                        err.code === "error"
                          ? "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300"
                          : err.code === "warning"
                          ? "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                          : "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle
                          className={cn(
                            "h-4 w-4 shrink-0 mt-0.5",
                            err.code === "error"
                              ? "text-red-600 dark:text-red-400"
                              : err.code === "warning"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-blue-600 dark:text-blue-400"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium">{err.summary}</p>
                            {err.section && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/60 opacity-80 whitespace-nowrap">
                                {err.section}
                              </span>
                            )}
                          </div>
                          {err.detail && err.detail !== err.summary && (
                            <p className="text-[11px] text-muted-foreground mt-1">{err.detail}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Success message when valid */}
              {!validating && validationErrors.length === 0 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-1">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Proposal Ready for Submission!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Complies with EIP formatting and editorial rules. No errors or warnings detected.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-slate-200 dark:border-slate-700/50 bg-card/40">
              <button
                disabled={validating}
                onClick={() => setShowValidationDialog(false)}
                className="px-4 py-2 text-xs font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
