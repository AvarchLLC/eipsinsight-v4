'use client';

import { useEffect, useState } from 'react';
import { Activity, Boxes, CheckCircle2, ExternalLink, Layers, Radio, TrendingUp, Wallet } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';

type Op = {
  userOpHash: string;
  txHash: string;
  sender: string;
  paymaster: string | null;
  success: boolean;
  actualGasCost: string;
  timestamp: number;
};
type FrameTx = {
  hash: string;
  from: string;
  frameCount: number;
  allSucceeded: boolean;
  timestamp: number;
};
type Testnet = {
  online: boolean;
  chainId: number;
  status: string;
  blockNumber: number | null;
  entryPoint: string | null;
  explorerBase: string;
  rpc: string;
  smartAccounts: number;
  nativeWallets: number;
  operationCount: number;
  operationSuccessRate: number | null;
  frameTxCount: number;
  frameTxSuccessRate: number | null;
  recentOps: Op[];
  recentFrames: FrameTx[];
  checkedAt: string;
};
type HistPoint = { date: string; smartAccounts: number; operations: number; frameTxs: number };

function shortHash(h: string, head = 8, tail = 6) {
  if (!h || h.length <= head + tail + 2) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

function timeAgo(tsSec: number) {
  if (!tsSec) return '';
  const diff = Date.now() / 1000 - tsSec;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function pct(r: number | null) {
  return r == null ? '—' : `${Math.round(r * 100)}%`;
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Boxes; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function DaisugiPanel() {
  const [data, setData] = useState<Testnet | null>(null);
  const [history, setHistory] = useState<HistPoint[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client.pq
      .getTestnet()
      .then((d) => {
        if (!cancelled) setData(d as Testnet);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    client.pq
      .getTestnetHistory()
      .then((h) => {
        if (!cancelled) setHistory(h as HistPoint[]);
      })
      .catch(() => {
        /* no history yet — chart stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;

  if (data === null) {
    return (
      <section className="rounded-xl border border-border bg-card/60 p-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 animate-pulse" /> Connecting to the Daisugi testnet…
        </span>
      </section>
    );
  }

  const ex = data.explorerBase;

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <Activity className="h-4 w-4 text-primary" /> Daisugi testnet — live
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              data.online && data.status === 'operational'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', data.online ? 'bg-emerald-500' : 'bg-amber-500')} />
            {data.online ? data.status : 'unreachable'}
          </span>
          <a
            href={ex}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Explorer <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        End-to-end PQ signatures exercised live: ERC-4337 UserOperations signed with a SPHINCS+ variant, plus native EIP-8141 frame transactions (type 0x06).
        {data.blockNumber ? ` Chain ${data.chainId} · block ${data.blockNumber.toLocaleString()}.` : ` Chain ${data.chainId}.`}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={Wallet} label="Smart accounts" value={data.smartAccounts.toLocaleString()} sub={`${data.nativeWallets} native factory`} />
        <Stat icon={Boxes} label="UserOps" value={data.operationCount.toLocaleString()} sub={`${pct(data.operationSuccessRate)} recent success`} />
        <Stat icon={Layers} label="Frame txs" value={data.frameTxCount.toLocaleString()} sub={`${pct(data.frameTxSuccessRate)} all-frames OK`} />
        <Stat icon={CheckCircle2} label="EIP-8141" value="type 0x06" sub="native frame tx" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent UserOperations</span>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-300">ERC-4337</span>
          </div>
          <div className="space-y-1">
            {data.recentOps.length === 0 && <p className="text-[11px] text-muted-foreground">No recent operations.</p>}
            {data.recentOps.map((o) => (
              <a
                key={o.userOpHash}
                href={`${ex}/op/${o.userOpHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5 text-[11px] hover:border-primary/40 hover:bg-background"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', o.success ? 'bg-emerald-500' : 'bg-red-500')} />
                  <span className="truncate font-mono text-foreground">{shortHash(o.userOpHash)}</span>
                </span>
                <span className="shrink-0 font-mono text-muted-foreground">{shortHash(o.sender, 6, 4)}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(o.timestamp)}</span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent frame transactions</span>
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:text-violet-300">EIP-8141</span>
          </div>
          <div className="space-y-1">
            {data.recentFrames.length === 0 && <p className="text-[11px] text-muted-foreground">No recent frame transactions.</p>}
            {data.recentFrames.map((f) => (
              <a
                key={f.hash}
                href={`${ex}/tx/${f.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5 text-[11px] hover:border-primary/40 hover:bg-background"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', f.allSucceeded ? 'bg-emerald-500' : 'bg-amber-500')} />
                  <span className="truncate font-mono text-foreground">{shortHash(f.hash)}</span>
                </span>
                <span className="shrink-0 font-semibold text-muted-foreground">{f.frameCount} frame{f.frameCount === 1 ? '' : 's'}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(f.timestamp)}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {history.length >= 2 && (
        <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Adoption over time
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="pqAccounts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pqOps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pqFrames" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickLine={false} axisLine={false} width={34} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="plainline" />
                <Area type="monotone" dataKey="smartAccounts" name="Smart accounts" stroke="#10b981" fill="url(#pqAccounts)" strokeWidth={2} isAnimationActive={false} />
                <Area type="monotone" dataKey="operations" name="UserOps" stroke="#3b82f6" fill="url(#pqOps)" strokeWidth={2} isAnimationActive={false} />
                <Area type="monotone" dataKey="frameTxs" name="Frame txs" stroke="#8b5cf6" fill="url(#pqFrames)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="mt-3 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
        Live from the Daisugi explorer{data.entryPoint ? ` · EntryPoint ${shortHash(data.entryPoint, 8, 6)}` : ''} · RPC{' '}
        <code className="font-mono">{data.rpc}</code>. Success rates are over the most recent indexed window.
        {history.length < 2 && ' Daily growth history is being collected.'}
      </p>
    </section>
  );
}
