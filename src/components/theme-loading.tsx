'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemedLogoGif } from '@/components/themed-logo-gif';

export function ThemeLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          // pointer-events-none so this brief loading veil never intercepts
          // clicks/typing on the navbar search underneath it (it covers the whole
          // screen at z-9999). It's a cosmetic loading state, not a modal gate.
          className="pointer-events-none fixed inset-0 z-9999 flex items-center justify-center bg-background/70 backdrop-blur-md"
        >
          <div className="w-full max-w-md px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45 }}
              className="rounded-xl border border-border bg-card/70 p-6 shadow-[0_18px_50px_rgb(var(--persona-accent-rgb)/0.18)]"
            >
              <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
              <div className="flex flex-col items-center gap-6">
                {/* Logo */}
                <div className="relative">
                  <ThemedLogoGif
                    alt="EIPsInsight"
                    width={74}
                    height={74}
                    unoptimized
                    className="drop-shadow-[0_0_24px_rgb(var(--persona-accent-rgb)/0.35)]"
                  />
                </div>

                {/* Loading Text */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.15 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <h2 className="dec-title persona-title text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                    Loading Experience
                  </h2>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    Preparing your insights...
                  </p>
                </motion.div>

                {/* Progress Bar */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.25 }}
                  className="w-full"
                >
                  <div className="relative h-2.5 overflow-hidden rounded-full border border-border bg-muted/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="relative h-full rounded-full bg-linear-to-r from-primary/75 via-primary to-primary/80"
                      style={{
                        boxShadow: '0 0 18px rgb(var(--persona-accent-rgb) / 0.45)',
                      }}
                    >
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '220%' }}
                        transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                        className="absolute inset-y-0 w-1/3 bg-white/35 blur-[1px]"
                      />
                    </motion.div>
                  </div>

                  {/* Progress Percentage */}
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Loading
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {Math.round(Math.min(progress, 100))}%
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
