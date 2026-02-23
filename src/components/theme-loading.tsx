'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

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
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-9999 flex items-center justify-center bg-background"
        >
          <div className="flex flex-col items-center gap-6 px-4">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <Image
                src="/brand/logo/EIPsInsights.gif"
                alt="EIPsInsight"
                width={80}
                height={80}
                unoptimized
                className="drop-shadow-2xl"
              />
            </motion.div>

            {/* Loading Text */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <h2 className="dec-title text-2xl font-semibold bg-linear-to-r from-emerald-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                Loading Experience
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Preparing your insights...
              </p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="w-full max-w-xs"
            >
              <div className="relative h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="h-full rounded-full bg-linear-to-r from-emerald-500 via-cyan-500 to-emerald-500"
                  style={{
                    boxShadow: '0 0 20px rgba(34, 211, 238, 0.5)',
                  }}
                />
              </div>

              {/* Progress Percentage */}
              <div className="mt-2 text-center">
                <span className="text-xs font-medium text-cyan-400">
                  {Math.round(progress)}%
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
