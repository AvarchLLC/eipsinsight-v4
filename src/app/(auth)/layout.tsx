import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Sign In",
  description: "Sign in to access your EIPsInsight account.",
  path: "/login",
  noIndex: true,
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-ledger
      className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-between selection:bg-[var(--brand)] selection:text-[var(--paper)]"
    >
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink)] px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer group shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[var(--ink-faint)] group-hover:text-[var(--ink)] group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to index</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle variant="switch" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        {children}
      </main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs font-mono text-[var(--ink-faint)] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[var(--border)]/60">
        <span>© {new Date().getFullYear()} EIPsInsight. Open Ethereum Standards Observatory.</span>
        <div className="flex items-center gap-4 text-xs font-sans text-[var(--ink-muted)]">
          <Link href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms</Link>
          <Link href="/privacy-policy" className="hover:text-[var(--ink)] transition-colors">Privacy</Link>
          <a
            href="https://github.com/AvarchLLC/eipsinsight-v4"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--ink)] transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
