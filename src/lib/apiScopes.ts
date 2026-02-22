export const API_SCOPES = {
  // Analytics scopes
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_WRITE: "analytics:write",
  
  // Proposals scopes
  PROPOSALS_READ: "proposals:read",
  PROPOSALS_WRITE: "proposals:write",
  
  // Upgrades scopes
  UPGRADES_READ: "upgrades:read",
  UPGRADES_WRITE: "upgrades:write",
  
  // Blog scopes
  BLOG_READ: "blog:read",
  BLOG_WRITE: "blog:write",
  
  // Account scopes
  ACCOUNT_READ: "account:read",
  ACCOUNT_WRITE: "account:write",
} as const

export type ApiScope = typeof API_SCOPES[keyof typeof API_SCOPES]

export const SCOPE_CATEGORIES = {
  analytics: ["analytics:read", "analytics:write"],
  proposals: ["proposals:read", "proposals:write"],
  upgrades: ["upgrades:read", "upgrades:write"],
  blog: ["blog:read", "blog:write"],
  account: ["account:read", "account:write"],
} as const

export const SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
  "analytics:read": "Read analytics and contributor data",
  "analytics:write": "Modify analytics and assignments",
  "proposals:read": "Read proposal and PR data",
  "proposals:write": "Create and modify proposals",
  "upgrades:read": "Read upgrade timeline data",
  "upgrades:write": "Modify upgrade information",
  "blog:read": "Read blog posts and articles",
  "blog:write": "Create and publish blog posts",
  "account:read": "Read account information",
  "account:write": "Modify account settings",
} as const
