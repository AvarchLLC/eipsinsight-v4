"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Info,
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
import { toast } from "sonner";

// Mobile navigation items (same as sidebar)
const mobileNavItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "Standards", href: "/standards", icon: Layers },
  { title: "Upgrades", href: "/upgrade", icon: Package },
  { title: "Analytics", href: "/analytics/prs", icon: LineChart },
  { title: "Resources", href: "/resources", icon: BookOpen },
  { title: "About Us", href: "/about", icon: Info },
];

const PERSONA_TONE: Record<string, string> = {
  emerald: "text-emerald-300 border-emerald-400/35 bg-emerald-500/12",
  baby: "text-sky-300 border-sky-300/35 bg-sky-400/12",
  orange: "text-orange-300 border-orange-300/35 bg-orange-500/12",
  purple: "text-purple-300 border-purple-300/35 bg-purple-500/12",
  violet: "text-violet-300 border-violet-300/35 bg-violet-500/12",
  sky: "text-cyan-200 border-cyan-200/40 bg-cyan-300/12",
};

const PERSONA_ICON_TONE: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  baby: "bg-sky-400/15 text-sky-300 border-sky-300/30",
  orange: "bg-orange-500/15 text-orange-300 border-orange-300/30",
  purple: "bg-purple-500/15 text-purple-300 border-purple-300/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-300/30",
  sky: "bg-cyan-300/15 text-cyan-200 border-cyan-200/35",
};

const PERSONA_HOVER_TONE: Record<string, string> = {
  emerald:
    "hover:bg-emerald-500/12 hover:border-emerald-400/30 hover:text-foreground focus:bg-emerald-500/12 focus:border-emerald-400/30 focus:text-foreground data-[highlighted]:bg-emerald-500/12 data-[highlighted]:border-emerald-400/30 data-[highlighted]:text-foreground",
  baby:
    "hover:bg-sky-400/12 hover:border-sky-300/30 hover:text-foreground focus:bg-sky-400/12 focus:border-sky-300/30 focus:text-foreground data-[highlighted]:bg-sky-400/12 data-[highlighted]:border-sky-300/30 data-[highlighted]:text-foreground",
  orange:
    "hover:bg-orange-500/12 hover:border-orange-300/30 hover:text-foreground focus:bg-orange-500/12 focus:border-orange-300/30 focus:text-foreground data-[highlighted]:bg-orange-500/12 data-[highlighted]:border-orange-300/30 data-[highlighted]:text-foreground",
  purple:
    "hover:bg-purple-500/12 hover:border-purple-300/30 hover:text-foreground focus:bg-purple-500/12 focus:border-purple-300/30 focus:text-foreground data-[highlighted]:bg-purple-500/12 data-[highlighted]:border-purple-300/30 data-[highlighted]:text-foreground",
  violet:
    "hover:bg-violet-500/12 hover:border-violet-300/30 hover:text-foreground focus:bg-violet-500/12 focus:border-violet-300/30 focus:text-foreground data-[highlighted]:bg-violet-500/12 data-[highlighted]:border-violet-300/30 data-[highlighted]:text-foreground",
  sky:
    "hover:bg-cyan-300/12 hover:border-cyan-200/35 hover:text-foreground focus:bg-cyan-300/12 focus:border-cyan-200/35 focus:text-foreground data-[highlighted]:bg-cyan-300/12 data-[highlighted]:border-cyan-200/35 data-[highlighted]:text-foreground",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
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
    setPersona(newPersona, { redirect: false });
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
  const currentPersonaTone = currentPersona ? PERSONA_TONE[currentPersona.color] : "";

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <nav
      className={cn(
        "relative z-50 w-full transition-all duration-300",
        "border-b border-border bg-background/95 backdrop-blur-xl",
        scrolled
          ? "border-primary/30 bg-background/98 shadow-[0_8px_28px_rgb(var(--persona-accent-rgb)/0.14)]"
          : "shadow-[0_2px_12px_rgb(var(--persona-accent-rgb)/0.08)]"
      )}
    >
      <div className="w-full max-w-full px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex h-14 items-center gap-3">
          {/* LEFT: Logo (Desktop) */}
          <Link
            href="/"
            className="hidden md:flex items-center gap-2 shrink-0 basis-[220px] min-w-[220px] group"
          >
            <div className="relative">
              <ThemedLogoGif
                alt="EIPsInsight"
                width={28}
                height={28}
                unoptimized
              />
            </div>
            <span className="dec-title font-semibold text-foreground transition-colors group-hover:text-primary">
              EIPsInsight
            </span>
          </Link>

          {/* CENTER: Search (Desktop) - Flex grow to center */}
          <div className="hidden md:flex min-w-0 flex-1 justify-center px-2 lg:px-4">
            <div className="w-full max-w-xl">
              <SearchBar />
            </div>
          </div>

          {/* RIGHT: Theme + Persona + Profile (Desktop) */}
          <div className="hidden md:flex items-center justify-end gap-1.5 shrink-0 basis-[220px] min-w-[220px]">
            <ThemeToggle variant="switch" className="shrink-0" />
            {/* Compact Persona Switcher */}
            {FEATURES.PERSONA_SWITCHER && isHydrated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-200",
                      "hover:scale-[1.02]",
                      hasPersona 
                        ? cn("text-foreground", currentPersonaTone, "hover:border-primary/40")
                        : "animate-pulse border-primary/40 bg-primary/10 text-primary"
                    )}
                  >
                    {hasPersona && PersonaIcon ? (
                      <>
                        <PersonaIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs leading-none">{currentPersona?.shortLabel}</span>
                      </>
                    ) : (
                      <span className="text-xs font-medium">Select persona</span>
                    )}
                    <ChevronDown className={cn("h-3 w-3", hasPersona ? "text-current/80" : "text-muted-foreground")} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 border-border bg-popover/95 p-1 backdrop-blur-xl"
                >
                  {!hasPersona && (
                    <div className="mb-1 border-b border-border px-2 py-2 text-xs text-muted-foreground">
                      Choose how you use EIPsInsight
                    </div>
                  )}
                  {PERSONA_LIST.map((personaId) => {
                    const meta = PERSONAS[personaId];
                    const Icon = meta.icon;
                    const isSelected = personaId === persona;
                    const tone = PERSONA_TONE[meta.color];
                    const iconTone = PERSONA_ICON_TONE[meta.color];
                    const hoverTone = PERSONA_HOVER_TONE[meta.color];
                    return (
                      <DropdownMenuItem
                        key={personaId}
                        onClick={() => handlePersonaChange(personaId)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-2.5 transition-all duration-200",
                          isSelected
                            ? cn(tone, "shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.18)]")
                            : cn("bg-transparent text-foreground", hoverTone)
                        )}
                      >
                        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", iconTone)}>
                          <Icon className="h-4 w-4 shrink-0" />
                        </div>
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                            {meta.shortLabel}
                          </span>
                          <span className="text-[10px] leading-tight text-muted-foreground/90">
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
                className="h-8 rounded-lg persona-gradient px-3 text-xs text-primary-foreground hover:opacity-90"
                asChild
              >
                <Link href="/login">Sign in</Link>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card p-0 transition-all duration-200 hover:border-primary/50 hover:bg-muted/60">
                    <ProfileAvatar user={session.user} size="xs" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 overflow-hidden rounded-xl border border-border bg-popover/95 p-0 shadow-xl backdrop-blur-xl"
                >
                  {/* Header */}
                  <div className="relative border-b border-border bg-muted/40 px-4 py-3">
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />
                    <div className="flex items-center gap-3">
                      <ProfileAvatar user={session.user} size="md" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-medium text-foreground">
                          {userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Signed in
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-foreground">
                        <Settings2 className="h-4 w-4 text-primary" />
                        <span className="text-sm">Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mx-2 my-1 border-border" />
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-4 py-2 text-foreground"
                      onClick={handleSignOut}
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
              <span className="dec-title text-sm font-semibold text-foreground">
                EIPsInsight
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <ThemeToggle variant="icon" />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "inline-flex items-center justify-center rounded-lg p-2 transition-colors",
                "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                mobileOpen && "bg-muted/70 text-foreground"
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
        <div className="border-t border-border bg-background/98 backdrop-blur-xl md:hidden">
          <div className="space-y-3 px-4 py-4">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search EIPs, ERCs, authors…"
                className={cn(
                  "h-9 w-full rounded-md border border-border bg-muted/60 px-10 text-sm text-foreground",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
                        ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-primary/80")} />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Upgrade Button */}
            {session?.user && membershipTier === "free" && (
              <Link
                href="/premium"
                className="w-full flex items-center justify-center gap-2 rounded-lg persona-gradient text-white text-sm font-semibold py-2.5 px-3 transition hover:opacity-90 hover:shadow-lg"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </Link>
            )}

            {/* Mobile Persona + Auth Row */}
            <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
              {/* Persona */}
              {FEATURES.PERSONA_SWITCHER && isHydrated && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm",
                        hasPersona
                          ? cn("text-foreground", currentPersonaTone)
                          : "border-primary/40 bg-primary/10 text-primary"
                      )}
                    >
                      {hasPersona && PersonaIcon ? (
                        <>
                          <PersonaIcon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs">{currentPersona?.shortLabel}</span>
                        </>
                      ) : (
                        <span className="text-xs font-medium">Select persona</span>
                      )}
                      <ChevronDown className={cn("h-3 w-3", hasPersona ? "text-current/80" : "text-muted-foreground")} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 border-border bg-popover/95 backdrop-blur-xl">
                    {PERSONA_LIST.map((personaId) => {
                      const meta = PERSONAS[personaId];
                      const Icon = meta.icon;
                      const isSelected = personaId === persona;
                      const tone = PERSONA_TONE[meta.color];
                      const hoverTone = PERSONA_HOVER_TONE[meta.color];
                      return (
                        <DropdownMenuItem
                          key={personaId}
                          onClick={() => handlePersonaChange(personaId)}
                          className={cn(
                            "flex items-center gap-2 rounded-md border border-transparent px-2 py-2",
                            isSelected ? tone : hoverTone
                          )}
                        >
                          <Icon className={cn("h-4 w-4", isSelected ? "text-current" : "text-muted-foreground")} />
                          <span className={cn("text-sm", isSelected ? "text-foreground" : "text-muted-foreground")}>{meta.shortLabel}</span>
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
                  className="h-8 rounded-lg persona-gradient px-3 text-xs text-primary-foreground hover:opacity-90"
                  asChild
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ProfileAvatar user={session.user} size="sm" />
                    <span className="truncate max-w-[80px]">{session.user.name || "Account"}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 h-8 px-2 text-xs"
                    onClick={handleSignOut}
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
