'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Mail,
  Database,
  Lock,
  Eye,
  UserCheck,
  Cookie,
  Bell,
  FileText,
  ChevronRight,
} from 'lucide-react';

type LegalSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  body: React.ReactNode;
};

const privacySections: LegalSection[] = [
  {
    id: 'introduction',
    label: 'Introduction',
    icon: FileText,
    body: (
      <>
        <p>
          Welcome to EIPs Insight. We are committed to protecting your privacy and securing the personal information you share when you use the platform.
        </p>
        <p>
          This policy explains what data we collect, how we use it, where third parties are involved, and what rights you may have depending on your jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    label: 'Information We Collect',
    icon: Database,
    body: (
      <>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Personal information</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Name and email address</li>
            <li>GitHub account information used during authentication</li>
            <li>Profile information and preferences</li>
            <li>Payment and billing information handled through Stripe</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Usage information</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Page views, clicks, and navigation patterns</li>
            <li>Search queries, filters, and saved preferences</li>
            <li>API usage and token activity</li>
            <li>Device, browser, IP address, and timestamps</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    id: 'how-we-use',
    label: 'How We Use Data',
    icon: Eye,
    body: (
      <>
        <p>We use collected information to operate and improve the service.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Authenticate users and manage accounts</li>
          <li>Process subscriptions and billing</li>
          <li>Personalize views, persona settings, and recommendations</li>
          <li>Track API usage and enforce access rules</li>
          <li>Send product, security, and operational notices</li>
          <li>Analyze usage patterns and improve performance</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-security',
    label: 'Data Security',
    icon: Lock,
    body: (
      <>
        <p>We use industry-standard controls to reduce risk and protect account data.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>HTTPS/TLS for encrypted transport</li>
          <li>Secure authentication infrastructure</li>
          <li>Hashed API tokens with scoped permissions</li>
          <li>Access controls and ongoing monitoring</li>
        </ul>
        <p>
          No system can guarantee absolute security. We aim for reasonable, modern protections and continuously improve controls over time.
        </p>
      </>
    ),
  },
  {
    id: 'data-sharing',
    label: 'Data Sharing',
    icon: UserCheck,
    body: (
      <>
        <p>We do not sell personal information. We may share data only in limited cases:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>With service providers such as Stripe, hosting, and infrastructure vendors</li>
          <li>When legally required</li>
          <li>During business transfers such as acquisition or restructuring</li>
          <li>When you explicitly authorize sharing</li>
          <li>When information is already public by your own action</li>
        </ul>
      </>
    ),
  },
  {
    id: 'your-rights',
    label: 'Your Privacy Rights',
    icon: Bell,
    body: (
      <>
        <p>Depending on your location, you may be able to request:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Access to the personal data we hold about you</li>
          <li>Correction of inaccurate information</li>
          <li>Deletion of personal information</li>
          <li>Export in a portable format</li>
          <li>Objection to certain processing activities</li>
        </ul>
        <p>To exercise these rights, contact us using the email listed below.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    label: 'Cookies',
    icon: Cookie,
    body: (
      <>
        <p>We use cookies and similar technologies for:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Essential site functionality and authentication</li>
          <li>Preference persistence such as theme and persona</li>
          <li>Analytics to understand usage patterns</li>
        </ul>
        <p>You can control cookies through browser settings, though disabling them may reduce functionality.</p>
      </>
    ),
  },
  {
    id: 'third-party',
    label: 'Third-Party Services',
    icon: Database,
    body: (
      <>
        <p>We integrate with third-party services to operate the product:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>GitHub for authentication and public governance data context</li>
          <li>Stripe for payments and billing</li>
          <li>Infrastructure and hosting providers to run the platform</li>
        </ul>
        <p>Those providers maintain their own privacy policies and operational controls.</p>
      </>
    ),
  },
  {
    id: 'data-retention',
    label: 'Data Retention',
    icon: Database,
    body: (
      <>
        <p>
          We retain personal information only as long as necessary for the purposes described here, unless a longer retention period is required by law, accounting, or security needs.
        </p>
        <p>
          When accounts are deleted, we will delete or anonymize personal information where reasonably possible, subject to those obligations.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    label: 'Children’s Privacy',
    icon: Shield,
    body: (
      <>
        <p>
          Our services are not intended for children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to remove it.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    label: 'Changes to Policy',
    icon: Bell,
    body: (
      <>
        <p>
          We may update this Privacy Policy to reflect changes in the product, operational practices, or legal requirements. Material changes will be reflected on this page with an updated effective date.
        </p>
        <p>We encourage periodic review if you rely on the service for ongoing usage.</p>
      </>
    ),
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: Mail,
    body: (
      <>
        <p>If you have questions or requests related to this policy or our data practices, contact us at:</p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">
            Email:{' '}
            <a href="mailto:dev@avarch.com" className="text-primary hover:text-primary/80">
              dev@avarch.com
            </a>
          </p>
        </div>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('introduction');

  const sections = useMemo(() => privacySections, []);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) return;

    let frameId: number | null = null;

    const updateActiveSection = () => {
      const threshold = 140;
      const candidates = elements.map((element) => ({
        id: element.id,
        top: element.getBoundingClientRect().top,
      }));

      const passed = candidates.filter((candidate) => candidate.top <= threshold);
      const currentId =
        passed.length > 0
          ? passed.sort((a, b) => b.top - a.top)[0].id
          : candidates.sort((a, b) => Math.abs(a.top - threshold) - Math.abs(b.top - threshold))[0]?.id ?? elements[0].id;

      setActiveSection((previous) => (previous === currentId ? previous : currentId));
      frameId = null;
    };

    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
              <nav className="mt-3 border-l-2 border-border/70">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`relative flex w-full items-center gap-2 py-2.5 pl-4 pr-2 text-left text-[13px] transition-colors ${
                        isActive
                          ? 'font-medium text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isActive && <span className="absolute -left-px top-0 h-full w-0.5 rounded-r bg-primary" />}
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="mb-8">
              <div className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Legal
              </div>
              <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
                Privacy Policy
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                How EIPsInsight collects, uses, stores, and protects personal information across accounts, billing, preferences, and product usage.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex h-8 items-center rounded-full border border-border bg-muted/40 px-3 text-xs text-muted-foreground">
                  Last updated: February 27, 2026
                </span>
                <Link
                  href="/terms"
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  Terms of Service
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>

            <div className="space-y-6">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-28 rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Section</p>
                        <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                          {section.label}
                        </h2>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      {section.body}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <Link href="/" className="text-sm text-primary hover:text-primary/80">
                Back to Home
              </Link>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
                <Link href="/about" className="text-muted-foreground hover:text-foreground">
                  About
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
