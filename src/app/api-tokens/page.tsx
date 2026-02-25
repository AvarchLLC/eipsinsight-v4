'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, AlertCircle, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { client } from '@/lib/orpc'
import { TokenStats } from './_components/token-stats'
import { TokenList } from './_components/token-list'
import { CreateTokenDialog } from './_components/create-token-dialog'
import { RevokeTokenDialog } from './_components/revoke-token-dialog'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [membershipTier, setMembershipTier] = useState<string>('free')
  const [isCreating, setIsCreating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [revokeTokenId, setRevokeTokenId] = useState<string | null>(null)
  const [revokeTokenName, setRevokeTokenName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [tokensList, statsData, subscription] = await Promise.all([
        client.account.listTokens({}),
        client.account.getTokenStats({}),
        fetch('/api/stripe/subscription').then((res) => res.json()).catch(() => ({ tier: 'free' })),
      ])
      setTokens(tokensList || [])
      setStats(statsData)
      setMembershipTier(subscription?.tier || 'free')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tokens'
      setError(message)
      toast.error('Failed to load API tokens')
      console.error('Error fetching tokens:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const handleCreateToken = async (input: any) => {
    try {
      setIsCreating(true)
      setError(null)
      const newToken = await client.account.createToken(input)
      if (newToken) {
        toast.success('Token created successfully')
        await fetchTokens()
        return newToken
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create token'
      setError(message)
      toast.error(message)
      console.error('Error creating token:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevokeClick = (tokenId: string, tokenName: string) => {
    setRevokeTokenId(tokenId)
    setRevokeTokenName(tokenName)
    setShowRevokeDialog(true)
  }

  const handleConfirmRevoke = async () => {
    if (!revokeTokenId) return
    try {
      setIsRevoking(true)
      setError(null)
      await client.account.revokeToken({ tokenId: revokeTokenId })
      toast.success('Token revoked successfully')
      setShowRevokeDialog(false)
      setRevokeTokenId(null)
      setRevokeTokenName('')
      await fetchTokens()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke token'
      setError(message)
      toast.error(message)
      console.error('Error revoking token:', err)
    } finally {
      setIsRevoking(false)
    }
  }

  const isPaidMember = membershipTier !== 'free'

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-wide text-cyan-200">
          API
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-50">API Tokens</h1>
            <p className="mt-2 text-slate-400">Create and manage API tokens for programmatic access to your account.</p>
          </div>
          {isPaidMember ? (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="shrink-0 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              New Token
            </Button>
          ) : (
            <Button
              asChild
              className="shrink-0 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
            >
              <Link href="/pricing">
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Free Tier Notice */}
      {!isPaidMember && (
        <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6">
          <div className="flex gap-3">
            <Crown className="h-6 w-6 shrink-0 text-amber-300" />
            <div>
              <h3 className="font-semibold text-amber-300">Upgrade to Pro or Enterprise</h3>
              <p className="mt-2 text-sm text-amber-200">
                API tokens are only available for Pro and Enterprise members. Upgrade your plan to create and manage API tokens for programmatic access.
              </p>
              <Button asChild className="mt-4 bg-amber-500 text-black hover:bg-amber-400">
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div>
            <p className="font-semibold text-red-300">Error</p>
            <p className="text-sm text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {!isLoading && stats && <div className="mb-8"><TokenStats total={stats.total} active={stats.active} lastUsed={stats.lastUsed} /></div>}

      {/* Security Info */}
      <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
        <div className="flex gap-3">
          <div className="shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-300" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-amber-300">Security Notice</p>
            <ul className="mt-2 space-y-1 text-amber-200">
              <li>• Save your token securely - we won't show it again</li>
              <li>• Use scopes to limit token permissions</li>
              <li>• Revoke tokens immediately if compromised</li>
              <li>• Tokens expire automatically after the set duration</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Token List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-cyan-400/20 bg-slate-950/60 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <TokenList
          tokens={tokens}
          onRevoke={(tokenId) => {
            const token = tokens.find((t) => t.id === tokenId)
            if (token) {
              handleRevokeClick(tokenId, token.name)
            }
          }}
          isLoading={isRevoking}
        />
      )}

      {/* Dialogs */}
      <CreateTokenDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateToken={handleCreateToken}
        isLoading={isCreating}
      />

      <RevokeTokenDialog
        isOpen={showRevokeDialog}
        tokenName={revokeTokenName}
        onConfirm={handleConfirmRevoke}
        onCancel={() => {
          setShowRevokeDialog(false)
          setRevokeTokenId(null)
          setRevokeTokenName('')
        }}
        isLoading={isRevoking}
      />
    </div>
  )
}
