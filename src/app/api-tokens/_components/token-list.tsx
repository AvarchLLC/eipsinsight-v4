'use client'

import { useState } from 'react'
import { Trash2, Copy, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SCOPE_DESCRIPTIONS, type ApiScope } from '@/lib/apiScopes'
import { getTokenAge, getTimeUntilExpiration } from '@/lib/token-utils'

interface TokenListProps {
  tokens: Array<{
    id: string
    name: string
    scopes: string[]
    lastUsed: Date | null
    expiresAt: Date | null
    createdAt: Date
  }>
  onRevoke: (tokenId: string) => void
  isLoading?: boolean
}

export function TokenList({ tokens, onRevoke, isLoading = false }: TokenListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyMasked = (tokenId: string) => {
    navigator.clipboard.writeText(`Token ID: ${tokenId}`)
    setCopiedId(tokenId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (tokens.length === 0) {
    return (
      <Card className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-12 text-center shadow-[0_20px_70px_rgba(6,182,212,0.12)]">
        <Lock className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-50">No tokens yet</h3>
        <p className="mt-2 text-slate-400">Create your first token to get started with API access.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {tokens.map((token) => {
        const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date()
        const expiryStatus = getTimeUntilExpiration(token.expiresAt)

        return (
          <Card
            key={token.id}
            className={`rounded-2xl border p-4 shadow-[0_20px_70px_rgba(6,182,212,0.12)] sm:p-6 ${
              isExpired
                ? 'border-red-400/20 bg-red-500/5'
                : 'border-cyan-400/20 bg-slate-950/60'
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Token Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-50 truncate">{token.name}</h3>
                  {isExpired && (
                    <span className="shrink-0 rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300">
                      Expired
                    </span>
                  )}
                </div>

                {/* Scopes */}
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Scopes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {token.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded-full border border-slate-600 bg-slate-900/50 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300 transition-colors"
                        title={SCOPE_DESCRIPTIONS[scope as ApiScope]}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-col gap-1 text-xs text-slate-400 sm:flex-row sm:gap-4 mt-3">
                  <div>
                    Created {getTokenAge(new Date(token.createdAt))}
                  </div>
                  {token.lastUsed ? (
                    <div className="text-cyan-300">
                      Last used {getTokenAge(new Date(token.lastUsed))}
                    </div>
                  ) : (
                    <div className="text-slate-500">Never used</div>
                  )}
                  {token.expiresAt && (
                    <div className={isExpired ? 'text-red-400' : 'text-emerald-400'}>
                      {expiryStatus || 'Expired'}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleCopyMasked(token.id)}
                  title="Copy token ID"
                  className="text-slate-400 hover:text-slate-200"
                >
                  {copiedId === token.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onRevoke(token.id)}
                  disabled={isLoading}
                  title="Revoke this token"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
