/**
 * Feature Flags - Controls visibility and availability of features
 * 
 * This file manages feature flags for the application. Features can be
 * toggled on/off based on environment variables, allowing safe development
 * of new features behind flags before production release.
 * 
 * Usage Example:
 * ```tsx
 * import { FEATURES } from '@/constants/features';
 * 
 * function Header() {
 *   return (
 *     <div>
 *       {FEATURES.COMMUNITY_SHOWCASE && (
 *         <Link to="/community">Community</Link>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

export const FEATURES = {
  /**
   * Community Showcase Gallery
   * 
   * Enables the community gallery feature where users can:
   * - Publish ASCII art to a public gallery
   * - Browse published projects from other users
   * - Like, comment, and remix community projects
   * - Manage their public profile
   * 
   * Environment Variable: VITE_FEATURE_COMMUNITY_ENABLED
   * Development: Set in .env.local
   * Production: Set in Vercel environment variables
   * 
   * Status: In Development (Phase 0)
   * Expected Release: TBD
   */
  COMMUNITY_SHOWCASE: import.meta.env.VITE_FEATURE_COMMUNITY_ENABLED === 'true',
} as const;

/**
 * Type helper for feature flag checks
 */
export type FeatureFlag = keyof typeof FEATURES;

/**
 * Helper function to check if a feature is enabled
 * 
 * @param feature - The feature flag to check
 * @returns boolean indicating if the feature is enabled
 * 
 * @example
 * if (isFeatureEnabled('COMMUNITY_SHOWCASE')) {
 *   // Show community features
 * }
 */
export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURES[feature];
};
