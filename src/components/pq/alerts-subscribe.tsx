'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useSession';
import { client } from '@/lib/orpc';
import { PQ_EIPS } from '@/data/pq-registry';

/**
 * One-click subscribe to status changes for every tracked PQ EIP, using the
 * existing per-proposal subscription mechanism. This is how a coordinator gets
 * emailed when any PQ proposal moves — the closest thing to "subscribe to the
 * PQ alert feed" that the notification backend supports today.
 */
export function PqAlertsSubscribe() {
  const router = useRouter();
  const { data: session, loading } = useSession();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (!session?.user) {
      toast.info('Sign in to subscribe to PQ status alerts');
      router.push('/login');
      return;
    }
    setBusy(true);
    try {
      const results = await Promise.allSettled(
        PQ_EIPS.map((e) => client.subscriptions.subscribeToProposal({ repo: 'eip', number: e.number, filter: 'status' })),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      setDone(true);
      toast.success(`Subscribed to ${ok} PQ EIP${ok === 1 ? '' : 's'}`, {
        description: 'You will be emailed when any tracked PQ proposal changes status.',
      });
    } catch {
      toast.error('Could not subscribe — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy || loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
      title="Email me when any tracked PQ EIP changes status"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {done ? 'Subscribed' : 'Subscribe'}
    </button>
  );
}
