'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Landmark,
  Layers,
  Mail,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { partners } from '@/data/resources/partners';
import { grants } from '@/data/resources/grants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

export default function DonatePage() {
  const [copied, setCopied] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'ethereum' | 'arbitrum' | 'optimism' | 'base'>('ethereum');

  const walletAddress = '0x68B1C495096710Ab5D3aD137F5024221aAf35B7d';

  const topGrants = useMemo(
    () => [
      grants.find((g) => g.title.toLowerCase().includes('ecosystem')),
      grants.find((g) => g.title.toLowerCase().includes('gitcoin')),
    ].filter(Boolean),
    []
  );

  const partnerLogos: Record<string, string> = {
    EtherWorld: '/brand/partners/ew.png',
    'ECH (Ethereum Cat Herders)': '/brand/partners/ech.png',
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Homepage
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {/* Page Hero Header */}
        <div className="mb-8 border-b border-border/60 pb-6 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex flex-wrap items-center gap-2">
              <Heart className="h-7 w-7 text-rose-500 fill-rose-500/20 shrink-0" />
              <h1 className="dec-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Donate to Support Our Mission
              </h1>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs">
                Public Good
              </Badge>
            </div>

            <Link href="https://github.com/AvarchLLC/eipsinsight-v4" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="border-border bg-card/60 hover:bg-muted text-xs gap-1.5 shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Star on GitHub
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Button>
            </Link>
          </div>
          <p className="w-full text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your support keeps EIPsInsight free, open-source, and continuously improved. Every donation directly funds server infrastructure, real-time RPC data pipelines, and public Ethereum governance analytics tools.
          </p>
        </div>

        {/* Main Donation Container */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Left Column: Wallet & Network Options */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-xs">
            <div>
              <div className="mb-4 inline-flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary shrink-0" />
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Send Crypto Donation</h2>
              </div>
              <p className="mb-6 text-xs text-muted-foreground leading-relaxed sm:text-sm">
                We accept ETH, ERC-20 tokens, and stablecoins across all EVM-compatible networks. All supported chains use the exact same Ethereum wallet address below.
              </p>

              {/* Supported EVM Network Selectors */}
              <div className="mb-6 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Preferred Network
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      { id: 'ethereum', label: 'Ethereum', icon: EthereumIcon },
                      { id: 'arbitrum', label: 'Arbitrum One', icon: Layers },
                      { id: 'optimism', label: 'Optimism', icon: Layers },
                      { id: 'base', label: 'Base', icon: Layers },
                    ] as const
                  ).map((net) => {
                    const NetIcon = net.icon;
                    const isSelected = selectedNetwork === net.id;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => setSelectedNetwork(net.id as any)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-primary/50 bg-primary/10 text-primary shadow-xs'
                            : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                      >
                        <NetIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{net.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallet Address Input Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    EVM Wallet Address
                  </label>
                  <span className="text-[11px] text-primary font-medium">EVM Compatible</span>
                </div>

                <div className="relative flex items-center overflow-hidden rounded-xl border border-border/80 bg-background/80 shadow-xs">
                  <div className="min-w-0 flex-1 px-3.5 py-3 font-mono text-xs font-medium text-foreground sm:text-sm truncate">
                    {walletAddress}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex items-center gap-1.5 border-l border-border/80 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Address'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Verifiable public Multisig wallet for platform development and infrastructure.</span>
            </div>
          </div>

          {/* Right Column: Scan to Donate QR Card */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/60 p-6 text-center shadow-sm backdrop-blur-xs">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground sm:text-lg">
                <QrCode className="h-5 w-5 text-primary" /> Scan to Donate
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Scan with any mobile Web3 wallet</p>
            </div>

            {/* QR Code Container */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="relative rounded-2xl border border-border bg-white p-3.5 shadow-lg"
            >
              <QRCodeSVG value={walletAddress} size={200} includeMargin={false} bgColor="#ffffff" fgColor="#0f172a" />
            </motion.div>

            <div className="mt-4 space-y-1">
              <p className="font-mono text-xs text-muted-foreground break-all max-w-xs">{walletAddress}</p>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] uppercase font-bold tracking-wider">
                Ethereum Mainnet & L2s
              </Badge>
            </div>
          </div>
        </div>

        {/* Partners & Ecosystem Collaborations */}
        <section className="mb-8 rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-xs">
          <div className="mb-4 text-center sm:text-left">
            <div className="inline-flex items-center gap-2">
              <Landmark className="h-5 w-5 text-amber-500 shrink-0" />
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Our Ecosystem Partners
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed sm:text-sm">
              EIPsInsight is supported by governance organizations, media partners, and core contributors who share our vision for transparent Ethereum standards.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {partners.map((partner) => (
              <a
                key={partner.name}
                href={partner.website}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center justify-center rounded-xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/40 hover:bg-muted/40"
              >
                {partnerLogos[partner.name] ? (
                  <Image
                    src={partnerLogos[partner.name]}
                    alt={partner.name}
                    width={130}
                    height={48}
                    className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors text-center">
                    {partner.name}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>

        {/* Funding & Grants Transparency */}
        <section className="mb-8 rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-xs">
          <div className="mb-4 text-center sm:text-left">
            <div className="inline-flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400 shrink-0" />
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Funding & Grants Transparency
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed sm:text-sm">
              We transparently publish grant distributions and community contributions supporting platform maintenance.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30 text-xs">
              Ethereum Foundation
            </Badge>
            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30 text-xs">
              Gitcoin Grants
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-xs">
              Open Source Public Goods
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30 text-xs">
              Community Donors
            </Badge>
          </div>

          <div className="space-y-3">
            {topGrants.map((grant) => (
              <div key={grant!.id} className="rounded-xl border border-border/70 bg-background/50 p-4">
                <h3 className="text-sm font-semibold text-foreground">{grant!.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{grant!.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact & Inquiries Footer Box */}
        <section className="mb-8 rounded-2xl border border-border/80 bg-card/60 p-6 text-center shadow-sm backdrop-blur-xs">
          <Mail className="mx-auto h-6 w-6 text-primary mb-2" />
          <h3 className="text-base font-semibold text-foreground">Have questions or partnership inquiries?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Reach out directly to our engineering & governance team at{' '}
            <a href="mailto:dev@avarch.com" className="font-semibold text-primary underline hover:text-primary/80">
              dev@avarch.com
            </a>
          </p>
        </section>
      </motion.div>
    </div>
  );
}
