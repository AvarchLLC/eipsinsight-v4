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

interface PrGovernance {
  state?: string;
  category?: string | null;
  subcategory?: string | null;
  needsEditorAttention?: boolean;
  ciState?: string | null;
  failingChecks?: string | null;
  hasMergeConflicts?: boolean;
  hasFailingRequiredChecks?: boolean;
  reason?: string | null;
  waitingSince?: string | null;
  numReviews?: number | null;
}

interface PrStatusTransition { eipNumber: number; from: string | null; to: string | null }

interface ImportedPrInfo {
  prNumber: number;
  prTitle: string;
  prAuthor?: string;
  prUrl: string;
  prState?: "merged" | "draft" | "closed" | "open";
  filename: string;
  proposalFiles?: string[];
  governance?: PrGovernance;
  statusTransition?: PrStatusTransition;
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

interface ValidationItem { summary: string; detail?: string; code?: string; section?: string; field?: string; line?: number }

// ── Validation Checklist Definitions ──
const VALIDATION_CHECKS = [
  { id: "preamble", label: "Preamble & Frontmatter", desc: "Field order, required keys, repo-specific status/type/category" },
  { id: "title_desc", label: "Title & Description", desc: "Title Case, length limits (≤44 & ≤140), one-sentence rules" },
  { id: "authors_disc", label: "Author & Discussions-To", desc: "GitHub handle required, Magicians topic URL" },
  { id: "sections", label: "Sections & Structure", desc: "Section sequence, required sections by type, CC0 copyright" },
  { id: "normative", label: "RFC 2119 / Normative Language", desc: "Keyword scope (MUST/SHOULD) and RFC boilerplate" },
  { id: "prose_links", label: "Prose, Links & Quality", desc: "EIP-N format, allowed links, no LaTeX, no template artifacts" },
  { id: "crossref", label: "Cross-references & Database", desc: "requires exist and the number is free (live proposal database)" },
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
  rip: ["Core", "RRC", "Networking", "Interface"],
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
  const [showRulesDialog, setShowRulesDialog] = useState(false);

  // Clipboard
  const [copied, setCopied] = useState(false);

  // Refs for cursor-based markdown insert
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const codeEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const codeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Severity counts for the validation summary.
  const severityCounts = useMemo(() => {
    let error = 0, warning = 0, info = 0;
    for (const e of validationErrors) {
      if (e.code === "error") error++;
      else if (e.code === "warning") warning++;
      else info++;
    }
    return { error, warning, info };
  }, [validationErrors]);

  // Jump the code editor to a 1-based line and select it.
  const jumpToLine = useCallback((line?: number) => {
    if (!line) return;
    setShowValidationDialog(false);
    setPreview(false);
    if (viewMode === "edit") setViewMode("split");
    setTimeout(() => {
      const ta = codeEditorRef.current;
      if (!ta) return;
      const lines = ta.value.split("\n");
      let start = 0;
      for (let i = 0; i < line - 1 && i < lines.length; i++) start += lines[i].length + 1;
      const end = start + (lines[line - 1]?.length ?? 0);
      ta.focus();
      ta.setSelectionRange(start, end);
      // Scroll the selected line roughly into view.
      const lineHeight = 22;
      ta.scrollTop = Math.max(0, (line - 4) * lineHeight);
    }, 60);
  }, [viewMode]);

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
    }
    // A tab/repo switch means the document context changed — clear stale results.
    setValidated(false);
    setValidationErrors([]);
    setShowValidationDialog(false);
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
      // New document imported — drop any prior validation results/highlights.
      setValidated(false);
      setValidationErrors([]);
      setShowValidationDialog(false);
      setImportedPrInfo({
        prNumber: dataJson.prNumber,
        prTitle: dataJson.prTitle,
        prAuthor: dataJson.prAuthor,
        prUrl: dataJson.prUrl,
        prState: dataJson.prState,
        filename: dataJson.filename,
        proposalFiles: dataJson.proposalFiles,
        governance: dataJson.governance,
        statusTransition: dataJson.statusTransition,
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
      // New document imported — drop any prior validation results/highlights.
      setValidated(false);
      setValidationErrors([]);
      setShowValidationDialog(false);
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
        body: JSON.stringify({
          markdownContent: markdownRaw,
          repo: repoType,
          filename: tabMode === "pr" ? importedPrInfo?.filename : undefined,
          isNew: tabMode === "new",
        }),
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
            line: msg.line,
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

  // On phones the 50/50 split is unusable — collapse it to a single pane.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const effectiveViewMode: ViewMode = isMobile && viewMode === "split" ? "edit" : viewMode;
  const showEdit = effectiveViewMode === "edit" || effectiveViewMode === "split";
  const showOutput = effectiveViewMode === "output" || effectiveViewMode === "split";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ─── Top Bar ─── */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-full px-4 py-2 sm:px-6 lg:px-8 xl:px-12">
          <NextLink href="/tools" className="mb-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />Tools
          </NextLink>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {/* New / Import / PR segmented control */}
            <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5">
              {([
                { key: "new" as TabMode, label: `New ${repoType.toUpperCase()}`, icon: null },
                { key: "import" as TabMode, label: `Import ${repoType.toUpperCase()}`, icon: null },
                { key: "pr" as TabMode, label: "Review PR", icon: GitPullRequest },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTabMode(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    tabMode === t.key
                      ? "bg-background text-primary shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.icon && <t.icon className="h-3.5 w-3.5" />}
                  {t.label}
                </button>
              ))}
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
                    placeholder={tabMode === "pr" ? `PR # (e.g. 12449)` : `${repoType.toUpperCase()} number`}
                    className="w-44 rounded-lg border border-border bg-muted/40 py-1.5 pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30"
                  />
                  <button onClick={handleImport} disabled={importing} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-muted">
                    {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Search className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
                {importError && <span className="text-xs text-red-500 max-w-[160px] truncate" title={importError}>{importError}</span>}
              </div>
            )}

            {/* Repo selector */}
            <div className="ml-auto inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5">
              {(["eip", "erc", "rip"] as EipType[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRepoType(r)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    repoType === r ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.toUpperCase()}s
                </button>
              ))}
            </div>

            {/* View mode (Split hidden on phones — collapses to a single pane) */}
            <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5">
              {([
                { key: "split" as ViewMode, icon: Columns2, title: "Split", desktopOnly: true },
                { key: "edit" as ViewMode, icon: Pencil, title: "Edit", desktopOnly: false },
                { key: "output" as ViewMode, icon: Eye, title: "Preview", desktopOnly: false },
              ])
                .filter((v) => !(isMobile && v.desktopOnly))
                .map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setViewMode(v.key)}
                    title={v.title}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 transition-all",
                      effectiveViewMode === v.key ? "bg-background text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <v.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
            </div>

            {/* Validate & Download */}
            <div className="flex items-center gap-2 pl-2 ml-0.5 border-l border-border">
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>Validate</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={!validated}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                  validated
                    ? "border-border bg-muted/40 text-foreground hover:bg-muted"
                    : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-50"
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
      <div className={cn("flex flex-1 min-h-0 overflow-hidden", effectiveViewMode === "split" ? "flex-row" : "flex-col")}>
        {/* LEFT: Editor */}
        {showEdit && (
          <div className={cn("h-full overflow-y-auto p-3 space-y-3 sm:p-4", effectiveViewMode === "split" ? "w-1/2 border-r border-border" : "w-full")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
                Document {repoType === "eip" ? "an EIP" : repoType === "erc" ? "an ERC" : "a RIP"}
              </h2>
              {importedPrInfo && (
                <div className="flex items-center gap-1.5">
                  <a
                    href={importedPrInfo.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-muted border border-border hover:bg-muted/80 transition-colors"
                  >
                    <GitPullRequest className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">PR #{importedPrInfo.prNumber}</span>
                    <span className="text-muted-foreground text-[11px] truncate max-w-[140px] sm:max-w-[200px]">({importedPrInfo.filename})</span>
                    <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                  </a>
                  {importedPrInfo.prState && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border tracking-wide",
                        importedPrInfo.prState === "merged"
                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                          : importedPrInfo.prState === "draft"
                          ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30"
                          : importedPrInfo.prState === "closed"
                          ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      )}
                    >
                      {importedPrInfo.prState}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* PR review panel — editor posture + status transition from the governance DB */}
            {importedPrInfo && (importedPrInfo.statusTransition || importedPrInfo.governance || (importedPrInfo.proposalFiles && importedPrInfo.proposalFiles.length > 1)) && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">PR review</h3>
                </div>

                {importedPrInfo.statusTransition && importedPrInfo.statusTransition.from && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-foreground">{repoType.toUpperCase()}-{importedPrInfo.statusTransition.eipNumber}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-xs">
                      <span className="text-muted-foreground">{importedPrInfo.statusTransition.from}</span>
                      <span className="text-primary font-bold">→</span>
                      <span className="font-semibold text-foreground">{importedPrInfo.statusTransition.to}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">status change in this PR</span>
                  </div>
                )}

                {importedPrInfo.governance && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {importedPrInfo.governance.hasFailingRequiredChecks ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3" />Required CI failing</span>
                    ) : importedPrInfo.governance.ciState && /success|pass/i.test(importedPrInfo.governance.ciState) ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />CI passing</span>
                    ) : importedPrInfo.governance.ciState ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">CI {importedPrInfo.governance.ciState}</span>
                    ) : null}
                    {importedPrInfo.governance.needsEditorAttention && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">Needs editor review</span>
                    )}
                    {importedPrInfo.governance.hasMergeConflicts && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">Merge conflicts</span>
                    )}
                    {importedPrInfo.governance.category && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{importedPrInfo.governance.category}{importedPrInfo.governance.subcategory ? ` · ${importedPrInfo.governance.subcategory}` : ""}</span>
                    )}
                    {typeof importedPrInfo.governance.numReviews === "number" && importedPrInfo.governance.numReviews > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{importedPrInfo.governance.numReviews} review{importedPrInfo.governance.numReviews === 1 ? "" : "s"}</span>
                    )}
                    {importedPrInfo.governance.waitingSince && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        waiting {Math.max(0, Math.round((Date.now() - new Date(importedPrInfo.governance.waitingSince).getTime()) / 86400000))}d
                      </span>
                    )}
                  </div>
                )}

                {importedPrInfo.governance?.reason && (
                  <p className="text-[11px] text-muted-foreground">{importedPrInfo.governance.reason}</p>
                )}

                {importedPrInfo.proposalFiles && importedPrInfo.proposalFiles.length > 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    This PR touches {importedPrInfo.proposalFiles.length} proposal files — reviewing <span className="font-mono text-foreground">{importedPrInfo.filename.split("/").pop()}</span>.
                  </p>
                )}
              </div>
            )}

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
                            <span title={INSTRUCTIONS[field.key]} className="cursor-help"><Info className="h-3 w-3 text-muted-foreground" /></span>
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
          <div className={cn("h-full flex flex-col overflow-y-auto bg-muted/20", effectiveViewMode === "split" ? "w-1/2" : "w-full")}>
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
                  ref={codeEditorRef}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4" onClick={() => !validating && setShowValidationDialog(false)}>
          <div className="bg-background border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                {validating ? (
                  <><Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" /><h3 className="text-base font-semibold text-foreground truncate">Running checks…</h3></>
                ) : severityCounts.error > 0 ? (
                  <><AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" /><h3 className="text-base font-semibold text-red-600 dark:text-red-400 truncate">Validation failed</h3></>
                ) : validationErrors.length > 0 ? (
                  <><Info className="h-5 w-5 text-amber-500 shrink-0" /><h3 className="text-base font-semibold text-amber-600 dark:text-amber-400 truncate">Passed with advisories</h3></>
                ) : (
                  <><CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" /><h3 className="text-base font-semibold text-emerald-600 dark:text-emerald-400 truncate">All checks passed</h3></>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => setShowRulesDialog(true)} title="How validation works" className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                  <BookOpen className="h-4 w-4" />
                </button>
                <button disabled={validating} onClick={() => setShowValidationDialog(false)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Summary strip */}
            {!validating && (
              <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-border bg-muted/30 text-[11px]">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", severityCounts.error > 0 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground")}>
                  {severityCounts.error} error{severityCounts.error === 1 ? "" : "s"}
                </span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", severityCounts.warning > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground")}>
                  {severityCounts.warning} warning{severityCounts.warning === 1 ? "" : "s"}
                </span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", severityCounts.info > 0 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground")}>
                  {severityCounts.info} suggestion{severityCounts.info === 1 ? "" : "s"}
                </span>
                <span className="ml-auto font-mono text-muted-foreground truncate">
                  {repoType.toUpperCase()} rules{tabMode === "pr" && importedPrInfo ? ` · PR #${importedPrInfo.prNumber}` : ""}
                </span>
              </div>
            )}

            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {/* Progress checklist (while validating) */}
              {validating && (
                <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Standards &amp; editorial checks</p>
                  <div className="space-y-1.5">
                    {VALIDATION_CHECKS.map((chk, idx) => {
                      const isPassed = activeCheckStep > idx;
                      const isCurrent = activeCheckStep === idx;
                      return (
                        <div key={chk.id} className="flex items-start gap-2 text-xs py-0.5">
                          {isCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0 mt-0.5" />
                            : isPassed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-medium", isCurrent ? "text-primary" : isPassed ? "text-foreground" : "text-muted-foreground")}>{chk.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{chk.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grouped flagged items */}
              {!validating && validationErrors.length > 0 && (
                <div className="space-y-4">
                  {([
                    { key: "error", title: "Errors", hint: "These block submission — the editors' CI will reject them.", items: validationErrors.filter(e => e.code === "error") },
                    { key: "warning", title: "Warnings", hint: "Strongly recommended fixes.", items: validationErrors.filter(e => e.code === "warning") },
                    { key: "info", title: "Suggestions", hint: "Optional polish.", items: validationErrors.filter(e => e.code !== "error" && e.code !== "warning") },
                  ] as const).map((group) => group.items.length === 0 ? null : (
                    <div key={group.key} className="space-y-2">
                      <p className={cn("text-[11px] font-semibold uppercase tracking-wider", group.key === "error" ? "text-red-600 dark:text-red-400" : group.key === "warning" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400")}>
                        {group.title} ({group.items.length})
                      </p>
                      {group.items.map((err, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg border p-3",
                            err.code === "error" ? "border-red-500/20 bg-red-500/5"
                              : err.code === "warning" ? "border-amber-500/20 bg-amber-500/5"
                              : "border-blue-500/20 bg-blue-500/5"
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            {err.line ? (
                              <button
                                onClick={() => jumpToLine(err.line)}
                                title={`Jump to line ${err.line}`}
                                className={cn(
                                  "shrink-0 mt-0.5 font-mono text-[10px] font-semibold rounded px-1.5 py-0.5 border transition-colors",
                                  err.code === "error" ? "border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                    : err.code === "warning" ? "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                    : "border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                )}
                              >
                                L{err.line}
                              </button>
                            ) : (
                              <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-muted-foreground/40" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-foreground">{err.summary}</p>
                                {err.section && (
                                  <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground whitespace-nowrap">{err.section}</span>
                                )}
                              </div>
                              {err.detail && err.detail !== err.summary && err.detail !== err.section && (
                                <p className="text-[11px] text-muted-foreground mt-1">{err.detail}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Success */}
              {!validating && validationErrors.length === 0 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-1.5">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Ready for submission</p>
                  <p className="text-xs text-muted-foreground">Passes the {repoType.toUpperCase()} formatting and editorial rules with no errors, warnings, or suggestions.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-card/40">
              <button onClick={() => setShowRulesDialog(true)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Info className="h-3.5 w-3.5" /> How validation works
              </button>
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

      {/* ─── "How validation works" info dialog ─── */}
      {showRulesDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowRulesDialog(false)}>
          <div className="bg-background border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">How validation works</h3>
              </div>
              <button onClick={() => setShowRulesDialog(false)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5 flex-1">
              <p className="text-sm text-muted-foreground">
                Your draft is checked against the same rules the EIP editors enforce in CI (the <span className="font-medium text-foreground">eipw</span> walidator), plus live cross-checks against EIPsInsight&apos;s proposal database. Rules adapt to whether you&apos;re writing an <span className="font-mono text-foreground">EIP</span>, <span className="font-mono text-foreground">ERC</span>, or <span className="font-mono text-foreground">RIP</span>.
              </p>

              {/* Pipeline diagram */}
              <div className="rounded-lg border border-border bg-card/60 p-4 overflow-x-auto">
                <svg viewBox="0 0 680 220" className="w-full min-w-[560px]" role="img" aria-label="Validation pipeline">
                  <defs>
                    <marker id="vb-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" className="fill-muted-foreground" />
                    </marker>
                  </defs>
                  {/* Input */}
                  <g>
                    <rect x="8" y="88" width="104" height="44" rx="8" className="fill-primary/10 stroke-primary/40" strokeWidth="1.5" />
                    <text x="60" y="106" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="600">Markdown</text>
                    <text x="60" y="122" textAnchor="middle" className="fill-muted-foreground" fontSize="10">draft / PR</text>
                  </g>
                  <line x1="112" y1="110" x2="150" y2="110" className="stroke-muted-foreground" strokeWidth="1.5" markerEnd="url(#vb-arrow)" />
                  {/* Parse */}
                  <g>
                    <rect x="150" y="88" width="104" height="44" rx="8" className="fill-muted stroke-border" strokeWidth="1.5" />
                    <text x="202" y="106" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="600">Parse</text>
                    <text x="202" y="122" textAnchor="middle" className="fill-muted-foreground" fontSize="10">preamble + sections</text>
                  </g>
                  <line x1="254" y1="110" x2="292" y2="110" className="stroke-muted-foreground" strokeWidth="1.5" markerEnd="url(#vb-arrow)" />
                  {/* Rule groups stacked */}
                  <g>
                    <rect x="292" y="20" width="150" height="38" rx="8" className="fill-muted stroke-border" strokeWidth="1.5" />
                    <text x="367" y="43" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="500">Preamble &amp; frontmatter</text>
                    <rect x="292" y="66" width="150" height="38" rx="8" className="fill-muted stroke-border" strokeWidth="1.5" />
                    <text x="367" y="89" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="500">Sections &amp; structure</text>
                    <rect x="292" y="112" width="150" height="38" rx="8" className="fill-muted stroke-border" strokeWidth="1.5" />
                    <text x="367" y="135" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="500">Normative / prose / links</text>
                    <rect x="292" y="158" width="150" height="38" rx="8" className="fill-blue-500/10 stroke-blue-500/40" strokeWidth="1.5" />
                    <text x="367" y="176" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="500">Database cross-check</text>
                    <text x="367" y="190" textAnchor="middle" className="fill-muted-foreground" fontSize="9">requires exist · number free</text>
                  </g>
                  <line x1="442" y1="110" x2="486" y2="110" className="stroke-muted-foreground" strokeWidth="1.5" markerEnd="url(#vb-arrow)" />
                  {/* Result */}
                  <g>
                    <rect x="486" y="70" width="110" height="80" rx="8" className="fill-card stroke-border" strokeWidth="1.5" />
                    <circle cx="506" cy="92" r="4" className="fill-red-500" /><text x="518" y="96" className="fill-foreground" fontSize="11">Errors</text>
                    <circle cx="506" cy="112" r="4" className="fill-amber-500" /><text x="518" y="116" className="fill-foreground" fontSize="11">Warnings</text>
                    <circle cx="506" cy="132" r="4" className="fill-blue-500" /><text x="518" y="136" className="fill-foreground" fontSize="11">Suggestions</text>
                  </g>
                </svg>
              </div>

              {/* Severity legend */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">Errors</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Block submission — CI will reject them. Fix before opening a PR.</p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Warnings</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Strongly recommended. Editors will usually ask for these.</p>
                </div>
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Suggestions</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Optional polish and style nudges.</p>
                </div>
              </div>

              {/* Rule groups */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What gets checked</p>
                {VALIDATION_CHECKS.map((chk) => (
                  <div key={chk.id} className="flex items-start gap-2 rounded-lg border border-border bg-card/40 px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{chk.label}</p>
                      <p className="text-[11px] text-muted-foreground">{chk.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground">
                Each finding shows the line it came from — click the <span className="font-mono text-foreground">L##</span> badge to jump straight to it in the editor. A clean run here means your draft matches what CI expects, but editors still review substance.
              </p>
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-border bg-card/40">
              <button onClick={() => setShowRulesDialog(false)} className="px-4 py-2 text-xs font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
