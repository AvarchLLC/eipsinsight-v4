"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Home,
  Layers,
  LineChart,
  Lightbulb,
  Package,
  Settings,
  ChevronRight,
  Sparkles,
  Crown,
  User,
  PanelLeft,
  PanelLeftOpen,
  Compass,
  Search,
  Wrench,
  LayoutDashboard,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { usePersonaStore } from "@/stores/personaStore";
import { DEFAULT_PERSONA, type Persona } from "@/lib/persona";
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

// ============================================================================
// Types
// ============================================================================

interface SidebarSubItem {
  title: string;
  href: string;
  sectionId?: string; // For scroll-spy sections (homepage only)
}

interface SidebarItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  items?: SidebarSubItem[];
}

interface SidebarSection {
  id: string;
  label: string; // Empty string = no label rendered
  items: SidebarItem[];
}

// ============================================================================
// Homepage sections (scroll spy)
// ============================================================================

// ============================================================================
// Sidebar sections definition
// ============================================================================

const sidebarSections: SidebarSection[] = [
  {
    id: "main",
    label: "",
    items: [
      {
        title: "Home",
        icon: Home,
        href: "/",
      },
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
      },
      {
        title: "Search",
        icon: Search,
        href: "/search",
      },
    ],
  },
  {
    id: "standards",
    label: "Standards & Governance",
    items: [
      {
        title: "Standards",
        icon: Layers,
        href: "/standards",
        items: [
          { title: "All Standards", href: "/standards" },
          { title: "EIPs", href: "/standards?repo=eips" },
          { title: "ERCs", href: "/standards?repo=ercs" },
          { title: "RIPs", href: "/standards?repo=rips" },
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
        items: [
          { title: "Previous Upgrades", href: "/upgrade" },
          { title: "Pectra", href: "/upgrade/pectra" },
          { title: "Fusaka", href: "/upgrade/fusaka" },
          { title: "Glamsterdam", href: "/upgrade/glamsterdam" },
          { title: "Hegotá", href: "/upgrade/hegota" },
        ],
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics & Insights",
    items: [
      {
        title: "Analytics",
        icon: LineChart,
        href: "/analytics",
        items: [
          { title: "EIPs", href: "/analytics/eips" },
          { title: "PRs", href: "/analytics/prs" },
          { title: "Board", href: "/tools/board" },
          { title: "Editors", href: "/analytics/editors" },
          { title: "Reviewers", href: "/analytics/reviewers" },
          { title: "Authors", href: "/analytics/authors" },
          { title: "Contributors", href: "/analytics/contributors" },
        ],
      },
      {
        title: "Insights",
        icon: Lightbulb,
        href: "/insights",
        items: [
          { title: "Overview", href: "/insights" },
          { title: "Year-Month Analysis", href: "/insights/year-month-analysis" },
          { title: "Governance & Process", href: "/insights/governance-and-process" },
          { title: "Upgrade Insights", href: "/insights/upgrade-insights" },
          { title: "Editorial Commentary", href: "/insights/editorial-commentary" },
        ],
      },
    ],
  },
  {
    id: "tools",
    label: "Productivity",
    items: [
      {
        title: "Tools",
        icon: Wrench,
        href: "/tools",
        items: [
          { title: "Overview", href: "/tools" },
          { title: "EIP Builder", href: "/tools/eip-builder" },
          { title: "Dependencies", href: "/tools/dependencies" },
          { title: "Timeline", href: "/tools/timeline" },
        ],
      },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      {
        title: "Resources",
        icon: BookOpen,
        href: "/resources",
        items: [
          { title: "Overview", href: "/resources" },
          { title: "FAQ", href: "/resources/faq" },
          { title: "Blogs", href: "/resources/blogs" },
          { title: "Videos", href: "/resources/videos" },
          { title: "News", href: "/resources/news" },
          { title: "Documentation", href: "/resources/docs" },
        ],
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
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
      {
        title: "Admin",
        icon: Shield,
        href: "/admin/blogs",
        items: [
          { title: "Blogs", href: "/admin/blogs" },
          { title: "Editors", href: "/admin/editors" },
          { title: "Videos", href: "/admin/videos" },
        ],
      },
    ],
  },
];

// ============================================================================
// Persona-based section ordering
// "main" is always first, "account" is always last.
// Only the middle sections are reordered per persona.
// ============================================================================

const PERSONA_SECTION_ORDER: Record<Persona, string[]> = {
  // Developer: protocol upgrades and standards first, then data
  developer: ["standards", "analytics", "tools", "learn"],
  // Editor: editorial workflow — standards, then analytics to track PRs/reviews
  editor: ["standards", "analytics", "tools", "learn"],
  // Researcher: data and analysis first, then the underlying standards
  researcher: ["analytics", "standards", "tools", "learn"],
  // Builder: tools and ERCs for building, then governance context
  builder: ["tools", "standards", "analytics", "learn"],
  // Enterprise: high-level governance overview, then learning resources
  enterprise: ["standards", "analytics", "learn", "tools"],
  // Newcomer: learning first, then progressively deeper content
  newcomer: ["learn", "standards", "analytics", "tools"],
};

const DEFAULT_SECTION_ORDER = ["standards", "analytics", "tools", "learn"];

// ============================================================================
// Helpers
// ============================================================================

function getOrderedSections(persona: Persona | null): SidebarSection[] {
  const sectionMap = new Map(sidebarSections.map((s) => [s.id, s]));
  const mainSection = sectionMap.get("main")!;
  const accountSection = sectionMap.get("account")!;

  // Respect the feature flag — if persona nav reordering is off, use default order
  if (!FEATURES.PERSONA_NAV_REORDER) {
    const middleSections = DEFAULT_SECTION_ORDER
      .map((id) => sectionMap.get(id))
      .filter((s): s is SidebarSection => !!s);
    return [mainSection, ...middleSections, accountSection];
  }

  const effectivePersona = persona || DEFAULT_PERSONA;
  const order =
    PERSONA_SECTION_ORDER[effectivePersona] || DEFAULT_SECTION_ORDER;

  const middleSections = order
    .map((id) => sectionMap.get(id))
    .filter((s): s is SidebarSection => !!s);

  return [mainSection, ...middleSections, accountSection];
}

/**
 * Determine which collapsible menu item should be auto-expanded
 * based on the current pathname.
 */
function getActiveItemTitle(pathname: string): string | null {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/search")) return "Search";
  if (
    pathname.startsWith("/standards") ||
    pathname.startsWith("/all") ||
    pathname.startsWith("/eip") ||
    pathname.startsWith("/erc") ||
    pathname.startsWith("/rip")
  )
    return "Standards";
  if (pathname.startsWith("/explore")) return "Explore";
  if (pathname.startsWith("/upgrade")) return "Upgrades";
  if (pathname === "/tools/board") return "Analytics";
  if (pathname.startsWith("/analytics")) return "Analytics";
  if (pathname.startsWith("/tools")) return "Tools";
  if (pathname.startsWith("/insights")) return "Insights";
  if (pathname.startsWith("/resources")) return "Resources";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/admin")) return "Admin";
  return null;
}

// ============================================================================
// Inner component (needs useSearchParams which requires Suspense boundary)
// ============================================================================

function AppSidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, toggleSidebar: toggleSidebarUI } = useSidebar();
  const { isOpen, toggleSidebar } = useSidebarStore();
  const persona = usePersonaStore((s) => s.persona);

  // Which collapsible items are currently expanded
  const [openItems, setOpenItems] = React.useState<string[]>(() => {
    const active = getActiveItemTitle(pathname);
    return active ? [active] : [];
  });
  const rememberedOpen = React.useRef<string[]>(openItems);

  // Scroll spy state (kept for future use)
  const [activeSection, setActiveSection] = React.useState("");
  const [membershipTier, setMembershipTier] = React.useState<string>("free");

  // Fetch membership tier
  React.useEffect(() => {
    fetch("/api/stripe/subscription")
      .then((res) => res.json())
      .then((data) => setMembershipTier(data?.tier || "free"))
      .catch(() => setMembershipTier("free"));
  }, []);

  // Get persona-ordered sections
  const orderedSections = React.useMemo(
    () => getOrderedSections(persona),
    [persona]
  );

  // Normalized search param string for reactive comparison
  const currentSearchStr = React.useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.sort();
    return params.toString();
  }, [searchParams]);

  // ========================================================================
  // Collapsible management
  // ========================================================================

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const prevState = React.useRef(state);

  // Sync Zustand state with shadcn sidebar state (one-way: shadcn -> zustand)
  React.useEffect(() => {
    if (prevState.current !== state) {
      prevState.current = state;
      const shouldBeOpen = state === "expanded";
      if (shouldBeOpen !== isOpen) {
        toggleSidebar();
      }
    }
  }, [state, isOpen, toggleSidebar]);

  // Collapse sections when sidebar collapses, restore on expand
  React.useEffect(() => {
    if (state === "collapsed" && openItems.length > 0) {
      rememberedOpen.current = openItems;
      setOpenItems([]);
    } else if (
      state === "expanded" &&
      openItems.length === 0 &&
      rememberedOpen.current.length > 0
    ) {
      setOpenItems(rememberedOpen.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleToggle = React.useCallback(() => {
    toggleSidebarUI();
  }, [toggleSidebarUI]);

  // Listen for toggle event from navbar
  React.useEffect(() => {
    const handler = () => handleToggle();
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, [handleToggle]);

  // Auto-expand the correct collapsible on route change
  React.useEffect(() => {
    const activeItem = getActiveItemTitle(pathname);
    if (activeItem && !openItems.includes(activeItem)) {
      setOpenItems([activeItem]);
    } else if (!activeItem) {
      setOpenItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ========================================================================
  // Scroll spy — collects sectionId entries from all sidebar sub-items
  // ========================================================================

  const sectionIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const section of orderedSections) {
      for (const item of section.items) {
        if (item.items) {
          for (const sub of item.items) {
            if (sub.sectionId) ids.push(sub.sectionId);
          }
        }
      }
    }
    return ids;
  }, [orderedSections]);

  React.useEffect(() => {
    if (pathname !== "/" || sectionIds.length === 0) {
      setActiveSection("");
      return;
    }

    let rafHandle = 0;

    const updateActiveSection = () => {
      const threshold = window.innerHeight * 0.3;
      let currentActive = "";

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          currentActive = id;
        }
      }

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 50
      ) {
        currentActive = sectionIds[sectionIds.length - 1];
      }

      if (!currentActive) {
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            currentActive = id;
            break;
          }
        }
      }

      setActiveSection(currentActive);
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafHandle);
      rafHandle = requestAnimationFrame(updateActiveSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const initTimer = setTimeout(updateActiveSection, 150);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafHandle);
      clearTimeout(initTimer);
    };
  }, [pathname, sectionIds]);

  // ========================================================================
  // Active state helpers
  // ========================================================================

  /**
   * Check if a sub-item is the currently active one.
   *
   * - Scroll spy items: only active if we're on "/" AND the scroll spy says so
   * - URL items: exact match on pathname + normalized query params
   *
   * This fixes the old bug where "Overview" (/tools) was highlighted when
   * visiting /tools/eip-builder, because the old code used prefix matching.
   */
  const isSubItemActive = React.useCallback(
    (subItem: SidebarSubItem): boolean => {
      // Scroll-spy items (homepage only)
      if (subItem.sectionId) {
        return pathname === "/" && activeSection === subItem.sectionId;
      }

      // Parse the href into path + search
      const url = new URL(subItem.href, "http://localhost");
      const hrefPath = url.pathname;

      // Path must match exactly (no prefix matching for sub-items!)
      if (pathname !== hrefPath) return false;

      // Compare query params — both sides sorted for order-insensitive match
      const hrefParams = new URLSearchParams(url.search);
      hrefParams.sort();
      return hrefParams.toString() === currentSearchStr;
    },
    [pathname, currentSearchStr, activeSection]
  );

  /**
   * Check if a parent item's path is active (prefix match).
   * Used for the top-level collapsible highlight.
   */
  const isParentPathActive = React.useCallback(
    (href?: string): boolean => {
      if (!href) return false;
      const basePath = href.split("?")[0].split("#")[0];
      if (basePath === "/") return pathname === "/";
      return pathname === basePath || pathname.startsWith(basePath + "/");
    },
    [pathname]
  );

  /**
   * Check if any child sub-item is currently active.
   */
  const hasActiveChild = React.useCallback(
    (items?: SidebarSubItem[]): boolean => {
      if (!items) return false;
      return items.some((item) => isSubItemActive(item));
    },
    [isSubItemActive]
  );

  // ========================================================================
  // Render
  // ========================================================================

  const renderSubItem = (subItem: SidebarSubItem) => {
    const isActive = isSubItemActive(subItem);

    return (
      <SidebarMenuSubItem key={subItem.title + subItem.href}>
        <SidebarMenuSubButton
          asChild
          isActive={isActive}
          className={cn(
            "rounded-md py-1.5 transition-all duration-200",
            "hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-0.5",
            "border border-transparent hover:border-slate-200 dark:hover:border-cyan-400/20",
            isActive &&
              "bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-medium border-slate-200 dark:border-cyan-400/30"
          )}
        >
          <Link
            href={subItem.href}
            onClick={(e) => {
              // For scroll-spy items, smooth-scroll instead of navigating
              if (subItem.sectionId) {
                e.preventDefault();
                const el = document.getElementById(subItem.sectionId);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.pushState(null, "", subItem.href);
                  setActiveSection(subItem.sectionId);
                }
              }
            }}
          >
            <span className="text-xs">{subItem.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  const renderItem = (item: SidebarItem) => {
    const hasSubItems = item.items && item.items.length > 0;
    const isItemOpen = openItems.includes(item.title);
    const isActive = isParentPathActive(item.href);
    const isChildActive = hasActiveChild(item.items);
    const isHighlighted = isActive || isChildActive;

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
                  "hover:bg-slate-100 dark:hover:bg-slate-800/70 dark:hover:border-cyan-400/20",
                  "border border-transparent",
                  (isItemOpen || isHighlighted) &&
                    "bg-slate-100 dark:bg-slate-800/80 dark:border-cyan-400/30",
                  state === "collapsed" &&
                    "w-11 h-11 p-0 flex items-center justify-center"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isHighlighted
                      ? "text-emerald-600 dark:text-emerald-300 dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                      : "text-slate-500 dark:text-cyan-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 dark:group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                    state === "collapsed" && "shrink-0"
                  )}
                />
                {state === "expanded" && (
                  <>
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        isHighlighted
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-600 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white"
                      )}
                    >
                      {item.title}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-slate-400 dark:text-cyan-400/50 transition-all duration-300",
                        isItemOpen && "rotate-90 text-emerald-600 dark:text-emerald-400"
                      )}
                    />
                  </>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {state === "expanded" && (
              <CollapsibleContent>
                <SidebarMenuSub className="ml-0 border-l-2 border-slate-200 dark:border-cyan-400/10 pl-6 pt-2">
                  {item.items?.map(renderSubItem)}
                </SidebarMenuSub>
              </CollapsibleContent>
            )}
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    // Simple item (no sub-items) — e.g. Upgrades, Profile, Settings
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={state === "collapsed" ? item.title : undefined}
          className={cn(
            "group relative overflow-hidden rounded-lg transition-all duration-300",
            "hover:bg-slate-100 dark:hover:bg-slate-800/70 dark:hover:border-cyan-400/20 hover:translate-x-0.5",
            "border border-transparent",
            isActive &&
              "bg-slate-100 dark:bg-slate-800/80 dark:border-cyan-400/40",
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
                  ? "text-emerald-600 dark:text-emerald-300 dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : "text-slate-500 dark:text-cyan-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 dark:group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                state === "collapsed" && "shrink-0"
              )}
            />
            {state === "expanded" && (
              <span
                className={cn(
                  "text-sm transition-colors",
                  isActive
                    ? "text-slate-900 dark:text-white font-semibold"
                    : "text-slate-600 dark:text-slate-100 font-medium group-hover:text-slate-900 dark:group-hover:text-white"
                )}
              >
                {item.title}
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200 dark:border-cyan-300/20 bg-white dark:bg-slate-950/95 backdrop-blur-xl"
    >
      {/* Header with Toggle Button — matches navbar h-14 */}
      <SidebarHeader
        className={cn(
          "h-14 border-b border-slate-200 dark:border-cyan-300/20 bg-white/95 dark:bg-slate-950/80 transition-all duration-300 flex items-center",
          state === "expanded" ? "px-2" : "justify-center px-1"
        )}
      >
        <button
          onClick={handleToggle}
          className={cn(
            "group flex items-center justify-center gap-2 rounded-lg transition-all duration-300",
            "hover:bg-slate-100 dark:hover:bg-slate-800/70",
            "border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-cyan-400/30",
            "bg-slate-100 dark:bg-slate-800/60",
            state === "expanded" ? "w-full h-10 px-3" : "w-10 h-10"
          )}
          title={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
        >
          {state === "expanded" ? (
            <>
              <PanelLeft className="h-4 w-4 text-slate-600 dark:text-cyan-300 transition-colors group-hover:text-slate-900 dark:group-hover:text-emerald-300 shrink-0" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Collapse
              </span>
            </>
          ) : (
            <PanelLeftOpen className="h-4 w-4 text-slate-600 dark:text-cyan-300 transition-colors group-hover:text-slate-900 dark:group-hover:text-emerald-300" />
          )}
        </button>
      </SidebarHeader>

      <SidebarContent
        className={cn(
          "gap-0 py-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-500/20",
          state === "collapsed" && "px-0 items-center"
        )}
      >
        {orderedSections.map((section) => (
          <SidebarGroup key={section.id} className="py-0">
            {/* Section label (expanded) or separator line (collapsed) */}
            {state === "expanded" && section.label && (
              <SidebarGroupLabel className="px-4 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-cyan-300/50">
                {section.label}
              </SidebarGroupLabel>
            )}
            {state === "collapsed" && section.label && (
              <div className="my-2 h-px w-6 bg-slate-300 dark:bg-cyan-400/15" />
            )}
            <SidebarGroupContent
              className={cn(
                "px-3",
                state === "collapsed" && "px-2 w-full flex flex-col items-center"
              )}
            >
              <SidebarMenu
                className={cn(
                  "gap-1.5",
                  state === "collapsed" && "items-center"
                )}
              >
                {section.items.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-slate-200 dark:border-cyan-300/20 bg-slate-50 dark:bg-slate-950/80 p-3">
        {membershipTier === "free" && (
          state === "expanded" ? (
            <Link href="/premium">
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-3 border border-slate-200 dark:border-cyan-400/30 transition hover:border-slate-300 dark:hover:border-cyan-400/50 hover:bg-slate-200 dark:hover:bg-slate-800">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-300 dark:drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Pro Version</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">
                    Unlock all features
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href="/premium"
              className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Pro Version"
            >
              <Crown className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            </Link>
          )
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

// ============================================================================
// Exported component — wraps inner content in Suspense for useSearchParams
// ============================================================================

export function AppSidebar() {
  return (
    <Suspense>
      <AppSidebarContent />
    </Suspense>
  );
}
