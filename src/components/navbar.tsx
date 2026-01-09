"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Menu,
  X,
  PanelLeft,
  User,
  Settings2,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebarStore";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/hooks/useSession";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isOpen } = useSidebarStore();

  const { data: session } = useSession();

  const userName = session?.user?.name ?? session?.user?.email;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-cyan-300/20 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Collapse Button - Show only when sidebar is open */}
          {isOpen && (
            <button
              onClick={() => {
                const event = new CustomEvent("toggle-sidebar");
                window.dispatchEvent(event);
              }}
              className={cn(
                "mr-2 group rounded-lg p-2 transition-all duration-300",
                "hover:bg-linear-to-r hover:from-emerald-500/15 hover:via-cyan-500/15 hover:to-blue-500/15",
                "hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] border border-transparent hover:border-cyan-400/30"
              )}
            >
              <PanelLeft className="h-5 w-5 text-cyan-300 transition-colors group-hover:text-emerald-300" />
            </button>
          )}

          {/* LEFT: Logo - Show when sidebar is closed on desktop */}
          <Link
            href="/"
            className={cn(
              "group shrink-0 transition-all duration-300",
              isOpen && "md:opacity-0 md:pointer-events-none md:w-0"
            )}
          >
            <div className="relative flex items-center gap-2 overflow-hidden rounded-xl p-1.5">
              <div className="absolute inset-0 scale-110 bg-linear-to-r from-emerald-400/20 via-cyan-400/20 to-emerald-400/20 opacity-0 blur-md transition-all duration-300 group-hover:opacity-100" />

              <div className="relative z-10">
                <Image
                  src="/brand/logo/EIPsInsightsDark.gif"
                  alt="EIPsInsight"
                  width={28}
                  height={28}
                  className="dark:hidden"
                />
                <Image
                  src="/brand/logo/EIPsInsights.gif"
                  alt="EIPsInsight"
                  width={28}
                  height={28}
                  className="hidden dark:block"
                />
              </div>

              <span className="dec-title relative z-10 hidden font-semibold tracking-tight text-slate-900 transition-colors duration-300 dark:text-white sm:inline">
                EIPsInsight
              </span>

              <div className="absolute inset-0 rounded-xl border border-transparent transition-all duration-300 group-hover:border-emerald-400/50">
                <div className="absolute inset-0 rounded-xl bg-linear-to-r from-emerald-400/10 via-cyan-400/10 to-emerald-400/10 opacity-0 transition-all duration-300 group-hover:opacity-100" />
              </div>
            </div>
          </Link>

          {/* CENTER: Search (Desktop) */}
          <div className="hidden flex-1 justify-center px-6 md:flex">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/80" />
              <input
                type="search"
                placeholder="Search EIPs, ERCs, RIPs, authors, status…"
                className={cn(
                  "w-full rounded-full border border-cyan-300/30 bg-black/40",
                  "pl-10 pr-4 py-2.5 text-sm text-slate-200",
                  "placeholder:text-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-400/40",
                  "transition"
                )}
              />
            </div>
          </div>

          {/* RIGHT: Auth/Profile (Desktop) */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {!session?.user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button
                  size="sm"
                  className="rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 text-black hover:from-emerald-400 hover:to-cyan-400"
                  asChild
                >
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group flex items-center gap-2 rounded-full border border-cyan-300/30 bg-black/30 px-2.5 py-1.5 shadow-[0_0_20px_rgba(8,47,73,0.25)] transition hover:-translate-y-[1px] hover:border-cyan-200/60 hover:shadow-[0_10px_40px_rgba(6,182,212,0.25)]">
                    <ProfileAvatar user={session.user} size="sm" />
                    <span className="text-sm text-slate-200">{userName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 overflow-hidden border-cyan-400/30 bg-slate-950/90 p-0 shadow-[0_15px_60px_rgba(6,182,212,0.18)] backdrop-blur-xl"
                >
                  <div className="relative border-b border-cyan-300/20 bg-linear-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 px-4 py-4">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_55%)]" />
                    <div className="relative flex items-center gap-3">
                      <ProfileAvatar user={session.user} size="md" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-50">{userName}</span>
                        <span className="text-xs text-slate-400">Signed in · secure</span>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <DropdownMenuItem asChild className="gap-2 text-slate-100">
                      <Link href="/profile" className="flex w-full items-center gap-2">
                        <User className="h-4 w-4 text-emerald-300" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Profile</span>
                          <span className="text-xs text-slate-400">View and share your page</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2 text-slate-100">
                      <Link href="/settings" className="flex w-full items-center gap-2">
                        <Settings2 className="h-4 w-4 text-cyan-300" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Settings</span>
                          <span className="text-xs text-slate-400">Account, notifications</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mx-2 my-1 border-cyan-300/20" />
                    <DropdownMenuItem className="gap-2 text-slate-100" onClick={async () => {
                      await authClient.signOut();
                      window.location.href = "/";
                    }}>
                      <LogOut className="h-4 w-4 text-rose-300" />
                      <div className="flex flex-col items-start">
                        <span className="text-sm">Sign out</span>
                        <span className="text-xs text-slate-400">End this session</span>
                      </div>
                    </DropdownMenuItem>
                  </div>

                  <div className="flex items-center justify-between border-t border-cyan-300/20 px-4 py-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Shipped with the Neon pack</span>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">Live</span>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* MOBILE: Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-200 hover:bg-white/10 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE PANEL */}
      {mobileOpen && (
        <div className="border-t border-cyan-300/20 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="space-y-4 px-4 py-4">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/80" />
              <input
                type="search"
                placeholder="Search EIPs, ERCs, authors…"
                className={cn(
                  "w-full rounded-lg border border-cyan-300/30 bg-black/40",
                  "pl-10 pr-4 py-3 text-sm text-slate-200",
                  "placeholder:text-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                )}
              />
            </div>

            {/* Mobile Auth/Profile */}
            {!session?.user ? (
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button
                  className="flex-1 rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 text-black"
                  asChild
                >
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-300/20 bg-slate-950/70 px-3 py-3 shadow-[0_10px_40px_rgba(6,182,212,0.15)]">
                <div className="flex items-center gap-2">
                  <ProfileAvatar user={session.user} size="md" />
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-200">{userName}</span>
                    <span className="text-xs text-slate-400">Signed in</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" asChild>
                    <Link href="/profile">Profile</Link>
                  </Button>
                  <Button variant="destructive" onClick={async () => {
                    await authClient.signOut();
                    window.location.href = "/";
                  }}>
                    Sign out
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
