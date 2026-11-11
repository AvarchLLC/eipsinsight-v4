import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Camera, MapPin } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { DEVCON8_IMAGES } from '@/data/devcon8-gallery';

export const metadata: Metadata = buildMetadata({
  title: 'Events',
  description:
    'Photos and moments from EIPsInsight at Ethereum community events and conferences.',
  path: '/events',
  image: DEVCON8_IMAGES[0]?.src ?? null,
});

type EventEntry = {
  slug: string;
  title: string;
  location: string;
  period: string;
  blurb: string;
  cover?: string;
  count: number;
};

const EVENTS: EventEntry[] = [
  {
    slug: 'devcon-8',
    title: 'Devcon 8',
    location: 'India',
    period: '2026',
    blurb:
      'The EIPsInsight booth, editors, authors, and the wider Ethereum community.',
    cover: DEVCON8_IMAGES[0]?.src,
    count: DEVCON8_IMAGES.length,
  },
];

export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16 pt-8 sm:px-6">
      <header className="border-b border-border/40 pb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Camera className="h-3.5 w-3.5" /> Gallery
        </span>
        <h1 className="dec-title persona-title mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Events
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Moments from EIPsInsight out in the wild, at Ethereum conferences and
          community gatherings.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {EVENTS.map((ev) => (
          <Link
            key={ev.slug}
            href={`/events/${ev.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
              {ev.cover && (
                <Image
                  src={ev.cover}
                  alt={ev.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                <Camera className="h-3 w-3" /> {ev.count} photos
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">{ev.title}</h2>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {ev.location} · {ev.period}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{ev.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
