

export interface ValidationMessage {
  level: "error" | "warning" | "info";
  message: string;
  section?: string; // e.g. "Preamble", "Sections", "Normative Language"
  field?: string;   // Which field or section is affected
}

export interface ValidationResult {
  success: boolean;
  messages: ValidationMessage[];
}

// ── Constants ──

const VALID_STATUSES = ["Draft", "Review", "Last Call", "Final", "Stagnant", "Withdrawn", "Living"];
const VALID_TYPES = ["Standards Track", "Meta", "Informational"];
const VALID_CATEGORIES_EIP = ["Core", "Networking", "Interface"];
const VALID_CATEGORIES_ERC = ["ERC", "Interface"];

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

const REQUIRED_SECTIONS = ["Abstract", "Specification", "Rationale", "Security Considerations", "Copyright"];

const TITLE_CASE_SMALL_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "for", "in", "on",
  "at", "to", "by", "of", "with", "from", "up", "as", "into", "via",
]);

const MAGICIANS_URL_PATTERN = /^https:\/\/ethereum-magicians\.org\/t\//;

const DISALLOWED_LINK_PATTERNS = [
  { pattern: /https?:\/\/(www\.)?eips\.ethereum\.org/gi, name: "eips.ethereum.org (use relative links)" },
  { pattern: /https?:\/\/github\.com\/ethereum\/EIPs(?!\/blob\/[a-f0-9]{40})/gi, name: "github.com/ethereum/EIPs (use relative links or commit-pinned permalinks)" },
  { pattern: /https?:\/\/github\.com\/ethereum\/ERCs(?!\/blob\/[a-f0-9]{40})/gi, name: "github.com/ethereum/ERCs (use relative links)" },
  { pattern: /https?:\/\/ethresear\.ch/gi, name: "ethresear.ch" },
  { pattern: /https?:\/\/hackmd\.io/gi, name: "hackmd.io" },
  { pattern: /https?:\/\/etherscan\.io/gi, name: "etherscan.io" },
  { pattern: /https?:\/\/arxiv\.org/gi, name: "arxiv.org" },
];

// ── Helpers ──

interface ParsedFrontmatter {
  raw: string;
  fields: Array<{ key: string; value: string; line: number }>;
  fieldMap: Map<string, string>;
}

function parseFrontmatter(md: string): { fm: ParsedFrontmatter; body: string } | null {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const raw = match[1];
  const body = md.slice(match[0].length);
  const lines = raw.split("\n");
  const fields: Array<{ key: string; value: string; line: number }> = [];
  const fieldMap = new Map<string, string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^([a-z][a-z0-9-]*):\s*(.*)/i);
    if (m) {
      const key = m[1].toLowerCase();
      const value = m[2].trim();
      fields.push({ key, value, line: i + 1 });
      fieldMap.set(key, value);
    }
  }

  return { fm: { raw, fields, fieldMap }, body };
}

function parseSections(body: string): Array<{ heading: string; content: string; index: number }> {
  const sections: Array<{ heading: string; content: string; index: number }> = [];
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
    sections.push({ heading: positions[i].heading, content, index: i });
  }

  return sections;
}

function isTitleCase(title: string): boolean {
  const words = title.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-zA-Z0-9]/g, "");
    if (!word) continue;
    // First word must be capitalized
    if (i === 0) {
      if (word[0] !== word[0].toUpperCase()) return false;
      continue;
    }
    // Small words can be lowercase
    if (TITLE_CASE_SMALL_WORDS.has(word.toLowerCase())) continue;
    // All other words should start with uppercase
    if (word[0] !== word[0].toUpperCase()) return false;
  }
  return true;
}

// ── Validation Functions ──

function validateFieldOrder(fm: ParsedFrontmatter): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const fieldKeys = fm.fields.map((f) => f.key);
  const ordered = FIELD_ORDER.filter((f) => fieldKeys.includes(f));
  const actual = fieldKeys.filter((f) => FIELD_ORDER.includes(f));

  if (JSON.stringify(ordered) !== JSON.stringify(actual)) {
    msgs.push({
      level: "warning",
      message: `Preamble fields are not in the required order. Expected: ${ordered.join(", ")}. Got: ${actual.join(", ")}`,
      section: "Preamble",
      field: "order",
    });
  }

  // Check for unknown fields
  const known = new Set(FIELD_ORDER);
  for (const f of fieldKeys) {
    if (!known.has(f)) {
      msgs.push({
        level: "warning",
        message: `Unknown preamble field: "${f}"`,
        section: "Preamble",
        field: f,
      });
    }
  }

  return msgs;
}

function validateRequiredFields(fm: ParsedFrontmatter): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const required = ["eip", "title", "description", "author", "status", "type", "created"];

  for (const field of required) {
    if (!fm.fieldMap.has(field) || !fm.fieldMap.get(field)?.trim()) {
      msgs.push({
        level: "error",
        message: `Missing required preamble field: ${field}`,
        section: "Preamble",
        field,
      });
    }
  }

  return msgs;
}

function validateTitle(title: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!title) return msgs;

  if (title.length > 44) {
    msgs.push({
      level: "error",
      message: `Title is ${title.length} characters — maximum is 44`,
      section: "Preamble",
      field: "title",
    });
  }

  if (!isTitleCase(title)) {
    msgs.push({
      level: "warning",
      message: `Title should be in Title Case`,
      section: "Preamble",
      field: "title",
    });
  }

  if (/\beip[- ]?\d+/i.test(title)) {
    msgs.push({
      level: "error",
      message: `Title must not contain the EIP number`,
      section: "Preamble",
      field: "title",
    });
  }

  if (/\bstandard\b/i.test(title)) {
    msgs.push({
      level: "error",
      message: `Title must not contain the word "standard"`,
      section: "Preamble",
      field: "title",
    });
  }

  if (/[.!?]$/.test(title.trim())) {
    msgs.push({
      level: "warning",
      message: `Title should be a few words, not a sentence (remove trailing punctuation)`,
      section: "Preamble",
      field: "title",
    });
  }

  return msgs;
}

function validateDescription(description: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!description) return msgs;

  if (description.length > 140) {
    msgs.push({
      level: "error",
      message: `Description is ${description.length} characters — maximum is 140`,
      section: "Preamble",
      field: "description",
    });
  }

  if (description.includes(":")) {
    msgs.push({
      level: "warning",
      message: `Description should not contain a colon`,
      section: "Preamble",
      field: "description",
    });
  }

  if (/\bstandard\b/i.test(description)) {
    msgs.push({
      level: "error",
      message: `Description must not contain the word "standard"`,
      section: "Preamble",
      field: "description",
    });
  }

  // Check for multiple sentences (rough heuristic: period followed by capital letter)
  const sentenceBreaks = description.match(/\.\s+[A-Z]/g);
  if (sentenceBreaks && sentenceBreaks.length > 0) {
    msgs.push({
      level: "warning",
      message: `Description should be one sentence`,
      section: "Preamble",
      field: "description",
    });
  }

  return msgs;
}

function validateAuthor(author: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!author) return msgs;

  const hasHandle = /@[a-zA-Z0-9_-]+/.test(author);
  const hasEmail = /<[^>]+@[^>]+>/.test(author);

  if (!hasHandle && !hasEmail) {
    msgs.push({
      level: "error",
      message: `Author must include at least one GitHub handle (@username) or email address`,
      section: "Preamble",
      field: "author",
    });
  }

  // Check format: entries should be "Name (@handle)" or "Name <email>"
  const entries = author.split(",").map((s) => s.trim()).filter(Boolean);
  for (const entry of entries) {
    const validFormat = /^.+\s+\(@[a-zA-Z0-9_-]+\)$/.test(entry) ||
      /^.+\s+<[^>]+@[^>]+>$/.test(entry) ||
      /^.+\s+(@[a-zA-Z0-9_-]+)$/.test(entry);

    if (!validFormat) {
      // Check if it's just a bare handle
      if (/^@[a-zA-Z0-9_-]+$/.test(entry)) {
        msgs.push({
          level: "warning",
          message: `Author "${entry}" — a real name before the handle is preferred`,
          section: "Preamble",
          field: "author",
        });
      }
    }
  }

  return msgs;
}

function validateDiscussionsTo(url: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!url || url === "null") {
    msgs.push({
      level: "warning",
      message: `discussions-to should link to an Ethereum Magicians topic`,
      section: "Preamble",
      field: "discussions-to",
    });
    return msgs;
  }

  if (!MAGICIANS_URL_PATTERN.test(url)) {
    msgs.push({
      level: "error",
      message: `discussions-to must be an ethereum-magicians.org topic URL, not "${url}"`,
      section: "Preamble",
      field: "discussions-to",
    });
  }

  return msgs;
}

function validateStatus(status: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!status) return msgs;

  if (!VALID_STATUSES.includes(status)) {
    msgs.push({
      level: "error",
      message: `Invalid status: "${status}". Must be one of: ${VALID_STATUSES.join(", ")}`,
      section: "Preamble",
      field: "status",
    });
  }

  return msgs;
}

function validateType(type: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!type) return msgs;

  if (!VALID_TYPES.includes(type)) {
    msgs.push({
      level: "error",
      message: `Invalid type: "${type}". Must be one of: ${VALID_TYPES.join(", ")}`,
      section: "Preamble",
      field: "type",
    });
  }

  return msgs;
}

function validateCategory(type: string | undefined, category: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];

  if (type === "Standards Track") {
    if (!category) {
      msgs.push({
        level: "warning",
        message: `Category is required for Standards Track EIPs`,
        section: "Preamble",
        field: "category",
      });
    } else {
      const allValid = [...VALID_CATEGORIES_EIP, ...VALID_CATEGORIES_ERC];
      if (!allValid.includes(category)) {
        msgs.push({
          level: "error",
          message: `Invalid category: "${category}". Must be one of: ${VALID_CATEGORIES_EIP.join(", ")}`,
          section: "Preamble",
          field: "category",
        });
      }
    }
  } else if (category) {
    msgs.push({
      level: "error",
      message: `Category must only be present for Standards Track EIPs`,
      section: "Preamble",
      field: "category",
    });
  }

  return msgs;
}

function validateConditionalFields(fm: ParsedFrontmatter): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const status = fm.fieldMap.get("status");

  // last-call-deadline
  if (status === "Last Call") {
    if (!fm.fieldMap.has("last-call-deadline") || !fm.fieldMap.get("last-call-deadline")?.trim()) {
      msgs.push({
        level: "error",
        message: `last-call-deadline is required when status is Last Call`,
        section: "Preamble",
        field: "last-call-deadline",
      });
    }
  } else if (fm.fieldMap.has("last-call-deadline")) {
    msgs.push({
      level: "warning",
      message: `last-call-deadline should only be present when status is Last Call`,
      section: "Preamble",
      field: "last-call-deadline",
    });
  }

  // withdrawal-reason
  if (status === "Withdrawn") {
    if (!fm.fieldMap.has("withdrawal-reason") || !fm.fieldMap.get("withdrawal-reason")?.trim()) {
      msgs.push({
        level: "warning",
        message: `withdrawal-reason is expected when status is Withdrawn`,
        section: "Preamble",
        field: "withdrawal-reason",
      });
    }
  } else if (fm.fieldMap.has("withdrawal-reason")) {
    msgs.push({
      level: "warning",
      message: `withdrawal-reason should only be present when status is Withdrawn`,
      section: "Preamble",
      field: "withdrawal-reason",
    });
  }

  return msgs;
}

function validateCreatedDate(created: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!created) return msgs;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(created)) {
    msgs.push({
      level: "error",
      message: `Created date must be in ISO format (YYYY-MM-DD), got "${created}"`,
      section: "Preamble",
      field: "created",
    });
  }

  return msgs;
}

function validateRequires(requires: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!requires || !requires.trim()) return msgs;

  const nums = requires.split(",").map((s) => s.trim()).filter(Boolean).map(Number);
  const invalid = nums.filter((n) => isNaN(n) || n <= 0);

  if (invalid.length > 0) {
    msgs.push({
      level: "error",
      message: `requires entries must be positive integers`,
      section: "Preamble",
      field: "requires",
    });
  }

  // Check ascending order
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] <= nums[i - 1]) {
      msgs.push({
        level: "warning",
        message: `requires entries should be in ascending order`,
        section: "Preamble",
        field: "requires",
      });
      break;
    }
  }

  return msgs;
}

function validateEIPNumber(eip: string | undefined): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!eip) return msgs;

  // Allow placeholder
  if (eip === "<TBD>" || eip.toLowerCase() === "x" || eip === "TBD") return msgs;

  const num = parseInt(eip, 10);
  if (isNaN(num) || num <= 0) {
    msgs.push({
      level: "error",
      message: `EIP number must be a positive integer (or use placeholder)`,
      section: "Preamble",
      field: "eip",
    });
  }

  return msgs;
}

// ── Section validations (§3) ──

function validateSections(body: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const sections = parseSections(body);
  const headings = sections.map((s) => s.heading);

  // Check required sections exist
  for (const req of REQUIRED_SECTIONS) {
    if (!headings.includes(req)) {
      msgs.push({
        level: req === "Copyright" ? "error" : "warning",
        message: `Missing required section: ## ${req}`,
        section: "Sections",
        field: req,
      });
    }
  }

  // Check section order (only among recognized sections)
  const recognized = headings.filter((h) => SECTION_ORDER.includes(h));
  const expectedOrder = SECTION_ORDER.filter((s) => recognized.includes(s));

  if (JSON.stringify(recognized) !== JSON.stringify(expectedOrder)) {
    msgs.push({
      level: "error",
      message: `Sections are not in the required order. Expected: ${expectedOrder.join(" → ")}`,
      section: "Sections",
    });
  }

  // Check for unrecognized top-level sections
  for (const h of headings) {
    if (!SECTION_ORDER.includes(h)) {
      msgs.push({
        level: "warning",
        message: `Unrecognized section: "## ${h}" — the linter may reject extra top-level sections`,
        section: "Sections",
        field: h,
      });
    }
  }

  // Check Copyright line is exact
  const copyrightSection = sections.find((s) => s.heading === "Copyright");
  if (copyrightSection) {
    const expected = "Copyright and related rights waived via [CC0](../LICENSE.md).";
    if (!copyrightSection.content.includes(expected)) {
      msgs.push({
        level: "error",
        message: `Copyright section must contain exactly: "${expected}"`,
        section: "Sections",
        field: "Copyright",
      });
    }
  }

  // Check for empty sections
  for (const sec of sections) {
    if (sec.heading !== "Copyright" && !sec.content.trim()) {
      msgs.push({
        level: "warning",
        message: `Section "## ${sec.heading}" is empty — remove it or add content`,
        section: "Sections",
        field: sec.heading,
      });
    }
  }

  // Check Security Considerations is not generic
  const securitySection = sections.find((s) => s.heading === "Security Considerations");
  if (securitySection) {
    const content = securitySection.content.toLowerCase();
    const genericPhrases = [
      "no security considerations",
      "no new risks",
      "follow best practices",
      "no additional security",
      "needs discussion",
      "none",
      "n/a",
      "tbd",
      "todo",
    ];
    for (const phrase of genericPhrases) {
      if (content.trim() === phrase || content.includes(phrase)) {
        msgs.push({
          level: "warning",
          message: `Security Considerations must be specific to this proposal — generic text like "${phrase}" is insufficient`,
          section: "Sections",
          field: "Security Considerations",
        });
        break;
      }
    }
  }

  return msgs;
}

// ── Template / placeholder detection (§3) ──

function validateNoTemplateArtifacts(md: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];

  // HTML comments
  const htmlComments = md.match(/<!--[\s\S]*?-->/g);
  if (htmlComments && htmlComments.length > 0) {
    msgs.push({
      level: "warning",
      message: `Found ${htmlComments.length} HTML comment(s) — delete all template comments before submitting`,
      section: "Sections",
    });
  }

  // TODO / placeholder markers
  const todoPatterns = [
    { pattern: /\bTODO\b/g, name: "TODO" },
    { pattern: /\bFIXME\b/g, name: "FIXME" },
    { pattern: /\bXXX\b/g, name: "XXX" },
    { pattern: /Remove this comment/gi, name: '"Remove this comment"' },
    { pattern: /\bplaceholder\b/gi, name: '"placeholder"' },
  ];

  // Skip frontmatter for this check
  const bodyStart = md.indexOf("---", md.indexOf("---") + 3);
  const body = bodyStart > 0 ? md.slice(bodyStart + 3) : md;

  for (const { pattern, name } of todoPatterns) {
    const matches = body.match(pattern);
    if (matches) {
      msgs.push({
        level: "warning",
        message: `Found ${matches.length} "${name}" marker(s) — remove before submitting`,
        section: "Sections",
      });
    }
  }

  return msgs;
}

// ── Normative language (§4) ──

function validateNormativeLanguage(body: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const sections = parseSections(body);

  // Find if any RFC 2119 keyword is used anywhere
  const keywordPattern = /\b(MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|OPTIONAL|MAY)\b/g;

  let hasKeywordAnywhere = false;
  let hasBoilerplate = false;
  const keywordsOutsideSpec: Array<{ section: string; keyword: string }> = [];

  for (const sec of sections) {
    const matches = sec.content.match(keywordPattern);
    if (matches && matches.length > 0) {
      hasKeywordAnywhere = true;

      // Keywords should only be in Specification (and its subsections)
      if (sec.heading !== "Specification" && sec.heading !== "Copyright") {
        for (const kw of matches) {
          keywordsOutsideSpec.push({ section: sec.heading, keyword: kw });
        }
      }
    }

    // Check for RFC boilerplate
    if (sec.content.includes("RFC 2119") && sec.content.includes("RFC 8174")) {
      hasBoilerplate = true;
    }
  }

  if (hasKeywordAnywhere && !hasBoilerplate) {
    msgs.push({
      level: "warning",
      message: `RFC 2119/8174 keywords used but boilerplate paragraph is missing from Specification — add the standard paragraph with links to both RFCs`,
      section: "Normative Language",
    });
  }

  if (!hasKeywordAnywhere && hasBoilerplate) {
    msgs.push({
      level: "info",
      message: `RFC 2119 boilerplate is present but no keywords are used — consider removing it`,
      section: "Normative Language",
    });
  }

  // Report keywords outside Specification
  if (keywordsOutsideSpec.length > 0) {
    const unique = [...new Set(keywordsOutsideSpec.map((k) => `${k.keyword} in ${k.section}`))];
    const display = unique.length > 3 ? unique.slice(0, 3).join(", ") + ` (+${unique.length - 3} more)` : unique.join(", ");
    msgs.push({
      level: "warning",
      message: `Normative keywords should only appear in Specification — found: ${display}`,
      section: "Normative Language",
    });
  }

  return msgs;
}

// ── Prose rules (§7) ──

function validateProse(body: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const sections = parseSections(body);

  // Check EIP reference format (should be EIP-N with hyphen)
  const badEipRefs = body.match(/\bEIP\s+\d+\b/gi);
  if (badEipRefs) {
    msgs.push({
      level: "warning",
      message: `Use "EIP-N" with a hyphen, not "EIP N". Found: ${[...new Set(badEipRefs)].slice(0, 3).join(", ")}`,
      section: "Prose & Style",
    });
  }

  // No LaTeX
  if (/\$[^$]+\$/.test(body) || /\\\(.*?\\\)/.test(body) || /\\\[[\s\S]*?\\\]/.test(body)) {
    msgs.push({
      level: "warning",
      message: `LaTeX math ($...$, \\(...\\)) renders literally — use code spans like \`2**24\` instead`,
      section: "Prose & Style",
    });
  }

  // Check for bullet-only sections (a section that is nothing but a list)
  for (const sec of sections) {
    if (!sec.content.trim()) continue;
    if (sec.heading === "Copyright") continue;

    const lines = sec.content.split("\n").filter((l) => l.trim());
    const allBullets = lines.every((l) => /^\s*[-*+]\s/.test(l) || /^\s*\d+\.\s/.test(l));
    if (allBullets && lines.length > 0) {
      msgs.push({
        level: "info",
        message: `Section "${sec.heading}" consists only of a bulleted list — add a lead-in sentence`,
        section: "Prose & Style",
        field: sec.heading,
      });
    }
  }

  return msgs;
}

// ── Link validation (§8) ──

function validateLinks(body: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];

  for (const { pattern, name } of DISALLOWED_LINK_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const matches = body.match(pattern);
    if (matches) {
      msgs.push({
        level: "warning",
        message: `Found link to ${name} — this is not on the allowed link list`,
        section: "Links & References",
      });
    }
  }

  // Check for GitHub branch/tag links (should be commit-pinned with 40-hex)
  const ghPermalinks = body.match(/github\.com\/[^/]+\/[^/]+\/blob\/[^/\s)]+/g);
  if (ghPermalinks) {
    for (const link of ghPermalinks) {
      // Extract the ref part after /blob/
      const refMatch = link.match(/\/blob\/([^/\s)]+)/);
      if (refMatch) {
        const ref = refMatch[1];
        if (!/^[a-f0-9]{40}$/.test(ref)) {
          msgs.push({
            level: "warning",
            message: `Permalink "${link}" uses a branch/tag ref — commit-pinned links require a 40-character hex hash`,
            section: "Links & References",
          });
          break; // Don't spam
        }
      }
    }
  }

  return msgs;
}

// ── PR metadata hints (§1) ──

function validatePRMetadata(body: string): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];

  // Check for future-tense / PR-reference language
  const processLanguage = [
    { pattern: /\bthis PR\b/gi, name: '"this PR"' },
    { pattern: /\bonce merged\b/gi, name: '"once merged"' },
    { pattern: /\bthis proposal will\b/gi, name: '"this proposal will"' },
  ];

  for (const { pattern, name } of processLanguage) {
    pattern.lastIndex = 0;
    if (pattern.test(body)) {
      msgs.push({
        level: "info",
        message: `Avoid ${name} — write as if already Final, describing the protocol, not the proposal's journey`,
        section: "Cross-References",
      });
    }
  }

  return msgs;
}

// ── Main validation entry point ──

export function validateEIPMarkdown(md: string): ValidationResult {
  const messages: ValidationMessage[] = [];

  // Check frontmatter exists
  const parsed = parseFrontmatter(md);
  if (!parsed) {
    messages.push({ level: "error", message: "Missing YAML frontmatter (---)", section: "Preamble" });
    return { success: false, messages };
  }

  const { fm, body } = parsed;

  // §2: Preamble validations
  messages.push(...validateRequiredFields(fm));
  messages.push(...validateFieldOrder(fm));
  messages.push(...validateEIPNumber(fm.fieldMap.get("eip")));
  messages.push(...validateTitle(fm.fieldMap.get("title")));
  messages.push(...validateDescription(fm.fieldMap.get("description")));
  messages.push(...validateAuthor(fm.fieldMap.get("author")));
  messages.push(...validateDiscussionsTo(fm.fieldMap.get("discussions-to")));
  messages.push(...validateStatus(fm.fieldMap.get("status")));
  messages.push(...validateType(fm.fieldMap.get("type")));
  messages.push(...validateCategory(fm.fieldMap.get("type"), fm.fieldMap.get("category")));
  messages.push(...validateConditionalFields(fm));
  messages.push(...validateCreatedDate(fm.fieldMap.get("created")));
  messages.push(...validateRequires(fm.fieldMap.get("requires")));

  // §3: Section validations
  messages.push(...validateSections(body));
  messages.push(...validateNoTemplateArtifacts(md));

  // §4: Normative language
  messages.push(...validateNormativeLanguage(body));

  // §7: Prose
  messages.push(...validateProse(body));

  // §8: Links
  messages.push(...validateLinks(body));

  // §6: Write-as-if-Final
  messages.push(...validatePRMetadata(body));

  const hasErrors = messages.some((m) => m.level === "error");
  return { success: !hasErrors, messages };
}
