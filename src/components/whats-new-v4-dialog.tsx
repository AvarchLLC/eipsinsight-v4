"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  LayoutPanelLeft,
  Navigation,
  Sparkles,
} from "lucide-react";

const STORAGE_KEY = "eipsinsight_whats_new_seen_v1";

type TourTarget = "none" | "sidebar" | "navbar";

type Slide = {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  target: TourTarget;
};

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    eyebrow: "Platform Update",
    title: "Welcome to EIPsInsight",
    description:
      "EIPsInsight is designed to make standard discovery, contributor metrics, and governance workflows intuitive and effortless.",
    points: [
      "Clear structure across Explore, Insights, Tools, Resources, and People",
      "Fast search and instant access to Ethereum standards",
      "Unified tools for board meetings, timelines, and proposal editing",
    ],
    target: "none",
  },
  {
    icon: LayoutPanelLeft,
    eyebrow: "Navigation",
    title: "Sidebar Command Center",
    description:
      "The sidebar groups all platform workflows by intent so you can quickly jump between standards, insights, and tools.",
    points: [
      "Browse by status, category, and timeline in Explore",
      "Access EIP Builder and Board meetings in Tools",
      "Reduce context-switching with organized navigation",
    ],
    target: "sidebar",
  },
  {
    icon: Navigation,
    eyebrow: "Quick Access",
    title: "Streamlined Top Bar",
    description:
      "Global search, theme toggle, account controls, and core actions are always at your fingertips.",
    points: [
      "Instant global search for any EIP, ERC, or RIP",
      "Fast access to settings, tokens, and profile",
      "Consistent action bar across every page",
    ],
    target: "navbar",
  },
  {
    icon: Compass,
    eyebrow: "All Set",
    title: "Everything in One Place",
    description:
      "Workflows and tools are consolidated for easier access. Explore the platform map for full details.",
    points: [
      "Status views live under Explore → Status",
      "Developer & editor tools are grouped under Tools",
      "Articles, documentation, and videos are under Resources",
    ],
    target: "none",
  },
];

function shouldSuppressDialog(pathname: string | null) {
  if (!pathname) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/rpc")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/verify-request")) return true;
  if (pathname.startsWith("/whats-new")) return true;
  return false;
}

function selectorForTarget(target: TourTarget) {
  if (target === "sidebar") return '[data-tour="sidebar"]';
  if (target === "navbar") return '[data-tour="navbar"]';
  return "";
}

export function WhatsNewV4Dialog() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [targetRect, setTargetRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const slide = useMemo(() => SLIDES[activeSlide], [activeSlide]);
  const isFirst = activeSlide === 0;
  const isLast = activeSlide === SLIDES.length - 1;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    if (shouldSuppressDialog(pathname)) return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY) === "1";
      if (!seen) {
        const timer = window.setTimeout(() => setIsOpen(true), 240);
        return () => window.clearTimeout(timer);
      }
    } catch {
      setIsOpen(true);
    }
  }, [isDesktop, pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || slide.target === "none") {
      setTargetRect(null);
      return;
    }

    const selector = selectorForTarget(slide.target);
    const updateRect = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const pad = 8;
      setTargetRect({
        left: Math.max(4, rect.left - pad),
        top: Math.max(4, rect.top - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen, slide.target]);

  if (!isDesktop) return null;

  function markSeenAndClose() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // no-op
    }
    setIsOpen(false);
  }

  function nextSlide() {
    setActiveSlide((prev) => Math.min(prev + 1, SLIDES.length - 1));
  }

  function prevSlide() {
    setActiveSlide((prev) => Math.max(prev - 1, 0));
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="whats-new-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[120]"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to EIPsInsight"
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />

          <AnimatePresence>
            {targetRect ? (
              <motion.div
                key={`${slide.target}-${activeSlide}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none fixed z-[121] rounded-xl border border-primary/70 bg-primary/10 persona-glow"
                style={{
                  left: targetRect.left,
                  top: targetRect.top,
                  width: targetRect.width,
                  height: targetRect.height,
                  boxShadow:
                    "0 0 0 1px rgb(var(--persona-accent-rgb)/0.45), 0 0 28px rgb(var(--persona-accent-rgb)/0.28)",
                }}
              />
            ) : null}
          </AnimatePresence>

          <div className="relative z-[122] flex min-h-full items-center justify-center p-4 sm:p-5">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-primary/18 via-primary/6 to-transparent" />

              <div className="relative p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Platform Tour
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activeSlide + 1} / {SLIDES.length}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                      <slide.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {slide.eyebrow}
                      </p>
                      <h2 className="dec-title mt-1 text-balance text-3xl font-semibold tracking-tight leading-[1.1] text-foreground sm:text-4xl">
                        {slide.title}
                      </h2>
                      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {slide.description}
                      </p>
                    </div>

                    <ul className="space-y-2.5">
                      {slide.points.map((point) => (
                        <li
                          key={point}
                          className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>

                    {slide.target !== "none" ? (
                      <p className="text-xs text-primary">
                        Highlighted area shows where this feature is located.
                      </p>
                    ) : null}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-5 flex items-center justify-center gap-1.5">
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        i === activeSlide
                          ? "w-8 bg-primary"
                          : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55"
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevSlide}
                      disabled={isFirst}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      onClick={nextSlide}
                      disabled={isLast}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={markSeenAndClose}
                      className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      Skip
                    </button>
                    <Link
                      href="/whats-new"
                      onClick={markSeenAndClose}
                      className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      See what&apos;s new
                    </Link>
                    <button
                      onClick={markSeenAndClose}
                      className="inline-flex items-center rounded-md persona-gradient px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
