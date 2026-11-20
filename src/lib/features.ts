/**
 * Feature flags for safe rollout of new functionality.
 */

export const FEATURES = {
  /**
   * Show the "Ask about this call" AI box on call pages.
   * Defaults OFF while the feature is still being tested — a visible error state
   * ("The AI is busy right now…") makes a poor first impression. Set
   * NEXT_PUBLIC_FEATURE_CALL_ASK_AI=true to re-enable once it's reliable.
   */
  CALL_ASK_AI:
    process.env.NEXT_PUBLIC_FEATURE_CALL_ASK_AI === "true",
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
