/**
 * Feature flags for safe rollout of new functionality.
 * 
 * Set these in your .env.local file:
 * NEXT_PUBLIC_FEATURE_PERSONA_ONBOARDING=true
 * NEXT_PUBLIC_FEATURE_PERSONA_SWITCHER=true
 * NEXT_PUBLIC_FEATURE_PERSONA_NAV_REORDER=true
 */

export const FEATURES = {
  /**
   * Enable the persona onboarding flow at /p
   * When enabled, new users will be prompted to select their persona
   */
  PERSONA_ONBOARDING:
    process.env.NEXT_PUBLIC_FEATURE_PERSONA_ONBOARDING === "true",

  /**
   * Enable the persona switcher dropdown in the navbar
   * Allows users to change their persona at any time
   */
  PERSONA_SWITCHER:
    process.env.NEXT_PUBLIC_FEATURE_PERSONA_SWITCHER === "true",

  /**
   * Enable persona-aware navigation reordering
   * Sidebar items will be reordered based on the user's persona
   */
  PERSONA_NAV_REORDER:
    process.env.NEXT_PUBLIC_FEATURE_PERSONA_NAV_REORDER === "true",

  /**
   * Enable persona-aware page context headers
   * Pages will show persona-specific highlights at the top
   */
  PERSONA_CONTEXT_HEADERS:
    process.env.NEXT_PUBLIC_FEATURE_PERSONA_CONTEXT_HEADERS === "true",
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof typeof FEATURES
): boolean {
  return FEATURES[feature] === true;
}

/**
 * Get all enabled features (useful for debugging)
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
}
