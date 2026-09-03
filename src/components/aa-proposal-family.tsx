import Link from 'next/link';
import { cn } from '@/lib/utils';

/** The account-abstraction proposal family, oldest idea to current native-AA work. */
const AA_FAMILY: Array<{ id: string; href: string; name: string; status: string; live: boolean }> = [
  { id: 'EIP-7702', href: '/eip/7702', name: 'Set EOA account code', status: 'Live · Pectra', live: true },
  { id: 'ERC-4337', href: '/erc/4337', name: 'Account Abstraction (EntryPoint)', status: 'Live · off-protocol', live: true },
  { id: 'EIP-7701', href: '/eip/7701', name: 'Native Account Abstraction', status: 'Draft', live: false },
  { id: 'EIP-8141', href: '/eip/8141', name: 'Frames (native AA)', status: 'Proposed · Hegota', live: false },
  { id: 'EIP-8130', href: '/eip/8130', name: 'AA for L2s', status: 'Draft', live: false },
  { id: 'EIP-5792', href: '/eip/5792', name: 'Wallet Call API', status: 'Wallet RPC', live: false },
  { id: 'EIP-3074', href: '/eip/3074', name: 'AUTH / AUTHCALL', status: 'Superseded by 7702', live: false },
  { id: 'EIP-2938', href: '/eip/2938', name: 'Account Abstraction', status: 'Withdrawn', live: false },
  { id: 'EIP-86', href: '/eip/86', name: 'Abstraction of tx origin & signature', status: 'The original AA idea (2017)', live: false },
];

export function AaProposalFamily() {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <h3 className="mb-1 text-sm font-semibold text-foreground">The account-abstraction proposal family</h3>
      <p className="mb-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> live on-chain today</span>
        <span className="mx-2 opacity-40">·</span>
        the rest are proposed, superseded, or historical.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {AA_FAMILY.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className="group flex items-center gap-2.5 rounded-lg border border-border bg-background/40 px-3 py-2 transition-colors hover:border-primary/40"
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', p.live ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
            <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary">{p.id}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{p.name}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{p.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
