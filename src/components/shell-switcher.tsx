'use client';

import { usePathname } from 'next/navigation';
import { MainAppShell } from '@/components/main-app-shell';
import { UpgradeShell } from '@/components/upgrade/upgrade-shell';

/**
 * Picks the app chrome by route. The /upgrade tree is its own focused
 * dashboard with a minimal navbar; everything else (including /oldupgrade,
 * kept for comparison) uses the standard sidebar shell.
 */
export function ShellSwitcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isUpgradeShell = pathname === '/upgrade' || pathname.startsWith('/upgrade/');

  if (isUpgradeShell) {
    return <UpgradeShell>{children}</UpgradeShell>;
  }
  return <MainAppShell>{children}</MainAppShell>;
}
