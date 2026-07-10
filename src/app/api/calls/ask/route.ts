import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchTranscriptText } from '@/lib/call-artifacts';

/**
 * Answer a question about a specific protocol call, grounded ONLY in that
 * call's EF summary + transcript. Uses Groq (plain-text completion).
 */

export const runtime = 'nodejs';

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
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
  const transcript = call.has_transcript
    ? await fetchTranscriptText(call.series, call.call_id, 12_000)
    : null;

  if (!tldrText && !transcript) {
    return NextResponse.json({
      answer: "There isn't a synced summary or transcript for this call yet, so I can't answer questions about it.",
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

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const status = res.status === 429 ? 429 : 502;
      return NextResponse.json(
        { error: status === 429 ? 'The AI is busy right now — try again in a moment.' : 'AI request failed.' },
        { status }
      );
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return NextResponse.json({ error: 'No answer returned.' }, { status: 502 });
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: 'AI request timed out.' }, { status: 504 });
  }
}
