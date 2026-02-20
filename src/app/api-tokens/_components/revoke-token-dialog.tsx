'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface RevokeTokenDialogProps {
  isOpen: boolean
  tokenName: string
  onConfirm: () => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function RevokeTokenDialog({
  isOpen,
  tokenName,
  onConfirm,
  onCancel,
  isLoading = false,
}: RevokeTokenDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md rounded-2xl border border-red-400/20 bg-slate-950/60 p-6 shadow-[0_20px_70px_rgba(6,182,212,0.12)] sm:p-8">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-50">Revoke Token?</h2>
            <p className="mt-2 text-slate-400">
              Are you sure you want to revoke <span className="font-mono text-cyan-300">"{tokenName}"</span>? This
              action cannot be undone.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Any applications using this token will immediately lose access.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={onCancel}
            disabled={isLoading}
            variant="secondary"
            className="flex-1 rounded-lg border-cyan-400/30 bg-slate-950/60 hover:border-cyan-400/50 hover:bg-slate-900/70"
          >
            Keep Token
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-red-500/80 text-white hover:bg-red-600"
          >
            {isLoading ? 'Revoking...' : 'Revoke'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
