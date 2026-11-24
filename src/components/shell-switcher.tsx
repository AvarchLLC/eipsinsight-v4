'use client';

import { usePathname } from 'next/navigation';
import { MainAppShell } from '@/components/main-app-shell';

/**
 * Shell switcher:
 * Auth routes (/login, /verify-request) render without the main app shell
 * (no app sidebar, no main navbar, no floating feedback, no footer).
 * All standard app routes render inside MainAppShell.
 */
export function ShellSwitcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute =
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/verify-request' ||
    pathname.startsWith('/verify-request/');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return <MainAppShell>{children}</MainAppShell>;
}
