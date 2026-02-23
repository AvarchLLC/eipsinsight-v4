"use client";

import Link from "next/link";
import { ArrowLeft, Video, Github } from "lucide-react";

export default function VideosPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl mb-2">
            Videos
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Talks, walkthroughs, and explainers about Ethereum standards.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="rounded-full bg-purple-500/20 p-6 inline-flex mb-6">
            <Video className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Videos Coming Soon
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            We&apos;re curating educational videos, talks, and tutorials about EIPs and the Ethereum ecosystem. Stay tuned!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/resources/docs"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-900 dark:text-white bg-cyan-500/20 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors"
            >
              Read documentation
            </Link>
            <a
              href="https://github.com/AvarchLLC/EIPsInsight"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Github className="h-4 w-4" />
              Follow us on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
