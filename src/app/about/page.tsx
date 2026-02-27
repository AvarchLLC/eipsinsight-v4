'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Target,
  Zap,
  Users,
  Globe,
  Shield,
  TrendingUp,
  Code,
  Search,
  BarChart3,
  Bell,
  FileText,
  Heart,
  Rocket,
  ArrowRight,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="w-full py-8 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8 xl:pl-12 xl:pr-12">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Hero Section */}
          <div className="mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1.5 ring-1 ring-cyan-400/30">
              <Heart className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                About Us
              </span>
            </div>
            <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-slate-100">
              Empowering the Ethereum Community with Data-Driven Insights
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              EIPs Insight is your comprehensive platform for tracking, analyzing, and understanding Ethereum Improvement Proposals, Ethereum Request for Comments, and Rollup Improvement Proposals.
            </p>
          </div>

          {/* Mission Section */}
          <section className="mb-12 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Our Mission</h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                We believe that transparency and accessibility are fundamental to the growth and success of the Ethereum ecosystem. Our mission is to provide developers, researchers, and community members with the tools and insights they need to stay informed about the evolution of Ethereum standards.
              </p>
              <p>
                By aggregating data from multiple sources and presenting it in an intuitive, searchable format, we help you navigate the complex landscape of Ethereum proposals, track governance activity, and understand the impact of protocol changes.
              </p>
            </div>
          </section>

          {/* What We Offer */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">What We Offer</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-lg border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Search className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Comprehensive Search
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Search and filter through thousands of EIPs, ERCs, and RIPs with advanced filtering by status, category, author, and more.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-lg border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Real-Time Analytics
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Track proposal trends, status changes, and contributor activity with live dashboards and historical data visualization.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-lg border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                  <Bell className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Governance Tracking
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Stay updated on recent changes, editor activity, and proposal lifecycle transitions with our governance activity feed.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-lg border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Code className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Developer API
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Integrate EIPs data into your own applications with our powerful, well-documented API and customizable access tokens.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Core Values */}
          <section className="mb-12 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Zap className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Our Core Values</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0">
                  <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Transparency</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    We believe in open data and clear communication. All our data sources are publicly accessible, and we're committed to being transparent about how we collect and present information.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0">
                  <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Community-Driven</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Built by the community, for the community. We actively listen to feedback and continuously improve our platform based on user needs and suggestions.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0">
                  <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Innovation</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    We're constantly exploring new ways to visualize and analyze Ethereum governance data, pushing the boundaries of what's possible in blockchain analytics.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0">
                  <Globe className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Accessibility</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Whether you're a seasoned Ethereum core developer or just getting started, our platform is designed to be intuitive and accessible to everyone.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section className="mb-12 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Our Data Sources</h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                We aggregate data from official Ethereum repositories to ensure accuracy and reliability:
              </p>
              <ul className="ml-6 list-disc space-y-1">
                <li>
                  <strong>ethereum/EIPs:</strong> Core Ethereum Improvement Proposals
                </li>
                <li>
                  <strong>ethereum/ERCs:</strong> Ethereum Request for Comments (Application-level standards)
                </li>
                <li>
                  <strong>ethereum/RIPs:</strong> Rollup Improvement Proposals
                </li>
              </ul>
              <p className="mt-3">
                Our platform automatically syncs with these repositories to provide real-time updates on proposal status changes, new submissions, and editor activity.
              </p>
            </div>
          </section>

          {/* Get Involved */}
          <section className="mb-12 rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-6 shadow-sm ring-1 ring-cyan-400/30">
            <div className="mb-4 inline-flex items-center gap-2">
              <Heart className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Get Involved</h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                EIPs Insight is more than just a data platform—it's a community resource. Here's how you can participate:
              </p>
              <ul className="ml-6 list-disc space-y-1">
                <li>Contribute to proposal discussions on GitHub</li>
                <li>Share your insights and analytics on social media</li>
                <li>Provide feedback to help us improve the platform</li>
                <li>Use our API to build complementary tools and services</li>
                <li>Join our community channels to connect with other Ethereum enthusiasts</li>
              </ul>
            </div>
          </section>

          {/* Legal & Contact */}
          <section className="mb-12 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Legal & Privacy
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                We take your privacy and data security seriously. Our platform is built with privacy-first principles and complies with industry best practices.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-300"
                >
                  Privacy Policy
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Terms of Service
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Contact Us</h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                Have questions, suggestions, or feedback? We'd love to hear from you!
              </p>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="mb-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  General Inquiries:
                </p>
                <a
                  href="mailto:hello@eipsinsight.com"
                  className="text-cyan-700 hover:underline dark:text-cyan-300"
                >
                  hello@eipsinsight.com
                </a>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="mb-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  Privacy & Security:
                </p>
                <a
                  href="mailto:privacy@eipsinsight.com"
                  className="text-cyan-700 hover:underline dark:text-cyan-300"
                >
                  privacy@eipsinsight.com
                </a>
              </div>
            </div>
          </section>

          {/* Footer Navigation */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 pt-6 dark:border-slate-700/50">
            <Link href="/" className="text-sm text-cyan-700 hover:underline dark:text-cyan-300">
              ← Back to Home
            </Link>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                href="/pricing"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Pricing
              </Link>
              <Link
                href="/api-tokens"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                API
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
