import type { ImageLoaderProps } from 'next/image'

/**
 * Next.js image loader for Cloudinary-hosted images.
 * Safe to use in client components — imports no server-side env vars.
 * Replaces (or inserts) transformation params so Cloudinary handles
 * resizing/format conversion instead of the local Next.js sharp pipeline.
 */
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.includes('res.cloudinary.com')) return src

  const q = quality ?? 75
  const transforms = `f_auto,q_${q},w_${width}`

  // URL already has transforms injected (e.g. f_auto,q_auto,w_1600) — replace them
  if (src.includes('/upload/f_')) {
    return src.replace(/\/upload\/[^/]+\//, `/upload/${transforms}/`)
  }

  // Bare Cloudinary URL — insert transforms after /upload/
  return src.replace('/upload/', `/upload/${transforms}/`)
}
