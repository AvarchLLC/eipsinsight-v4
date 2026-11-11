'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryImage } from '@/data/devcon8-gallery';

type Props = {
  images: GalleryImage[];
  /** Alt-text prefix, e.g. "Devcon 8 India". */
  altPrefix?: string;
  className?: string;
};

type Indexed = { img: GalleryImage; index: number };

const MARQUEE_ROW_H = 170; // px
const MARQUEE_COUNT = 18; // images fed into the drifting hero rows

/** Bento span pattern — a few big/wide tiles break up the grid rhythm. */
function spanClass(i: number): string {
  const m = i % 11;
  if (m === 0) return 'col-span-2 row-span-2'; // hero
  if (m === 4) return 'col-span-2'; // wide
  if (m === 7) return 'row-span-2'; // tall
  return '';
}

function MarqueeRow({
  items,
  direction,
  duration,
  onOpen,
  altPrefix,
}: {
  items: Indexed[];
  direction: 'left' | 'right';
  duration: number;
  onOpen: (i: number) => void;
  altPrefix: string;
}) {
  // Duplicate the strip so the -50% translate loops seamlessly.
  const doubled = [...items, ...items];
  return (
    <div className="marquee-mask group relative overflow-hidden">
      <div
        className="flex w-max gap-3 group-hover:[animation-play-state:paused]"
        style={{
          animation: `${direction === 'left' ? 'gallery-marquee-l' : 'gallery-marquee-r'} ${duration}s linear infinite`,
        }}
      >
        {doubled.map((it, k) => {
          const w = Math.round((it.img.w / it.img.h) * MARQUEE_ROW_H);
          return (
            <button
              key={`${it.index}-${k}`}
              type="button"
              onClick={() => onOpen(it.index)}
              aria-label={`Open photo ${it.index + 1}`}
              className="relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40"
              style={{ height: MARQUEE_ROW_H, width: w }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.img.src}
                alt={`${altPrefix} ${it.index + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PhotoGallery({ images, altPrefix = 'Event photo', className }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const isOpen = active !== null;

  const close = useCallback(() => setActive(null), []);
  const go = useCallback(
    (dir: 1 | -1) =>
      setActive((cur) => (cur === null ? cur : (cur + dir + images.length) % images.length)),
    [images.length]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close, go]);

  const current = active !== null ? images[active] : null;

  const marquee: Indexed[] = images
    .slice(0, Math.min(MARQUEE_COUNT, images.length))
    .map((img, index) => ({ img, index }));
  const rowA = marquee.filter((_, i) => i % 2 === 0);
  const rowB = marquee.filter((_, i) => i % 2 === 1);

  return (
    <div className={className}>
      {/* Keyframes for the drifting hero rows. */}
      <style>{`
        @keyframes gallery-marquee-l { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes gallery-marquee-r { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .marquee-mask { -webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent); mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent); }
        @media (prefers-reduced-motion: reduce) { .marquee-mask > div { animation: none !important; } }
      `}</style>

      {/* Auto-scrolling hero */}
      {rowA.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-10 space-y-3"
        >
          <MarqueeRow items={rowA} direction="left" duration={70} onOpen={setActive} altPrefix={altPrefix} />
          {rowB.length > 0 && (
            <MarqueeRow items={rowB} direction="right" duration={85} onOpen={setActive} altPrefix={altPrefix} />
          )}
        </motion.div>
      )}

      {/* Bento grid */}
      <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[170px] sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <motion.button
            key={img.src}
            type="button"
            onClick={() => setActive(i)}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.025, ease: 'easeOut' }}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-border bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              spanClass(i)
            )}
          >
            <Image
              src={img.src}
              alt={`${altPrefix} ${i + 1}`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <Expand className="absolute right-2 top-2 h-4 w-4 translate-y-1 text-white opacity-0 drop-shadow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" />
          </motion.button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {isOpen && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Previous"
              className="absolute left-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <motion.div
              key={current.src}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative flex max-h-[85vh] max-w-[92vw] items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.src}
                alt={`${altPrefix} ${active! + 1}`}
                className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
              />
            </motion.div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Next"
              className="absolute right-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              {active! + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
