'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Copy, Check, Heart, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function EthereumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path fill="currentColor" fillOpacity="0.85" d="M127.9 0L124.7 10.9V278.7L127.9 281.9L255.8 206.3L127.9 0Z" />
      <path fill="currentColor" d="M127.9 0L0 206.3L127.9 281.9V151.9V0Z" />
      <path fill="currentColor" fillOpacity="0.85" d="M127.9 306.1L126.1 308.3V403.7L127.9 417L255.9 230.5L127.9 306.1Z" />
      <path fill="currentColor" d="M127.9 417V306.1L0 230.5L127.9 417Z" />
      <path fill="currentColor" fillOpacity="0.35" d="M127.9 281.9L255.8 206.3L127.9 151.9V281.9Z" />
      <path fill="currentColor" fillOpacity="0.5" d="M0 206.3L127.9 281.9V151.9L0 206.3Z" />
    </svg>
  );
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const walletAddress = '0x68B1C495096710Ab5D3aD137F5024221aAf35B7d';

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('eips-insight-cookie-consent');
    if (!consent) {
      // Show banner after 1 second delay
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('eips-insight-cookie-consent', 'accepted');
    localStorage.setItem('eips-insight-consent-date', new Date().toISOString());

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    }

    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('eips-insight-cookie-consent', 'declined');
    localStorage.setItem('eips-insight-consent-date', new Date().toISOString());

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }

    setShowBanner(false);
  };

  const handleClose = () => {
    setShowBanner(false);
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy wallet address:', err);
    }
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        className="fixed bottom-5 left-0 right-0 z-[9999] flex justify-center px-3 sm:px-6"
      >
        {/* Premium Glassmorphism Container */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="group relative w-full max-w-5xl overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-1 text-card-foreground shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.45)] dark:bg-slate-900/90"
        >
          {/* Subtle Ambient Glow Gradients */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-blue-500/10 to-purple-500/10 opacity-70 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Close Button */}
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="absolute right-3.5 top-3.5 z-20 rounded-xl border border-border/60 bg-muted/40 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </motion.button>

          {/* Main Layout Grid */}
          <div className="relative flex flex-col items-stretch md:flex-row">
            {/* Left Section - Cookie Consent */}
            <div className="flex flex-1 flex-col justify-center p-4 sm:p-5 md:flex-[0_0_58%] space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
                className="flex items-start gap-3.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-inner shadow-primary/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 pr-6 md:pr-0">
                  <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                    Your Privacy Matters
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    🍪 We use cookies to enhance your experience, preserve preferences, and understand site usage.{' '}
                    <NextLink
                      href="/privacy-policy"
                      className="font-medium text-primary underline underline-offset-3 hover:text-primary/80 transition-colors"
                    >
                      Learn more
                    </NextLink>
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.35 }}
                className="flex flex-wrap items-center gap-2.5 pt-1"
              >
                <motion.button
                  onClick={handleAccept}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all duration-200"
                >
                  Accept All Cookies
                </motion.button>
                <motion.button
                  onClick={handleDecline}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className="rounded-full border border-border/80 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xs hover:bg-muted hover:text-foreground transition-all duration-200"
                >
                  Decline
                </motion.button>
              </motion.div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden self-stretch my-3 w-px bg-gradient-to-b from-transparent via-border/80 to-transparent md:block" />

            {/* Right Section - Support / Donation Card */}
            <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-5 md:flex-[0_0_42%] border-t border-border/50 md:border-t-0">
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="w-full max-w-sm"
              >
                <div className="mb-2.5 text-center sm:text-left flex items-center justify-between">
                  <div>
                    <h4 className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight text-foreground sm:text-base">
                      <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" /> Support Our Mission
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Keep EIPsInsight free & open-source</p>
                  </div>
                  <NextLink
                    href="/donate"
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Donate page ↗
                  </NextLink>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-muted/30 p-2.5 backdrop-blur-xs">
                  {/* Dynamic QR Code */}
                  <div className="group/qr relative shrink-0">
                    <div className="relative overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-md transition-transform duration-200 group-hover/qr:scale-105">
                      <QRCodeSVG value={walletAddress} size={64} includeMargin={false} bgColor="#ffffff" fgColor="#0f172a" />
                    </div>
                  </div>

                  {/* Wallet Info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-muted-foreground">Ethereum Address</span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                        <EthereumIcon className="h-3 w-3 text-primary" /> Mainnet
                      </span>
                    </div>

                    <div className="relative">
                      <div className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-1.5 pr-8 font-mono text-[11px] text-foreground shadow-xs">
                        <div className="truncate">
                          {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title={hasCopied ? 'Copied!' : 'Copy full address'}
                      >
                        {hasCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>

                      {/* Copied Tooltip Badge */}
                      <AnimatePresence>
                        {hasCopied && (
                          <motion.div
                            initial={{ opacity: 0, y: 5, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                            className="absolute -top-7 right-0 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md"
                          >
                            ✓ Copied!
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CookieConsentBanner;
