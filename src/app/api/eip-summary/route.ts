import { NextRequest, NextResponse } from 'next/server';
import { callLLM, extractJson } from '@/lib/ai-curation';

/**
 * On-demand editorial summary for a proposal page.
 *
 * Uses the app's shared `callLLM` (Gemini → Anthropic → Groq, per configured keys)
 * — NOT a standalone Cohere trial key. The old Cohere path returned HTTP 200 with
 * its "You are using a Trial key…" quota warning *as the summary text* once the
 * trial ran out, and that warning rendered verbatim on the page. Reusing the same
 * provider the rest of the app depends on keeps this durable.
 */

// Phrases that mean a provider leaked a quota/error notice instead of a summary.
// If any survives into the "summary", we drop it rather than render it.
const PROVIDER_NOISE = [
  'trial key',
  'api-keys',
  'rate limit',
  'quota',
  'dashboard.cohere',
  'support@',
  'upgrade to a production key',
];

function looksLikeProviderNoise(text: string): boolean {
  const lower = text.toLowerCase();
  return PROVIDER_NOISE.some((p) => lower.includes(p));
}

const H4 = 'font-semibold text-cyan-600 dark:text-cyan-400 mt-4 mb-1';
const P = 'mb-3 text-slate-600 dark:text-slate-400';
const KNOWN_HEADERS = 'Purpose|Technical Approach|Benefits & Impact|Impact|Significance';

/** Escape HTML so scraped/model text can't inject markup, then apply inline md. */
function inline(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-cyan-600 dark:text-cyan-400">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">$1</code>');
}

/**
 * Line-based renderer for the model's markdown summary.
 *
 * Written as a small parser rather than a regex chain because the old chain
 * collapsed every newline to a space, which jammed `*` bullet lists onto one line
 * as literal asterisks. This walks lines, groups bullet runs into real <ul>s, and
 * escapes HTML first so nothing in the model output can inject markup.
 */
function formatSummaryForDisplay(summary: string): string {
  const lines = summary.trim().replace(/^#{1,6}\s*/gm, '').split('\n');
  const out: string[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;
    out.push(
      `<ul class="ml-5 list-disc space-y-1 ${P}">` +
        bullets.map((b) => `<li>${b}</li>`).join('') +
        '</ul>'
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }

    // Bullet: "* text", "- text", incl. "- **label**: rest" (label kept bold).
    const bullet = line.match(/^[*-]\s+(.*)$/);
    if (bullet) {
      const labelled = bullet[1].match(/^\*\*(.+?)\*\*:\s*(.*)$/);
      bullets.push(
        labelled
          ? `<strong class="text-emerald-600 dark:text-emerald-400">${inline(labelled[1])}:</strong> ${inline(labelled[2])}`
          : inline(bullet[1])
      );
      continue;
    }
    flush();

    // "**Header**" alone, or "**Header** — trailing text" / "**Header**: text".
    const boldHeader = line.match(/^\*\*(.+?)\*\*\s*(?:[—:-]\s*(.*))?$/);
    if (boldHeader) {
      out.push(`<h4 class="${H4}">${inline(boldHeader[1])}</h4>`);
      if (boldHeader[2]?.trim()) out.push(`<p class="${P}">${inline(boldHeader[2])}</p>`);
      continue;
    }

    // Bare "Header: text" for the known section names.
    const colonHeader = line.match(new RegExp(`^(${KNOWN_HEADERS}):\\s*(.*)$`));
    if (colonHeader) {
      out.push(`<h4 class="${H4}">${colonHeader[1]}</h4>`);
      if (colonHeader[2]?.trim()) out.push(`<p class="${P}">${inline(colonHeader[2])}</p>`);
      continue;
    }

    out.push(`<p class="${P}">${inline(line)}</p>`);
  }
  flush();

  return out.join('');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eipNo, content, proposalType } = body;
    const type: string = proposalType ?? 'EIP';

    if (!content || !eipNo) {
      return NextResponse.json({ error: 'Missing eipNo or content' }, { status: 400 });
    }

    // Drop the preamble and cap length before sending to the model.
    let textToAnalyze: string = typeof content === 'string' ? content : String(content);
    const preambleEnd = textToAnalyze.indexOf('---', 4);
    if (preambleEnd !== -1) textToAnalyze = textToAnalyze.slice(preambleEnd + 3).trim();
    const maxChars = 80_000;
    if (textToAnalyze.length > maxChars) {
      textToAnalyze = textToAnalyze.slice(0, maxChars) + '\n\n[... content truncated ...]';
    }

    const system =
      'You are a technical writer who summarizes Ethereum proposals for a knowledgeable ' +
      'but non-specialist audience. Respond ONLY with a JSON object — no prose outside it.';

    const user = `Summarize ${type} ${eipNo} in 80-120 words.

Return JSON of exactly this shape:
{ "summary": "<markdown>" }

The markdown must use these section headers verbatim, each followed by its content:
**Purpose** — what problem this ${type} solves (1-2 sentences)
**Technical Approach** — key changes or mechanisms (2-3 points)
**Impact** — how it helps developers, users, or the network (1-2 sentences)
**Significance** — why it matters for Ethereum (1 sentence)

Do NOT restate raw metadata (title, author, status, category). Keep it concise and professional.

${type} ${eipNo} content:
${textToAnalyze}`;

    let raw: string | null = null;
    try {
      raw = await callLLM(system, user);
    } catch (err) {
      console.error('eip-summary: callLLM failed', err);
      return NextResponse.json(
        { error: 'AI summary is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }

    if (!raw) {
      return NextResponse.json(
        { error: 'AI summary is not configured or is temporarily unavailable.' },
        { status: 503 }
      );
    }

    // The model is asked for { summary }, but tolerate a bare string too.
    let summary = '';
    const jsonSlice = extractJson(raw);
    if (jsonSlice) {
      try {
        const parsed = JSON.parse(jsonSlice) as { summary?: unknown };
        if (typeof parsed.summary === 'string') summary = parsed.summary;
      } catch {
        /* fall through to raw */
      }
    }
    if (!summary) summary = raw;

    // Never surface a provider quota/error notice as a summary.
    if (!summary.trim() || looksLikeProviderNoise(summary)) {
      return NextResponse.json(
        { error: 'AI summary is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ summary: formatSummaryForDisplay(summary) });
  } catch (err) {
    console.error('eip-summary error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
