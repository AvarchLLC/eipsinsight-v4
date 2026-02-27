'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Shield, Mail, Database, Lock, Eye, UserCheck, Cookie, Bell, FileText } from 'lucide-react';

const sections = [
  { id: 'introduction', label: 'Introduction', icon: FileText },
  { id: 'information-we-collect', label: 'Information We Collect', icon: Database },
  { id: 'how-we-use', label: 'How We Use Your Information', icon: Eye },
  { id: 'data-security', label: 'Data Security', icon: Lock },
  { id: 'data-sharing', label: 'Data Sharing', icon: UserCheck },
  { id: 'your-rights', label: 'Your Privacy Rights', icon: Bell },
  { id: 'cookies', label: 'Cookies Policy', icon: Cookie },
  { id: 'third-party', label: 'Third-Party Services', icon: Database },
  { id: 'data-retention', label: 'Data Retention', icon: Database },
  { id: 'children', label: 'Children\'s Privacy', icon: Shield },
  { id: 'changes', label: 'Changes to Policy', icon: Bell },
  { id: 'contact', label: 'Contact Us', icon: Mail },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('introduction');

  useEffect(() => {
    const observerOptions = {
      rootMargin: '-100px 0px -66% 0px',
      threshold: 0.1,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 120;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="w-full py-8 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8 xl:pl-12 xl:pr-12">
      <div className="flex max-w-5xl gap-8">
        {/* Sidebar Table of Contents */}
        <aside className="hidden lg:block lg:w-72">
          <div className="sticky top-24">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-4 flex items-center gap-2 px-1">
                <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  On This Page
                </h3>
              </div>
              <nav className="relative space-y-1 border-l-2 border-slate-200 dark:border-slate-700">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`relative flex w-full items-center gap-2.5 py-2.5 pl-5 pr-3 text-left text-[13px] transition ${
                        isActive
                          ? 'text-cyan-700 dark:text-cyan-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute -left-0.5 top-0 h-full w-1 rounded-r bg-cyan-600 dark:bg-cyan-400"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          </div>
        </aside>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1"
        >
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1.5 ring-1 ring-cyan-400/30">
            <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
              Legal Document
            </span>
          </div>
          <h1 className="mb-3 text-4xl font-bold text-slate-900 dark:text-slate-100">
            Privacy Policy
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: February 27, 2026
          </p>
        </div>

          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1.5 ring-1 ring-cyan-400/30">
              <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                Legal Document
              </span>
            </div>
            <h1 className="mb-3 text-4xl font-bold text-slate-900 dark:text-slate-100">
              Privacy Policy
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Last updated: February 27, 2026
            </p>
          </div>

          <div className="space-y-12">
            {/* Introduction */}
            <section id="introduction" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 inline-flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Introduction
                </h2>
              </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                Welcome to EIPs Insight. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
              <p>
                By accessing or using EIPs Insight, you agree to the terms of this Privacy Policy. If you do not agree with the terms, please do not access or use our services.
              </p>
            </div>
          </section>

          {/* Information We Collect */}
          <section id="information-we-collect" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Information We Collect
              </h2>
            </div>
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Personal Information
                </h3>
                <p>When you create an account or use our services, we may collect:</p>
                <ul className="ml-6 mt-2 list-disc space-y-1">
                  <li>Name and email address</li>
                  <li>GitHub account information (username, profile data)</li>
                  <li>Profile information and preferences</li>
                  <li>Payment and billing information (processed securely through Stripe)</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Usage Information
                </h3>
                <p>We automatically collect information about your interaction with our platform:</p>
                <ul className="ml-6 mt-2 list-disc space-y-1">
                  <li>Page views, clicks, and navigation patterns</li>
                  <li>Search queries and filter preferences</li>
                  <li>API usage and token activity</li>
                  <li>Device information, browser type, and IP address</li>
                  <li>Timestamps of your activities</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Cookies and Tracking Technologies
                </h3>
                <p>
                  We use cookies and similar tracking technologies to enhance your experience, remember your preferences, and analyze site usage. You can control cookie settings through your browser preferences.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section id="how-we-use" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                How We Use Your Information
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>We use the collected information for the following purposes:</p>
              <ul className="ml-6 list-disc space-y-1">
                <li>To provide, maintain, and improve our services</li>
                <li>To authenticate users and manage accounts</li>
                <li>To process subscription payments and manage billing</li>
                <li>To personalize your experience and deliver relevant content</li>
                <li>To track API usage and enforce rate limits</li>
                <li>To send important updates, security alerts, and notifications</li>
                <li>To analyze usage patterns and improve platform performance</li>
                <li>To detect, prevent, and address technical issues or fraud</li>
                <li>To comply with legal obligations and enforce our terms of service</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section id="data-security" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Lock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Data Security
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="ml-6 list-disc space-y-1">
                <li>Encrypted data transmission using HTTPS/TLS</li>
                <li>Secure authentication with Better Auth integration</li>
                <li>Hashed API tokens with scoped permissions</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and monitoring</li>
              </ul>
              <p className="mt-3">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Data Sharing */}
          <section id="data-sharing" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Data Sharing and Disclosure
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>We do not sell your personal information. We may share your data only in the following circumstances:</p>
              <ul className="ml-6 list-disc space-y-1">
                <li>
                  <strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (e.g., Stripe for payment processing, hosting providers)
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, court order, or government regulation
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you explicitly authorize us to share your information
                </li>
                <li>
                  <strong>Public Information:</strong> Information you choose to make public (e.g., public profile data, comments on proposals)
                </li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section id="your-rights" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Your Privacy Rights
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>Depending on your location, you may have the following rights:</p>
              <ul className="ml-6 list-disc space-y-1">
                <li>
                  <strong>Access:</strong> Request a copy of the personal information we hold about you
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate or incomplete data
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal information
                </li>
                <li>
                  <strong>Data Portability:</strong> Request export of your data in a portable format
                </li>
                <li>
                  <strong>Opt-Out:</strong> Unsubscribe from marketing communications
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain data processing activities
                </li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please contact us at the email address provided below.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section id="cookies" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Cookie className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Cookies Policy
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>We use cookies and similar technologies for:</p>
              <ul className="ml-6 list-disc space-y-1">
                <li>
                  <strong>Essential Cookies:</strong> Required for basic site functionality and authentication
                </li>
                <li>
                  <strong>Preference Cookies:</strong> Remember your settings and preferences (theme, persona)
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Help us understand how users interact with our platform
                </li>
              </ul>
              <p className="mt-3">
                You can manage cookie preferences through your browser settings. Note that disabling certain cookies may affect platform functionality.
              </p>
            </div>
          </section>

          {/* Third-Party Services */}
          <section id="third-party" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Third-Party Services
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>Our platform integrates with third-party services:</p>
              <ul className="ml-6 list-disc space-y-1">
                <li>
                  <strong>GitHub:</strong> For authentication and accessing public GitHub data
                </li>
                <li>
                  <strong>Stripe:</strong> For secure payment processing
                </li>
                <li>
                  <strong>Hosting Providers:</strong> For platform infrastructure
                </li>
              </ul>
              <p className="mt-3">
                These third parties have their own privacy policies. We recommend reviewing them to understand how they handle your data.
              </p>
            </div>
          </section>

          {/* Data Retention */}
          <section id="data-retention" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Data Retention
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
              <p>
                When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal, accounting, or security purposes.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section id="children" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Children's Privacy
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                Our services are not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
              </p>
            </div>
          </section>

          {/* Changes to Privacy Policy */}
          <section id="changes" className="scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <div className="mb-4 inline-flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Changes to This Privacy Policy
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
              <p>
                We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section id="contact" className="scroll-mt-28 rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-6 shadow-sm ring-1 ring-cyan-400/30">
            <div className="mb-4 inline-flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Contact Us
              </h2>
            </div>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="rounded-lg bg-white/70 p-4 dark:bg-slate-900/70">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Email: <a href="mailto:privacy@eipsinsight.com" className="text-cyan-700 hover:underline dark:text-cyan-300">privacy@eipsinsight.com</a>
                </p>
              </div>
            </div>
          </section>

          {/* Footer Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 pt-6 dark:border-slate-700/50">
            <Link
              href="/"
              className="text-sm text-cyan-700 hover:underline dark:text-cyan-300"
            >
              ← Back to Home
            </Link>
            <div className="flex gap-4 text-sm">
              <Link
                href="/terms"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    </div>
  );
}
