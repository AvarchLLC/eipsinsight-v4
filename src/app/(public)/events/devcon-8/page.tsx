import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Camera, MapPin } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { PhotoGallery } from '@/components/photo-gallery';
import { DEVCON8_IMAGES } from '@/data/devcon8-gallery';

export const metadata: Metadata = buildMetadata({
  title: 'Devcon 8 India · Gallery',
  description:
    'Photos from the EIPsInsight booth and the Ethereum community at Devcon 8 in India.',
  path: '/events/devcon-8',
  image: DEVCON8_IMAGES[0]?.src ?? null,
});

export default function Devcon8GalleryPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-16 pt-8 sm:px-6">
      <Link
        href="/events"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        All events
      </Link>

      <header className="border-b border-border/40 pb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <MapPin className="h-3.5 w-3.5" /> India · 2026
        </span>
        <h1 className="dec-title persona-title mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Devcon 8
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground sm:text-base">
          <Camera className="h-4 w-4" />
          {DEVCON8_IMAGES.length} photos from the EIPsInsight booth and the
          Ethereum community.
        </p>
      </header>

      <PhotoGallery images={DEVCON8_IMAGES} altPrefix="Devcon 8 India" />
    </div>
  );
}
