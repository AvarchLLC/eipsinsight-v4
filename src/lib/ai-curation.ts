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
  return !updatedBy || MACHINE_ACTORS.has(updatedBy);
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
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
      systemInstruction: {
        parts: [{ text: system }],
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
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
