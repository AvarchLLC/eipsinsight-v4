'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useSession';
import { client } from '@/lib/orpc';

/**
 * Subscribe to status changes for the whole tracked PQ EIP set in one click.
 * Backed by the existing proposal-subscription system + the scheduler's
 * proposal-status notifier (one batched RPC, real subscribe/unsubscribe state),
 * so the user is emailed whenever any PQ proposal moves — no bespoke channel.
 */
export function PqAlertsSubscribe() {
  const router = useRouter();
  const { data: session, loading: sessionLoading } = useSession();
  const [state, setState] = useState<{ total: number; subscribed: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session?.user) {
      setState(null);
      return;
    }
    let cancelled = false;
    client.subscriptions
      .getPqSubscription({})
      .then((s) => {
        if (!cancelled) setState(s as { total: number; subscribed: number });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  const isSubscribed = !!state && state.total > 0 && state.subscribed >= state.total;

  const handleClick = async () => {
    if (!session?.user) {
      toast.info('Sign in to subscribe to PQ status alerts');
      router.push('/login');
      return;
    }
    setBusy(true);
    try {
      if (isSubscribed) {
        const r = (await client.subscriptions.unsubscribeFromPq({})) as { total: number; subscribed: number };
        setState(r);
        toast.success('Unsubscribed from PQ status alerts');
      } else {
        const r = (await client.subscriptions.subscribeToPq({ filter: 'status' })) as { total: number; subscribed: number };
        setState(r);
        toast.success(`Subscribed to ${r.subscribed} PQ EIP${r.subscribed === 1 ? '' : 's'}`, {
          description: 'You will be emailed when any tracked PQ proposal changes status.',
        });
      }
    } catch {
      toast.error('Could not update subscription — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const label = busy
    ? isSubscribed
      ? 'Updating…'
      : 'Subscribing…'
    : isSubscribed
      ? 'Subscribed'
      : 'Subscribe';

  return (
    <button
      onClick={handleClick}
      disabled={busy || sessionLoading}
      className={
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ' +
        (isSubscribed
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'
          : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15')
      }
      title={
        isSubscribed
          ? 'You are subscribed to status changes for all tracked PQ EIPs — click to unsubscribe'
          : 'Email me when any tracked PQ EIP changes status'
      }
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isSubscribed ? (
        <BellRing className="h-3.5 w-3.5" />
      ) : (
        <Bell className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
