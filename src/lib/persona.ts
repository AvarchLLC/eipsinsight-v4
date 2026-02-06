import {
  Code2,
  FileEdit,
  FlaskConical,
  Hammer,
  Building2,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

// Persona type definition
export type Persona =
  | "developer"
  | "editor"
  | "researcher"
  | "builder"
  | "enterprise"
  | "newcomer";

// Persona metadata with labels, descriptions, and icons
export interface PersonaMeta {
  id: Persona;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const PERSONAS: Record<Persona, PersonaMeta> = {
  developer: {
    id: "developer",
    label: "Developer / Client Team",
    shortLabel: "Developer",
    description:
      "Track network upgrades, consensus changes, and implementation timelines",
    icon: Code2,
    color: "emerald",
  },
  editor: {
    id: "editor",
    label: "EIP Editor / Reviewer",
    shortLabel: "Editor",
    description:
      "Review proposals in progress, track status changes, and manage the editorial process",
    icon: FileEdit,
    color: "blue",
  },
  researcher: {
    id: "researcher",
    label: "Researcher / Analyst",
    shortLabel: "Researcher",
    description:
      "Analyze governance patterns, contributor activity, and historical trends",
    icon: FlaskConical,
    color: "purple",
  },
  builder: {
    id: "builder",
    label: "Builder / ERC Author",
    shortLabel: "Builder",
    description:
      "Explore ERCs, find implementation patterns, and track application-layer standards",
    icon: Hammer,
    color: "orange",
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise / Decision-Maker",
    shortLabel: "Enterprise",
    description:
      "Get high-level summaries, understand protocol direction, and plan around upgrades",
    icon: Building2,
    color: "cyan",
  },
  newcomer: {
    id: "newcomer",
    label: "Newcomer / Student",
    shortLabel: "Newcomer",
    description:
      "Learn about Ethereum governance, EIPs, and how protocol changes happen",
    icon: GraduationCap,
    color: "pink",
  },
};

// Default landing pages for each persona
export const PERSONA_DEFAULTS: Record<Persona, string> = {
  developer: "/upgrade",           // Network Upgrades - What's shipping, when, and how it affects clients
  editor: "/all",                   // Search + Analytics - PR flow, reviews, backlog, coordination
  researcher: "/analytics/prs",    // Analytics - Trends, data, correlations, governance signals
  builder: "/erc",                  // Tools/Standards - Writing, validating, and shipping standards
  enterprise: "/upgrade",          // Insights → Upgrades - What's changing and why it matters
  newcomer: "/",                    // Home → Resources - Orientation, learning paths, context
};

// Persona microcopy - displayed on landing pages
export const PERSONA_MICROCOPY: Record<Persona, string> = {
  developer: "Track what's changing in Ethereum protocol upgrades, how it affects clients, and what's coming next.",
  editor: "Coordinate reviews, track proposal status, and keep the EIP process moving.",
  researcher: "Analyze how Ethereum standards evolve over time using real data and historical context.",
  builder: "Create, review, and ship standards with the right tools and references.",
  enterprise: "Understand Ethereum's roadmap, upgrade cadence, and business impact—without protocol deep dives.",
  newcomer: "Learn how Ethereum evolves, who decides what ships, and how you can participate.",
};

// Navigation ordering per persona
// Each array contains sidebar item titles in priority order
export const PERSONA_NAV_ORDER: Record<Persona, string[]> = {
  developer: [
    "Upgrades",
    "Analytics",
    "Standards",
    "Home",
    "Resources",
    "Settings",
  ],
  editor: [
    "Standards",
    "Analytics",
    "Upgrades",
    "Home",
    "Resources",
    "Settings",
  ],
  researcher: [
    "Analytics",
    "Standards",
    "Upgrades",
    "Home",
    "Resources",
    "Settings",
  ],
  builder: [
    "Standards",
    "Upgrades",
    "Analytics",
    "Home",
    "Resources",
    "Settings",
  ],
  enterprise: [
    "Upgrades",
    "Home",
    "Analytics",
    "Standards",
    "Resources",
    "Settings",
  ],
  newcomer: [
    "Home",
    "Resources",
    "Standards",
    "Upgrades",
    "Analytics",
    "Settings",
  ],
};

// All personas as an array for iteration
export const PERSONA_LIST: Persona[] = [
  "developer",
  "editor",
  "researcher",
  "builder",
  "enterprise",
  "newcomer",
];

// Default persona for new users
export const DEFAULT_PERSONA: Persona = "newcomer";

// =============================================================================
// Persona-specific Configuration for Pages and Features
// =============================================================================

export interface PersonaPageConfig {
  // Analytics page defaults
  analyticsDefault: "prs" | "contributors" | "editors";
  
  // Upgrades page display mode
  upgradesView: "technical" | "summary" | "timeline";
  
  // Standards page focus
  standardsFocus: "all" | "eip" | "erc" | "rip";
  
  // Search default scope
  searchScope: "all" | "eips" | "ercs" | "rips";
  
  // Display preferences
  showTechnicalTerms: boolean;
  showDetailedStats: boolean;
  
  // Boards default view (for /tools/boards)
  boardsDefault: "all" | "editor" | "core" | "historical";
}

export const PERSONA_PAGE_CONFIG: Record<Persona, PersonaPageConfig> = {
  developer: {
    analyticsDefault: "prs",
    upgradesView: "technical",
    standardsFocus: "eip",
    searchScope: "eips",
    showTechnicalTerms: true,
    showDetailedStats: true,
    boardsDefault: "core",
  },
  editor: {
    analyticsDefault: "editors",
    upgradesView: "timeline",
    standardsFocus: "all",
    searchScope: "all",
    showTechnicalTerms: true,
    showDetailedStats: true,
    boardsDefault: "editor",
  },
  researcher: {
    analyticsDefault: "contributors",
    upgradesView: "timeline",
    standardsFocus: "all",
    searchScope: "all",
    showTechnicalTerms: true,
    showDetailedStats: true,
    boardsDefault: "historical",
  },
  builder: {
    analyticsDefault: "contributors",
    upgradesView: "summary",
    standardsFocus: "erc",
    searchScope: "ercs",
    showTechnicalTerms: true,
    showDetailedStats: false,
    boardsDefault: "all",
  },
  enterprise: {
    analyticsDefault: "prs",
    upgradesView: "summary",
    standardsFocus: "all",
    searchScope: "all",
    showTechnicalTerms: false,
    showDetailedStats: false,
    boardsDefault: "all",
  },
  newcomer: {
    analyticsDefault: "prs",
    upgradesView: "summary",
    standardsFocus: "all",
    searchScope: "all",
    showTechnicalTerms: false,
    showDetailedStats: false,
    boardsDefault: "all",
  },
};

// =============================================================================
// Upgrade Page Highlights Configuration
// =============================================================================

export interface UpgradeHighlight {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export const PERSONA_UPGRADE_HIGHLIGHTS: Record<Persona, UpgradeHighlight[]> = {
  developer: [
    {
      title: "Upcoming Network Forks",
      description: "Track activation epochs, client readiness, and required changes",
      ctaLabel: "View Timeline",
      ctaLink: "#timeline",
    },
    {
      title: "Core EIPs in Next Upgrade",
      description: "See which consensus and execution layer changes are included",
      ctaLabel: "View EIPs",
      ctaLink: "#eips",
    },
    {
      title: "What Changed Since Last Fork",
      description: "Compare EIP compositions between upgrades",
    },
  ],
  editor: [
    {
      title: "EIPs Awaiting Review",
      description: "Proposals that need editorial attention before inclusion",
      ctaLabel: "View Queue",
      ctaLink: "/all?status=review",
    },
    {
      title: "Recent Status Changes",
      description: "Track which EIPs moved to Last Call or Final",
    },
    {
      title: "Upgrade Composition Changes",
      description: "Monitor EIP additions and removals from upcoming forks",
    },
  ],
  researcher: [
    {
      title: "Upgrade Governance Patterns",
      description: "Analyze how upgrade decisions have evolved over time",
    },
    {
      title: "Historical Timeline",
      description: "Explore the full history of Ethereum network upgrades",
      ctaLabel: "View History",
      ctaLink: "#timeline",
    },
    {
      title: "EIP Inclusion Trends",
      description: "See patterns in how proposals get included in upgrades",
    },
  ],
  builder: [
    {
      title: "ERC Standards in Upgrades",
      description: "Application-layer standards that may affect your project",
      ctaLabel: "View ERCs",
      ctaLink: "/erc",
    },
    {
      title: "Breaking Changes",
      description: "Identify changes that might require code updates",
    },
    {
      title: "New Capabilities",
      description: "Discover new features enabled by upcoming upgrades",
    },
  ],
  enterprise: [
    {
      title: "What This Means for You",
      description: "Plain-English summary of upcoming protocol changes",
    },
    {
      title: "Timeline & Planning",
      description: "Key dates and milestones for infrastructure planning",
      ctaLabel: "View Timeline",
      ctaLink: "#timeline",
    },
    {
      title: "Impact Assessment",
      description: "High-level overview of business implications",
    },
  ],
  newcomer: [
    {
      title: "What is a Network Upgrade?",
      description: "Learn how Ethereum evolves through coordinated improvements",
      ctaLabel: "Learn More",
      ctaLink: "/resources/getting-started",
    },
    {
      title: "Upgrade Timeline",
      description: "See the history and future of Ethereum upgrades",
      ctaLabel: "Explore",
      ctaLink: "#timeline",
    },
    {
      title: "Key Terms Explained",
      description: "Understand forks, EIPs, and the upgrade process",
    },
  ],
};

// =============================================================================
// Helper Functions
// =============================================================================

// Validate if a string is a valid persona
export function isValidPersona(value: string | null | undefined): value is Persona {
  if (!value) return false;
  return PERSONA_LIST.includes(value as Persona);
}

// Get persona meta with fallback to default
export function getPersonaMeta(persona: string | null | undefined): PersonaMeta {
  if (isValidPersona(persona)) {
    return PERSONAS[persona];
  }
  return PERSONAS[DEFAULT_PERSONA];
}

// Get page config for persona
export function getPersonaPageConfig(persona: string | null | undefined): PersonaPageConfig {
  if (isValidPersona(persona)) {
    return PERSONA_PAGE_CONFIG[persona];
  }
  return PERSONA_PAGE_CONFIG[DEFAULT_PERSONA];
}

// Get upgrade highlights for persona
export function getUpgradeHighlights(persona: string | null | undefined): UpgradeHighlight[] {
  if (isValidPersona(persona)) {
    return PERSONA_UPGRADE_HIGHLIGHTS[persona];
  }
  return PERSONA_UPGRADE_HIGHLIGHTS[DEFAULT_PERSONA];
}
