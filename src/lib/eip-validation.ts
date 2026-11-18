// EIP / ERC / RIP markdown validator.
//
// Mirrors the rules the editors actually enforce in CI (eipw — the EIP
// Walidator) as closely as a client-side checker can, and adds a few
// EIPsInsight-specific niceties (line numbers on every message, repo-aware
// rule sets). Pure and synchronous — DB-backed checks (requires-exist,
// duplicate-number) are layered on top in the API route.

export type RepoKind = "eip" | "erc" | "rip";

export interface ValidationMessage {
  level: "error" | "warning" | "info";
  message: string;
  section?: string; // e.g. "Preamble", "Sections", "Normative Language"
  field?: string;   // Which field or section is affected
  line?: number;    // 1-based line in the document, when locatable
}

export interface ValidationResult {
  success: boolean;
  messages: ValidationMessage[];
}

export interface ValidateOptions {
  /** Which proposal family's rules to apply. Defaults to "eip". */
  repo?: RepoKind;
  /** Source filename, e.g. "EIPS/eip-1234.md" — enables filename↔number checks. */
  filename?: string;
  /** New-proposal mode (the number is likely a placeholder). */
  isNew?: boolean;
}

// ── Constants ──

const VALID_STATUSES = ["Draft", "Review", "Last Call", "Final", "Stagnant", "Withdrawn", "Living"];
const VALID_TYPES = ["Standards Track", "Meta", "Informational"];

// Category sets differ per repo.
const CATEGORIES_BY_REPO: Record<RepoKind, string[]> = {
  eip: ["Core", "Networking", "Interface"],
  erc: ["ERC", "Interface"],
  rip: ["Core", "RRC", "Networking", "Interface"],
};

const REPO_LABEL: Record<RepoKind, string> = { eip: "EIP", erc: "ERC", rip: "RIP" };
const REPO_FILE_PREFIX: Record<RepoKind, string> = { eip: "eip-", erc: "erc-", rip: "rip-" };

const FIELD_ORDER = [
  "eip", "title", "description", "author", "discussions-to",
  "status", "last-call-deadline", "type", "category", "created",
  "requires", "withdrawal-reason",
];

const SECTION_ORDER = [
  "Abstract", "Motivation", "Specification", "Rationale",
  "Backwards Compatibility", "Test Cases", "Reference Implementation",
  "Security Considerations", "Copyright",
];

// Required sections depend on type (Meta / Informational don't need a Specification).
const ALWAYS_REQUIRED_SECTIONS = ["Abstract", "Rationale", "Security Considerations", "Copyright"];

const TITLE_CASE_SMALL_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "for", "in", "on",
  "at", "to", "by", "of", "with", "from", "up", "as", "into", "via",
]);

const MAGICIANS_URL_PATTERN = /^https:\/\/ethereum-magicians\.org\/t\//;

// Disallowed link hosts (EIP-1 restricts external links to a small allowlist).
const DISALLOWED_LINK_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /https?:\/\/(www\.)?eips\.ethereum\.org/gi, name: "eips.ethereum.org (use relative links)" },
  { pattern: /https?:\/\/github\.com\/ethereum\/EIPs(?!\/blob\/[a-f0-9]{40})/gi, name: "github.com/ethereum/EIPs (use relative links or commit-pinned permalinks)" },
  { pattern: /https?:\/\/github\.com\/ethereum\/ERCs(?!\/blob\/[a-f0-9]{40})/gi, name: "github.com/ethereum/ERCs (use relative links)" },
  { pattern: /https?:\/\/ethresear\.ch/gi, name: "ethresear.ch" },
  { pattern: /https?:\/\/hackmd\.io/gi, name: "hackmd.io" },
  { pattern: /https?:\/\/etherscan\.io/gi, name: "etherscan.io" },
  { pattern: /https?:\/\/arxiv\.org/gi, name: "arxiv.org" },
];

// ── Line helpers ──

/** 1-based line number of a character offset in the full document. */
function lineOf(md: string, index: number): number {
  if (index <= 0) return 1;
  let count = 1;
  const end = Math.min(index, md.length);
  for (let i = 0; i < end; i++) if (md[i] === "\n") count++;
  return count;
}

/** Line of the first occurrence of `needle` in `md`, or undefined. */
function lineOfText(md: string, needle: string): number | undefined {
  const idx = md.indexOf(needle);
  return idx >= 0 ? lineOf(md, idx) : undefined;
}

// ── Parsing ──

interface FrontmatterField { key: string; value: string; line: number }
interface ParsedFrontmatter {
  raw: string;
  fields: FrontmatterField[];
  fieldMap: Map<string, string>;
  lineMap: Map<string, number>; // key -> document line
}

function parseFrontmatter(md: string): { fm: ParsedFrontmatter; body: string; bodyStart: number } | null {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const raw = match[1];
  const bodyStart = match[0].length;
  const body = md.slice(bodyStart);
  const lines = raw.split("\n");
  const fields: FrontmatterField[] = [];
  const fieldMap = new Map<string, string>();
  const lineMap = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^([a-z][a-z0-9-]*):\s*(.*)/i);
    if (m) {
      const key = m[1].toLowerCase();
      const value = m[2].trim();
      // Document line: `---` is line 1, so raw line i maps to doc line i + 2.
      const docLine = i + 2;
      fields.push({ key, value, line: docLine });
      fieldMap.set(key, value);
      lineMap.set(key, docLine);
    }
  }

  return { fm: { raw, fields, fieldMap, lineMap }, body, bodyStart };
}

interface Section { heading: string; content: string; index: number; line: number }

function parseSections(body: string, bodyStart: number, md: string): Section[] {
  const sections: Section[] = [];
  const headingPattern = /^## (.+)$/gm;
  let match: RegExpExecArray | null;
  const positions: Array<{ heading: string; start: number }> = [];

  while ((match = headingPattern.exec(body)) !== null) {
    positions.push({ heading: match[1].trim(), start: match.index });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i + 1 < positions.length ? positions[i + 1].start : body.length;
    const fullBlock = body.slice(start, end);
    const content = fullBlock.replace(/^## .+\n*/, "").trim();
    sections.push({
      heading: positions[i].heading,
      content,
      index: i,
      line: lineOf(md, bodyStart + start),
    });
  }

  return sections;
}

function isTitleCase(title: string): boolean {
  const words = title.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-zA-Z0-9]/g, "");
    if (!word) continue;
    if (i === 0) {
      if (word[0] !== word[0].toUpperCase()) return false;
      continue;
    }
    if (TITLE_CASE_SMALL_WORDS.has(word.toLowerCase())) continue;
    if (word[0] !== word[0].toUpperCase()) return false;
  }
  return true;
}

function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

// ── Preamble validations ──

function validateFieldOrder(fm: ParsedFrontmatter, repo: RepoKind): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  // RIPs use `rip:` as the number field instead of `eip:`.
  const order = repo === "rip" ? FIELD_ORDER.map((f) => (f === "eip" ? "rip" : f)) : FIELD_ORDER;
  const fieldKeys = fm.fields.map((f) => f.key);
  const ordered = order.filter((f) => fieldKeys.includes(f));
  const actual = fieldKeys.filter((f) => order.includes(f));

  if (JSON.stringify(ordered) !== JSON.stringify(actual)) {
    msgs.push({
      level: "error", // eipw: preamble field order is a hard error
      message: `Preamble fields are out of order. Expected: ${ordered.join(", ")}`,
      section: "Preamble",
      field: "order",
      line: fm.fields[0]?.line,
    });
  }

  const known = new Set(order);
  for (const f of fm.fields) {
    if (!known.has(f.key)) {
      msgs.push({
        level: "warning",
        message: `Unknown preamble field: "${f.key}"`,
        section: "Preamble",
        field: f.key,
        line: f.line,
      });
    }
  }

  return msgs;
}

function validateRequiredFields(fm: ParsedFrontmatter, numberKey: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const required = [numberKey, "title", "description", "author", "status", "type", "created"];
  const firstLine = fm.fields[0]?.line ?? 2;

  for (const field of required) {
    if (!fm.fieldMap.has(field) || !fm.fieldMap.get(field)?.trim()) {
      msgs.push({
        level: "error",
        message: `Missing required preamble field: ${field}`,
        section: "Preamble",
        field,
        line: fm.lineMap.get(field) ?? firstLine,
      });
    }
  }

  return msgs;
}

function validateTitle(title: string | undefined, line?: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!title) return msgs;

  if (title.length > 44) {
    msgs.push({ level: "error", message: `Title is ${title.length} characters — maximum is 44`, section: "Preamble", field: "title", line });
  }
  if (!isTitleCase(title)) {
    msgs.push({ level: "warning", message: `Title should be in Title Case`, section: "Preamble", field: "title", line });
  }
  if (/\beip[- ]?\d+/i.test(title)) {
    msgs.push({ level: "error", message: `Title must not contain the EIP number`, section: "Preamble", field: "title", line });
  }
  if (/\bstandard\b/i.test(title)) {
    msgs.push({ level: "error", message: `Title must not contain the word "standard"`, section: "Preamble", field: "title", line });
  }
  if (/[.!?]$/.test(title.trim())) {
    msgs.push({ level: "warning", message: `Title should be a few words, not a sentence (remove trailing punctuation)`, section: "Preamble", field: "title", line });
  }
  return msgs;
}

function validateDescription(description: string | undefined, line?: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!description) return msgs;

  if (description.length > 140) {
    msgs.push({ level: "error", message: `Description is ${description.length} characters — maximum is 140`, section: "Preamble", field: "description", line });
  }
  if (description.includes(":")) {
    msgs.push({ level: "warning", message: `Description should not contain a colon`, section: "Preamble", field: "description", line });
  }
  if (/\bstandard\b/i.test(description)) {
    msgs.push({ level: "error", message: `Description must not contain the word "standard"`, section: "Preamble", field: "description", line });
  }
  const sentenceBreaks = description.match(/\.\s+[A-Z]/g);
  if (sentenceBreaks && sentenceBreaks.length > 0) {
    msgs.push({ level: "warning", message: `Description should be one sentence`, section: "Preamble", field: "description", line });
  }
  return msgs;
}

function validateAuthor(author: string | undefined, line?: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!author) return msgs;

  const hasHandle = /@[a-zA-Z0-9-]+/.test(author);
  if (!hasHandle) {
    // eipw effectively needs at least one GitHub handle so editors can @-mention.
    msgs.push({
      level: "error",
      message: `At least one author must have a GitHub handle (Name (@username)) — an email alone is not enough`,
      section: "Preamble",
      field: "author",
      line,
    });
  }

  const entries = author.split(",").map((s) => s.trim()).filter(Boolean);
  for (const entry of entries) {
    const validFormat =
      /^.+\s+\(@[a-zA-Z0-9-]+\)$/.test(entry) ||
      /^.+\s+<[^>]+@[^>]+>$/.test(entry) ||
      /^.+\s+(@[a-zA-Z0-9-]+)$/.test(entry);
    if (!validFormat && /^@[a-zA-Z0-9-]+$/.test(entry)) {
      msgs.push({
        level: "warning",
        message: `Author "${entry}" — a real name before the handle is preferred`,
        section: "Preamble",
        field: "author",
        line,
      });
    }
  }
  return msgs;
}

function validateDiscussionsTo(url: string | undefined, status: string | undefined, line?: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!url || url === "null") {
    // A brand-new Draft may not have a Magicians thread yet; later statuses need it.
    msgs.push({
      level: status && status !== "Draft" ? "error" : "warning",
      message: `discussions-to should link to an Ethereum Magicians topic`,
      section: "Preamble",
      field: "discussions-to",
      line,
    });
    return msgs;
  }
  if (!MAGICIANS_URL_PATTERN.test(url)) {
    msgs.push({
      level: "error",
      message: `discussions-to must be an ethereum-magicians.org/t/... topic URL, not "${url}"`,
      section: "Preamble",
      field: "discussions-to",
      line,
    });
  }
  return msgs;
}

function validateStatus(status: string | undefined, line?: number): ValidationMessage[] {
  if (!status) return [];
  if (!VALID_STATUSES.includes(status)) {
    return [{ level: "error", message: `Invalid status: "${status}". Must be one of: ${VALID_STATUSES.join(", ")}`, section: "Preamble", field: "status", line }];
  }
  return [];
}

function validateType(type: string | undefined, line?: number): ValidationMessage[] {
  if (!type) return [];
  if (!VALID_TYPES.includes(type)) {
    return [{ level: "error", message: `Invalid type: "${type}". Must be one of: ${VALID_TYPES.join(", ")}`, section: "Preamble", field: "type", line }];
  }
  return [];
}

function validateCategory(type: string | undefined, category: string | undefined, repo: RepoKind, line?: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const allowed = CATEGORIES_BY_REPO[repo];

  if (type === "Standards Track") {
    if (!category) {
      msgs.push({ level: "error", message: `Category is required for Standards Track ${REPO_LABEL[repo]}s`, section: "Preamble", field: "category", line });
    } else if (!allowed.includes(category)) {
      msgs.push({ level: "error", message: `Invalid category: "${category}". For ${REPO_LABEL[repo]}s it must be one of: ${allowed.join(", ")}`, section: "Preamble", field: "category", line });
    }
  } else if (category) {
    msgs.push({ level: "error", message: `Category must only be present for Standards Track proposals`, section: "Preamble", field: "category", line });
  }
  return msgs;
}

function validateConditionalFields(fm: ParsedFrontmatter): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const status = fm.fieldMap.get("status");
  const lcLine = fm.lineMap.get("last-call-deadline") ?? fm.lineMap.get("status");
  const wrLine = fm.lineMap.get("withdrawal-reason") ?? fm.lineMap.get("status");

  // last-call-deadline — eipw requires it to be present (when Last Call) and a
  // valid date. It is NOT required to be in the future: an existing proposal in
  // Last Call legitimately has a past deadline while it awaits Final.
  if (status === "Last Call") {
    const raw = fm.fieldMap.get("last-call-deadline")?.trim();
    if (!raw) {
      msgs.push({ level: "error", message: `last-call-deadline is required when status is Last Call`, section: "Preamble", field: "last-call-deadline", line: lcLine });
    } else if (!parseISODate(raw)) {
      msgs.push({ level: "error", message: `last-call-deadline must be a valid date (YYYY-MM-DD), got "${raw}"`, section: "Preamble", field: "last-call-deadline", line: lcLine });
    }
  } else if (fm.fieldMap.has("last-call-deadline")) {
    msgs.push({ level: "warning", message: `last-call-deadline should only be present when status is Last Call`, section: "Preamble", field: "last-call-deadline", line: lcLine });
  }

  // withdrawal-reason
  if (status === "Withdrawn") {
    if (!fm.fieldMap.get("withdrawal-reason")?.trim()) {
      msgs.push({ level: "warning", message: `withdrawal-reason is expected when status is Withdrawn`, section: "Preamble", field: "withdrawal-reason", line: wrLine });
    }
  } else if (fm.fieldMap.has("withdrawal-reason")) {
    msgs.push({ level: "warning", message: `withdrawal-reason should only be present when status is Withdrawn`, section: "Preamble", field: "withdrawal-reason", line: wrLine });
  }

  return msgs;
}

function validateCreatedDate(created: string | undefined, line?: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!created) return msgs;

  const d = parseISODate(created);
  if (!d) {
    msgs.push({ level: "error", message: `Created date must be in ISO format (YYYY-MM-DD), got "${created}"`, section: "Preamble", field: "created", line });
    return msgs;
  }
  // Allow up to +1 day for timezone slack.
  if (d.getTime() - Date.now() > 86_400_000) {
    msgs.push({ level: "error", message: `Created date ${created} is in the future`, section: "Preamble", field: "created", line });
  }
  return msgs;
}

function validateRequires(requires: string | undefined, line?: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!requires || !requires.trim()) return msgs;

  const nums = requires.split(",").map((s) => s.trim()).filter(Boolean).map(Number);
  const invalid = nums.filter((n) => isNaN(n) || n <= 0 || !Number.isInteger(n));
  if (invalid.length > 0) {
    msgs.push({ level: "error", message: `requires entries must be positive integers`, section: "Preamble", field: "requires", line });
  }
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] <= nums[i - 1]) {
      msgs.push({ level: "warning", message: `requires entries should be in ascending order`, section: "Preamble", field: "requires", line });
      break;
    }
  }
  return msgs;
}

function validateEIPNumber(eip: string | undefined, line?: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!eip) return msgs;
  if (eip === "<TBD>" || eip.toLowerCase() === "x" || eip === "TBD") return msgs;

  const num = parseInt(eip, 10);
  if (isNaN(num) || num <= 0) {
    msgs.push({ level: "error", message: `Proposal number must be a positive integer (or use a placeholder)`, section: "Preamble", field: "eip", line });
  }
  return msgs;
}

function validateFilename(filename: string | undefined, eip: string | undefined, repo: RepoKind): ValidationMessage[] {
  if (!filename) return [];
  const msgs: ValidationMessage[] = [];
  const base = filename.split("/").pop() ?? filename;

  const m = base.match(/^(eip|erc|rip)-([0-9]+)\.md$/i);
  if (!m) {
    msgs.push({ level: "error", message: `Filename "${base}" must match <${REPO_FILE_PREFIX[repo]}N>.md`, section: "Preamble", field: "eip" });
    return msgs;
  }
  const fileKind = m[1].toLowerCase();
  const fileNum = m[2];

  if (fileKind !== repo) {
    msgs.push({ level: "warning", message: `Filename prefix "${fileKind}-" does not match the ${REPO_LABEL[repo]} ruleset being applied`, section: "Preamble", field: "eip" });
  }
  if (eip && eip !== "<TBD>" && eip.toLowerCase() !== "x" && eip !== "TBD" && String(parseInt(eip, 10)) !== String(parseInt(fileNum, 10))) {
    msgs.push({ level: "error", message: `Filename number (${fileNum}) does not match preamble eip: ${eip}`, section: "Preamble", field: "eip" });
  }
  return msgs;
}

// ── Section validations ──

function validateSections(body: string, bodyStart: number, md: string, type: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const sections = parseSections(body, bodyStart, md);
  const headings = sections.map((s) => s.heading);

  // Required sections (Specification only for Standards Track).
  const required = [...ALWAYS_REQUIRED_SECTIONS];
  if (type === "Standards Track") required.splice(1, 0, "Specification");
  for (const req of required) {
    if (!headings.includes(req)) {
      msgs.push({
        level: req === "Copyright" || req === "Security Considerations" ? "error" : "warning",
        message: `Missing required section: ## ${req}`,
        section: "Sections",
        field: req,
      });
    }
  }

  // Section order.
  const recognized = headings.filter((h) => SECTION_ORDER.includes(h));
  const expectedOrder = SECTION_ORDER.filter((s) => recognized.includes(s));
  if (JSON.stringify(recognized) !== JSON.stringify(expectedOrder)) {
    msgs.push({ level: "error", message: `Sections are out of order. Expected: ${expectedOrder.join(" → ")}`, section: "Sections", line: sections[0]?.line });
  }

  // Unrecognized top-level sections.
  for (const sec of sections) {
    if (!SECTION_ORDER.includes(sec.heading)) {
      msgs.push({ level: "warning", message: `Unrecognized section: "## ${sec.heading}" — the linter may reject extra top-level sections`, section: "Sections", field: sec.heading, line: sec.line });
    }
  }

  // Copyright exact line.
  const copyright = sections.find((s) => s.heading === "Copyright");
  if (copyright) {
    const expected = "Copyright and related rights waived via [CC0](../LICENSE.md).";
    if (!copyright.content.includes(expected)) {
      msgs.push({ level: "error", message: `Copyright section must contain exactly: "${expected}"`, section: "Sections", field: "Copyright", line: copyright.line });
    }
  }

  // Empty sections.
  for (const sec of sections) {
    if (sec.heading !== "Copyright" && !sec.content.trim()) {
      msgs.push({ level: "warning", message: `Section "## ${sec.heading}" is empty — remove it or add content`, section: "Sections", field: sec.heading, line: sec.line });
    }
  }

  // Non-generic Security Considerations.
  const security = sections.find((s) => s.heading === "Security Considerations");
  if (security) {
    const content = security.content.toLowerCase().trim();
    const generic = ["no security considerations", "no new risks", "follow best practices", "no additional security", "needs discussion", "none", "n/a", "tbd", "todo"];
    for (const phrase of generic) {
      if (content === phrase || content.includes(phrase)) {
        msgs.push({ level: "warning", message: `Security Considerations must be specific to this proposal — generic text like "${phrase}" is insufficient`, section: "Sections", field: "Security Considerations", line: security.line });
        break;
      }
    }
  }

  return msgs;
}

function validateNoTemplateArtifacts(md: string, bodyStart: number): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const body = md.slice(bodyStart);

  const comment = body.match(/<!--[\s\S]*?-->/);
  if (comment) {
    const all = body.match(/<!--[\s\S]*?-->/g);
    msgs.push({ level: "warning", message: `Found ${all?.length ?? 1} HTML comment(s) — delete all template comments before submitting`, section: "Sections", line: lineOf(md, bodyStart + (comment.index ?? 0)) });
  }

  const todoPatterns = [
    { re: /\bTODO\b/, name: "TODO" },
    { re: /\bFIXME\b/, name: "FIXME" },
    { re: /\bXXX\b/, name: "XXX" },
    { re: /Remove this comment/i, name: '"Remove this comment"' },
    { re: /\bplaceholder\b/i, name: '"placeholder"' },
  ];
  for (const { re, name } of todoPatterns) {
    const m = body.match(re);
    if (m) {
      const count = body.match(new RegExp(re.source, re.flags.includes("i") ? "gi" : "g"))?.length ?? 1;
      msgs.push({ level: "warning", message: `Found ${count} "${name}" marker(s) — remove before submitting`, section: "Sections", line: lineOf(md, bodyStart + (m.index ?? 0)) });
    }
  }
  return msgs;
}

function validateNormativeLanguage(body: string, bodyStart: number, md: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const sections = parseSections(body, bodyStart, md);
  const keywordPattern = /\b(MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|OPTIONAL|MAY)\b/g;

  let hasKeywordAnywhere = false;
  let hasBoilerplate = false;
  let specLine: number | undefined;
  const outside: Array<{ section: string; keyword: string; line: number }> = [];

  for (const sec of sections) {
    if (sec.heading === "Specification") specLine = sec.line;
    const matches = sec.content.match(keywordPattern);
    if (matches && matches.length > 0) {
      hasKeywordAnywhere = true;
      if (sec.heading !== "Specification" && sec.heading !== "Copyright") {
        for (const kw of matches) outside.push({ section: sec.heading, keyword: kw, line: sec.line });
      }
    }
    if (sec.content.includes("RFC 2119") && sec.content.includes("RFC 8174")) hasBoilerplate = true;
  }

  if (hasKeywordAnywhere && !hasBoilerplate) {
    msgs.push({ level: "warning", message: `RFC 2119/8174 keywords are used but the boilerplate paragraph is missing from Specification — add it with links to both RFCs`, section: "Normative Language", line: specLine });
  }
  if (!hasKeywordAnywhere && hasBoilerplate) {
    msgs.push({ level: "info", message: `RFC 2119 boilerplate is present but no keywords are used — consider removing it`, section: "Normative Language", line: specLine });
  }
  if (outside.length > 0) {
    const unique = [...new Set(outside.map((k) => `${k.keyword} in ${k.section}`))];
    const display = unique.length > 3 ? unique.slice(0, 3).join(", ") + ` (+${unique.length - 3} more)` : unique.join(", ");
    msgs.push({ level: "warning", message: `Normative keywords should only appear in Specification — found: ${display}`, section: "Normative Language", line: outside[0].line });
  }
  return msgs;
}

function validateProse(body: string, bodyStart: number, md: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const sections = parseSections(body, bodyStart, md);

  const badEip = body.match(/\bEIP\s+\d+\b/i);
  if (badEip) {
    const all = [...new Set(body.match(/\bEIP\s+\d+\b/gi) ?? [])];
    msgs.push({ level: "warning", message: `Use "EIP-N" with a hyphen, not "EIP N". Found: ${all.slice(0, 3).join(", ")}`, section: "Prose & Style", line: lineOf(md, bodyStart + (badEip.index ?? 0)) });
  }

  const latex = body.match(/\$[^$]+\$/) || body.match(/\\\(.*?\\\)/) || body.match(/\\\[[\s\S]*?\\\]/);
  if (latex) {
    msgs.push({ level: "warning", message: `LaTeX math ($...$, \\(...\\)) renders literally — use code spans like \`2**24\` instead`, section: "Prose & Style", line: lineOf(md, bodyStart + (latex.index ?? 0)) });
  }

  for (const sec of sections) {
    if (!sec.content.trim() || sec.heading === "Copyright") continue;
    const lines = sec.content.split("\n").filter((l) => l.trim());
    const allBullets = lines.length > 0 && lines.every((l) => /^\s*[-*+]\s/.test(l) || /^\s*\d+\.\s/.test(l));
    if (allBullets) {
      msgs.push({ level: "info", message: `Section "${sec.heading}" is only a bulleted list — add a lead-in sentence`, section: "Prose & Style", field: sec.heading, line: sec.line });
    }
  }
  return msgs;
}

function validateLinks(body: string, bodyStart: number, md: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  for (const { pattern, name } of DISALLOWED_LINK_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const m = re.exec(body);
    if (m) {
      msgs.push({ level: "warning", message: `Found link to ${name} — this is not on the allowed link list`, section: "Links & References", line: lineOf(md, bodyStart + m.index) });
    }
  }

  const permalinkRe = /github\.com\/[^/]+\/[^/]+\/blob\/([^/\s)]+)/g;
  let pm: RegExpExecArray | null;
  while ((pm = permalinkRe.exec(body)) !== null) {
    if (!/^[a-f0-9]{40}$/.test(pm[1])) {
      msgs.push({ level: "warning", message: `Permalink uses a branch/tag ref — commit-pinned links require a 40-character hex hash`, section: "Links & References", line: lineOf(md, bodyStart + pm.index) });
      break;
    }
  }
  return msgs;
}

function validatePRMetadata(body: string, bodyStart: number, md: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const processLanguage = [
    { re: /\bthis PR\b/i, name: '"this PR"' },
    { re: /\bonce merged\b/i, name: '"once merged"' },
    { re: /\bthis proposal will\b/i, name: '"this proposal will"' },
  ];
  for (const { re, name } of processLanguage) {
    const m = body.match(re);
    if (m) {
      msgs.push({ level: "info", message: `Avoid ${name} — write as if already Final, describing the protocol, not the proposal's journey`, section: "Cross-References", line: lineOf(md, bodyStart + (m.index ?? 0)) });
    }
  }
  return msgs;
}

// ── Main entry point ──

export function validateEIPMarkdown(md: string, opts: ValidateOptions = {}): ValidationResult {
  const repo: RepoKind = opts.repo ?? "eip";
  const messages: ValidationMessage[] = [];

  const parsed = parseFrontmatter(md);
  if (!parsed) {
    messages.push({ level: "error", message: "Missing YAML frontmatter (---)", section: "Preamble", line: 1 });
    return { success: false, messages };
  }

  const { fm, body, bodyStart } = parsed;
  const type = fm.fieldMap.get("type");
  const numberKey = repo === "rip" ? "rip" : "eip";

  // Preamble
  messages.push(...validateRequiredFields(fm, numberKey));
  messages.push(...validateFieldOrder(fm, repo));
  messages.push(...validateEIPNumber(fm.fieldMap.get(numberKey), fm.lineMap.get(numberKey)));
  messages.push(...validateFilename(opts.filename, fm.fieldMap.get(numberKey), repo));
  messages.push(...validateTitle(fm.fieldMap.get("title"), fm.lineMap.get("title")));
  messages.push(...validateDescription(fm.fieldMap.get("description"), fm.lineMap.get("description")));
  messages.push(...validateAuthor(fm.fieldMap.get("author"), fm.lineMap.get("author")));
  messages.push(...validateDiscussionsTo(fm.fieldMap.get("discussions-to"), fm.fieldMap.get("status"), fm.lineMap.get("discussions-to")));
  messages.push(...validateStatus(fm.fieldMap.get("status"), fm.lineMap.get("status")));
  messages.push(...validateType(fm.fieldMap.get("type"), fm.lineMap.get("type")));
  messages.push(...validateCategory(type, fm.fieldMap.get("category"), repo, fm.lineMap.get("category")));
  messages.push(...validateConditionalFields(fm));
  messages.push(...validateCreatedDate(fm.fieldMap.get("created"), fm.lineMap.get("created")));
  messages.push(...validateRequires(fm.fieldMap.get("requires"), fm.lineMap.get("requires")));

  // Body
  messages.push(...validateSections(body, bodyStart, md, type));
  messages.push(...validateNoTemplateArtifacts(md, bodyStart));
  messages.push(...validateNormativeLanguage(body, bodyStart, md));
  messages.push(...validateProse(body, bodyStart, md));
  messages.push(...validateLinks(body, bodyStart, md));
  messages.push(...validatePRMetadata(body, bodyStart, md));

  const hasErrors = messages.some((m) => m.level === "error");
  return { success: !hasErrors, messages };
}

// Re-exported for callers that want to add DB-backed messages.
export { lineOfText };
