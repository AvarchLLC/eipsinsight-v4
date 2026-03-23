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
  UserRoundSearch,
} from "lucide-react";

const STORAGE_KEY = "eipsinsight_v4_whats_new_seen_v1";

type TourTarget = "none" | "sidebar" | "navbar" | "persona";

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
    eyebrow: "Major update",
    title: "Welcome to EIPsInsight v4",
    description:
      "v4 is redesigned to make navigation, discovery, and contributor context much easier to use.",
    points: [
      "Clearer product structure across Explore, Insights, Tools, Resources, and People",
      "More guided paths for different personas",
      "Core workflows are still here, now better organized",
    ],
    target: "none",
  },
  {
    icon: LayoutPanelLeft,
    eyebrow: "Navigation",
    title: "Use the sidebar as your command center",
    description:
      "The sidebar now groups workflows by intent so you can jump quickly between standards, insights, tools, and resources.",
    points: [
      "Start discovery in Explore",
      "Open workflows in Tools",
      "Use grouped sections to reduce context switching",
    ],
    target: "sidebar",
  },
  {
    icon: Navigation,
    eyebrow: "Top bar",
    title: "Navbar is your quick-access lane",
    description:
      "Search, theme, account, and primary navigation controls are streamlined in one compact row.",
    points: [
      "Search and jump faster",
      "Quick access to profile and settings",
      "Consistent top-level actions across pages",
    ],
    target: "navbar",
  },
  {
    icon: UserRoundSearch,
    eyebrow: "Persona",
    title: "Choose a persona to personalize your experience",
    description:
      "Pick editor, contributor, researcher, or ecosystem-oriented context and we adapt accents and discovery cues around your workflow.",
    points: [
      "Persona affects relevance cues and context",
      "Better orientation for your role-specific tasks",
      "You can switch anytime from the navbar",
    ],
    target: "persona",
  },
  {
    icon: Compass,
    eyebrow: "All set",
    title: "Everything you used before is still available",
    description:
      "Some pages moved, but workflows are consolidated rather than removed. Use the What’s New page for the quick migration map.",
    points: [
      "Status-heavy pages now live under Explore",
      "Board and builder workflows are grouped in Tools",
      "Blogs and learning content are centralized in Resources",
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
  if (target === "persona") return '[data-tour="persona-switch"]';
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
          aria-label="Welcome to EIPsInsight v4"
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
                  boxShadow: "0 0 0 1px rgb(var(--persona-accent-rgb)/0.45), 0 0 28px rgb(var(--persona-accent-rgb)/0.28)",
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
                    EIPsInsight v4 Tour
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
                        Highlighted area shows where this workflow lives in v4.
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
                      Continue
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

