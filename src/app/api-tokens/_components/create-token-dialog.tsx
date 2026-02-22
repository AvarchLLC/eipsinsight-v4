'use client'

import { useState } from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SCOPE_CATEGORIES, SCOPE_DESCRIPTIONS, type ApiScope } from '@/lib/apiScopes'

interface CreateTokenDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateToken: (input: { name: string; scopes: string[]; expiryDays?: number }) => Promise<{
    plainToken: string
    createdAt: Date
    expiresAt: Date | null
    name: string
    id: string
    scopes: string[]
  } | undefined>
  isLoading?: boolean
}

export function CreateTokenDialog({
  isOpen,
  onClose,
  onCreateToken,
  isLoading = false,
}: CreateTokenDialogProps) {
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [expiryDays, setExpiryDays] = useState(90)
  const [showToken, setShowToken] = useState(false)
  const [createdToken, setCreatedToken] = useState<{
    plainToken: string
    createdAt: Date
    expiresAt: Date | null
    name: string
    id: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateToken = async () => {
    if (!name.trim() || selectedScopes.length === 0) return

    try {
      const result = await onCreateToken({
        name,
        scopes: selectedScopes,
        expiryDays,
      })
      if (result) {
        setCreatedToken({
          plainToken: result.plainToken,
          createdAt: result.createdAt,
          expiresAt: result.expiresAt,
          name: result.name,
          id: result.id,
        })
      }
    } catch (error) {
      console.error('Error creating token:', error)
    }
  }

  const handleCopyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken.plainToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setName('')
    setSelectedScopes([])
    setExpiryDays(90)
    setShowToken(false)
    setCreatedToken(null)
    setCopied(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-2xl rounded-2xl border border-cyan-400/20 bg-slate-950 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)] sm:p-8">
        <h2 className="mb-2 text-2xl font-semibold text-slate-50">Create API Token</h2>
        <p className="mb-6 text-slate-400">
          {createdToken ? 'Save your token securely. You won\'t see it again.' : 'Create a new API token to authenticate requests.'}
        </p>

        {createdToken ? (
          <div className="space-y-6">
            {/* Token Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Your API Token</label>
              <div className="flex items-center gap-2 rounded-lg bg-slate-900 p-3">
                <code className="flex-1 break-all font-mono text-sm text-slate-300">
                  {showToken ? createdToken.plainToken : '•'.repeat(Math.min(createdToken.plainToken.length, 50))}
                </code>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setShowToken(!showToken)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleCopyToken}
                  className="text-slate-400 hover:text-slate-200"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-300">
                ⚠️ Store this token securely. We can't show it again.
              </p>
            </div>

            {/* Token Details */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Token Name</p>
                <p className="font-mono text-sm text-slate-300">{createdToken.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Created At</p>
                <p className="text-sm text-slate-300">{new Date(createdToken.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Expires At</p>
                <p className="text-sm text-slate-300">{createdToken.expiresAt ? new Date(createdToken.expiresAt).toLocaleString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Scopes</p>
                <p className="text-sm text-slate-300">{createdToken.plainToken ? 'See list below' : 'N/A'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleClose} className="flex-1 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Token Name */}
            <div>
              <label className="text-sm font-medium text-slate-300">Token Name</label>
              <Input
                placeholder="e.g., GitHub Actions CI, Analytics Dashboard"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 border-slate-700/80 bg-slate-900 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            {/* Scopes Selection */}
            <div>
              <label className="text-sm font-medium text-slate-300">Scopes</label>
              <p className="mb-3 text-xs text-slate-400">Select what this token can access</p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(SCOPE_CATEGORIES).map(([category, scopes]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-slate-300 tracking-wider">{category}</p>
                    <div className="ml-2 space-y-2">
                      {scopes.map((scope) => (
                        <label
                          key={scope}
                          className="flex items-center gap-2 rounded-lg p-2 hover:bg-slate-900/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(scope)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedScopes([...selectedScopes, scope])
                              } else {
                                setSelectedScopes(selectedScopes.filter((s) => s !== scope))
                              }
                            }}
                            className="h-4 w-4 rounded border border-slate-600 bg-slate-900 accent-cyan-500"
                          />
                          <div>
                            <p className="text-sm text-slate-300">{scope}</p>
                            <p className="text-xs text-slate-500">{SCOPE_DESCRIPTIONS[scope as ApiScope]}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expiry Days */}
            <div>
              <label className="text-sm font-medium text-slate-300">Expires In (days)</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Math.max(7, Math.min(365, parseInt(e.target.value) || 90)))}
                  className="w-20 rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-2 text-center text-slate-100"
                />
                <span className="text-sm text-slate-400">days (7–365)</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="secondary"
                className="flex-1 rounded-lg border-cyan-400/30 bg-slate-950/60 hover:border-cyan-400/50 hover:bg-slate-900/70"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateToken}
                disabled={!name.trim() || selectedScopes.length === 0 || isLoading}
                className="flex-1 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Token'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
