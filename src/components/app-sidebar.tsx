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
import { client } from "@/lib/orpc";
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
  sectionId?: string; // Backward compat; prefer href hash sections (/path#section)
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
          { title: "Overview", href: "/upgrade" },
          { title: "Previous Upgrades", href: "/upgrade/archive" },
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
          { title: "About Us", href: "/about" },
        ],
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      {
        title: "Settings",
        icon: Settings,
        href: "/settings",
      },
      {
        title: "Admin",
        icon: Shield,
        href: "/admin?tab=blogs",
        items: [
          { title: "Blogs", href: "/admin#blogs" },
          { title: "Editors", href: "/admin#editors" },
          { title: "Videos", href: "/admin#videos" },
          { title: "Feedback", href: "/admin#feedback" },
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
  developer: ["standards", "analytics", "tools", "learn"],
  editor: ["analytics", "tools", "standards", "learn"],
  researcher: ["analytics", "standards", "tools", "learn"],
  builder: ["tools", "standards", "learn", "analytics"],
  enterprise: ["standards", "analytics", "learn", "tools"],
  newcomer: ["learn", "standards", "analytics", "tools"],
};

const DEFAULT_SECTION_ORDER = ["standards", "analytics", "tools", "learn"];

const PERSONA_ITEM_PRIORITY: Record<Persona, string[]> = {
  developer: [
    "Upgrades",
    "Standards",
    "Analytics",
    "Tools",
    "Insights",
    "Explore",
    "Resources",
    "Search",
    "Home",
    "Dashboard",
  ],
  editor: [
    "Search",
    "Analytics",
    "Tools",
    "Standards",
    "Insights",
    "Explore",
    "Resources",
    "Upgrades",
    "Home",
    "Dashboard",
  ],
  researcher: [
    "Analytics",
    "Insights",
    "Standards",
    "Explore",
    "Search",
    "Upgrades",
    "Tools",
    "Resources",
    "Home",
    "Dashboard",
  ],
  builder: [
    "Tools",
    "Standards",
    "Search",
    "Explore",
    "Resources",
    "Insights",
    "Analytics",
    "Upgrades",
    "Home",
    "Dashboard",
  ],
  enterprise: [
    "Upgrades",
    "Insights",
    "Standards",
    "Analytics",
    "Explore",
    "Resources",
    "Tools",
    "Search",
    "Home",
    "Dashboard",
  ],
  newcomer: [
    "Resources",
    "Explore",
    "Home",
    "Dashboard",
    "Standards",
    "Upgrades",
    "Insights",
    "Analytics",
    "Tools",
    "Search",
  ],
};

// ============================================================================
// Helpers
// ============================================================================

function sortItemsByPersonaPriority(
  items: SidebarItem[],
  persona: Persona
): SidebarItem[] {
  const priority = PERSONA_ITEM_PRIORITY[persona];
  const rank = new Map(priority.map((title, idx) => [title, idx]));
  return [...items].sort((a, b) => {
    const ar = rank.get(a.title) ?? Number.MAX_SAFE_INTEGER;
    const br = rank.get(b.title) ?? Number.MAX_SAFE_INTEGER;
    if (ar !== br) return ar - br;
    return a.title.localeCompare(b.title);
  });
}

function getOrderedSections(persona: Persona | null): SidebarSection[] {
  const sectionMap = new Map(sidebarSections.map((s) => [s.id, s]));
  const mainSection = sectionMap.get("main")!;
  const accountSection = sectionMap.get("account")!;

  // Respect the feature flag — if persona nav reordering is off, use default order
  const effectivePersona = persona || DEFAULT_PERSONA;

  if (!FEATURES.PERSONA_NAV_REORDER) {
    const middleSections = DEFAULT_SECTION_ORDER
      .map((id) => sectionMap.get(id))
      .filter((s): s is SidebarSection => !!s);
    return [mainSection, ...middleSections, accountSection].map((section) => ({
      ...section,
      items: sortItemsByPersonaPriority(section.items, effectivePersona),
    }));
  }

  const order =
    PERSONA_SECTION_ORDER[effectivePersona] || DEFAULT_SECTION_ORDER;

  const middleSections = order
    .map((id) => sectionMap.get(id))
    .filter((s): s is SidebarSection => !!s);

  return [mainSection, ...middleSections, accountSection].map((section) => ({
    ...section,
    items: sortItemsByPersonaPriority(section.items, effectivePersona),
  }));
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
  if (pathname.startsWith("/profile")) return "Settings";
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

  // Accordion behavior: only one parent open at a time
  const [openItem, setOpenItem] = React.useState<string | null>(() => {
    const active = getActiveItemTitle(pathname);
    return active ?? null;
  });
  const rememberedOpen = React.useRef<string | null>(openItem);

  // Scroll spy state (kept for future use)
  const [activeSection, setActiveSection] = React.useState("");
  const [membershipTier, setMembershipTier] = React.useState<string>("free");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [hash, setHash] = React.useState(() => 
    typeof window !== "undefined" ? window.location.hash : ""
  );

  // Fetch membership tier
  React.useEffect(() => {
    fetch("/api/stripe/subscription")
      .then((res) => res.json())
      .then((data) => setMembershipTier(data?.tier || "free"))
      .catch(() => setMembershipTier("free"));
  }, []);

  React.useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  // Also update hash when pathname or searchParams change
  React.useEffect(() => {
    setHash(window.location.hash);
  }, [pathname, searchParams]);

  React.useEffect(() => {
    let cancelled = false;
    client.account
      .getMe()
      .then((user) => {
        if (!cancelled) setIsAdmin(user.role === "admin");
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Get persona-ordered sections
  const orderedSections = React.useMemo(
    () => getOrderedSections(persona),
    [persona]
  );

  const visibleSections = React.useMemo(() => {
    return orderedSections.map((section) => {
      if (section.id !== "account") return section;
      const items = section.items.filter((item) => {
        if (item.title === "Admin") return isAdmin;
        return true;
      });
      return { ...section, items };
    });
  }, [orderedSections, isAdmin]);

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
    setOpenItem((prev) => (prev === title ? null : title));
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
    if (state === "collapsed" && openItem) {
      rememberedOpen.current = openItem;
      setOpenItem(null);
    } else if (state === "expanded" && !openItem && rememberedOpen.current) {
      setOpenItem(rememberedOpen.current);
    }
  }, [state, openItem]);

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
    setOpenItem(activeItem ?? null);
  }, [pathname, currentSearchStr, hash]);

  // ========================================================================
  // Scroll spy — active page only (hash sections for any route)
  // ========================================================================

  const activeParentItem = React.useMemo(() => {
    const allItems = visibleSections.flatMap((section) => section.items);

    return (
      allItems.find((item) => {
        if (!item.items?.length) return false;
        return item.items.some((sub) => {
          const url = new URL(sub.href, "http://localhost");
          const hrefPath = url.pathname;
          const hrefParams = new URLSearchParams(url.search);
          hrefParams.sort();
          return pathname === hrefPath && hrefParams.toString() === currentSearchStr;
        });
      }) ?? null
    );
  }, [visibleSections, pathname, currentSearchStr]);

  const trackedSections = React.useMemo(() => {
    if (!activeParentItem?.items?.length) return [];
    return activeParentItem.items
      .map((sub) => {
        const url = new URL(sub.href, "http://localhost");
        const id = sub.sectionId || url.hash.replace(/^#/, "");
        const hrefPath = url.pathname;
        return id && hrefPath === pathname ? id : null;
      })
      .filter((x): x is string => !!x);
  }, [activeParentItem, pathname]);

  React.useEffect(() => {
    if (trackedSections.length === 0) {
      setActiveSection("");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.4, 0.7],
      }
    );

    trackedSections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [trackedSections]);

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
      // Parse the href into path + search
      const url = new URL(subItem.href, "http://localhost");
      const hrefPath = url.pathname;

      // Path must match exactly (no prefix matching for sub-items!)
      if (pathname !== hrefPath) return false;

      // Compare query params — both sides sorted for order-insensitive match
      const hrefParams = new URLSearchParams(url.search);
      hrefParams.sort();
      if (hrefParams.toString() !== currentSearchStr) return false;

      const sectionId = subItem.sectionId || url.hash.replace(/^#/, "");
      if (sectionId) {
        if (activeSection) return activeSection === sectionId;
        return hash === `#${sectionId}`;
      }
      return true;
    },
    [pathname, currentSearchStr, activeSection, hash]
  );

  /**
   * Check if a parent item's path is active (prefix match).
   * Used for the top-level collapsible highlight.
   * Special handling for hash-based routing (e.g., /admin#blogs).
   */
  const isParentPathActive = React.useCallback(
    (href?: string): boolean => {
      if (!href) return false;
      
      const parsed = new URL(href, "http://localhost");
      const basePath = parsed.pathname;
      if (basePath === "/") return pathname === "/";
      return pathname === basePath || pathname.startsWith(basePath + "/");
    },
    [pathname, hash]
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
            "rounded-md py-1.5 motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:bg-muted/60 hover:text-foreground motion-safe:hover:translate-x-0.5",
            "border border-transparent hover:border-border",
            "data-[active=true]:!bg-primary/15 data-[active=true]:!text-foreground",
            isActive &&
              "bg-primary/10 text-foreground font-medium border-primary/30 shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.16)]"
          )}
        >
          <Link
            href={subItem.href}
            onClick={(e) => {
              const url = new URL(subItem.href, "http://localhost");
              const sectionId = subItem.sectionId || url.hash.replace(/^#/, "");
              const samePath = pathname === url.pathname;
              if (sectionId && samePath) {
                e.preventDefault();
                const el = document.getElementById(sectionId);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", subItem.href);
                  setActiveSection(sectionId);
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
    const isItemOpen = openItem === item.title;
    const isActive = isParentPathActive(item.href);
    const isChildActive = hasActiveChild(item.items);
    const isHighlighted = isActive || isChildActive;
    const effectivePersona = persona ?? DEFAULT_PERSONA;
    const personaPriority = PERSONA_ITEM_PRIORITY[effectivePersona] ?? [];
    const isRecommended = personaPriority.slice(0, 2).includes(item.title);

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
                  "group relative overflow-hidden rounded-lg motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "hover:bg-muted/60 motion-safe:hover:translate-x-0.5",
                  "border border-transparent",
                  "data-[active=true]:!bg-primary/15 data-[active=true]:!text-foreground",
                  (isItemOpen || isHighlighted) &&
                    "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.16)]",
                  state === "collapsed" &&
                    "w-11 h-11 p-0 flex items-center justify-center"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isHighlighted
                      ? "text-primary dark:drop-shadow-[0_0_8px_rgb(var(--persona-accent-rgb)/0.8)]"
                      : "text-muted-foreground group-hover:text-primary",
                    state === "collapsed" && "shrink-0"
                  )}
                />
                {state === "expanded" && (
                  <>
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        isHighlighted
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {item.title}
                    </span>
                    {isRecommended && (
                      <Sparkles className="mr-1 h-3.5 w-3.5 text-primary" aria-label="Recommended" />
                    )}
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-all duration-300",
                        isItemOpen && "rotate-90 text-primary"
                      )}
                    />
                  </>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {state === "expanded" && (
              <CollapsibleContent
                className={cn(
                  "overflow-hidden",
                  "data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
                )}
              >
                <SidebarMenuSub className="ml-0 border-l-2 border-border/80 pl-6 pt-2">
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
            "group relative overflow-hidden rounded-lg motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:bg-muted/60 motion-safe:hover:translate-x-0.5",
            "border border-transparent",
            "data-[active=true]:!bg-primary/15 data-[active=true]:!text-foreground",
            isActive &&
              "bg-primary/10 border-primary/40 shadow-[0_0_0_1px_rgb(var(--persona-accent-rgb)/0.16)]",
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
                  ? "text-primary dark:drop-shadow-[0_0_8px_rgb(var(--persona-accent-rgb)/0.8)]"
                  : "text-muted-foreground group-hover:text-primary",
                state === "collapsed" && "shrink-0"
              )}
            />
            {state === "expanded" && (
              <span
                className={cn(
                  "text-sm transition-colors",
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground font-medium group-hover:text-foreground"
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
      className="border-r border-border bg-background/95 backdrop-blur-xl"
    >
      {/* Header with Toggle Button — matches navbar h-14 */}
      <SidebarHeader
        className={cn(
          "h-14 border-b border-border bg-background/95 transition-all duration-300 flex items-center",
          state === "expanded" ? "px-2" : "justify-center px-1"
        )}
      >
        <button
          onClick={handleToggle}
          className={cn(
            "group flex items-center justify-center gap-2 rounded-lg motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:bg-muted/60 motion-safe:hover:scale-[1.01]",
            "border border-border hover:border-primary/30",
            "bg-muted/40",
            state === "expanded" ? "w-full h-10 px-3" : "w-10 h-10"
          )}
          title={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
        >
          {state === "expanded" ? (
            <>
              <PanelLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              <span className="text-sm font-medium text-foreground transition-colors">
                Collapse
              </span>
            </>
          ) : (
            <PanelLeftOpen className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          )}
        </button>
      </SidebarHeader>

      <SidebarContent
        className={cn(
          "gap-0 py-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30",
          state === "collapsed" && "px-0 items-center"
        )}
      >
        {visibleSections.map((section) => (
          <SidebarGroup key={section.id} className="py-0">
            {/* Section label (expanded) or separator line (collapsed) */}
            {state === "expanded" && section.label && (
              <SidebarGroupLabel className="px-4 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </SidebarGroupLabel>
            )}
            {state === "collapsed" && section.label && (
              <div className="my-2 h-px w-6 bg-border" />
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
      <SidebarFooter className="border-t border-border bg-card/50 p-3">
        {membershipTier === "free" && (
          state === "expanded" ? (
            <Link href="/premium">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 transition hover:bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary dark:drop-shadow-[0_0_6px_rgb(var(--persona-accent-rgb)/0.6)]" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">Pro Version</p>
                  <p className="text-[10px] text-muted-foreground">
                    Unlock all features
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href="/premium"
              className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted"
              title="Pro Version"
            >
              <Crown className="h-5 w-5 text-primary" />
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
