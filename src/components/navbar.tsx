"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Menu,
  X,
  Settings2,
  LogOut,
  Home,
  Layers,
  Package,
  LineChart,
  BookOpen,
  ChevronDown,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/hooks/useSession";
import { ProfileAvatar } from "@/components/profile-avatar";
import { SearchBar } from "@/components/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePersonaStore } from "@/stores/personaStore";
import { usePersonaSyncOnChange } from "@/hooks/usePersonaSync";
import { PERSONAS, PERSONA_LIST, type Persona } from "@/lib/persona";
import { FEATURES } from "@/lib/features";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemedLogoGif } from "@/components/themed-logo-gif";

// Mobile navigation items (same as sidebar)
const mobileNavItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "Standards", href: "/standards", icon: Layers },
  { title: "Upgrades", href: "/upgrade", icon: Package },
  { title: "Analytics", href: "/analytics/prs", icon: LineChart },
  { title: "Resources", href: "/resources", icon: BookOpen },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [membershipTier, setMembershipTier] = useState<string>("free");
  const { data: session } = useSession();
  const { persona, setPersona, isHydrated } = usePersonaStore();
  const { syncPersonaToServer, isAuthenticated } = usePersonaSyncOnChange();

  const userName = session?.user?.name ?? session?.user?.email;

  // Fetch membership tier
  useEffect(() => {
    if (session?.user) {
      fetch("/api/stripe/subscription")
        .then((res) => res.json())
        .then((data) => setMembershipTier(data?.tier || "free"))
        .catch(() => setMembershipTier("free"));
    }
  }, [session?.user]);

  // Handle persona change - sync to server then redirect
  const handlePersonaChange = async (newPersona: Persona) => {
    // Sync to server first if logged in
    if (isAuthenticated) {
      await syncPersonaToServer(newPersona);
    }
    // Then update local state and redirect
    setPersona(newPersona);
  };

  // Handle scroll for sticky navbar effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentPersona = persona ? PERSONAS[persona] : null;
  const PersonaIcon = currentPersona?.icon;
  const hasPersona = persona !== null;

  return (
    <nav
      className={cn(
        "relative z-50 w-full transition-all duration-300",
        "border-b backdrop-blur-xl",
        "dark:border-cyan-300/20 dark:bg-slate-950/90",
        "border-slate-200/80 bg-white/95",
        scrolled
          ? "dark:border-cyan-300/30 dark:bg-slate-950/95 dark:shadow-[0_4px_30px_rgba(6,182,212,0.12)] shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          : "dark:shadow-[0_4px_20px_rgba(6,182,212,0.08)] shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
      )}
    >
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex h-14 items-center gap-4">
          {/* LEFT: Logo (Desktop) */}
          <Link
            href="/"
            className="hidden md:flex items-center gap-2 shrink-0 group"
          >
            <div className="relative">
              <ThemedLogoGif
                alt="EIPsInsight"
                width={28}
                height={28}
                unoptimized
              />
            </div>
            <span className="dec-title font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-100 transition-colors">
              EIPsInsight
            </span>
          </Link>

          {/* CENTER: Search (Desktop) - Flex grow to center */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <div className="w-full max-w-md">
              <SearchBar />
            </div>
          </div>

          {/* RIGHT: Theme + Persona + Profile (Desktop) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <ThemeToggle variant="switch" className="shrink-0" />
            {/* Compact Persona Switcher */}
            {FEATURES.PERSONA_SWITCHER && isHydrated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all",
                      "border",
                      "dark:hover:border-cyan-400/30 dark:hover:bg-slate-800/50 dark:hover:text-white",
                      "hover:border-cyan-500/40 hover:bg-slate-100",
                      "text-sm",
                      hasPersona 
                        ? "border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300"
                        : "border-cyan-400/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 animate-pulse"
                    )}
                  >
                    {hasPersona && PersonaIcon ? (
                      <>
                        <PersonaIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                        <span className="text-xs">{currentPersona?.shortLabel}</span>
                      </>
                    ) : (
                      <span className="text-xs font-medium">Select persona</span>
                    )}
                    <ChevronDown className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 bg-white dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-700/50 p-1"
                >
                  {!hasPersona && (
                    <div className="px-2 py-2 mb-1 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                      Choose how you use EIPsInsight
                    </div>
                  )}
                  {PERSONA_LIST.map((personaId) => {
                    const meta = PERSONAS[personaId];
                    const Icon = meta.icon;
                    const isSelected = personaId === persona;
                    return (
                      <DropdownMenuItem
                        key={personaId}
                        onClick={() => handlePersonaChange(personaId)}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer rounded-md",
                          isSelected && "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-cyan-600 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400")} />
                        <div className="flex flex-col">
                          <span className={cn("text-sm", isSelected ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300")}>
                            {meta.shortLabel}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">
                            {meta.description.slice(0, 50)}...
                          </span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Profile / Auth */}
            {!session?.user ? (
              <Button
                size="sm"
                className="rounded-lg bg-linear-to-r from-emerald-500 to-cyan-500 text-black hover:from-emerald-400 hover:to-cyan-400 h-8 px-3 text-xs"
                asChild
              >
                <Link href="/login">Sign in</Link>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full border border-slate-300 dark:border-slate-700/50 hover:border-cyan-500/50 dark:hover:border-cyan-400/30 p-0.5 transition-all hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                    <ProfileAvatar user={session.user} size="sm" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 overflow-hidden rounded-xl border border-slate-200 dark:border-cyan-400/30 bg-white/95 dark:bg-slate-950/95 p-0 shadow-xl dark:shadow-[0_15px_60px_rgba(6,182,212,0.18)] backdrop-blur-xl"
                >
                  {/* Header */}
                  <div className="relative border-b border-slate-200 dark:border-cyan-300/20 bg-slate-50 dark:bg-slate-900/70 px-4 py-3">
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/40 to-transparent" />
                    <div className="flex items-center gap-3">
                      <ProfileAvatar user={session.user} size="md" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {userName}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Signed in
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-100">
                        <Settings2 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                        <span className="text-sm">Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mx-2 my-1 border-slate-200 dark:border-cyan-300/20" />
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-100"
                      onClick={async () => {
                        await authClient.signOut();
                        window.location.href = "/";
                      }}
                    >
                      <LogOut className="h-4 w-4 text-rose-500 dark:text-rose-300" />
                      <span className="text-sm">Sign out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* MOBILE: Logo + Menu Toggle */}
          <div className="flex md:hidden items-center justify-between w-full">
            {/* Mobile Logo */}
            <Link href="/" className="flex items-center gap-2">
              <ThemedLogoGif
                alt="EIPsInsight"
                width={24}
                height={24}
                unoptimized
              />
              <span className="dec-title font-semibold text-slate-900 dark:text-white text-sm">
                EIPsInsight
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <ThemeToggle variant="icon" />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "inline-flex items-center justify-center rounded-lg p-2 transition-colors",
                "text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white",
                mobileOpen && "bg-slate-100 dark:bg-slate-800/50"
              )}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE PANEL */}
      {mobileOpen && (
        <div className="border-t border-slate-200 dark:border-cyan-300/20 bg-white dark:bg-slate-950/98 backdrop-blur-xl md:hidden">
          <div className="space-y-3 px-4 py-4">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-cyan-400/80" />
              <input
                type="search"
                placeholder="Search EIPs, ERCs, authors…"
                className={cn(
                  "w-full rounded-lg border border-slate-300 dark:border-cyan-300/30 bg-slate-50 dark:bg-black/40",
                  "pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-200",
                  "placeholder:text-slate-500 dark:placeholder:text-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                )}
              />
            </div>

            {/* Mobile Navigation */}
            <nav className="flex flex-wrap gap-2">
              {mobileNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all",
                      "border",
                      isActive
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-700 dark:text-white font-medium"
                        : "border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-cyan-500/40 dark:hover:border-cyan-400/30 hover:bg-slate-200 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-cyan-600 dark:text-cyan-400")} />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Upgrade Button */}
            {session?.user && membershipTier === "free" && (
              <Link
                href="/premium"
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold py-2.5 px-3 transition hover:opacity-90 hover:shadow-lg"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </Link>
            )}

            {/* Mobile Persona + Auth Row */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
              {/* Persona */}
              {FEATURES.PERSONA_SWITCHER && isHydrated && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm",
                        hasPersona
                          ? "border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300"
                          : "border-cyan-400/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                      )}
                    >
                      {hasPersona && PersonaIcon ? (
                        <>
                          <PersonaIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                          <span className="text-xs">{currentPersona?.shortLabel}</span>
                        </>
                      ) : (
                        <span className="text-xs font-medium">Select persona</span>
                      )}
                      <ChevronDown className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-white dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-700/50">
                    {PERSONA_LIST.map((personaId) => {
                      const meta = PERSONAS[personaId];
                      const Icon = meta.icon;
                      const isSelected = personaId === persona;
                      return (
                        <DropdownMenuItem
                          key={personaId}
                          onClick={() => handlePersonaChange(personaId)}
                          className={cn("flex items-center gap-2", isSelected && "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300")}
                        >
                          <Icon className={cn("h-4 w-4", isSelected ? "text-cyan-600 dark:text-cyan-300" : "text-slate-500 dark:text-slate-400")} />
                          <span className={isSelected ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}>{meta.shortLabel}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Auth */}
              {!session?.user ? (
                <Button
                  size="sm"
                  className="rounded-lg bg-linear-to-r from-emerald-500 to-cyan-500 text-black h-8 px-3 text-xs"
                  asChild
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/profile" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <ProfileAvatar user={session.user} size="sm" />
                    <span className="truncate max-w-[80px]">{session.user.name || "Account"}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 h-8 px-2 text-xs"
                    onClick={async () => {
                      await authClient.signOut();
                      window.location.href = "/";
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
