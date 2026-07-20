'use client';

import { MainAppShell } from '@/components/main-app-shell';

/**
 * Every route uses the standard shell (navbar + sidebar). The /upgrade tree previously had its
 * own minimal chrome (UpgradeShell) with a bespoke sub-navbar; that navigation now lives in the
 * sidebar's Upgrades and "Calls & Decisions" trees, so upgrade pages get the same chrome as the
 * rest of the app rather than a parallel one.
 */
export function ShellSwitcher({ children }: { children: React.ReactNode }) {
  return <MainAppShell>{children}</MainAppShell>;
}
