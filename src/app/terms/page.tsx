'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { 
  FileText, 
  Mail, 
  Shield, 
  Lock, 
  UserCheck, 
  Bell, 
  AlertTriangle,
  Scale,
  Globe,
  Ban,
  CheckCircle2
} from 'lucide-react';

const sections = [
  { id: 'introduction', label: 'Introduction', icon: FileText },
  { id: 'acceptance', label: 'Acceptance of Terms', icon: CheckCircle2 },
  { id: 'services', label: 'Services Description', icon: Globe },
  { id: 'user-accounts', label: 'User Accounts', icon: UserCheck },
  { id: 'acceptable-use', label: 'Acceptable Use Policy', icon: Shield },
  { id: 'intellectual-property', label: 'Intellectual Property', icon: Scale },
  { id: 'api-usage', label: 'API Usage Terms', icon: Lock },
  { id: 'disclaimers', label: 'Disclaimers', icon: AlertTriangle },
  { id: 'limitation-liability', label: 'Limitation of Liability', icon: Ban },
  { id: 'termination', label: 'Termination', icon: Ban },
  { id: 'changes', label: 'Changes to Terms', icon: Bell },
  { id: 'contact', label: 'Contact Us', icon: Mail },
];

export default function TermsOfServicePage() {
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
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full py-8 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8 xl:pl-12 xl:pr-12">
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Header */}
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1.5 ring-1 ring-cyan-400/30">
                <Scale className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                  Terms of Service
                </span>
              </div>
              <h1 className="mb-3 text-4xl font-bold text-slate-900 dark:text-slate-100">
                Terms of Service
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Last updated: February 27, 2026
              </p>
            </div>

            {/* Introduction */}
            <section id="introduction" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Introduction
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  Welcome to EIPs Insight ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the EIPs Insight platform, website, and services (collectively, the "Services").
                </p>
                <p>
                  By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.
                </p>
              </div>
            </section>

            {/* Acceptance of Terms */}
            <section id="acceptance" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Acceptance of Terms
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  By creating an account, accessing our platform, using our API, or otherwise engaging with our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy.
                </p>
                <p>
                  If you are using our Services on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
                </p>
              </div>
            </section>

            {/* Services Description */}
            <section id="services" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Services Description
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  EIPs Insight provides a comprehensive platform for tracking, analyzing, and understanding Ethereum Improvement Proposals (EIPs), Ethereum Request for Comments (ERCs), and Rollup Improvement Proposals (RIPs). Our Services include:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Search and filtering capabilities for Ethereum standards and proposals</li>
                  <li>Real-time analytics and governance tracking</li>
                  <li>API access for programmatic data retrieval</li>
                  <li>Community features and user accounts</li>
                  <li>Premium membership tiers with enhanced features</li>
                </ul>
                <p>
                  We reserve the right to modify, suspend, or discontinue any part of our Services at any time with or without notice.
                </p>
              </div>
            </section>

            {/* User Accounts */}
            <section id="user-accounts" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  User Accounts
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  To access certain features of our Services, you may be required to create an account. When creating an account, you agree to:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activities that occur under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                </ul>
                <p>
                  You may not use another person's account without permission, and you may not create an account using a false identity or impersonate another person or entity.
                </p>
              </div>
            </section>

            {/* Acceptable Use Policy */}
            <section id="acceptable-use" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Acceptable Use Policy
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  You agree not to use our Services to:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Violate any applicable laws, regulations, or third-party rights</li>
                  <li>Transmit any harmful, offensive, or illegal content</li>
                  <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                  <li>Interfere with or disrupt the integrity or performance of our Services</li>
                  <li>Scrape, crawl, or index our Services in violation of our robots.txt or API terms</li>
                  <li>Use automated systems to access our Services in a manner that sends more requests than a human could reasonably produce</li>
                  <li>Engage in any activity that could damage, disable, or impair our Services</li>
                  <li>Use our Services for any commercial purposes without our prior written consent</li>
                </ul>
              </div>
            </section>

            {/* Intellectual Property */}
            <section id="intellectual-property" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Intellectual Property Rights
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  The Services, including all content, features, and functionality, are owned by EIPs Insight and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
                <p>
                  The underlying Ethereum proposal data (EIPs, ERCs, RIPs) is sourced from public GitHub repositories and remains subject to the respective licenses of those repositories. Our platform aggregates and presents this public data in value-added formats.
                </p>
                <p>
                  You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise exploit any of our proprietary content without our express written permission.
                </p>
              </div>
            </section>

            {/* API Usage Terms */}
            <section id="api-usage" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  API Usage Terms
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  If you access our Services via our API, the following additional terms apply:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>You must use a valid API token issued to your account</li>
                  <li>You must comply with rate limits specified in your membership tier</li>
                  <li>You may not share your API tokens with third parties</li>
                  <li>You must implement proper error handling and respect HTTP status codes</li>
                  <li>You must include proper attribution when displaying data from our API</li>
                  <li>API tokens may be revoked at any time for violations of these Terms</li>
                </ul>
                <p>
                  We reserve the right to modify API endpoints, rate limits, and access requirements with reasonable notice to users.
                </p>
              </div>
            </section>

            {/* Disclaimers */}
            <section id="disclaimers" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Disclaimers
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p className="font-semibold uppercase">
                  THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                </p>
                <p>
                  We do not warrant that:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>The Services will be uninterrupted, secure, or error-free</li>
                  <li>The data provided through our Services is accurate, complete, or up-to-date</li>
                  <li>Any defects or errors will be corrected</li>
                  <li>The Services will meet your specific requirements</li>
                </ul>
                <p>
                  While we strive to provide accurate and reliable information, the Ethereum proposal data is subject to change and should not be relied upon as the sole source of truth. Always verify critical information with official Ethereum repositories.
                </p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section id="limitation-liability" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Ban className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Limitation of Liability
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p className="font-semibold uppercase">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, EIPS INSIGHT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
                </p>
                <p>
                  Our total liability to you for any claims arising from or related to these Terms or your use of the Services shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or $100, whichever is greater.
                </p>
                <p>
                  Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you.
                </p>
              </div>
            </section>

            {/* Termination */}
            <section id="termination" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Ban className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Termination
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  We reserve the right to suspend or terminate your access to our Services at any time, with or without cause, with or without notice, for any reason including:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Violation of these Terms or our Acceptable Use Policy</li>
                  <li>Fraudulent, abusive, or illegal activity</li>
                  <li>Extended periods of inactivity</li>
                  <li>Requests by law enforcement or government agencies</li>
                </ul>
                <p>
                  You may terminate your account at any time by contacting us at the email address provided below. Upon termination, your right to access and use the Services will immediately cease.
                </p>
                <p>
                  Provisions of these Terms that by their nature should survive termination shall survive, including intellectual property rights, disclaimers, and limitations of liability.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section id="changes" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Changes to These Terms
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  We may update these Terms from time to time to reflect changes in our practices, Services, or legal requirements. We will notify you of any material changes by:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Posting the updated Terms on this page with a new "Last updated" date</li>
                  <li>Sending an email notification to registered users (for significant changes)</li>
                  <li>Displaying a prominent notice on our platform</li>
                </ul>
                <p>
                  Your continued use of the Services after any changes to these Terms constitutes your acceptance of the new Terms. If you do not agree to the modified Terms, you must stop using our Services.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section id="contact" className="mb-8 scroll-mt-28 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
              <div className="mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Contact Us
                </h2>
              </div>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <p>
                  If you have any questions, concerns, or requests regarding these Terms or our Services, please contact us at:
                </p>
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="mb-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    Email: <a href="mailto:legal@eipsinsight.com" className="text-cyan-700 hover:underline dark:text-cyan-300">legal@eipsinsight.com</a>
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    We will respond to your inquiry within 5 business days.
                  </p>
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
                  href="/privacy"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/about"
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  About Us
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar - Table of Contents (Desktop) */}
        <div className="sticky top-24 hidden h-fit lg:block lg:w-72">
          <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/55">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              On This Page
            </h3>
            <nav className="space-y-1">
              <div className="relative border-l-2 border-slate-200 dark:border-slate-700">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <div key={section.id} className="relative">
                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute -left-[2px] top-0 h-full w-0.5 bg-cyan-500"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <button
                        onClick={() => scrollToSection(section.id)}
                        className={`flex w-full items-center gap-2 py-2 pl-4 pr-2 text-left text-[13px] transition-colors ${
                          isActive
                            ? 'font-medium text-cyan-700 dark:text-cyan-300'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                        <span className="truncate">{section.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
