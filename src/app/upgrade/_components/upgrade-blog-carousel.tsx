'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

interface BlogPost {
  image: string;
  title: string;
  content: string;
  link: string;
}

interface UpgradeBlogCarouselProps {
  posts: BlogPost[];
  upgradeName: string;
}

export function UpgradeBlogCarousel({ posts, upgradeName }: UpgradeBlogCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!posts || posts.length === 0) return null;

  const visiblePosts = 3;
  const maxIndex = Math.max(0, posts.length - visiblePosts);

  const goNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const goPrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const visibleItems = posts.slice(currentIndex, currentIndex + visiblePosts);

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Related Articles</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Latest updates and insights about {upgradeName}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className={cn(
              'p-1.5 rounded-lg border border-border bg-muted/60 text-muted-foreground',
              'hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-all',
              'disabled:opacity-30 disabled:cursor-not-allowed'
            )}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goNext}
            disabled={currentIndex >= maxIndex}
            className={cn(
              'p-1.5 rounded-lg border border-border bg-muted/60 text-muted-foreground',
              'hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-all',
              'disabled:opacity-30 disabled:cursor-not-allowed'
            )}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {visibleItems.map((post, idx) => (
          <motion.div
            key={`${post.link}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className="group relative overflow-hidden rounded-lg border border-border bg-card/60 transition-all hover:border-primary/40"
          >
            <Link
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="relative h-28 overflow-hidden bg-muted/40 sm:h-32">
                {post.image.startsWith('http') ? (
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Image
                    src={`/upgrade/${post.image}`}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
              </div>
              <div className="p-2.5">
                <h4 className="mb-2 line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                  {post.title}
                </h4>
                <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {post.content}
                </p>
                <div className="flex items-center gap-1 text-xs text-primary transition-colors group-hover:text-primary/90">
                  <span>Read more</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {posts.length > visiblePosts && (
        <div className="flex items-center justify-center gap-1 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                idx === currentIndex
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
