"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Home,
  CalendarClock,
  ClipboardList,
  Layers,
  LineChart,
  Package,
  Settings,
  ChevronRight,
  ListTree,
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
  items?: SidebarSubItem[];
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
    id: "explore",
    label: "Explore",
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
    ],
  },
  {
    id: "governance",
    label: "Roadmap & Governance",
    items: [
      {
        title: "Upgrades",
        icon: Package,
        href: "/upgrade",
        // Flattened to two levels — current forks sit alongside the other
        // upgrade views instead of behind a "Current Upgrades" sub-tree.
        items: [
          { title: "Overview", href: "/upgrade" },
          { title: "Upgrade EIP Directory", href: "/upgrade/eips" },
          { title: "Hegotá", href: "/upgrade/hegota" },
          { title: "Glamsterdam", href: "/upgrade/glamsterdam" },
          { title: "Fusaka", href: "/upgrade/fusaka" },
          { title: "Previous Upgrades", href: "/upgrade/archive" },
          { title: "Devnets", href: "/upgrade/devnets" },
          { title: "Schedule", href: "/upgrade/schedule" },
        ],
      },
      {
        title: "Protocol Calls",
        icon: CalendarClock,
        href: "/calls",
        // Flattened — ACD sub-types and Decision filters are chosen in-page,
        // not via a third sidebar level.
        items: [
          { title: "All Calls", href: "/calls" },
          { title: "ACD Calls", href: "/calls?series=acd#recent" },
          { title: "Breakout Calls", href: "/calls?series=breakouts#recent" },
          { title: "Decisions", href: "/decisions" },
        ],
      },
      {
        title: "EIP Office Hours",
        icon: ClipboardList,
        href: "/officehours",
        items: [
          { title: "Overview", href: "/officehours" },
          { title: "Board", href: "/officehours/board" },
          { title: "Calls", href: "/officehours/calls" },
        ],
      },
      {
        title: "EIPIP Meetings",
        icon: ClipboardList,
        href: "/eipip",
        items: [
          { title: "Overview", href: "/eipip" },
          { title: "Meetings", href: "/eipip/calls" },
        ],
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      // One destination — the merged hub. Activity (PRs, Editors, EIPs…) and
      // Insights (This Week, Monthly, Commentary) are switched via grouped
      // tabs inside the page header, not the sidebar tree.
      {
        title: "Analytics & Insights",
        icon: LineChart,
        href: "/analytics/eips",
      },
    ],
  },
  {
    id: "build",
    label: "Build",
    items: [
      {
        title: "Tools",
        icon: Wrench,
        href: "/tools",
        items: [
          { title: "EIP Builder", href: "/eip-builder" },
          { title: "Timeline", href: "/timeline" },
          { title: "Dependencies", href: "/dependencies" },
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
          { title: "Docs", href: "/resources/docs" },
          { title: "Blogs", href: "/resources/blogs" },
          { title: "Videos", href: "/resources/videos" },
          { title: "News", href: "/resources/news" },
          { title: "FAQ", href: "/resources/faq" },
          { title: "Milestones", href: "/resources/milestones" },
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
          { title: "Blogs", href: "/admin?tab=blogs" },
          { title: "Editors", href: "/admin?tab=editors" },
          { title: "Videos", href: "/admin?tab=videos" },
          { title: "Feedback", href: "/admin/feedback" },
        ],
      },
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

// NOTE: The sidebar renders one canonical structure. It used to be reordered
// and filtered per persona; that layer was removed (persona is being
// deprecated) so `sidebarSections` is now the single source of truth for order
// and visibility, with the only runtime gate being the Admin item (role-based).

/**
 * Display-label overrides for "On this page", keyed by section id.
 *
 * Only needed where `toTitle(id)` gets it wrong — section ids are short and
 * persona-independent, so most auto-title correctly ("trending" → "Trending")
 * and must NOT be listed here. This map is global across routes, so an entry
 * here relabels that id on every page: keep keys specific enough not to collide
 * (that's why home uses "upgrade-watch" while /upgrade uses "upgrades").
 */
const SECTION_LABEL_OVERRIDES: Record<string, string> = {
  // Home — only the ones auto-titling can't produce.
  "eip-builder": "EIP Builder",
  "weekly-recap": "Weekly Standards Recap",
  "explore-detail-header": "Overview",
  "explore-detail-timeline": "Over Time",
  "explore-detail-editor-reviews-24h": "Reviews (24h)",
  "explore-detail-proposals-table": "Table",
  "stats": "Total Network Upgrades",
  "timeline": "Ethereum Upgrade Timeline",
  "upgrades": "Network Upgrade Roadmap",
  "included-authors": "Included EIP Authors",
  "network-upgrades-chart": "Distribution Timeline",
  "upgrade-eip-details": "EIP Details",
  "proposal-overview": "Overview",
  "proposal-timeline": "Lifecycle & Upgrade Timeline",
  "proposal-text": "Specification",
  "enterprise-brief": "Enterprise Assessment",
  "proposal-subscription": "Subscriptions",
  "lucid-mev": "MEV Protection Metrics",
  "lucid-meetings": "Working Group Decisions",
};

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
  // Analytics + Insights are one destination now.
  if (pathname.startsWith("/analytics") || pathname.startsWith("/insights"))
    return "Analytics & Insights";
  // Protocol Calls covers calls and decisions.
  if (
    pathname.startsWith("/calls") ||
    pathname.startsWith("/decisions")
  )
    return "Protocol Calls";
  if (pathname === "/officehours" || pathname.startsWith("/officehours")) return "EIP Office Hours";
  if (pathname === "/eipip" || pathname.startsWith("/eipip")) return "EIPIP Meetings";
  if (
    pathname.startsWith("/eip-builder") ||
    pathname.startsWith("/timeline") ||
    pathname.startsWith("/dependencies") ||
    pathname.startsWith("/tools")
  )
    return "Tools";
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

  // Accordion behavior: only one parent open at a time
  const [openItem, setOpenItem] = React.useState<string | null>(null);
  const [openSubTrees, setOpenSubTrees] = React.useState<Record<string, boolean>>({});
  const rememberedOpen = React.useRef<string | null>(openItem);

  // Scroll spy state (kept for future use)
  const [activeSection, setActiveSection] = React.useState("");
  const [pageSectionItems, setPageSectionItems] = React.useState<SidebarSubItem[]>([]);
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

  // Normalized search param string for reactive comparison
  const currentSearchStr = React.useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.sort();
    return params.toString();
  }, [searchParams]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const toTitle = (raw: string) =>
      raw
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const SECTION_SELECTOR = "section[id], [data-sidebar-section][id]";

    /**
     * Text of the first heading that belongs to THIS section.
     *
     * Headings inside a nested section[id] are ignored — otherwise an embedded
     * component (a trending list, a chart card) donates one of its item titles
     * as the section's label, which is how "On this page" ended up showing
     * proposal names.
     */
    const ownHeadingText = (node: HTMLElement): string | null => {
      const headings = Array.from(node.querySelectorAll<HTMLElement>("h1, h2, h3"));
      for (const heading of headings) {
        if (heading.closest(SECTION_SELECTOR) === node) {
          return heading.textContent?.trim() || null;
        }
      }
      return null;
    };

    const build = () => {
      const query = currentSearchStr ? `?${currentSearchStr}` : "";
      const seen = new Set<string>();
      const seenTitles = new Set<string>();
      const collected: SidebarSubItem[] = [];
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(SECTION_SELECTOR));

      for (const node of nodes) {
        const id = (node.id || "").trim();
        if (!id || seen.has(id)) continue;

        // Only top-level sections are page sections. A section[id] nested inside
        // another one belongs to an embedded component that happens to carry its
        // own anchor (e.g. TrendingProposals inside the home page's #trending);
        // listing it duplicates the entry the outer section already provides.
        if (node.parentElement?.closest(SECTION_SELECTOR)) continue;

        seen.add(id);
        const fromData = node.getAttribute("data-sidebar-label")?.trim();
        const title =
          SECTION_LABEL_OVERRIDES[id] ||
          fromData ||
          ownHeadingText(node) ||
          toTitle(id);
        const titleKey = title.toLowerCase().replace(/\s+/g, " ").trim();
        if (seenTitles.has(titleKey)) continue;
        seenTitles.add(titleKey);
        collected.push({
          title,
          href: `${pathname}${query}#${id}`,
          sectionId: id,
        });
      }

      // Only surface "On this page" when there are at least 2 meaningful sections
      if (collected.length < 2) {
        setPageSectionItems([]);
        return;
      }
      setPageSectionItems(collected);
    };

    build();
    const observer = new MutationObserver(() => build());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, currentSearchStr]);

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

  // One canonical structure (declared order). The only runtime gate left is the
  // role-based Admin item in the account section.
  const visibleSections = React.useMemo(() => {
    return sidebarSections.map((section) => {
      if (section.id === "account") {
        return {
          ...section,
          items: section.items.filter((item) =>
            item.title === "Admin" ? isAdmin : true
          ),
        };
      }
      return section;
    });
  }, [isAdmin]);

  // ========================================================================
  // Collapsible management
  // ========================================================================

  const toggleItem = (title: string) => {
    setOpenItem((prev) => (prev === title ? null : title));
  };
  const toggleSubTree = React.useCallback((key: string) => {
    setOpenSubTrees((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  // Auto-expand the correct collapsible on route change.
  React.useEffect(() => {
    const activeItem = getActiveItemTitle(pathname);
    setOpenItem(activeItem ?? null);
  }, [pathname]);

  // ========================================================================
  // Scroll spy — active page only (hash sections for any route)
  // ========================================================================

  const trackedSections = React.useMemo(() => {
    if (pageSectionItems.length === 0) return [];
    return pageSectionItems
      .map((sub) => sub.sectionId || new URL(sub.href, "http://localhost").hash.replace(/^#/, ""))
      .filter((x): x is string => !!x);
  }, [pageSectionItems]);

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
   * visiting /eip-builder, because the old code used prefix matching.
   */
  const isSubItemActive = React.useCallback(
    (subItem: SidebarSubItem): boolean => {
      if (subItem.items?.length) {
        return subItem.items.some((child) => isSubItemActive(child));
      }
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
      if (basePath === "/standards") {
        if (
          pathname === "/standards" ||
          pathname.startsWith("/standards/") ||
          pathname.startsWith("/eip/") ||
          pathname.startsWith("/erc/") ||
          pathname.startsWith("/rip/")
        ) {
          return true;
        }
      }
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
      return items.some((item) => isSubItemActive(item) || hasActiveChild(item.items));
    },
    [isSubItemActive]
  );

  // ========================================================================
  // Render
  // ========================================================================

  const renderSubItem = (subItem: SidebarSubItem, keyPath: string) => {
    const isActive = isSubItemActive(subItem);
    const hasNested = Boolean(subItem.items?.length);
    const subtreeKey = `${pathname}::${keyPath}`;
    const nestedOpen = openSubTrees[subtreeKey] || isActive;

    const proposalMatch = pathname.match(/^\/(eip|erc|rip|eips|ercs|rips)\/([^\/]+)/i);
    let activeProposalTitle: string | null = null;
    if (proposalMatch) {
      const rawRepo = proposalMatch[1].toLowerCase().replace(/s$/, '');
      const repoUpper = rawRepo === 'eip' ? 'EIP' : rawRepo === 'erc' ? 'ERC' : 'RIP';
      activeProposalTitle = `${repoUpper}-${proposalMatch[2]}`;
    }

    const isCurrentProposalItem =
      Boolean(activeProposalTitle) &&
      subItem.title === activeProposalTitle &&
      subItem.href === pathname;

    if (hasNested) {
      return (
        <SidebarMenuSubItem key={`${subtreeKey}-${subItem.title}`}>
          <Collapsible open={nestedOpen} onOpenChange={() => toggleSubTree(subtreeKey)}>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton
                isActive={isActive}
                className={cn(
                  "rounded-md py-1.5 motion-safe:transition-all motion-safe:duration-300",
                  "border border-transparent hover:border-border hover:bg-muted/60",
                  "data-[active=true]:bg-primary/15! data-[active=true]:text-foreground!",
                  isActive && "bg-primary/10 text-foreground font-medium border-primary/30"
                )}
              >
                <span className="inline-flex w-full items-center justify-between text-xs">
                  <span>{subItem.title}</span>
                  <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", nestedOpen && "rotate-90 text-primary")} />
                </span>
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <SidebarMenuSub className="ml-0 border-l border-border/70 pl-3 pt-1">
                {subItem.items?.map((child, idx) => renderSubItem(child, `${keyPath}.${idx}`))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuSubItem>
      );
    }

    return (
      <SidebarMenuSubItem key={subItem.title + subItem.href + keyPath}>
        <SidebarMenuSubButton
          asChild
          isActive={isActive}
          className={cn(
            "rounded-md py-1.5 motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
            "hover:bg-muted/60 hover:text-foreground motion-safe:hover:translate-x-0.5",
            "border border-transparent hover:border-border",
            "data-[active=true]:bg-primary/15! data-[active=true]:text-foreground!",
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

        {/* ON THIS PAGE TOC nested directly under the current proposal item */}
        {isCurrentProposalItem && pageSectionItems.length > 0 && (
          <div className="mt-2 mb-1.5 rounded-lg border border-primary/20 bg-primary/[0.04] p-2">
            <div className="mb-1.5 flex items-center gap-1.5 px-1">
              <ListTree className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/90">
                On this page
              </span>
            </div>
            <ul className="relative ml-1 space-y-0.5 border-l border-border/60">
              {pageSectionItems.map((pageSub, idx) =>
                renderPageTocItem(pageSub, `${keyPath}.page.${idx}`)
              )}
            </ul>
          </div>
        )}
      </SidebarMenuSubItem>
    );
  };

  /**
   * A single "On this page" row. Unlike nav sub-items, these render as a live
   * table-of-contents: a continuous rail (the <ul> left border) with a filled
   * accent dot + bold accent text marking the section currently in view
   * (scrollspy via `activeSection`), so it reads as a page map, not more links.
   */
  const renderPageTocItem = (subItem: SidebarSubItem, keyPath: string) => {
    const isActive = isSubItemActive(subItem);
    return (
      <li key={subItem.title + subItem.href + keyPath} className="list-none">
        <Link
          href={subItem.href}
          onClick={(e) => {
            const url = new URL(subItem.href, "http://localhost");
            const sectionId = subItem.sectionId || url.hash.replace(/^#/, "");
            const samePath = pathname === url.pathname;
            if (sectionId && samePath) {
              e.preventDefault();
              if (sectionId === "enterprise-brief") {
                window.dispatchEvent(new Event("enable-enterprise"));
              }
              const el = document.getElementById(sectionId);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                window.history.replaceState(null, "", subItem.href);
                setActiveSection(sectionId);
              }
            }
          }}
          className={cn(
            "group relative flex items-center rounded-md py-1 pl-4 pr-2 text-xs transition-colors",
            isActive
              ? "font-medium text-primary"
              : "text-muted-foreground/80 hover:text-foreground"
          )}
        >
          {/* Rail marker: filled accent dot when the section is in view, a small
              faint tick otherwise. Sits on the <ul>'s left border. */}
          <span
            aria-hidden
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full transition-all",
              isActive
                ? "-left-[4px] h-2 w-2 bg-primary ring-2 ring-background"
                : "left-[-1px] h-1 w-1 bg-border group-hover:bg-primary/60"
            )}
          />
          <span className="truncate">{subItem.title}</span>
        </Link>
      </li>
    );
  };

  const renderItem = (item: SidebarItem) => {
    const isActive = isParentPathActive(item.href);
    const contextualSectionItems: SidebarSubItem[] = isActive ? pageSectionItems : [];

    // Proposal title helper for /eip/7702, /erc/20, /rip/7212 etc.
    const proposalMatch = pathname.match(/^\/(eip|erc|rip|eips|ercs|rips)\/([^\/]+)/i);
    let activeProposalTitle: string | null = null;
    let activeRepoType: 'eip' | 'erc' | 'rip' | null = null;
    if (proposalMatch) {
      const rawRepo = proposalMatch[1].toLowerCase().replace(/s$/, '');
      activeRepoType = rawRepo as 'eip' | 'erc' | 'rip';
      const repoUpper = rawRepo === 'eip' ? 'EIP' : rawRepo === 'erc' ? 'ERC' : 'RIP';
      activeProposalTitle = `${repoUpper}-${proposalMatch[2]}`;
    }

    let staticItems = item.items ? [...item.items] : [];
    if (item.title === "Standards" && activeProposalTitle && activeRepoType) {
      staticItems = staticItems.map((sub) => {
        const titleLower = sub.title.toLowerCase();
        if (
          (activeRepoType === 'eip' && titleLower === 'eips') ||
          (activeRepoType === 'erc' && titleLower === 'ercs') ||
          (activeRepoType === 'rip' && titleLower === 'rips')
        ) {
          return {
            ...sub,
            items: [
              {
                title: activeProposalTitle!,
                href: pathname,
              },
            ],
          };
        }
        return sub;
      });
    }

    const hasStaticItems = staticItems.length > 0;
    const hasPageSections = contextualSectionItems.length > 0;
    const hasSubItems = hasStaticItems || hasPageSections;
    const isItemOpen = openItem === item.title;
    const isChildActive = hasActiveChild([...staticItems, ...contextualSectionItems]);
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
                  "group relative overflow-hidden rounded-lg motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "hover:bg-muted/60 motion-safe:hover:translate-x-0.5",
                  "border border-transparent",
                  "data-[active=true]:bg-primary/15! data-[active=true]:text-foreground!",
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
                      title={item.title}
                      className={cn(
                        // min-w-0 + truncate: long labels ellipsise instead of wrapping and
                        // overflowing the fixed-height row.
                        "min-w-0 flex-1 truncate text-sm font-medium transition-colors",
                        isHighlighted
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {item.title}
                    </span>
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
                  {staticItems.map((sub, idx) => renderSubItem(sub, `${item.title}.${idx}`))}

                  {/* "On this page" — for non-proposal pages (on proposal pages it is nested under the proposal item) */}
                  {hasPageSections && !activeProposalTitle && (
                    <li className="mt-2.5 list-none">
                      <div className="rounded-lg border border-primary/15 bg-primary/[0.04] px-2 py-2">
                        <div className="mb-1.5 flex items-center gap-1.5 px-1">
                          <ListTree className="h-3.5 w-3.5 text-primary" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/90">
                            On this page
                          </span>
                        </div>
                        <ul className="relative ml-1 space-y-0.5 border-l border-border/60">
                          {contextualSectionItems.map((sub, idx) =>
                            renderPageTocItem(sub, `${item.title}.page.${idx}`)
                          )}
                        </ul>
                      </div>
                    </li>
                  )}
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
            "data-[active=true]:bg-primary/15! data-[active=true]:text-foreground!",
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
      data-tour="sidebar"
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
