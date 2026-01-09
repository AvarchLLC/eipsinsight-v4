'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { client } from '@/lib/orpc'

interface ProfileAvatarProps {
  user: {
    id: string
    name?: string | null
    email: string
    image?: string | null
    avatarUrl?: string | null
  }
  onUploadComplete?: (url: string) => void
  editable?: boolean
  size?: 'sm' | 'md' | 'lg'
}

async function cropImageToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const side = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = side
        canvas.height = side
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not process image'))
          return
        }
        const offsetX = (img.width - side) / 2
        const offsetY = (img.height - side) / 2
        ctx.drawImage(img, offsetX, offsetY, side, side, 0, 0, side, side)
        const dataUrl = canvas.toDataURL(file.type || 'image/png', 0.92)
        resolve(dataUrl.split(',')[1] ?? '')
      }
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export function ProfileAvatar({
  user,
  onUploadComplete,
  editable = false,
  size = 'md',
}: ProfileAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-20 w-20',
  }

  const avatarUrl = user.avatarUrl || user.image
  const initials = (user.name || user.email || 'U').slice(0, 2).toUpperCase()

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const base64 = await cropImageToSquare(file)
      const result = await client.account.uploadAvatar({
        fileName: file.name,
        base64Data: base64,
      })
      onUploadComplete?.(result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative inline-block">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={avatarUrl || undefined} alt={user.name || user.email} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {editable && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 rounded-full bg-linear-to-br from-emerald-500 to-cyan-500 p-1 text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
            title="Upload avatar"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {error && <div className="absolute top-full mt-2 text-xs text-rose-400">{error}</div>}
        </>
      )}
    </div>
  )
}
