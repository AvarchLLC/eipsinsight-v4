'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Pencil, Plus, Sparkles, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { client } from '@/lib/orpc';
import { STAKEHOLDER_GROUPS } from '@/lib/stakeholders';

const STAKEHOLDERS = STAKEHOLDER_GROUPS;

type Curation = {
  eip_number: number;
  layman_title: string | null;
  layman_summary: string | null;
  layer: string | null;
  benefits: string[];
  tradeoffs: string[];
  stakeholder_impacts: Record<string, { description?: string }> | null;
  headliner_of: string | null;
  headliner_note: string | null;
  updated_by: string | null;
  updated_at: string;
};

type EditorState = {
  eip_number: string;
  layman_title: string;
  layman_summary: string;
  layer: '' | 'EL' | 'CL';
  benefits: string;
  tradeoffs: string;
  headliner_of: string;
  headliner_note: string;
  stakeholders: Record<string, string>;
};

const EMPTY_STAKEHOLDERS = Object.fromEntries(STAKEHOLDERS.map((s) => [s.key, '']));

const EMPTY_EDITOR: EditorState = {
  eip_number: '',
  layman_title: '',
  layman_summary: '',
  layer: '',
  benefits: '',
  tradeoffs: '',
  headliner_of: '',
  headliner_note: '',
  stakeholders: { ...EMPTY_STAKEHOLDERS },
};

function toEditorState(curation: Curation): EditorState {
  return {
    eip_number: String(curation.eip_number),
    layman_title: curation.layman_title ?? '',
    layman_summary: curation.layman_summary ?? '',
    layer: curation.layer === 'EL' || curation.layer === 'CL' ? curation.layer : '',
    benefits: curation.benefits.join('\n'),
    tradeoffs: curation.tradeoffs.join('\n'),
    headliner_of: curation.headliner_of ?? '',
    headliner_note: curation.headliner_note ?? '',
    stakeholders: {
      ...EMPTY_STAKEHOLDERS,
      ...Object.fromEntries(
        STAKEHOLDERS.map((s) => [s.key, curation.stakeholder_impacts?.[s.key]?.description ?? ''])
      ),
    },
  };
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function AdminCurationsPage() {
  const [curations, setCurations] = useState<Curation[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingEip, setDeletingEip] = useState<number | null>(null);

  const generateWithAi = async () => {
    if (!editor) return;
    const eipNumber = Number.parseInt(editor.eip_number, 10);
    if (!Number.isFinite(eipNumber) || eipNumber <= 0) {
      toast.error('Enter a valid EIP number first');
      return;
    }
    setGenerating(true);
    try {
      const g = await client.curations.generateEipCuration({ eip_number: eipNumber });
      setEditor((current) =>
        current
          ? {
              ...current,
              layman_title: g.layman_title ?? current.layman_title,
              layman_summary: g.layman_summary ?? current.layman_summary,
              benefits: g.benefits.length ? g.benefits.join('\n') : current.benefits,
              tradeoffs: g.tradeoffs.length ? g.tradeoffs.join('\n') : current.tradeoffs,
              stakeholders: {
                ...EMPTY_STAKEHOLDERS,
                ...Object.fromEntries(
                  STAKEHOLDERS.map((s) => [s.key, g.stakeholder_impacts?.[s.key]?.description ?? '']),
                ),
              },
            }
          : current,
      );
      toast.success('Draft generated - review, then Save to keep it');
    } catch {
      toast.error('Could not generate (no spec or model error)');
    } finally {
      setGenerating(false);
    }
  };

  // All state updates happen in async callbacks (initial `loading` is true),
  // so the effect body never calls setState synchronously.
  const fetchCurations = () => {
    client.curations
      .listEipCurations({})
      .then(setCurations)
      .catch((error: { code?: string }) => {
        if (error?.code === 'FORBIDDEN' || error?.code === 'UNAUTHORIZED') {
          setForbidden(true);
        } else {
          toast.error('Failed to load curations');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchCurations, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return curations;
    return curations.filter(
      (curation) =>
        String(curation.eip_number).includes(query) ||
        `eip-${curation.eip_number}`.includes(query) ||
        (curation.layman_title ?? '').toLowerCase().includes(query) ||
        (curation.layman_summary ?? '').toLowerCase().includes(query) ||
        (curation.headliner_of ?? '').toLowerCase().includes(query)
    );
  }, [curations, search]);

  const save = async () => {
    if (!editor) return;
    const eipNumber = Number.parseInt(editor.eip_number, 10);
    if (!Number.isFinite(eipNumber) || eipNumber <= 0) {
      toast.error('Enter a valid EIP number');
      return;
    }
    setSaving(true);
    try {
      await client.curations.upsertEipCuration({
        eip_number: eipNumber,
        layman_title: editor.layman_title.trim() || null,
        layman_summary: editor.layman_summary.trim() || null,
        layer: editor.layer || null,
        benefits: splitLines(editor.benefits),
        tradeoffs: splitLines(editor.tradeoffs),
        headliner_of: editor.headliner_of.trim() || null,
        headliner_note: editor.headliner_note.trim() || null,
        stakeholder_impacts: Object.fromEntries(
          STAKEHOLDERS.map((s) => [s.key, { description: editor.stakeholders[s.key]?.trim() ?? '' }])
        ),
      });
      toast.success(`Saved curation for EIP-${eipNumber}`);
      setEditor(null);
      setIsNew(false);
      fetchCurations();
    } catch {
      toast.error('Failed to save curation');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (eipNumber: number) => {
    if (!window.confirm(`Delete curated content for EIP-${eipNumber}?`)) return;
    setDeletingEip(eipNumber);
    try {
      await client.curations.deleteEipCuration({ eip_number: eipNumber });
      toast.success(`Deleted curation for EIP-${eipNumber}`);
      setCurations((current) => current.filter((row) => row.eip_number !== eipNumber));
    } catch {
      toast.error('Failed to delete curation');
    } finally {
      setDeletingEip(null);
    }
  };

  if (forbidden) {
    return (
      <div className="page-shell py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an admin account to manage EIP curations.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-card/60">
        <div className="page-shell py-8">
          <Link
            href="/admin"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            ← Admin console
          </Link>
          <h1 className="dec-title persona-title mt-2 text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            EIP Curations
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Plain-language summaries, benefits, and tradeoffs shown on the /upgrade pages.
            Seeded from public curation datasets; rows edited here are never overwritten
            by re-imports.
          </p>
        </div>
      </section>

      <div className="page-shell space-y-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by EIP number, title, or upgrade slug…"
            className="h-9 w-full max-w-sm rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
          <button
            onClick={() => {
              setEditor(EMPTY_EDITOR);
              setIsNew(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <Plus className="h-4 w-4" />
            New curation
          </button>
        </div>

        {editor && (
          <div className="rounded-xl border border-primary/30 bg-card/60 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {isNew ? 'New curation' : `Editing EIP-${editor.eip_number}`}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateWithAi}
                  disabled={generating}
                  title="Draft summary, benefits, tradeoffs & stakeholder impacts from the EIP spec"
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generate with AI
                </button>
                <button
                  onClick={() => {
                    setEditor(null);
                    setIsNew(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                EIP number
                <input
                  value={editor.eip_number}
                  disabled={!isNew}
                  onChange={(event) => setEditor({ ...editor, eip_number: event.target.value })}
                  placeholder="7594"
                  className="h-9 rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Layman title (optional)
                <input
                  value={editor.layman_title}
                  onChange={(event) => setEditor({ ...editor, layman_title: event.target.value })}
                  placeholder="Short human-friendly title"
                  className="h-9 rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
                Layman summary
                <textarea
                  value={editor.layman_summary}
                  onChange={(event) => setEditor({ ...editor, layman_summary: event.target.value })}
                  rows={3}
                  placeholder="What this EIP does, in plain language."
                  className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Benefits (one per line)
                <textarea
                  value={editor.benefits}
                  onChange={(event) => setEditor({ ...editor, benefits: event.target.value })}
                  rows={4}
                  className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Trade-offs (one per line)
                <textarea
                  value={editor.tradeoffs}
                  onChange={(event) => setEditor({ ...editor, tradeoffs: event.target.value })}
                  rows={4}
                  className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Headliner of (upgrade slug, optional)
                <input
                  value={editor.headliner_of}
                  onChange={(event) => setEditor({ ...editor, headliner_of: event.target.value })}
                  placeholder="glamsterdam"
                  className="h-9 rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Headliner note (optional)
                <input
                  value={editor.headliner_note}
                  onChange={(event) => setEditor({ ...editor, headliner_note: event.target.value })}
                  placeholder="Why this is the headliner"
                  className="h-9 rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Layer
                <select
                  value={editor.layer}
                  onChange={(event) =>
                    setEditor({ ...editor, layer: event.target.value as EditorState['layer'] })
                  }
                  className="h-9 rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                >
                  <option value="">— unset —</option>
                  <option value="EL">Execution Layer (EL)</option>
                  <option value="CL">Consensus Layer (CL)</option>
                </select>
              </label>
            </div>

            {/* Stakeholder impacts */}
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Stakeholder impacts
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Who this EIP affects and how. Shown on the upgrade&apos;s Stakeholders tab. Leave a
                group blank to omit it.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {STAKEHOLDERS.map((stakeholder) => (
                  <label
                    key={stakeholder.key}
                    className="flex flex-col gap-1 text-xs font-medium text-muted-foreground"
                  >
                    {stakeholder.label}
                    <textarea
                      value={editor.stakeholders[stakeholder.key] ?? ''}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          stakeholders: {
                            ...editor.stakeholders,
                            [stakeholder.key]: event.target.value,
                          },
                        })
                      }
                      rows={2}
                      placeholder={`How ${stakeholder.label.toLowerCase()} are affected…`}
                      className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditor(null);
                  setIsNew(false);
                }}
                className="rounded-md border border-border bg-muted/60 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">EIP</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="hidden px-4 py-3 md:table-cell">Headliner</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Updated by</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((curation) => (
                    <tr
                      key={curation.eip_number}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-primary">
                        <Link href={`/eip/${curation.eip_number}`} className="hover:underline">
                          EIP-{curation.eip_number}
                        </Link>
                      </td>
                      <td className="max-w-md px-4 py-3 text-muted-foreground">
                        <span className="line-clamp-2">
                          {curation.layman_summary || curation.layman_title || (
                            <span className="italic opacity-60">No summary</span>
                          )}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {curation.headliner_of ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <Star className="h-3 w-3 fill-current" />
                            {curation.headliner_of}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                        {curation.updated_by ?? '—'}
                        <span className="ml-1 opacity-60">{curation.updated_at.slice(0, 10)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditor(toEditorState(curation));
                              setIsNew(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="rounded-md border border-border bg-muted/60 p-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(curation.eip_number)}
                            disabled={deletingEip === curation.eip_number}
                            className="rounded-md border border-border bg-muted/60 p-1.5 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingEip === curation.eip_number ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        <FileText className="mx-auto mb-2 h-6 w-6 opacity-40" />
                        No curations match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
