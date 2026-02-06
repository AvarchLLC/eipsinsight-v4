"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Home,
  Layers,
  LineChart,
  Package,
  Settings,
  ChevronRight,
  Sparkles,
  Crown,
  User,
  PanelLeft,
  PanelLeftOpen,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { usePersonaStore } from "@/stores/personaStore";
import { PERSONA_NAV_ORDER, DEFAULT_PERSONA, type Persona } from "@/lib/persona";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Homepage sections for scroll spy
const pageSections = [
  { title: "Protocol Bento", href: "/#protocol-bento", sectionId: "protocol-bento" },
  { title: "Governance Over Time", href: "/#governance-over-time", sectionId: "governance-over-time" },
  { title: "Trending Proposals", href: "/#trending-proposals", sectionId: "trending-proposals" },
  { title: "Our Tools", href: "/#our-tools", sectionId: "our-tools" },
  { title: "What We Track", href: "/#what-we-track", sectionId: "what-we-track" },
  { title: "Latest Updates", href: "/#latest-updates", sectionId: "latest-updates" },
  { title: "FAQs", href: "/#faqs", sectionId: "faqs" },
];

// Type for sidebar items
interface SidebarItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  items?: Array<{
    title: string;
    href: string;
    sectionId?: string;
  }>;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Home",
    icon: Home,
    href: "/",
    items: pageSections,
  },
  {
    title: "Standards",
    icon: Layers,
    items: [
      { title: "All Standards", href: "/all" },
      { title: "EIPs", href: "/eip" },
      { title: "ERCs", href: "/erc" },
      { title: "RIPs", href: "/rip" },
    ],
  },
  {
    title: "Explore",
    icon: Compass,
    href: "/explore",
    items: [
      { title: "Explore Hub", href: "/explore" },
      { title: "By Year", href: "/explore/years" },
      { title: "By Status", href: "/explore/status" },
      { title: "By Role", href: "/explore/roles" },
      { title: "Trending", href: "/explore/trending" },
    ],
  },
  {
    title: "Upgrades",
    icon: Package,
    href: "/upgrade",
  },
  {
    title: "Analytics",
    icon: LineChart,
    href: "/analytics",
    items: [
      { title: "PR Analytics", href: "/analytics/prs" },
      { title: "Contributors", href: "/analytics/contributors" },
      { title: "Editors & Reviewers", href: "/analytics/editors" },
    ],
  },
  {
    title: "Resources",
    icon: BookOpen,
    href: "/resources",
  },
  {
    title: "Profile",
    icon: User,
    href: "/profile",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

/**
 * Reorder sidebar items based on persona preferences
 */
function getOrderedSidebarItems(persona: Persona | null): SidebarItem[] {
  if (!FEATURES.PERSONA_NAV_REORDER) {
    return sidebarItems;
  }

  // Use effective persona (fallback to default if null)
  const effectivePersona = persona || DEFAULT_PERSONA;
  const order = PERSONA_NAV_ORDER[effectivePersona];
  if (!order) {
    return sidebarItems;
  }

  const itemMap = new Map(sidebarItems.map((item) => [item.title, item]));
  const orderedItems: SidebarItem[] = [];
  const addedTitles = new Set<string>();

  // Add items in the specified order
  for (const title of order) {
    const item = itemMap.get(title);
    if (item) {
      orderedItems.push(item);
      addedTitles.add(title);
    }
  }

  // Add any remaining items
  for (const item of sidebarItems) {
    if (!addedTitles.has(item.title)) {
      orderedItems.push(item);
    }
  }

  return orderedItems;
}

// Helper to get which menu item should be open based on path
function getActiveMenuItem(pathname: string): string | null {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/all") || pathname.startsWith("/eip") || pathname.startsWith("/erc") || pathname.startsWith("/rip")) return "Standards";
  if (pathname.startsWith("/explore")) return "Explore";
  if (pathname.startsWith("/analytics")) return "Analytics";
  return null;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar: toggleSidebarUI } = useSidebar();
  const { isOpen, toggleSidebar } = useSidebarStore();
  const persona = usePersonaStore((state) => state.persona);
  
  // Initialize open items based on current path - only open the active section
  const [openItems, setOpenItems] = React.useState<string[]>(() => {
    const active = getActiveMenuItem(pathname);
    return active ? [active] : [];
  });
  const rememberedOpen = React.useRef<string[]>(openItems);
  const [activeSection, setActiveSection] = React.useState<string>("");

  // Get ordered sidebar items based on persona
  const orderedItems = React.useMemo(
    () => getOrderedSidebarItems(persona),
    [persona]
  );

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  // Track previous state to prevent infinite loops
  const prevState = React.useRef(state);

  // Sync Zustand state with shadcn state (one-way: shadcn -> zustand)
  React.useEffect(() => {
    // Only sync if state actually changed
    if (prevState.current !== state) {
      prevState.current = state;
      const shouldBeOpen = state === "expanded";
      if (shouldBeOpen !== isOpen) {
        toggleSidebar();
      }
    }
  }, [state, isOpen, toggleSidebar]);

  // Close sections when collapsed, restore when expanded
  React.useEffect(() => {
    if (state === "collapsed" && openItems.length > 0) {
      rememberedOpen.current = openItems;
      setOpenItems([]);
    } else if (state === "expanded" && openItems.length === 0 && rememberedOpen.current.length > 0) {
      setOpenItems(rememberedOpen.current);
    }
  }, [state]); // Only depend on state, not openItems

  const handleToggle = React.useCallback(() => {
    toggleSidebarUI();
  }, [toggleSidebarUI]);

  // Listen for toggle event from navbar
  React.useEffect(() => {
    const handleExternalToggle = () => handleToggle();
    window.addEventListener("toggle-sidebar", handleExternalToggle);
    return () => window.removeEventListener("toggle-sidebar", handleExternalToggle);
  }, [handleToggle]);

  // Update open items when route changes
  React.useEffect(() => {
    const activeItem = getActiveMenuItem(pathname);
    if (activeItem && !openItems.includes(activeItem)) {
      setOpenItems([activeItem]);
    } else if (!activeItem) {
      setOpenItems([]);
    }
  }, [pathname]);

  // Scroll spy for homepage sections
  React.useEffect(() => {
    if (pathname !== "/") {
      setActiveSection("");
      return;
    }

    const sectionIds = pageSections.map((s) => s.sectionId);

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      let maxRatio = 0;
      let mostVisible = "";

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          mostVisible = entry.target.id;
        }
      });

      if (mostVisible && maxRatio > 0.1) {
        setActiveSection(mostVisible);
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pathname]);

  // Check if a path is active
  const isPathActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Check if any subitem is active
  const hasActiveSubItem = (items?: Array<{ href: string; sectionId?: string }>) => {
    if (!items) return false;
    return items.some((item) => {
      if (item.sectionId && pathname === "/") {
        return activeSection === item.sectionId;
      }
      return isPathActive(item.href);
    });
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-cyan-300/20 bg-slate-950/95 backdrop-blur-xl"
    >
      {/* Header with Toggle Button - matches navbar h-14 */}
      <SidebarHeader 
        className={cn(
          "h-14 border-b border-cyan-300/20 bg-slate-950/80 transition-all duration-300 flex items-center",
          state === "expanded" ? "px-2" : "justify-center px-1"
        )}
      >
        <button
          onClick={handleToggle}
          className={cn(
            "group flex items-center justify-center gap-2 rounded-lg transition-all duration-300",
            "hover:bg-gradient-to-r hover:from-emerald-500/15 hover:via-cyan-500/15 hover:to-blue-500/15",
            "hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] border border-cyan-400/20 hover:border-cyan-400/40",
            "bg-slate-900/50",
            state === "expanded" ? "w-full h-10 px-3" : "w-10 h-10"
          )}
          title={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
        >
          {state === "expanded" ? (
            <>
              <PanelLeft className="h-4 w-4 text-cyan-300 transition-colors group-hover:text-emerald-300 shrink-0" />
              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                Collapse
              </span>
            </>
          ) : (
            <PanelLeftOpen className="h-4 w-4 text-cyan-300 transition-colors group-hover:text-emerald-300" />
          )}
        </button>
      </SidebarHeader>

      <SidebarContent
        className={cn(
          "gap-0 py-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-500/20",
          state === "collapsed" && "px-0 items-center"
        )}
      >
        <SidebarGroup>
          {state === "expanded" && (
            <SidebarGroupLabel className="px-4 pb-2 pt-2 text-xs font-bold uppercase tracking-widest text-cyan-300/70">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent
            className={cn(
              "px-3",
              state === "collapsed" && "px-2 w-full flex flex-col items-center"
            )}
          >
            <SidebarMenu
              className={cn("gap-1.5", state === "collapsed" && "items-center")}
            >
              {orderedItems.map((item) => {
                const hasSubItems = item.items && item.items.length > 0;
                const isItemOpen = openItems.includes(item.title);
                const isActive = item.href ? isPathActive(item.href) : hasActiveSubItem(item.items);
                const isParentActive = hasSubItems && hasActiveSubItem(item.items);

                if (hasSubItems) {
                  return (
                    <Collapsible
                      key={item.title}
                      open={isItemOpen}
                      onOpenChange={() => toggleItem(item.title)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={state === "collapsed" ? item.title : undefined}
                            className={cn(
                              "group relative overflow-hidden rounded-lg transition-all duration-300",
                              "hover:bg-gradient-to-r hover:from-emerald-500/15 hover:via-cyan-500/15 hover:to-blue-500/15",
                              "hover:shadow-[0_0_15px_rgba(34,211,238,0.1)]",
                              "border border-transparent",
                              (isItemOpen || isParentActive) &&
                                "bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border-cyan-400/20",
                              state === "collapsed" &&
                                "w-11 h-11 p-0 flex items-center justify-center"
                            )}
                          >
                            <item.icon
                              className={cn(
                                "h-5 w-5 transition-all duration-300",
                                isParentActive
                                  ? "text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                  : "text-cyan-300 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                                state === "collapsed" && "shrink-0"
                              )}
                            />
                            {state === "expanded" && (
                              <>
                                <span
                                  className={cn(
                                    "flex-1 text-sm font-medium transition-colors",
                                    isParentActive
                                      ? "text-white"
                                      : "text-slate-100 group-hover:text-white"
                                  )}
                                >
                                  {item.title}
                                </span>
                                <ChevronRight
                                  className={cn(
                                    "h-3.5 w-3.5 text-cyan-400/50 transition-all duration-300",
                                    isItemOpen && "rotate-90 text-emerald-400"
                                  )}
                                />
                              </>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {state === "expanded" && (
                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-0 border-l-2 border-cyan-400/10 pl-6 pt-2">
                              {item.items?.map((subItem) => {
                                const isSubActive = subItem.sectionId
                                  ? pathname === "/" && activeSection === subItem.sectionId
                                  : isPathActive(subItem.href);

                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isSubActive}
                                      className={cn(
                                        "rounded-md py-1.5 transition-all duration-200",
                                        "hover:bg-cyan-500/10 hover:text-white hover:translate-x-0.5",
                                        "border border-transparent hover:border-cyan-400/20",
                                        isSubActive &&
                                          "bg-gradient-to-r from-emerald-400/15 via-cyan-400/15 to-blue-400/15 text-white font-medium shadow-[0_0_12px_rgba(34,211,238,0.15)] border-cyan-400/30"
                                      )}
                                    >
                                      <Link
                                        href={subItem.href}
                                        onClick={(e) => {
                                          if (subItem.sectionId) {
                                            e.preventDefault();
                                            const el = document.getElementById(
                                              subItem.sectionId
                                            );
                                            if (el) {
                                              el.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                              });
                                              window.history.pushState(
                                                null,
                                                "",
                                                subItem.href
                                              );
                                              setActiveSection(subItem.sectionId);
                                            }
                                          }
                                        }}
                                      >
                                        <span className="text-xs">
                                          {subItem.title}
                                        </span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={state === "collapsed" ? item.title : undefined}
                      className={cn(
                        "group relative overflow-hidden rounded-lg transition-all duration-300",
                        "hover:bg-gradient-to-r hover:from-emerald-500/15 hover:via-cyan-500/15 hover:to-blue-500/15",
                        "hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:translate-x-0.5",
                        "border border-transparent",
                        isActive &&
                          "bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)] border-cyan-400/40",
                        state === "collapsed" &&
                          "w-11 h-11 p-0 flex items-center justify-center"
                      )}
                    >
                      <Link
                        href={item.href || "#"}
                        className={cn(
                          state === "collapsed" &&
                            "flex h-full w-full items-center justify-center"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 transition-all duration-300",
                            isActive
                              ? "text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                              : "text-cyan-300 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                            state === "collapsed" && "shrink-0"
                          )}
                        />
                        {state === "expanded" && (
                          <span
                            className={cn(
                              "text-sm transition-colors",
                              isActive
                                ? "text-white font-semibold"
                                : "text-slate-100 font-medium group-hover:text-white"
                            )}
                          >
                            {item.title}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-cyan-300/20 bg-slate-950/80 p-3">
        {state === "expanded" ? (
          <Link href="/premium">
            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 p-3 shadow-[0_0_15px_rgba(34,211,238,0.08)] border border-cyan-400/20 transition hover:border-cyan-300/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.18)]">
              <Sparkles className="h-4 w-4 text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">Pro Version</p>
                <p className="text-[10px] text-cyan-200/60">Unlock all features</p>
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href="/premium"
            className="flex items-center justify-center p-2 rounded-lg hover:bg-cyan-500/10 transition-colors"
            title="Pro Version"
          >
            <Crown className="h-5 w-5 text-emerald-300" />
          </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
