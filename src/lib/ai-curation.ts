/**
 * AI generation of plain-language EIP curation content (layman summary,
 * benefits, tradeoffs, stakeholder impacts) from the EIP's own spec text.
 *
 * Provider-swappable: uses Anthropic if ANTHROPIC_API_KEY is set, otherwise
 * Groq (the app's existing provider). No SDK — plain fetch, matching
 * src/server/orpc/procedures/search.ts.
 */

import { STAKEHOLDER_KEYS } from '@/lib/stakeholders';

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ANTHROPIC_MODEL = 'claude-sonnet-5';

/** Actors that mark a curation row as machine-written (safe to overwrite). */
export const MACHINE_ACTORS = new Set([
  'dataset-import',
  'snapshot-import',
  'legacy-import',
  'upstream-import',
  'ai:groq',
  'ai:anthropic',
  'ai:gemini',
  'scraper:groq',
  'scraper:anthropic',
  'scraper:gemini',
]);

export function isMachineAuthored(updatedBy: string | null | undefined): boolean {
  if (!updatedBy || MACHINE_ACTORS.has(updatedBy)) return true;
  // The layer backfill is a mechanical script that only sets the `layer` flag
  // (no prose); its actor carries a parenthetical suffix, e.g.
  // "layer-backfill (unambiguous EL)". Treat any such row as machine-authored so
  // the generator can fill the missing prose while preserving the layer flag.
  return updatedBy.startsWith('layer-backfill');
}

export function currentAiActor(): 'ai:gemini' | 'ai:anthropic' | 'ai:groq' {
  if (process.env.GEMINI_API_KEY) return 'ai:gemini';
  return process.env.ANTHROPIC_API_KEY ? 'ai:anthropic' : 'ai:groq';
}

export interface GeneratedCuration {
  laymanTitle?: string;
  laymanSummary?: string;
  benefits?: string[];
  tradeoffs?: string[];
  stakeholderImpacts?: Record<string, { description: string }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGroq(system: string, user: string, modelOverride?: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = modelOverride || GROQ_MODEL;

  // Groq free tier limits by tokens/min; on 429, honor its retry hint and wait.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 12_000;
      await sleep(Math.min(waitMs + 500, 30_000));
      continue;
    }
    if (!response.ok) {
      throw new Error(`Groq ${response.status}: ${(await response.text()).slice(0, 160)}`);
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? null;
  }
  throw new Error('Groq 429: rate limit not cleared after retries');
}

async function callAnthropic(system: string, user: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      temperature: 0.3,
      system,
      messages: [{ role: 'user', content: `${user}\n\nRespond with ONLY the JSON object.` }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const data = (await response.json()) as { content?: Array<{ text?: string }> };
  return data.content?.[0]?.text ?? null;
}

async function callGemini(system: string, user: string, modelOverride?: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = modelOverride || process.env.GEMINI_EXPLAIN_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: user }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    systemInstruction: { parts: [{ text: system }] },
  });

  // Retry on rate limits, matching callGroq. Preview/thinking models like
  // gemini-3-flash-preview have tight RPM limits, so without this a burst of page
  // views (or React's dev double-render) throws 429 and the caller sees a failure.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (response.status === 429 || response.status === 503) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 8_000;
      await sleep(Math.min(waitMs + 500, 30_000));
      continue;
    }
    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    // Join ALL text parts: thinking models (gemini-3-*) can return a separate
    // thought part alongside the answer, so parts[0] alone may miss the text.
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    return text || null;
  }
  throw new Error('Gemini 429: rate limit not cleared after retries');
}

/** Prefer Gemini when configured, then Anthropic, else Groq. */
export async function callLLM(system: string, user: string, modelOverride?: string): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) return callGemini(system, user, modelOverride);
  if (process.env.ANTHROPIC_API_KEY) return callAnthropic(system, user);
  return callGroq(system, user, modelOverride);
}

export function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

/** Fetch and lightly clean an EIP/ERC spec's markdown from GitHub. */
export async function fetchEipSpec(
  eipNumber: number
): Promise<{ title: string; body: string } | null> {
  const sources = [
    `https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-${eipNumber}.md`,
    `https://raw.githubusercontent.com/ethereum/ERCs/master/ERCS/erc-${eipNumber}.md`,
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const raw = await res.text();
      // Split frontmatter (--- ... ---) from body.
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      const frontmatter = fmMatch?.[1] ?? '';
      const body = (fmMatch?.[2] ?? raw).trim();
      const title =
        frontmatter.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? `EIP-${eipNumber}`;
      return { title, body };
    } catch {
      // try next source
    }
  }
  return null;
}

const SYSTEM_PROMPT = `You explain Ethereum Improvement Proposals (EIPs) in plain language for a general technical audience.
You are given the real text of one EIP. Base everything ONLY on that text — never invent facts, numbers, or claims not supported by it.
Be concise, concrete, and neutral. Prefer everyday words over jargon. If something is genuinely unknown from the text, omit it rather than guessing.
Return a single JSON object, nothing else.`;

function buildUserPrompt(eipNumber: number, title: string, body: string): string {
  // Keep the spec bounded — the abstract/motivation/rationale near the top
  // carry the substance; trimming keeps us under free-tier token limits.
  const trimmed = body.length > 5000 ? `${body.slice(0, 5000)}\n…(truncated)` : body;
  return `EIP-${eipNumber}: ${title}

--- SPEC TEXT ---
${trimmed}
--- END SPEC ---

Produce this exact JSON shape:
{
  "laymanTitle": "short plain-language title (<=70 chars)",
  "laymanSummary": "2-4 sentences: what this EIP does and why it matters, in plain language",
  "benefits": ["3-5 short concrete benefits, each <=120 chars"],
  "tradeoffs": ["0-4 short honest tradeoffs/risks the text implies, each <=120 chars"],
  "stakeholderImpacts": {
    "endUsers": { "description": "1-2 sentences; omit the key entirely if not meaningfully affected" },
    "appDevs": { "description": "..." },
    "walletDevs": { "description": "..." },
    "toolingInfra": { "description": "..." },
    "layer2s": { "description": "..." },
    "stakersNodes": { "description": "..." },
    "elClients": { "description": "..." },
    "clClients": { "description": "..." }
  }
}
Only include stakeholder keys that are genuinely affected. Omit any group the EIP doesn't clearly touch.`;
}

export async function generateEipCuration(
  eipNumber: number
): Promise<GeneratedCuration | null> {
  const spec = await fetchEipSpec(eipNumber);
  if (!spec) return null;

  const raw = await callLLM(SYSTEM_PROMPT, buildUserPrompt(eipNumber, spec.title, spec.body));
  if (!raw) return null;
  const json = extractJson(raw);
  if (!json) return null;

  let parsed: GeneratedCuration;
  try {
    parsed = JSON.parse(json) as GeneratedCuration;
  } catch {
    return null;
  }

  // Sanitize: keep only known stakeholder keys with a real description.
  const impacts: Record<string, { description: string }> = {};
  for (const key of STAKEHOLDER_KEYS) {
    const description = parsed.stakeholderImpacts?.[key]?.description?.trim();
    if (description) impacts[key] = { description };
  }

  return {
    laymanTitle: parsed.laymanTitle?.trim() || undefined,
    laymanSummary: parsed.laymanSummary?.trim() || undefined,
    benefits: Array.isArray(parsed.benefits)
      ? parsed.benefits.map((b) => String(b).trim()).filter(Boolean).slice(0, 6)
      : undefined,
    tradeoffs: Array.isArray(parsed.tradeoffs)
      ? parsed.tradeoffs.map((t) => String(t).trim()).filter(Boolean).slice(0, 6)
      : undefined,
    stakeholderImpacts: Object.keys(impacts).length > 0 ? impacts : undefined,
  };
}

// ─── Enterprise / institutional impact ───────────────────────────────────────
// A dedicated, finance-audience curation: for each institution type, a curated
// impact level + a plain, specific reason. Non-impacted EIPs say so outright.

/** Canonical institution types shown in the Enterprise view. Keep in sync with
 *  the brief's Affected-organizations list. */
export const ENTERPRISE_ROLES = [
  'Banks & payment providers',
  'Auditors & accountants',
  'Asset managers',
  'Custodians & wallets',
  'Staking providers',
  'Infrastructure operators',
  'L2-using companies',
  'Digital-asset advisors',
] as const;

export type EnterpriseLevel = 'high' | 'medium' | 'low' | 'none';
export type EnterpriseTier = 'direct' | 'limited' | 'none';

export interface EnterpriseOrgImpact {
  role: string;
  level: EnterpriseLevel;
  /** One-line headline shown when the card is collapsed. */
  summary: string;
  /** "Affected how?" — the concrete mechanism / what changes for them. */
  how: string;
  /** "Why it matters" — the business consequence, in institutional terms. */
  why: string;
  /** "What to do" — optional action / monitoring guidance. */
  action?: string;
}
export interface EnterpriseBusinessArea {
  /** e.g. "Assets & client offerings", "Costs & processing", "Accounting & reporting". */
  area: string;
  /** One-line headline shown when the card is collapsed. */
  summary: string;
  /** The detailed explanation shown when expanded. */
  detail: string;
}
export interface EnterpriseImpact {
  tier: EnterpriseTier;
  summary: string;
  organizations: EnterpriseOrgImpact[];
  businessImpact?: EnterpriseBusinessArea[];
  readiness?: string;
}

const ENTERPRISE_SYSTEM_PROMPT = `You write a DETAILED enterprise impact report on Ethereum protocol changes for an INSTITUTIONAL audience: banks & payment providers, auditors & accountants, asset managers, custodians & wallets, staking providers, infrastructure operators, companies building on L2s, and digital-asset advisors.

Given the real text of one EIP, assess its concrete impact. Rules:
- Base everything ONLY on the EIP text. Never invent regulatory, accounting, or financial claims.
- Be HONEST and specific. Most protocol/developer EIPs have NO direct institutional impact — when that is the case, say so plainly and set levels to "none". Do not inflate importance.
- Levels: "high" = must actively plan/test/change operations before it ships. "medium" = indirect exposure worth monitoring (e.g. routine client/tooling updates). "low" = minimal, informational. "none" = not affected.
- For EACH organization give "how" (the concrete mechanism — what actually changes for them) and "why" (the business consequence: settlement, custody, reporting, controls, operations). For "none", "how" states there is no operational change and "why" states nothing needs attention.
- Write for a non-technical institutional reader, not protocol engineers.
Return a single JSON object, nothing else.`;

function buildEnterpriseUserPrompt(eipNumber: number, title: string, body: string): string {
  const trimmed = body.length > 5000 ? `${body.slice(0, 5000)}\n…(truncated)` : body;
  const roleList = ENTERPRISE_ROLES.map((r) => `    { "role": "${r}", "level": "high|medium|low|none", "summary": "<=90 char headline", "how": "1-2 sentences: how this EIP concretely affects them (or that it does not)", "why": "1-2 sentences: why it matters to their business (or why it doesn't)", "action": "1 short sentence, or 'No action needed.'" }`).join(',\n');
  return `EIP-${eipNumber}: ${title}

--- SPEC TEXT ---
${trimmed}
--- END SPEC ---

Produce this exact JSON shape:
{
  "tier": "direct | limited | none",
  "summary": "2-4 sentences for an institutional reader: what changes and whether institutions need to care. If there is no direct enterprise impact, state that plainly.",
  "organizations": [
${roleList}
  ],
  "businessImpact": [
    { "area": "Assets & client offerings", "summary": "<=90 char headline", "detail": "1-3 sentences of specifics for this EIP" },
    { "area": "Costs & transaction processing", "summary": "…", "detail": "…" },
    { "area": "Accounting & reporting", "summary": "…", "detail": "…" },
    { "area": "Controls & compliance", "summary": "…", "detail": "…" },
    { "area": "Operational procedures", "summary": "…", "detail": "…" }
  ],
  "readiness": "1-2 sentences on what institutions should do or monitor. Use 'No action needed.' when tier is none."
}
Include ALL eight organizations in the same order. Include the five businessImpact areas. tier "direct" if any organization is "high"; "limited" if the highest is "medium"; otherwise "none".`;
}

const LEVELS: readonly EnterpriseLevel[] = ['high', 'medium', 'low', 'none'];

export async function generateEnterpriseImpact(eipNumber: number): Promise<EnterpriseImpact | null> {
  const spec = await fetchEipSpec(eipNumber);
  if (!spec) return null;

  // The enterprise report is a large output. On GROQ's free tier the 70B model's
  // token budget is easily exhausted, so use the high-throughput 8B model when
  // GROQ is the active provider. Gemini/Anthropic use their own defaults.
  const groqActive = !process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY;
  const groqModel = groqActive ? process.env.ENTERPRISE_GROQ_MODEL || 'llama-3.1-8b-instant' : undefined;

  const raw = await callLLM(ENTERPRISE_SYSTEM_PROMPT, buildEnterpriseUserPrompt(eipNumber, spec.title, spec.body), groqModel);
  if (!raw) return null;
  const json = extractJson(raw);
  if (!json) return null;

  let parsed: {
    tier?: string;
    summary?: string;
    organizations?: Array<{ role?: string; level?: string; summary?: string; how?: string; why?: string; action?: string }>;
    businessImpact?: Array<{ area?: string; summary?: string; detail?: string }>;
    readiness?: string;
  };
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  // Sanitize organizations: one entry per canonical role, valid level, canonical order.
  const byRole = new Map<string, { level?: string; summary?: string; how?: string; why?: string; action?: string }>();
  for (const o of parsed.organizations ?? []) {
    if (o?.role) byRole.set(o.role.trim().toLowerCase(), o);
  }
  const organizations: EnterpriseOrgImpact[] = ENTERPRISE_ROLES.map((role) => {
    const found = byRole.get(role.toLowerCase());
    const level = (found?.level ?? '').toLowerCase();
    const why = found?.why?.trim() || 'Not directly affected by this change.';
    return {
      role,
      level: (LEVELS as readonly string[]).includes(level) ? (level as EnterpriseLevel) : 'none',
      summary: found?.summary?.trim() || why,
      how: found?.how?.trim() || 'No operational change for this organization type.',
      why,
      action: found?.action?.trim() || undefined,
    };
  });

  const businessImpact: EnterpriseBusinessArea[] = (parsed.businessImpact ?? [])
    .filter((b) => b?.area && (b.detail || b.summary))
    .map((b) => ({
      area: b.area!.trim(),
      summary: b.summary?.trim() || b.detail!.trim(),
      detail: b.detail?.trim() || b.summary!.trim(),
    }));

  // Derive tier from levels so it can never contradict the per-org data.
  const tier: EnterpriseTier = organizations.some((o) => o.level === 'high')
    ? 'direct'
    : organizations.some((o) => o.level === 'medium')
      ? 'limited'
      : 'none';

  const summary = parsed.summary?.trim();
  if (!summary) return null;

  return {
    tier,
    summary,
    organizations,
    businessImpact: businessImpact.length > 0 ? businessImpact : undefined,
    readiness: parsed.readiness?.trim() || (tier === 'none' ? 'No action needed.' : undefined),
  };
}
