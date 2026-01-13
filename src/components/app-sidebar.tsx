"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  PanelLeftOpen,
  Crown,
  Hash,
} from "lucide-react";
import { useSidebarStore } from "@/stores/sidebarStore";
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

const pageSections = [
  {
    title: "Protocol Bento",
    href: "/#protocol-bento",
    sectionId: "protocol-bento",
  },
  {
    title: "Governance Over Time",
    href: "/#governance-over-time",
    sectionId: "governance-over-time",
  },
  {
    title: "Trending Proposals",
    href: "/#trending-proposals",
    sectionId: "trending-proposals",
  },
  {
    title: "Our Tools",
    href: "/#our-tools",
    sectionId: "our-tools",
  },
  {
    title: "What We Track",
    href: "/#what-we-track",
    sectionId: "what-we-track",
  },
  {
    title: "Latest Updates",
    href: "/#latest-updates",
    sectionId: "latest-updates",
  },
  {
    title: "FAQs",
    href: "/#faqs",
    sectionId: "faqs",
  },
];

const sidebarItems = [
  {
    title: "Home",
    icon: Home,
    href: "/",
    items: pageSections.map(section => ({
      title: section.title,
      href: section.href,
      sectionId: section.sectionId,
    })),
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
    title: "Upgrades",
    icon: Package,
    href: "/upgrade",
  },
  {
    title: "Analytics",
    icon: LineChart,
    href: "/Analytics",
  },
  {
    title: "Resources",
    icon: BookOpen,
    href: "/resources",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar: toggleSidebarUI } = useSidebar();
  const { isOpen, toggleSidebar } = useSidebarStore();
  const [openItems, setOpenItems] = React.useState<string[]>(["Home", "Standards"]);
  const rememberedOpen = React.useRef<string[]>(openItems);
  const [currentHash, setCurrentHash] = React.useState<string>('');
  const [activeSection, setActiveSection] = React.useState<string>('');

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  // Sync Zustand state with shadcn state
  React.useEffect(() => {
    if (state === "collapsed" && isOpen) {
      toggleSidebar();
    } else if (state === "expanded" && !isOpen) {
      toggleSidebar();
    }
  }, [state]);

  // Close sections when collapsed, restore when expanded
  React.useEffect(() => {
    if (state === "collapsed") {
      rememberedOpen.current = openItems;
      setOpenItems([]);
    } else if (openItems.length === 0 && rememberedOpen.current.length) {
      setOpenItems(rememberedOpen.current);
    }
  }, [state]);

  const handleToggle = () => {
    toggleSidebarUI();
    toggleSidebar();
  };

  // Listen for toggle event from navbar
  React.useEffect(() => {
    const handleExternalToggle = () => {
      handleToggle();
    };
    window.addEventListener('toggle-sidebar', handleExternalToggle);
    return () => window.removeEventListener('toggle-sidebar', handleExternalToggle);
  }, []);

  // Track hash changes for section navigation
  React.useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash);
    };
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => {
      window.removeEventListener('hashchange', updateHash);
    };
  }, []);

  // Scroll spy: Track which section is currently in view
  React.useEffect(() => {
    const sectionIds = pageSections.map(s => s.sectionId);
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px', // Trigger when section is 20% from top
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Find the section that is most visible
      let maxIntersection = 0;
      let mostVisibleSection = '';

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxIntersection) {
          maxIntersection = entry.intersectionRatio;
          mostVisibleSection = entry.target.id;
        }
      });

      // If we found a visible section, update active section
      if (mostVisibleSection && maxIntersection > 0.1) {
        setActiveSection(mostVisibleSection);
        // Update hash without scrolling
        if (window.location.hash !== `#${mostVisibleSection}`) {
          window.history.replaceState(null, '', `#${mostVisibleSection}`);
          setCurrentHash(`#${mostVisibleSection}`);
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    sectionIds.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    // Also check on initial load
    const checkInitialSection = () => {
      const hash = window.location.hash.slice(1);
      if (hash && sectionIds.includes(hash)) {
        setActiveSection(hash);
      } else {
        // Find first visible section
        sectionIds.forEach((sectionId) => {
          const element = document.getElementById(sectionId);
          if (element) {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight * 0.3 && rect.bottom > 0;
            if (isVisible && !activeSection) {
              setActiveSection(sectionId);
            }
          }
        });
      }
    };

    // Wait for page to load
    if (document.readyState === 'complete') {
      checkInitialSection();
    } else {
      window.addEventListener('load', checkInitialSection);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('load', checkInitialSection);
    };
  }, [activeSection]);

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-cyan-300/20 bg-background/80 backdrop-blur-xl z-[60]",
        state === "collapsed" && "w-[88px]"
      )}
    >
      {/* Header with Logo */}
      <SidebarHeader className="h-16 border-b border-cyan-300/20 bg-background/80">
        {state === "expanded" ? (
          <div className="flex h-16 items-center gap-3 px-4">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-400/20 blur-lg" />
              <Image
                src="/brand/logo/EIPsInsights.gif"
                alt="EIPsInsight"
                width={32}
                height={32}
                className="relative z-10"
              />
            </div>
            <span className="dec-title text-lg font-bold text-white">
              EIPsInsight
            </span>
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center">
            <button
              onClick={handleToggle}
              className={cn(
                "group rounded-lg p-2 transition-all duration-300",
                "hover:bg-gradient-to-r hover:from-emerald-500/15 hover:via-cyan-500/15 hover:to-blue-500/15",
                "hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] border border-transparent hover:border-cyan-400/30"
              )}
            >
              <PanelLeftOpen className="h-5 w-5 text-cyan-300 transition-colors group-hover:text-emerald-300" />
            </button>
          </div>
        )}
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
          <SidebarGroupContent className={cn("px-3", state === "collapsed" && "px-0 w-full flex justify-center") }>
            <SidebarMenu className={cn("gap-1.5", state === "collapsed" && "items-center") }>
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href;
                const hasSubItems = item.items && item.items.length > 0;
                const isOpen = openItems.includes(item.title);

                if (hasSubItems) {
                  return (
                    <Collapsible
                      key={item.title}
                      open={isOpen}
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
                              "hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:border-cyan-400/30",
                              "border border-transparent",
                              "data-[state=open]:bg-gradient-to-r data-[state=open]:from-emerald-500/10 data-[state=open]:via-cyan-500/10 data-[state=open]:to-blue-500/10",
                              "data-[state=open]:border-cyan-400/20",
                              state === "collapsed" && "w-12 h-12 p-0 flex items-center justify-center mx-auto"
                            )}
                          >
                            {item.icon && (
                              <item.icon className={cn(
                                "h-5 w-5 text-cyan-300 transition-all duration-300 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                                state === "collapsed" && "shrink-0"
                              )} />
                            )}
                            {state === "expanded" && (
                              <>
                                <span className="flex-1 text-sm font-medium text-slate-100 transition-colors group-hover:text-white">
                                  {item.title}
                                </span>
                                <ChevronRight
                                  className={cn(
                                    "h-3.5 w-3.5 text-cyan-400/50 transition-all duration-300",
                                    isOpen && "rotate-90 text-emerald-400"
                                  )}
                                />
                              </>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="ml-0 border-l-2 border-cyan-400/10 pl-6 pt-2">
                            {item.items?.map((subItem) => {
                              const subItemWithSection = subItem as typeof subItem & { sectionId?: string };
                              // Use scroll spy active section if available, otherwise fall back to hash
                              const isSubActive = subItemWithSection.sectionId 
                                ? (activeSection === subItemWithSection.sectionId || currentHash === `#${subItemWithSection.sectionId}`)
                                : pathname === subItem.href;
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
                                        if (subItemWithSection.sectionId) {
                                          e.preventDefault();
                                          const element = document.getElementById(subItemWithSection.sectionId);
                                          if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            window.history.pushState(null, '', subItem.href);
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
                        "hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:border-cyan-400/30 hover:translate-x-0.5",
                        "border border-transparent",
                        isActive &&
                          "bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)] border-cyan-400/40",
                        state === "collapsed" && "w-12 h-12 p-0 flex items-center justify-center mx-auto"
                      )}
                    >
                      <Link
                        href={item.href || "#"}
                        className={cn(
                          state === "collapsed" && "flex h-full w-full items-center justify-center"
                        )}
                      >
                        {item.icon && (
                          <item.icon
                            className={cn(
                              "h-5 w-5 transition-all duration-300",
                              isActive
                                ? "text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                : "text-cyan-300 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
                              state === "collapsed" && "shrink-0"
                            )}
                          />
                        )}
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

      {/* Footer with gradient */}
      <SidebarFooter className="border-t border-cyan-300/20 bg-background/80 p-4">
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
          <Link href="/premium" className="flex items-center justify-center">
            {/* <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(34,211,238,0.12)] transition hover:border-cyan-300/50 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)]"> */}
              <Crown className="h-5 w-5 text-cyan-300" />
            {/* </div> */}
          </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
