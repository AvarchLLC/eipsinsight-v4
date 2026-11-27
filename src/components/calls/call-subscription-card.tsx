'use client';

import { useEffect, useState } from 'react';
import { Bell, CalendarPlus, Check, Loader2, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { client } from '@/lib/orpc';
import { useSession } from '@/hooks/useSession';
import { cn } from '@/lib/utils';

const CALL_SERIES_OPTIONS = [
  { id: 'all', label: 'All Protocol Calls' },
  { id: 'acdc', label: 'ACDC (Consensus)' },
  { id: 'acde', label: 'ACDE (Execution)' },
  { id: 'acdt', label: 'ACDT (Testing)' },
  { id: 'acdtcl', label: 'ACDT-CL (Testing CL)' },
  { id: 'breakouts', label: 'Breakout Calls (All)' },
  { id: 'eipip', label: 'EIPIP' },
  { id: 'eipoh', label: 'Office Hours' },
] as const;

const BREAKOUT_OPTIONS = [
  { id: 'epbs', label: 'ePBS', title: 'ePBS Breakout (EIP-7732)' },
  { id: 'bal', label: 'BAL', title: 'BAL Breakout (EIP-7928)' },
  { id: 'focil', label: 'FOCIL', title: 'FOCIL Breakout' },
  { id: 'zkevm', label: 'zkEVM', title: 'L1-zkEVM Breakout' },
  { id: 'fcr', label: 'FCR', title: 'Fast Confirmation Rule' },
  { id: 'price', label: 'Repricing', title: 'Glamsterdam Repricings' },
  { id: 'rpc', label: 'RPC', title: 'RPC Standards' },
  { id: 'awd', label: 'AllWalletDevs', title: 'AllWalletDevs' },
  { id: 'pqts', label: 'PQTS', title: 'PQ Transaction Signatures' },
  { id: 'pqi', label: 'PQ Interop', title: 'PQ Interop' },
  { id: 'tli', label: 'TLI', title: 'Trustless Log Index' },
  { id: 'etm', label: 'ETM', title: 'Encrypt The Mempool' },
  { id: 'aa', label: 'Native AA', title: 'Native Account Abstraction' },
  { id: 'p2p', label: 'P2P', title: 'P2P Networking' },
  { id: 'ssz', label: 'SSZ', title: 'SSZ Engine API' },
  { id: 'ethproofs', label: 'EthProofs', title: 'EthProofs' },
] as const;

type UpcomingItem = {
  series: string | null;
  title: string;
  issue_url: string | null;
  occurs_at: string | null;
  occurs_on: string | null;
  youtube_url?: string | null;
  zoom_url?: string | null;
};

const toCalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export function CallSubscriptionCard({ upcoming = [] }: { upcoming?: UpcomingItem[] }) {
  const { data: session, loading: sessionLoading } = useSession();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(['all']);
  const [saved, setSaved] = useState<string[]>([]);
  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sessionLoading || !session?.user) {
      setSaved([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    client.subscriptions
      .getCallSubscriptions({})
      .then((res) => {
        if (cancelled) return;
        setSaved(res.series);
        if (res.series.length > 0) setSelected(res.series);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user, sessionLoading]);

  const topLevelIds: string[] = CALL_SERIES_OPTIONS.map((o) => o.id).filter((id) => id !== 'all');
  const breakoutIds: string[] = BREAKOUT_OPTIONS.map((b) => b.id);

  const toggleSeries = (id: string) => {
    if (id === 'all') {
      setSelected((prev) => (prev.includes('all') ? [] : ['all']));
      return;
    }
    setSelected((prev) => {
      // If 'all' is currently active, expand it to all top-level series before toggling
      const base = prev.includes('all') ? [...topLevelIds] : prev;

      if (id === 'breakouts') {
        const hasBreakouts = base.includes('breakouts') || breakoutIds.some((b) => base.includes(b));
        const cleaned = base.filter((x) => x !== 'breakouts' && !breakoutIds.includes(x));
        const next = hasBreakouts ? cleaned : [...cleaned, 'breakouts'];
        return topLevelIds.every((t) => next.includes(t)) ? ['all'] : next;
      }

      if (breakoutIds.includes(id)) {
        const expanded = base.includes('breakouts')
          ? [...base.filter((x) => x !== 'breakouts'), ...breakoutIds.filter((b) => b !== id)]
          : base.includes(id)
            ? base.filter((x) => x !== id)
            : [...base, id];
        const allPicked = breakoutIds.every((b) => expanded.includes(b));
        const next = allPicked
          ? [...expanded.filter((x) => !breakoutIds.includes(x)), 'breakouts']
          : expanded;
        return topLevelIds.every((t) => next.includes(t)) ? ['all'] : next;
      }

      const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      return topLevelIds.every((t) => next.includes(t)) ? ['all'] : next;
    });
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one call series');
      return;
    }
    if (!session?.user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      toast.error('Enter a valid email address');
      return;
    }
    setSaving(true);
    try {
      const res = await client.subscriptions.subscribeToCalls({
        series: selected,
        email: session?.user ? undefined : guestEmail.trim(),
      });
      setSaved(res.series);
      setSelected(res.series);
      toast.success(
        res.series.includes('all')
          ? 'Subscribed to email alerts for all protocol calls'
          : `Subscribed to ${res.series.map((s) => s.toUpperCase()).join(', ')} call alerts`,
      );
      setOpen(false);
    } catch {
      toast.error('Failed to save call alert preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!session?.user) return;
    setSaving(true);
    try {
      await client.subscriptions.unsubscribeFromCalls({});
      setSaved([]);
      toast.success('Unsubscribed from protocol call email alerts');
    } catch {
      toast.error('Failed to unsubscribe');
    } finally {
      setSaving(false);
    }
  };

  const downloadUpcomingCalendar = () => {
    const events = upcoming
      .map((c) => {
        const start = c.occurs_at
          ? new Date(c.occurs_at)
          : c.occurs_on
            ? new Date(`${c.occurs_on.slice(0, 10)}T14:00:00Z`)
            : null;
        if (!start || Number.isNaN(start.getTime())) return null;
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const lines: string[] = [];
        if (c.zoom_url) lines.push(`Zoom: ${c.zoom_url}`);
        if (c.youtube_url) lines.push(`YouTube Live: ${c.youtube_url}`);
        if (c.issue_url) lines.push(`Agenda: ${c.issue_url}`);
        const location = c.zoom_url || c.youtube_url || c.issue_url || 'https://eipsinsight.com/calls';
        return [
          'BEGIN:VEVENT',
          `UID:${toCalStamp(start)}-${c.title.replace(/[^a-z0-9]/gi, '').slice(0, 20)}@eipsinsight.com`,
          `DTSTAMP:${toCalStamp(new Date())}`,
          `DTSTART:${toCalStamp(start)}`,
          `DTEND:${toCalStamp(end)}`,
          `SUMMARY:${c.title.replace(/[\r\n]/g, ' ')}`,
          `LOCATION:${location}`,
          `DESCRIPTION:${lines.join('\\n')}`,
          'END:VEVENT',
        ].join('\r\n');
      })
      .filter(Boolean);

    if (events.length === 0) {
      toast.message('No scheduled upcoming call dates to export');
      return;
    }

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EIPsInsight//Protocol Calls//EN',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ethereum-protocol-calls.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${events.length} upcoming calls (.ics)`);
  };

  const isSubscribed = saved.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="chip h-8 cursor-pointer gap-1.5 px-3 text-xs font-medium"
      >
        <Bell className={cn('h-3.5 w-3.5', isSubscribed ? 'text-[#10b981]' : 'text-[var(--brand-strong)]')} />
        <span>{isSubscribed ? 'Call Alerts Active' : 'Get Call Alerts'}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Protocol Call Alerts"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--ink)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--brand-strong)]" />
                  <h3 className="text-sm font-semibold">Protocol Call Alerts &amp; Calendar</h3>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Pick the calls you want email alerts for (with Zoom &amp; agenda links), or export upcoming calls to your calendar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-[var(--ink-faint)] hover:text-[var(--ink)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="eyebrow">Select Call Series</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {CALL_SERIES_OPTIONS.map((opt) => {
                  const checked =
                    selected.includes('all') ||
                    (opt.id === 'breakouts'
                      ? selected.includes('breakouts') || BREAKOUT_OPTIONS.some((b) => selected.includes(b.id))
                      : selected.includes(opt.id));
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleSeries(opt.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-[var(--l-radius-control)] border px-2.5 py-2 text-left text-xs transition-colors cursor-pointer',
                        checked
                          ? 'border-[var(--ink)] bg-[var(--surface-2)] font-medium text-[var(--ink)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--ink)]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          checked
                            ? 'border-[var(--brand-strong)] bg-[var(--brand-strong)] text-white'
                            : 'border-[var(--border-strong)] bg-transparent',
                        )}
                      >
                        {checked && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {(selected.includes('breakouts') || BREAKOUT_OPTIONS.some((b) => selected.includes(b.id))) && (
                <div className="rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                      Breakout &amp; Working Groups ({selected.includes('breakouts') ? BREAKOUT_OPTIONS.length : BREAKOUT_OPTIONS.filter((b) => selected.includes(b.id)).length}/{BREAKOUT_OPTIONS.length})
                    </p>
                    {!selected.includes('breakouts') && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelected((prev) => [
                            ...prev.filter((x) => x !== 'all' && !BREAKOUT_OPTIONS.some((b) => b.id === x)),
                            'breakouts',
                          ])
                        }
                        className="font-mono text-[10px] text-[var(--brand-strong)] hover:underline cursor-pointer"
                      >
                        Select all
                      </button>
                    )}
                  </div>
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {BREAKOUT_OPTIONS.map((b) => {
                      const bChecked = selected.includes('breakouts') || selected.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          title={b.title}
                          onClick={() => toggleSeries(b.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors',
                            bChecked
                              ? 'border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)]'
                              : 'border-[var(--border)] bg-transparent text-[var(--ink-faint)] hover:text-[var(--ink)]',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-3.5 w-3.5 items-center justify-center rounded border',
                              bChecked
                                ? 'border-[var(--brand-strong)] bg-[var(--brand-strong)] text-white'
                                : 'border-[var(--border-strong)]',
                            )}
                          >
                            {bChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </span>
                          <span>{b.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-1.5">
              <p className="eyebrow">Email Notification</p>
              {session?.user ? (
                <p className="rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--ink-muted)]">
                  Sending to <strong className="text-[var(--ink)]">{session.user.email}</strong>
                </p>
              ) : (
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Enter your email — e.g. you@ethereum.org"
                  className="h-9 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--ink)]"
                />
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={downloadUpcomingCalendar}
                className="chip h-8 cursor-pointer gap-1.5 px-3 text-xs"
              >
                <CalendarPlus className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
                <span>Export All (.ics)</span>
              </button>

              <div className="flex items-center gap-2">
                {isSubscribed && (
                  <button
                    type="button"
                    onClick={handleUnsubscribe}
                    disabled={saving}
                    className="btn h-8 px-3 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  >
                    Unsubscribe
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="btn btn-primary h-8 px-3.5 text-xs font-semibold disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{isSubscribed ? 'Save' : 'Subscribe'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
