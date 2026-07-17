"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, ChevronRight, ClipboardPaste, Copy, RotateCcw, Search } from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Candidate = {
  prNumber: number;
  title: string | null;
  author: string | null;
  repo: string;
  repoShort: string;
  url: string;
  isNew: boolean;
  waitDays: number;
  bucket: "final" | "lastcall" | "review" | "glamsterdam" | "draft";
};

type BucketKey = "final" | "lastcall" | "review" | "glamsterdam" | "draft";

const BUCKETS: { key: BucketKey; heading: string; defaultChecked: boolean; collapsed: boolean }[] = [
  { key: "glamsterdam", heading: "Glamsterdam EIPs promoted to Review", defaultChecked: true, collapsed: false },
  { key: "final", heading: "To Final", defaultChecked: true, collapsed: false },
  { key: "lastcall", heading: "To Last Call", defaultChecked: true, collapsed: false },
  { key: "review", heading: "Review", defaultChecked: true, collapsed: false },
  { key: "draft", heading: "Draft", defaultChecked: false, collapsed: true },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const rowKey = (c: Candidate) => `${c.repoShort}#${c.prNumber}`;

/** Next occurrence of a weekday (e.g. Tuesday) as yyyy-mm-dd, for a sensible default date. */
function defaultDateISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

function displayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** savvytime slug: "jul-21-2026" + "4pm" / "430pm". */
function savvytimeUrl(iso: string, time: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(hh)) return "https://savvytime.com/converter/utc";
  const dateSlug = `${MONTHS_ABBR[m - 1]}-${d}-${y}`;
  const ampm = hh < 12 ? "am" : "pm";
  const h12 = hh % 12 || 12;
  const timeSlug = `${h12}${mm ? String(mm).padStart(2, "0") : ""}${ampm}`;
  return `https://savvytime.com/converter/utc/${dateSlug}/${timeSlug}`;
}

type ParsedAgenda = {
  dateISO?: string;
  time?: string;
  editor?: string;
  zoom?: string;
  acd: string;
  misc: string;
  prs: { key: string; url: string; ref: string }[];
};

/** Parse an existing agenda body back into builder state (round-trip of the generated markdown). */
function parseAgenda(md: string): ParsedAgenda {
  const out: ParsedAgenda = { acd: "", misc: "", prs: [] };

  const dt = md.match(/\[([A-Za-z]+)\s+(\d+),\s*(\d{4}),\s*(\d{1,2}):(\d{2})\s*UTC\]/);
  if (dt) {
    const mi = MONTHS.findIndex((m) => m.toLowerCase() === dt[1].toLowerCase());
    if (mi >= 0) {
      out.dateISO = `${dt[3]}-${String(mi + 1).padStart(2, "0")}-${dt[2].padStart(2, "0")}`;
      out.time = `${dt[4].padStart(2, "0")}:${dt[5]}`;
    }
  }
  const ed = md.match(/Editor\s*-\s*(@?[\w-]+)/i);
  if (ed) out.editor = ed[1];
  const zm = md.match(/Zoom:\s*\[Link\]\(([^)]+)\)/i);
  if (zm && !/ZOOM_LINK/i.test(zm[1])) out.zoom = zm[1];

  // Group lines under their "### Heading".
  const sections: Record<string, string[]> = {};
  let heading: string | null = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.*)/);
    if (h) {
      heading = h[1].replace(/`/g, "").trim().toLowerCase();
      sections[heading] = [];
      continue;
    }
    if (heading) sections[heading].push(line);
  }
  const textOf = (key: string) => {
    const t = (sections[key] ?? []).join("\n").trim();
    return t === "_TBA_" ? "" : t;
  };
  out.acd = textOf("acd related");
  out.misc = textOf("misc");

  // PR lines can appear in any section; match by the GitHub pull URL.
  const urlRe = /https:\/\/github\.com\/[\w.-]+\/([\w.-]+)\/pull\/(\d+)/i;
  for (const secLines of Object.values(sections)) {
    for (const line of secLines) {
      const m = line.match(urlRe);
      if (!m) continue;
      const refM = line.match(/\bRef:\s*(.+)$/i);
      out.prs.push({
        key: `${m[1].toLowerCase()}#${m[2]}`,
        url: m[0],
        ref: refM ? refM[1].trim() : "",
      });
    }
  }
  return out;
}

export default function AgendaMakerPage() {
  // ── Meeting header fields ──
  const [meetingNo, setMeetingNo] = useState("");
  const [dateISO, setDateISO] = useState(defaultDateISO);
  const [time, setTime] = useState("16:00");
  const [editor, setEditor] = useState("");
  const [zoom, setZoom] = useState("");

  // ── Free-text sections (judgement calls) ──
  const [acdText, setAcdText] = useState("");
  const [miscText, setMiscText] = useState("");

  // ── Candidate data + selection ──
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [includeTitles, setIncludeTitles] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    Object.fromEntries(BUCKETS.map((b) => [b.key, b.collapsed])),
  );
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await client.tools.getAgendaCandidates({});
        if (cancelled) return;
        setCandidates(data);
        // Seed default selection: small status buckets checked, the big draft pool opt-in.
        const seed: Record<string, boolean> = {};
        for (const c of data) {
          const b = BUCKETS.find((x) => x.key === c.bucket);
          seed[rowKey(c)] = b?.defaultChecked ?? false;
        }
        setIncluded(seed);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const grouped = useMemo(() => {
    const g: Record<BucketKey, Candidate[]> = { glamsterdam: [], final: [], lastcall: [], review: [], draft: [] };
    for (const c of candidates ?? []) g[c.bucket].push(c);
    return g;
  }, [candidates]);

  const matchesSearch = (c: Candidate) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(c.prNumber).includes(q) ||
      (c.title ?? "").toLowerCase().includes(q) ||
      (c.author ?? "").toLowerCase().includes(q)
    );
  };

  const toggle = (key: string) => setIncluded((prev) => ({ ...prev, [key]: !prev[key] }));
  const setRef = (key: string, val: string) => setRefs((prev) => ({ ...prev, [key]: val }));

  const selectedCount = (b: BucketKey) => grouped[b].filter((c) => included[rowKey(c)]).length;

  const bulk = (b: BucketKey, on: boolean) =>
    setIncluded((prev) => {
      const next = { ...prev };
      for (const c of grouped[b]) if (matchesSearch(c)) next[rowKey(c)] = on;
      return next;
    });

  const resetAll = () => {
    setMeetingNo("");
    setEditor("");
    setZoom("");
    setAcdText("");
    setMiscText("");
    setRefs({});
    setSearch("");
    setIncluded(
      Object.fromEntries(
        (candidates ?? []).map((c) => [rowKey(c), BUCKETS.find((x) => x.key === c.bucket)?.defaultChecked ?? false]),
      ),
    );
  };

  const applyImport = () => {
    if (!candidates) {
      toast.error("Still loading the board — try again in a moment.");
      return;
    }
    const parsed = parseAgenda(importText);
    if (parsed.dateISO) setDateISO(parsed.dateISO);
    if (parsed.time) setTime(parsed.time);
    if (parsed.editor) setEditor(parsed.editor);
    if (parsed.zoom) setZoom(parsed.zoom);
    setAcdText(parsed.acd);

    const candKeys = new Set(candidates.map(rowKey));
    const nextIncluded: Record<string, boolean> = Object.fromEntries(candidates.map((c) => [rowKey(c), false]));
    const nextRefs: Record<string, string> = {};
    const orphans: { url: string; ref: string }[] = [];
    for (const pr of parsed.prs) {
      if (candKeys.has(pr.key)) {
        nextIncluded[pr.key] = true;
        if (pr.ref) nextRefs[pr.key] = pr.ref;
      } else {
        orphans.push({ url: pr.url, ref: pr.ref });
      }
    }
    setIncluded(nextIncluded);
    setRefs(nextRefs);

    // PRs from the imported agenda that are no longer open (merged/closed) can't be re-checked —
    // carry them into Misc so nothing is silently dropped.
    let misc = parsed.misc;
    if (orphans.length) {
      const carried = orphans.map((o) => `- ${o.url}${o.ref ? `  Ref: ${o.ref}` : ""}`).join("\n");
      misc = misc ? `${misc}\n${carried}` : carried;
      toast.info(`${orphans.length} imported PR(s) aren't open on the board anymore — moved to Misc.`);
    }
    setMiscText(misc);

    setShowImport(false);
    setImportText("");
    toast.success("Agenda imported", { description: `${parsed.prs.length} PR(s) parsed.` });
  };

  const markdown = useMemo(() => {
    const line = (c: Candidate) => {
      const ref = refs[rowKey(c)]?.trim();
      return `- ${c.url}${includeTitles && c.title ? `  ${c.title}` : ""}${ref ? `  Ref: ${ref}` : ""}`;
    };
    const section = (b: BucketKey) => {
      const items = grouped[b].filter((c) => included[rowKey(c)]).map(line);
      return items.length ? items.join("\n") : "_TBA_";
    };
    const editorLine = editor.trim() ? (editor.trim().startsWith("@") ? editor.trim() : `@${editor.trim()}`) : "@";

    return `### UTC Date & Time

[${displayDate(dateISO)}, ${time} UTC](${savvytimeUrl(dateISO, time)})

### Agenda

Editor - ${editorLine}
EIP Board: https://eipsinsight.com/board
Zoom: [Link](${zoom.trim() || "ZOOM_LINK"})

### ACD related
${acdText.trim() || "_TBA_"}

### Glamsterdam EIPs promoted to \`Review\`
${section("glamsterdam")}

### To Final
${section("final")}

### To Last Call
${section("lastcall")}

### Review
${section("review")}

### Misc
${miscText.trim() || "_TBA_"}

### Draft

${section("draft")}

### Call Series

EIP Editing Office Hour

### Autopilot Mode

- [x] Use autopilot (recommended defaults for this call series)`;
  }, [dateISO, time, editor, zoom, acdText, miscText, grouped, included, refs, includeTitles]);

  const issueTitle = `EIP Editing Office Hour (EIP + ERC) Meeting #${meetingNo.trim() || "NN"}, ${displayDate(dateISO)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Agenda body copied", { description: "Paste it into the ethereum/pm issue body." });
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copyTitle = async () => {
    try {
      await navigator.clipboard.writeText(issueTitle);
      toast.success("Issue title copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <Link
            href="/board"
            className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Board
          </Link>
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Office Hour Agenda Maker
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Status moves (Final / Last Call / Review) and drafts are pulled live from the PR board and pre-sorted. Tick what
            you want, add references, then copy the ready-to-paste agenda.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_minmax(360px,42%)]">
        {/* ── Builder ── */}
        <div className="space-y-4">
          {/* Meeting header */}
          <section className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Meeting details</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowImport((v) => !v)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-muted/50 px-2 text-xs text-foreground transition-colors hover:bg-muted"
                >
                  <ClipboardPaste className="h-3 w-3" /> Import
                </button>
                <button
                  onClick={resetAll}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-muted/50 px-2 text-xs text-foreground transition-colors hover:bg-muted"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
            </div>

            {showImport && (
              <div className="mb-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Paste an existing agenda body to edit it — the date, editor, Zoom, sections, PR selections, and refs are
                  restored. PRs that have since merged/closed drop to Misc.
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={5}
                  placeholder="Paste agenda markdown…"
                  className={textareaCls}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={applyImport}
                    disabled={!importText.trim() || loading}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Import agenda
                  </button>
                  <button
                    onClick={() => {
                      setShowImport(false);
                      setImportText("");
                    }}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-muted/60 px-3 text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Meeting #">
                <input value={meetingNo} onChange={(e) => setMeetingNo(e.target.value)} placeholder="107" className={inputCls} />
              </Field>
              <Field label="Editor (GitHub handle)">
                <input value={editor} onChange={(e) => setEditor(e.target.value)} placeholder="@samwilsn" className={inputCls} />
              </Field>
              <Field label="Date (UTC)">
                <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Time (UTC, 24h)">
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Zoom link" full>
                <input value={zoom} onChange={(e) => setZoom(e.target.value)} placeholder="https://us02web.zoom.us/j/…" className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Free-text sections */}
          <section className="rounded-xl border border-border bg-card/60 p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Manual sections</h2>
            <div className="space-y-3">
              <Field label="ACD related">
                <textarea value={acdText} onChange={(e) => setAcdText(e.target.value)} rows={2} placeholder="Leave blank for _TBA_ — no reliable signal for ACD items, editor's call" className={textareaCls} />
              </Field>
              <Field label="Misc">
                <textarea value={miscText} onChange={(e) => setMiscText(e.target.value)} rows={3} placeholder="Leave blank for _TBA_" className={textareaCls} />
              </Field>
            </div>
          </section>

          {/* Auto buckets */}
          <section className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Pull requests from the board</h2>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={includeTitles} onChange={(e) => setIncludeTitles(e.target.checked)} className="accent-primary" />
                Include titles
              </label>
            </div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by PR #, title, author"
                className="h-9 w-full rounded-md border border-border bg-muted/60 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading candidates…</p>
            ) : (
              <div className="space-y-2">
                {BUCKETS.map((b) => {
                  const rows = grouped[b.key].filter(matchesSearch);
                  const isCollapsed = collapsed[b.key];
                  return (
                    <div key={b.key} className="rounded-lg border border-border/70">
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <button
                          onClick={() => setCollapsed((p) => ({ ...p, [b.key]: !p[b.key] }))}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"
                        >
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {b.heading}
                          <span className="text-xs text-muted-foreground">
                            {selectedCount(b.key)}/{grouped[b.key].length} selected
                          </span>
                        </button>
                        <div className="flex items-center gap-1 text-[11px]">
                          <button onClick={() => bulk(b.key, true)} className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">All</button>
                          <button onClick={() => bulk(b.key, false)} className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">None</button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="max-h-96 overflow-y-auto border-t border-border/70">
                          {rows.length === 0 ? (
                            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matching PRs.</p>
                          ) : (
                            rows.map((c) => {
                              const key = rowKey(c);
                              const on = !!included[key];
                              return (
                                <div key={key} className={cn("flex items-start gap-2 border-b border-border/50 px-3 py-2 last:border-0", on && "bg-primary/5")}>
                                  <input type="checkbox" checked={on} onChange={() => toggle(key)} className="mt-0.5 accent-primary" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 text-xs">
                                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-primary hover:underline">
                                        {c.repoShort} #{c.prNumber}
                                      </a>
                                      {c.isNew && <span className="rounded bg-emerald-500/15 px-1 text-[10px] text-emerald-600 dark:text-emerald-400">new</span>}
                                      <span className="text-[10px] text-muted-foreground">{c.waitDays}d</span>
                                    </div>
                                    <p className="truncate text-xs text-foreground">{c.title ?? "Untitled"}</p>
                                    {on && (
                                      <input
                                        value={refs[key] ?? ""}
                                        onChange={(e) => setRef(key, e.target.value)}
                                        placeholder="Ref: (optional link/note)"
                                        className="mt-1 h-6 w-full rounded border border-border bg-background px-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── Live preview ── */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Agenda preview</h2>
              <button
                onClick={copy}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy body"}
              </button>
            </div>

            {/* The GitHub issue title (separate field from the body). */}
            <div className="mb-3">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Issue title
              </span>
              <div className="flex items-center gap-1.5">
                <input readOnly value={issueTitle} className={cn(inputCls, "font-mono text-xs")} />
                <button
                  onClick={copyTitle}
                  title="Copy issue title"
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 text-xs text-foreground transition-colors hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <pre className="max-h-[62vh] overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
              {markdown}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-border bg-muted/60 px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30";
const textareaCls =
  "w-full resize-y rounded-md border border-border bg-muted/60 px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={cn("block", full && "sm:col-span-2")}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
