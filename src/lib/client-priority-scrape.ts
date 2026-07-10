/**
 * Scrape client-team EIP priorities from each team's own published source and
 * extract structured stances with an LLM. Produces the same shape the
 * client-priority tab consumes, sourced from primary docs (not a compilation).
 */

import { callLLM, extractJson } from '@/lib/ai-curation';
import {
  CLIENT_LAYER,
  type ClientPrioritySource,
} from '@/data/client-priority-sources';

export interface ScrapedStance {
  clientName: string;
  clientType: 'EL' | 'CL';
  ratingSystem: string;
  rawRating: string;
  normalizedScore: number | null;
  comment?: string;
  sourceUrl: string;
}

const MAX_DOC_CHARS = 12_000;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '•');
}

function extractMarkdownFromHackMdHtml(html: string): string | null {
  // 1. Try window.publishProps
  const matchPublish = html.match(/window\.publishProps\s*=\s*JSON\.parse\(\`([\s\S]*?)\`\)/) ||
                       html.match(/window\.publishProps\s*=\s*JSON\.parse\("([\s\S]*?)"\)/);
  if (matchPublish) {
    try {
      const parsed = JSON.parse(matchPublish[1]);
      if (parsed.markdown) {
        return decodeURIComponent(parsed.markdown);
      }
    } catch {
      // fallback
    }
  }

  // 2. Try div id="publish-page"
  const matchPublishDiv = html.match(/<div[^>]*id="publish-page"[^>]*>([\s\S]*?)<\/div>/i);
  if (matchPublishDiv) {
    return decodeHtmlEntities(matchPublishDiv[1].trim());
  }

  // 3. Try div id="doc"
  const docStartTagMatch = html.match(/<div[^>]*id="doc"[^>]*>/i);
  if (docStartTagMatch) {
    const startIndex = html.indexOf(docStartTagMatch[0]) + docStartTagMatch[0].length;
    const endIndex = html.indexOf('</div>', startIndex);
    if (endIndex !== -1) {
      return decodeHtmlEntities(html.slice(startIndex, endIndex).trim());
    }
    return decodeHtmlEntities(html.slice(startIndex, startIndex + 12000).trim());
  }

  return null;
}

/** Turn a page URL into a raw-text URL where possible, then fetch + clean. */
export async function fetchSourceText(source: ClientPrioritySource): Promise<string | null> {
  const { url, fetch: mode } = source;
  try {
    if (mode === 'github-issue-comment') {
      // .../issues/<n>#issuecomment-<id>  →  GitHub API comment endpoint.
      const idMatch = url.match(/issuecomment-(\d+)/);
      const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)\/issues/);
      if (!idMatch || !repoMatch) return null;
      const api = `https://api.github.com/repos/${repoMatch[1]}/issues/comments/${idMatch[1]}`;
      const res = await fetch(api, {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { body?: string };
      return data.body?.slice(0, MAX_DOC_CHARS) ?? null;
    }

    if (mode === 'markdown') {
      // HackMD / notes.ethereum.org / status notes expose raw markdown at /download.
      // GitHub wiki pages expose raw markdown under raw.githubusercontent.com/wiki.
      const candidates: string[] = [];
      const wiki = url.match(/github\.com\/([^/]+)\/([^/]+)\/wiki\/(.+)$/);
      if (wiki) {
        candidates.push(
          `https://raw.githubusercontent.com/wiki/${wiki[1]}/${wiki[2]}/${wiki[3]}.md`
        );
      } else {
        candidates.push(`${url.replace(/\/$/, '')}/download`, url);
      }
      for (const candidate of candidates) {
        const res = await fetch(candidate, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(30_000),
        });
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const trimmed = text.trimStart();
            if (!trimmed.startsWith('<')) {
              return text.slice(0, MAX_DOC_CHARS);
            }
            // If it's HTML, check if it's a CodiMD/HackMD note page
            if (url.includes('hackmd.io') || url.includes('notes.ethereum.org') || url.includes('notes.status.im')) {
              const extracted = extractMarkdownFromHackMdHtml(text);
              if (extracted) return extracted.slice(0, MAX_DOC_CHARS);
            }
          }
        }
      }
      return null;
    }

    // html — fetch and strip to text.
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .trim();
    const text = decodeHtmlEntities(stripped).replace(/\s+/g, ' ');
    return text.slice(0, MAX_DOC_CHARS) || null;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You extract Ethereum client teams' EIP priority ratings from a document.
Only use what the document actually states — never invent ratings, EIPs, or opinions.
Return a single JSON object, nothing else.`;

function buildPrompt(source: ClientPrioritySource, text: string): string {
  const known = Object.entries(CLIENT_LAYER)
    .map(([name, layer]) => `${name}=${layer}`)
    .join(', ');
  return `This document is a client team's (or shared) EIP ranking. Likely team(s): ${source.clients.join(', ')}.
Known client layers: ${known}.

--- DOCUMENT ---
${text}
--- END ---

Extract every client-team stance on a numbered EIP. Output exactly:
{ "stances": [
  { "eipNumber": 7732, "clientName": "Geth", "clientType": "EL", "ratingSystem": "tier|support-oppose|priority|custom",
    "rawRating": "verbatim label from the doc (e.g. 'S', 'A', 'support', 'oppose')",
    "normalizedScore": 1-5 or null, "comment": "short rationale if present, else omit" }
] }

Normalize to normalizedScore (1-5):
- 5 = top tier / must-have / strong support
- 4 = high / want / support
- 3 = neutral / no strong opinion / medium
- 2 = low / weak / lean against
- 1 = oppose / against / lowest tier
- null = mentioned but no clear rating
  Only rows with a real EIP number (3-5 digits). Use the doc's own client names; if the doc is a single team's page and doesn't name itself, use the likely team above. Include clientType from the known layers. Omit anything you can't ground in the text.${
    source.promptInstructions ? `\n\nSPECIAL RULES FOR THIS SOURCE:\n${source.promptInstructions}` : ''
  }`;
}

export async function extractStances(
  source: ClientPrioritySource,
  text: string
): Promise<Array<ScrapedStance & { eipNumber: number }>> {
  const raw = await callLLM(SYSTEM_PROMPT, buildPrompt(source, text), 'llama-3.1-8b-instant');
  if (!raw) return [];
  const json = extractJson(raw);
  if (!json) return [];

  let parsed: { stances?: unknown };
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed.stances) ? parsed.stances : [];
  const out: Array<ScrapedStance & { eipNumber: number }> = [];
  for (const row of rows as Array<Record<string, unknown>>) {
    const clientName = String(row.clientName ?? '').trim();
    if (!clientName) continue;
    const eipNumber = Number(row.eipNumber);
    if (!Number.isInteger(eipNumber) || eipNumber <= 0) continue;
    const clientType =
      row.clientType === 'CL' || CLIENT_LAYER[clientName] === 'CL' ? 'CL' : 'EL';
    const rawRating = String(row.rawRating ?? '').trim();
    if (!rawRating) continue;
    const score = row.normalizedScore;
    const normalizedScore =
      typeof score === 'number' && score >= 1 && score <= 5 ? Math.round(score) : null;
    const comment = row.comment ? String(row.comment).trim() : undefined;
    out.push({
      eipNumber,
      clientName,
      clientType,
      ratingSystem: String(row.ratingSystem ?? 'custom').trim() || 'custom',
      rawRating: rawRating.slice(0, 60),
      normalizedScore,
      comment: comment && comment.length > 0 ? comment.slice(0, 1000) : undefined,
      sourceUrl: source.url,
    });
  }
  return out;
}

/** eipId → deduped stances, keyed so one team appears once per EIP. */
export function aggregateStances(
  perSource: Array<{ source: ClientPrioritySource; stances: Array<ScrapedStance & { eipNumber: number }> }>
): Array<{ eipId: number; stances: ScrapedStance[] }> {
  const byEip = new Map<number, Map<string, ScrapedStance>>();
  for (const { source, stances } of perSource) {
    for (const stance of stances) {
      if (!byEip.has(stance.eipNumber)) byEip.set(stance.eipNumber, new Map());
      const clientMap = byEip.get(stance.eipNumber)!;
      const existing = clientMap.get(stance.clientName);
      // Prefer a stance from the source that's explicitly this team's doc.
      const isOwnDoc = source.clients.includes(stance.clientName);
      if (!existing || isOwnDoc) {
        const { eipNumber: _drop, ...rest } = stance;
        void _drop;
        clientMap.set(stance.clientName, rest);
      }
    }
  }
  return Array.from(byEip.entries())
    .map(([eipId, clientMap]) => ({ eipId, stances: Array.from(clientMap.values()) }))
    .sort((a, b) => a.eipId - b.eipId);
}
