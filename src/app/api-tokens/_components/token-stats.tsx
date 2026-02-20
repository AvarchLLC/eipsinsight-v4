'use client'

import { Key, Shield, BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface TokenStatsProps {
  total: number
  active: number
  lastUsed: Date | null
}

export function TokenStats({ total, active, lastUsed }: TokenStatsProps) {
  const formatLastUsed = (lastUsed: Date | null): string => {
    if (!lastUsed) return 'Never'
    const now = new Date()
    const diff = now.getTime() - new Date(lastUsed).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Tokens */}
      <Card className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400">Total Tokens</p>
            <p className="mt-2 text-3xl font-bold text-slate-50">{total}</p>
          </div>
          <div className="rounded-lg bg-cyan-500/15 p-3">
            <Key className="h-6 w-6 text-cyan-300" />
          </div>
        </div>
      </Card>

      {/* Active Tokens */}
      <Card className="rounded-2xl border border-emerald-400/20 bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400">Active Tokens</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">{active}</p>
            <p className="mt-1 text-xs text-slate-500">{total > 0 ? Math.round((active / total) * 100) : 0}% active</p>
          </div>
          <div className="rounded-lg bg-emerald-500/15 p-3">
            <Shield className="h-6 w-6 text-emerald-300" />
          </div>
        </div>
      </Card>

      {/* Last Used */}
      <Card className="rounded-2xl border border-amber-400/20 bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400">Last Used</p>
            <p className="mt-2 text-lg font-semibold text-amber-200">{formatLastUsed(lastUsed)}</p>
            {lastUsed && <p className="mt-1 text-xs text-slate-500">Most recent activity</p>}
          </div>
          <div className="rounded-lg bg-amber-500/15 p-3">
            <BarChart3 className="h-6 w-6 text-amber-300" />
          </div>
        </div>
      </Card>
    </div>
  )
}
