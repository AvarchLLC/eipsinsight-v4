import 'server-only';

/**
 * Fetch + parse ACDbot call artifacts (transcript, chat) from ethereum/pm.
 * Shared by the call detail page and the "ask AI" route.
 */

export interface TranscriptCue {
  start: string;
  end: string;
  text: string;
}

export interface ChatMessage {
  time: string | null;
  author: string | null;
  text: string;
}

const ARTIFACTS_BASE =
  'https://raw.githubusercontent.com/ethereum/pm/master/.github/ACDbot/artifacts';

/** Normalized series slug → the manifest/artifact directory key. */
export function getRemoteSeries(series: string): string {
  const map: Record<string, string> = {
    price: 'glamsterdamrepricings',
    tli: 'trustlesslogindex',
    pqts: 'pqtransactionsignatures',
    rpc: 'rpcstandards',
    etm: 'encryptthemempool',
    awd: 'allwalletdevs',
    pqi: 'pqinterop',
    aa: 'nativeaa',
    p2p: 'p2pnetworking',
    ssz: 'sszengineapi',
  };
  if (series.startsWith('one-off-')) return series.slice(8);
  return map[series] ?? series;
}

export function parseVtt(vtt: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  for (const block of vtt.split(/\r?\n\r?\n/)) {
    const lines = block.trim().split(/\r?\n/);
    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;
    const match = timeLine.match(
      /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/
    );
    if (!match) continue;
    const text = lines
      .slice(lines.indexOf(timeLine) + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (text) cues.push({ start: match[1].split('.')[0], end: match[2].split('.')[0], text });
  }
  return cues;
}

async function fetchArtifact(series: string, callId: string, files: string[]): Promise<string | null> {
  const remote = getRemoteSeries(series);
  for (const file of files) {
    try {
      const res = await fetch(`${ARTIFACTS_BASE}/${remote}/${callId}/${file}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) return text;
      }
    } catch {
      // try next
    }
  }
  return null;
}

export async function fetchTranscriptCues(series: string, callId: string): Promise<TranscriptCue[] | null> {
  const raw = await fetchArtifact(series, callId, ['transcript_corrected.vtt', 'transcript.vtt']);
  if (!raw || !raw.includes('WEBVTT')) return null;
  const cues = parseVtt(raw);
  return cues.length > 0 ? cues : null;
}

/** Plain transcript text (for AI context) — cue text joined, bounded. */
export async function fetchTranscriptText(
  series: string,
  callId: string,
  maxChars = 14_000
): Promise<string | null> {
  const cues = await fetchTranscriptCues(series, callId);
  if (!cues) return null;
  return cues.map((c) => c.text).join(' ').slice(0, maxChars);
}

/**
 * Parse a Zoom-style chat export. Handles the common shapes:
 *   "HH:MM:SS From Name to Everyone: message"
 *   "HH:MM:SS\tName:\tmessage"
 *   continuation lines (no timestamp) append to the previous message.
 */
export function parseChat(raw: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const tsRe = /^(\d{1,2}:\d{2}:\d{2})/;
  const fromRe = /From\s+(.+?)(?:\s+to\s+[^:]+)?\s*:\s*(.*)$/i;
  const authorRe = /^(?:\d{1,2}:\d{2}:\d{2})?[\s\t]*(.+?):\s*(.*)$/;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, ' ').trim();
    if (!line) continue;
    const tsMatch = line.match(tsRe);
    const time = tsMatch ? tsMatch[1].padStart(8, '0') : null;

    if (tsMatch || fromRe.test(line)) {
      const rest = tsMatch ? line.slice(tsMatch[0].length).trim() : line;
      const from = rest.match(fromRe);
      if (from) {
        messages.push({ time, author: from[1].trim(), text: from[2].trim() });
        continue;
      }
      const auth = rest.match(authorRe);
      if (auth && auth[1] && auth[1].length < 60) {
        messages.push({ time, author: auth[1].trim(), text: auth[2].trim() });
        continue;
      }
      messages.push({ time, author: null, text: rest });
    } else if (messages.length > 0) {
      // continuation of previous message
      messages[messages.length - 1].text += ` ${line}`;
    } else {
      messages.push({ time: null, author: null, text: line });
    }
  }
  return messages.filter((m) => m.text);
}

export async function fetchChatMessages(series: string, callId: string): Promise<ChatMessage[] | null> {
  const raw = await fetchArtifact(series, callId, ['chat.txt']);
  if (!raw) return null;
  const parsed = parseChat(raw);
  return parsed.length > 0 ? parsed : null;
}
