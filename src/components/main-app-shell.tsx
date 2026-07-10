'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { GlobalPageFeedback } from '@/components/global-page-feedback';

/**
 * The default app chrome: sidebar + top navbar + footer. Extracted verbatim
 * from the root layout so the /upgrade tree can swap in its own shell
 * (see shell-switcher.tsx).
 */
export function MainAppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-screen flex-col overflow-hidden">
        <div className="shrink-0">
          <Navbar />
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <main className="min-h-full w-full">
            {children}
          </main>
          <GlobalPageFeedback />
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
