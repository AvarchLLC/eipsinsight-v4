import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchTranscriptText } from '@/lib/call-artifacts';

/**
 * Answer a question about a specific protocol call, grounded ONLY in that
 * call's EF summary + transcript.
 *
 * Resilient by design: tries Gemini → Anthropic → Groq (whichever keys are set),
 * retrying rate-limited providers with backoff before moving on. A single
 * provider hiccup (e.g. Groq's tight free-tier limits) no longer surfaces as a
 * hard "AI is busy" error — that only happens if EVERY configured provider is
 * exhausted at once.
 */

export const runtime = 'nodejs';

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_ASK_MODEL || 'claude-sonnet-5';
const GEMINI_MODEL = process.env.GEMINI_EXPLAIN_MODEL || 'gemini-2.5-flash';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Thrown when a provider is rate-limited even after retries. */
class RateLimited extends Error {}

async function callGroqText(system: string, user: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('groq: no key');
  // One quick retry on 429, then give up so a configured fallback (Gemini/
  // Anthropic) can take over rather than waiting out Groq's rate limit.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (res.status === 429) {
      if (attempt >= 1) throw new RateLimited('groq');
      const retryAfter = Number(res.headers.get('retry-after')) || 1;
      await sleep(Math.min(retryAfter * 1000, 1_500));
      continue;
    }
    if (!res.ok) throw new Error(`groq ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (answer) return answer;
    throw new Error('groq: empty');
  }
  throw new RateLimited('groq');
}

async function callAnthropicText(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('anthropic: no key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (res.status === 429) throw new RateLimited('anthropic');
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const answer = data.content?.[0]?.text?.trim();
  if (!answer) throw new Error('anthropic: empty');
  return answer;
}

async function callGeminiText(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('gemini: no key');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
        // Budget must cover the model's internal reasoning AND the answer —
        // thinking models (e.g. gemini-*-flash-preview) return empty content if
        // reasoning alone exhausts a small budget.
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(25_000),
    }
  );
  if (res.status === 429) throw new RateLimited('gemini');
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!answer) throw new Error('gemini: empty');
  return answer;
}

/**
 * Try each configured provider in turn; return the first answer.
 * Ordered for latency: Groq is fast (~1-2s) so it goes first; Gemini/Anthropic
 * are the reliable fallbacks when Groq is rate-limited (they're slower, esp. the
 * Gemini thinking model, but they get an answer out).
 */
async function askLLM(system: string, user: string): Promise<string> {
  const providers: Array<() => Promise<string>> = [];
  if (process.env.GROQ_API_KEY) providers.push(() => callGroqText(system, user));
  if (process.env.GEMINI_API_KEY) providers.push(() => callGeminiText(system, user));
  if (process.env.ANTHROPIC_API_KEY) providers.push(() => callAnthropicText(system, user));

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await provider();
    } catch (err) {
      lastError = err;
      // Fall through to the next provider on any failure (rate limit, error, timeout).
    }
  }
  throw lastError ?? new Error('no provider');
}

function anyProviderConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY
  );
}

export async function POST(request: Request) {
  if (!anyProviderConfigured()) {
    return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 });
  }

  let body: { series?: string; number?: string; question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const series = String(body.series ?? '').trim();
  const number = String(body.number ?? '').trim();
  const question = String(body.question ?? '').trim().slice(0, 500);
  if (!series || !number || !question) {
    return NextResponse.json({ error: 'Missing series, number, or question.' }, { status: 400 });
  }

  try {
    // Resolve the call (same flexible number matching as getCall).
    const parsed = Number(number);
    const candidates = [number, number.padStart(3, '0')];
    if (!Number.isNaN(parsed)) candidates.push(String(parsed));
    const call = await prisma.protocol_calls.findFirst({
      where: {
        series,
        OR: [{ call_number: { in: candidates } }, { call_id: number }],
      },
      select: { call_id: true, series: true, display_name: true, tldr: true, has_transcript: true },
    });
    if (!call) {
      return NextResponse.json({ error: 'Call not found.' }, { status: 404 });
    }

    const tldrText = call.tldr ? JSON.stringify(call.tldr).slice(0, 6_000) : '';
    let transcript: string | null = null;
    if (call.has_transcript) {
      // A transcript-fetch hiccup must not sink the whole answer — the summary
      // alone is usually enough to ground a reply.
      try {
        transcript = await fetchTranscriptText(call.series, call.call_id, 12_000);
      } catch (err) {
        console.error('[calls/ask] transcript fetch failed:', err);
      }
    }

    if (!tldrText && !transcript) {
      return NextResponse.json({
        answer:
          "There isn't a synced summary or transcript for this call yet, so I can't answer questions about it.",
      });
    }

    const context = [
      tldrText ? `SUMMARY (JSON):\n${tldrText}` : '',
      transcript ? `TRANSCRIPT (excerpt):\n${transcript}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const system = `You answer questions about a single Ethereum protocol call, using ONLY the provided summary and transcript.
Rules:
- Base every claim strictly on the material given. If the answer isn't in it, say so plainly.
- Be concise (2-5 sentences). Reference EIP numbers as "EIP-1234" when relevant.
- Never invent decisions, dates, or attributions not present in the text.`;

    const user = `Call: ${call.display_name ?? `${call.series} ${call.call_id}`}

--- MATERIAL ---
${context}
--- END ---

Question: ${question}`;

    const answer = await askLLM(system, user);
    return NextResponse.json({ answer });
  } catch (err) {
    // Nothing reaches the user as a raw 500. Rate-limited-everywhere is transient;
    // anything else (DB, LLM, network) gets a calm "try again" instead of a red error.
    const busy = err instanceof RateLimited;
    console.error('[calls/ask] failed:', err);
    return NextResponse.json(
      {
        error: busy
          ? 'The assistant is briefly at capacity — please try again in a moment.'
          : "Couldn't reach the assistant just now. Please try again shortly.",
      },
      { status: busy ? 429 : 502 }
    );
  }
}
