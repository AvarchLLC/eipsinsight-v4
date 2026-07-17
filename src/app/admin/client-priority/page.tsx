'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { client } from '@/lib/orpc';


type Stance = {
  clientName: string;
  clientType: 'EL' | 'CL';
  ratingSystem: string;
  rawRating: string;
  normalizedScore: number | null;
  comment?: string;
  sourceUrl?: string;
};

type EipStances = { eipId: number; stances: Stance[] };

const EMPTY_STANCE: Stance = {
  clientName: '',
  clientType: 'EL',
  ratingSystem: 'custom',
  rawRating: '',
  normalizedScore: null,
  comment: '',
  sourceUrl: '',
};

export default function AdminClientPriorityPage() {
  const [slug, setSlug] = useState('glamsterdam');
  const [eips, setEips] = useState<EipStances[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editingEip, setEditingEip] = useState<number | null>(null);
  const [newEipId, setNewEipId] = useState('');
  const [draft, setDraft] = useState<Stance[]>([]);
  const [saving, setSaving] = useState(false);

  const load = (forkSlug: string) => {
    setLoading(true);
    client.clientPriority
      .getClientPriority({ slug: forkSlug })
      .then((data) => setEips(data?.eips ?? []))
      .catch((error: { code?: string }) => {
        if (error?.code === 'FORBIDDEN' || error?.code === 'UNAUTHORIZED') setForbidden(true);
        else setEips([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // verify admin + prime the list
    client.clientPriority
      .listClientPriorityForks({})
      .then(() => load(slug))
      .catch((error: { code?: string }) => {
        if (error?.code === 'FORBIDDEN' || error?.code === 'UNAUTHORIZED') setForbidden(true);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedEips = useMemo(() => [...eips].sort((a, b) => a.eipId - b.eipId), [eips]);

  const openEditor = (eipId: number, stances: Stance[]) => {
    setEditingEip(eipId);
    setDraft(stances.length > 0 ? stances.map((s) => ({ ...s })) : [{ ...EMPTY_STANCE }]);
  };

  const saveEip = async () => {
    if (editingEip == null) return;
    const cleaned = draft
      .filter((s) => s.clientName.trim() && s.rawRating.trim())
      .map((s) => ({
        clientName: s.clientName.trim(),
        clientType: s.clientType,
        ratingSystem: s.ratingSystem.trim() || 'custom',
        rawRating: s.rawRating.trim(),
        normalizedScore: s.normalizedScore,
        comment: s.comment?.trim() || undefined,
        sourceUrl: s.sourceUrl?.trim() || undefined,
      }));
    setSaving(true);
    try {
      await client.clientPriority.upsertClientPriorityEip({ slug, eipId: editingEip, stances: cleaned });
      toast.success(`Saved EIP-${editingEip}`);
      setEditingEip(null);
      load(slug);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const removeEip = async (eipId: number) => {
    if (!window.confirm(`Remove all client stances for EIP-${eipId}?`)) return;
    try {
      await client.clientPriority.deleteClientPriorityEip({ slug, eipId });
      toast.success(`Removed EIP-${eipId}`);
      setEips((current) => current.filter((e) => e.eipId !== eipId));
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (forbidden) {
    return (
      <div className="page-shell py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an admin account to edit client priority.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-card/60">
        <div className="page-shell py-8">
          <Link href="/admin" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
            ← Admin console
          </Link>
          <h1 className="dec-title persona-title mt-2 text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            Client Priority
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Client-team stances on candidate EIPs, shown on the upgrade&apos;s Client priority tab.
            Seeded from a public snapshot; owned and editable here.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Upgrade</label>
            <select
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value);
                setEditingEip(null);
                load(event.target.value);
              }}
              className="h-9 rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50"
            >
              <option value="glamsterdam">Glamsterdam</option>
              <option value="hegota">Hegotá</option>
            </select>
          </div>
        </div>
      </section>

      <div className="page-shell space-y-4 py-10">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{sortedEips.length} EIPs with stances</p>
          <button
            onClick={() => {
              const id = Number.parseInt(newEipId, 10);
              if (!Number.isFinite(id) || id <= 0) {
                toast.error('Enter a valid EIP number');
                return;
              }
              openEditor(id, []);
              setNewEipId('');
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15"
          >
            <Plus className="h-4 w-4" />
            Add EIP
          </button>
        </div>
        <input
          value={newEipId}
          onChange={(event) => setNewEipId(event.target.value)}
          placeholder="New EIP number, then click Add EIP"
          className="h-9 w-56 rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground outline-none focus:border-primary/50"
        />

        {editingEip != null && (
          <div className="rounded-xl border border-primary/30 bg-card/60 p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">EIP-{editingEip} stances</h2>
              <button onClick={() => setEditingEip(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {draft.map((stance, index) => (
                <div key={index} className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-2 sm:grid-cols-12">
                  <input
                    value={stance.clientName}
                    onChange={(e) => setDraft((d) => d.map((s, i) => (i === index ? { ...s, clientName: e.target.value } : s)))}
                    placeholder="Client"
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs sm:col-span-2"
                  />
                  <select
                    value={stance.clientType}
                    onChange={(e) => setDraft((d) => d.map((s, i) => (i === index ? { ...s, clientType: e.target.value as 'EL' | 'CL' } : s)))}
                    className="h-8 rounded-md border border-border bg-background px-1 text-xs sm:col-span-1"
                  >
                    <option value="EL">EL</option>
                    <option value="CL">CL</option>
                  </select>
                  <input
                    value={stance.rawRating}
                    onChange={(e) => setDraft((d) => d.map((s, i) => (i === index ? { ...s, rawRating: e.target.value } : s)))}
                    placeholder="Rating (S / support)"
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs sm:col-span-2"
                  />
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={stance.normalizedScore ?? ''}
                    onChange={(e) =>
                      setDraft((d) =>
                        d.map((s, i) =>
                          i === index ? { ...s, normalizedScore: e.target.value === '' ? null : Number(e.target.value) } : s
                        )
                      )
                    }
                    placeholder="1-5"
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs sm:col-span-1"
                  />
                  <input
                    value={stance.comment ?? ''}
                    onChange={(e) => setDraft((d) => d.map((s, i) => (i === index ? { ...s, comment: e.target.value } : s)))}
                    placeholder="Comment (optional)"
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs sm:col-span-5"
                  />
                  <button
                    onClick={() => setDraft((d) => d.filter((_, i) => i !== index))}
                    className="flex h-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:border-red-500/40 hover:text-red-400 sm:col-span-1"
                    title="Remove row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setDraft((d) => [...d, { ...EMPTY_STANCE }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add client
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingEip(null)}
                  className="rounded-md border border-border bg-muted/60 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEip}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card/60">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sortedEips.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No stances yet for this upgrade. Use “Add EIP” to start.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {sortedEips.map((eip) => (
                <li key={eip.eipId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-20 font-mono text-xs font-semibold text-primary">EIP-{eip.eipId}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {eip.stances.map((s) => `${s.clientName} ${s.rawRating}`).join(' · ')}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {eip.stances.length} clients
                  </span>
                  <button
                    onClick={() => openEditor(eip.eipId, eip.stances)}
                    className="rounded-md border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeEip(eip.eipId)}
                    className="rounded-md border border-border bg-muted/60 p-1.5 text-muted-foreground hover:border-red-500/40 hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
