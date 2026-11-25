import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import {
  CALL_SERIES,
  callDisplayName,
  callSeriesLabel,
  callSeriesShort,
  isOneOffSeries,
  type CallSeriesMeta,
} from "@/data/call-series";

export interface CallSummary {
  series: string;
  number: string | null;
  displayName: string | null;
  date: string | null; // ISO yyyy-mm-dd
  videoUrl: string | null;
  hasTldr: boolean;
  hasTranscript: boolean;
  decisions: number;
  headline: string | null;
  title: string;
}

export interface CallMoment {
  text: string;
  seconds: number | null;
  stamp: string | null; // "HH:MM:SS"
}

export interface CallAction extends CallMoment {
  owner: string | null;
}

export interface CallDecisionRef {
  text: string;
  eips: number[];
  type: string | null;
  seconds: number | null;
  stamp: string | null;
}

export interface HighlightTopic {
  topic: string;
  items: CallMoment[];
}

export interface LabeledMoment extends CallMoment {
  label: string;
}

export interface CallEipMention {
  number: number;
  kind: "eip" | "erc" | "rip";
  title: string | null;
  onAgenda: boolean;
  discussed: boolean;
  moments: LabeledMoment[];
}

export interface AgendaItem {
  number: number;
  kind: "eip" | "erc" | "rip";
  title: string | null;
  mentionedBy: string | null;
  snippet: string | null;
  url: string | null;
}

export interface TranscriptCue {
  seconds: number;
  stamp: string;
  speaker: string | null;
  text: string;
}

export interface ChatMessage {
  time: string | null;
  author: string | null;
  text: string;
}

export interface CallDetail {
  series: string;
  callId: string;
  number: string | null;
  title: string;
  date: string | null;
  videoUrl: string | null;
  youtubeId: string | null;
  issueNumber: number | null;
  summary: string | null;
  decisions: CallMoment[];
  actionItems: CallAction[];
  targets: CallMoment[];
  highlights: HighlightTopic[];
  decisionRefs: CallDecisionRef[];
  eipsDiscussed: number[];
  eipMentions: CallEipMention[];
  agenda: AgendaItem[];
  hasTranscript: boolean;
  hasChat: boolean;
}

export interface SeriesOverviewRow {
  series: string;
  label: string;
  short: string;
  group: "core" | "breakout" | "process" | "other";
  count: number;
  firstDate: string | null;
  lastDate: string | null;
  cadenceDays: number | null;
  latest: CallSummary | null;
}

function cleanSnippet(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*`>]+/g, " ")
    .replace(/issues?\/\d+#?\S*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > 2 ? s : null;
}

function extractRefs(text: string): { kind: "eip" | "erc" | "rip"; number: number }[] {
  const out: { kind: "eip" | "erc" | "rip"; number: number }[] = [];
  const re = /\b(EIP|ERC|RIP)[-\s]?(\d{1,5})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ kind: m[1].toLowerCase() as "eip" | "erc" | "rip", number: Number(m[2]) });
  }
  return out;
}

export function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
  );
  return m ? m[1] : null;
}

const TOPIC_ACRONYMS = new Set([
  "pq", "ai", "el", "cl", "dc", "eip", "erc", "rip", "tls", "api", "rpc", "mev",
  "da", "zk", "zkevm", "evm", "ssz", "bls", "kzg", "pbs", "epbs", "focil", "aa",
  "pqts", "pqi", "eof", "acd", "acde", "acdc", "acdt", "p2p", "l1", "l2", "eth",
]);

function prettyTopic(slug: string): string {
  const words = slug.replace(/[_-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return slug;
  return words
    .map((w, i) => {
      if (TOPIC_ACRONYMS.has(w.toLowerCase())) return w.toUpperCase();
      if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
      return w;
    })
    .join(" ");
}

function parseStamp(stamp: unknown): { seconds: number | null; stamp: string | null } {
  if (typeof stamp !== "string" || !stamp.trim()) return { seconds: null, stamp: null };
  const clean = stamp.trim().replace(/^@/, "");
  const parts = clean.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return { seconds: null, stamp: clean };
  let sec = 0;
  if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
  else if (parts.length === 1) sec = parts[0];
  else return { seconds: null, stamp: clean };
  return { seconds: sec, stamp: clean };
}

function asArray<T = Record<string, unknown>>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

type DbRow = {
  call_id?: string | null;
  series: string;
  call_number: string | null;
  display_name: string | null;
  occurred_on: Date | string | null;
  video_url: string | null;
  has_tldr: boolean | null;
  has_transcript: boolean | null;
  has_chat: boolean | null;
  issue_number: number | null;
  tldr: Record<string, unknown> | null;
  key_decisions: Record<string, unknown> | null;
};

export async function getCalls(): Promise<CallSummary[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.$queryRawUnsafe<DbRow[]>(
        `SELECT series, call_number, display_name, occurred_on, video_url,
                has_tldr, has_transcript, has_chat, issue_number, tldr, key_decisions
         FROM protocol_calls
         ORDER BY occurred_on DESC NULLS LAST`
      );

      return rows.map((r) => {
        const t = r.tldr ?? {};
        const decisionsList = asArray(t.decisions);
        const first = decisionsList[0] as { decision?: unknown } | undefined;
        const headline = str(first?.decision);

        return {
          series: r.series,
          number: r.call_number,
          displayName: r.display_name,
          date: iso(r.occurred_on),
          videoUrl: r.video_url,
          hasTldr: Boolean(r.has_tldr),
          hasTranscript: Boolean(r.has_transcript),
          decisions: decisionsList.length,
          headline,
          title: callDisplayName({
            series: r.series,
            call_number: r.call_number,
            display_name: r.display_name,
          }),
        };
      });
    },
    ["protocol-calls-all"],
    { revalidate: 300 }
  )();
}

export async function getRecentCalls(limit = 6): Promise<CallSummary[]> {
  const all = await getCalls();
  return all
    .filter((c) => c.hasTldr || c.videoUrl)
    .slice(0, limit);
}

const GROUP_ORDER: Array<"core" | "breakout" | "process" | "other"> = [
  "core",
  "breakout",
  "process",
  "other",
];

export async function getCallSeriesOverview(): Promise<SeriesOverviewRow[]> {
  const all = await getCalls();
  const bySeries = new Map<string, CallSummary[]>();
  for (const c of all) {
    const list = bySeries.get(c.series) ?? [];
    list.push(c);
    bySeries.set(c.series, list);
  }

  const rows: SeriesOverviewRow[] = [];
  for (const [series, list] of bySeries.entries()) {
    const meta: CallSeriesMeta | undefined = CALL_SERIES[series];
    const dated = list
      .map((c) => c.date)
      .filter((d): d is string => d != null)
      .sort((a, b) => b.localeCompare(a));

    const gaps: number[] = [];
    for (let i = 0; i < Math.min(dated.length - 1, 8); i++) {
      const a = new Date(dated[i]).getTime();
      const b = new Date(dated[i + 1]).getTime();
      const days = Math.round((a - b) / 86400000);
      if (days >= 4 && days <= 60) gaps.push(days);
    }

    rows.push({
      series,
      label: callSeriesLabel(series),
      short: callSeriesShort(series),
      group: isOneOffSeries(series) ? "other" : meta?.group ?? "other",
      count: list.length,
      firstDate: dated.length ? dated[dated.length - 1] : null,
      lastDate: dated.length ? dated[0] : null,
      cadenceDays: median(gaps),
      latest: list[0] ?? null,
    });
  }

  return rows.sort((a, b) => {
    const g = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    if (g !== 0) return g;
    return (b.lastDate ?? "").localeCompare(a.lastDate ?? "");
  });
}

export async function getCallDetail(
  series: string,
  number: string
): Promise<CallDetail | null> {
  return unstable_cache(
    async () => {
      const rows = await prisma.$queryRawUnsafe<DbRow[]>(
        `SELECT call_id, series, call_number, display_name, occurred_on, video_url,
                has_tldr, has_transcript, has_chat, issue_number, tldr, key_decisions
         FROM protocol_calls
         WHERE series = $1 AND call_number = $2
         LIMIT 1`,
        series,
        number
      );
      const r = rows[0];
      if (!r) return null;
      const t = r.tldr ?? {};

      const decisions: CallMoment[] = asArray(t.decisions)
        .map((d: Record<string, unknown>) => ({
          text: str(d.decision) ?? "",
          ...parseStamp(d.timestamp),
        }))
        .filter((d) => d.text);

      const actionItems: CallAction[] = asArray(t.action_items)
        .map((a: Record<string, unknown>) => ({
          text: str(a.action) ?? "",
          owner: str(a.owner),
          ...parseStamp(a.timestamp),
        }))
        .filter((a) => a.text);

      const targets: CallMoment[] = asArray(t.targets)
        .map((g: Record<string, unknown>) => ({
          text: str(g.target) ?? "",
          ...parseStamp(g.timestamp),
        }))
        .filter((g) => g.text);

      const rawHighlights =
        t.highlights && typeof t.highlights === "object" && !Array.isArray(t.highlights)
          ? (t.highlights as Record<string, unknown>)
          : {};
      const highlights: HighlightTopic[] = Object.entries(rawHighlights)
        .map(([topic, items]) => ({
          topic: prettyTopic(topic),
          items: asArray(items)
            .map((h: Record<string, unknown>) => ({
              text: str(h.highlight) ?? "",
              ...parseStamp(h.timestamp),
            }))
            .filter((h) => h.text),
        }))
        .filter((h) => h.items.length > 0);

      const kd =
        r.key_decisions && typeof r.key_decisions === "object" ? r.key_decisions : {};
      const decisionRefs: CallDecisionRef[] = asArray(
        (kd as Record<string, unknown>).key_decisions
      )
        .map((d: Record<string, unknown>) => ({
          text: str(d.original_text) ?? str(d.context) ?? "",
          eips: Array.isArray(d.eips)
            ? (d.eips as unknown[]).map(Number).filter((n) => Number.isFinite(n))
            : [],
          type: str(d.type),
          ...parseStamp(d.timestamp),
        }))
        .filter((d) => d.text && d.eips.length > 0);

      const eipsDiscussed = [...new Set(decisionRefs.flatMap((d) => d.eips))].sort(
        (a, b) => a - b
      );

      const [proposals, agendaRows] = await Promise.all([
        prisma.eips
          .findMany({
            select: { eip_number: true, title: true },
          })
          .catch(() => []),
        prisma.$queryRawUnsafe<
          Array<{
            eip_number: number;
            mentioned_by: string | null;
            snippet: string | null;
            source_url: string | null;
          }>
        >(
          `SELECT eip_number, mentioned_by, snippet, source_url
           FROM pm_agenda_eips WHERE series = $1 AND call_number = $2
           ORDER BY eip_number`,
          series,
          number
        ).catch(() => []),
      ]);

      const byNumber = new Map<number, { title: string; kind: "eip" | "erc" | "rip" }>();
      for (const p of proposals) {
        if (!byNumber.has(p.eip_number)) {
          byNumber.set(p.eip_number, { title: p.title ?? "", kind: "eip" });
        }
      }

      const lookup = (num: number, hinted: "eip" | "erc" | "rip") => {
        const hit = byNumber.get(num);
        return { title: hit?.title ?? null, kind: hit?.kind ?? hinted };
      };

      const labeled: LabeledMoment[] = [
        ...decisions.map((d) => ({ ...d, label: "Decision" })),
        ...highlights.flatMap((h) => h.items.map((it) => ({ ...it, label: h.topic }))),
        ...actionItems.map((a) => ({
          text: a.text,
          seconds: a.seconds,
          stamp: a.stamp,
          label: "Action",
        })),
        ...targets.map((g) => ({ ...g, label: "Target" })),
      ];

      const mentions = new Map<number, CallEipMention>();
      const touch = (num: number, hinted: "eip" | "erc" | "rip") => {
        if (!mentions.has(num)) {
          const { title, kind } = lookup(num, hinted);
          mentions.set(num, {
            number: num,
            kind,
            title,
            onAgenda: false,
            discussed: false,
            moments: [],
          });
        }
        return mentions.get(num)!;
      };

      for (const mo of labeled) {
        for (const ref of extractRefs(mo.text)) {
          const e = touch(ref.number, ref.kind);
          e.moments.push(mo);
          if (mo.label === "Decision") e.discussed = true;
        }
      }
      for (const n of eipsDiscussed) touch(n, "eip").discussed = true;

      const agendaByEip = new Map<
        number,
        { mentioned_by: string | null; snippet: string | null; source_url: string | null }
      >();
      for (const a of agendaRows) {
        touch(a.eip_number, "eip").onAgenda = true;
        if (!agendaByEip.has(a.eip_number)) agendaByEip.set(a.eip_number, a);
      }

      const eipMentions = [...mentions.values()]
        .map((e) => ({ ...e, discussed: e.discussed || e.moments.length >= 2 }))
        .sort(
          (a, b) =>
            Number(b.discussed) - Number(a.discussed) ||
            b.moments.length - a.moments.length ||
            a.number - b.number
        );

      const agenda: AgendaItem[] = [...agendaByEip.entries()]
        .map(([num, a]) => {
          const { title, kind } = lookup(num, "eip");
          return {
            number: num,
            kind,
            title,
            mentionedBy: a.mentioned_by,
            snippet: cleanSnippet(a.snippet),
            url: a.source_url,
          };
        })
        .sort((a, b) => a.number - b.number);

      return {
        series: r.series,
        callId: (r.call_id as string) ?? (r.occurred_on ? `${iso(r.occurred_on)}_${r.call_number}` : r.call_number ?? ""),
        number: r.call_number,
        title: callDisplayName({
          series: r.series,
          call_number: r.call_number,
          display_name: r.display_name,
        }),
        date: iso(r.occurred_on),
        videoUrl: r.video_url,
        youtubeId: youtubeId(r.video_url),
        issueNumber: r.issue_number,
        summary: str(t.summary),
        decisions,
        actionItems,
        targets,
        highlights,
        decisionRefs,
        eipsDiscussed,
        eipMentions,
        agenda,
        hasTranscript: Boolean(r.has_transcript),
        hasChat: Boolean(r.has_chat),
      };
    },
    ["protocol-call-detail", series, number],
    { revalidate: 300 }
  )();
}
