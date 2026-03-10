'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

type LegalSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  body: React.ReactNode;
};

const termsSections: LegalSection[] = [
  {
    id: 'introduction',
    label: 'Introduction',
    icon: FileText,
    body: (
      <>
        <p>
          These Terms of Service govern access to and use of the EIPs Insight platform, including site features, analytics, account functionality, and API access.
        </p>
        <p>
          By accessing or using the service, you agree to these terms. If you do not agree, do not use the platform.
        </p>
      </>
    ),
  },
  {
    id: 'acceptance',
    label: 'Acceptance of Terms',
    icon: CheckCircle2,
    body: (
      <>
        <p>
          By creating an account, using the API, or otherwise engaging with the platform, you acknowledge that you have read and accepted these Terms and the Privacy Policy.
        </p>
        <p>
          If you act on behalf of an organization, you represent that you have authority to bind that organization.
        </p>
      </>
    ),
  },
  {
    id: 'services',
    label: 'Services Description',
    icon: Globe,
    body: (
      <>
        <p>EIPs Insight provides tooling and data surfaces for Ethereum standards and governance, including:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Search and filtering for EIPs, ERCs, and RIPs</li>
          <li>Governance analytics and dashboards</li>
          <li>API access for programmatic usage</li>
          <li>Community features and account-linked experiences</li>
          <li>Membership tiers and premium capabilities where applicable</li>
        </ul>
        <p>We may modify, suspend, or discontinue parts of the service over time.</p>
      </>
    ),
  },
  {
    id: 'user-accounts',
    label: 'User Accounts',
    icon: UserCheck,
    body: (
      <>
        <p>If you create an account, you agree to provide accurate information and keep your credentials secure.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Maintain current and complete account details</li>
          <li>Protect your credentials and API tokens</li>
          <li>Accept responsibility for activity under your account</li>
          <li>Notify us if you believe access has been compromised</li>
        </ul>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    label: 'Acceptable Use',
    icon: Shield,
    body: (
      <>
        <p>You agree not to use the service in ways that harm the platform, violate law, or abuse access.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not attempt unauthorized access to systems or accounts</li>
          <li>Do not disrupt or degrade platform performance</li>
          <li>Do not scrape or automate against the service outside permitted API usage</li>
          <li>Do not use the service to transmit illegal, harmful, or abusive content</li>
          <li>Do not use the platform commercially beyond allowed scope without consent</li>
        </ul>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    label: 'Intellectual Property',
    icon: Scale,
    body: (
      <>
        <p>
          The service, product surfaces, and platform-specific content are owned by EIPs Insight and protected under applicable intellectual property law.
        </p>
        <p>
          Public Ethereum standards data remains subject to its original source licenses. Our product adds structure, analytics, and interface layers on top of that public material.
        </p>
      </>
    ),
  },
  {
    id: 'api-usage',
    label: 'API Usage Terms',
    icon: Lock,
    body: (
      <>
        <p>Additional terms apply when using the API:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>You must use a valid token issued to your account</li>
          <li>You must respect rate limits and plan restrictions</li>
          <li>You may not share tokens with third parties</li>
          <li>You should handle errors and response codes correctly</li>
          <li>We may revoke API access for abuse or policy violations</li>
        </ul>
      </>
    ),
  },
  {
    id: 'disclaimers',
    label: 'Disclaimers',
    icon: AlertTriangle,
    body: (
      <>
        <p className="font-semibold uppercase text-foreground">
          The service is provided “as is” and “as available” without warranties of any kind.
        </p>
        <p>
          We aim for accuracy and operational usefulness, but governance and proposal data can change quickly and may require confirmation against official sources.
        </p>
      </>
    ),
  },
  {
    id: 'limitation-liability',
    label: 'Limitation of Liability',
    icon: Ban,
    body: (
      <>
        <p className="font-semibold uppercase text-foreground">
          To the fullest extent permitted by law, EIPs Insight is not liable for indirect, incidental, special, consequential, or punitive damages.
        </p>
        <p>
          Our total liability for claims arising from these Terms or your use of the service is limited to the amount you paid in the prior twelve months, or $100, whichever is greater.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    label: 'Termination',
    icon: Ban,
    body: (
      <>
        <p>We may suspend or terminate access for reasons including:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Violation of these Terms</li>
          <li>Fraudulent, abusive, or illegal activity</li>
          <li>Security risks or platform misuse</li>
          <li>Requests required by law or regulation</li>
        </ul>
        <p>You may also stop using the service and request account closure.</p>
      </>
    ),
  },
  {
    id: 'changes',
    label: 'Changes to Terms',
    icon: Bell,
    body: (
      <>
        <p>
          We may update these Terms to reflect changes in the service, operations, or legal requirements. Material changes will be posted here with an updated effective date.
        </p>
        <p>Continued use of the service after those changes constitutes acceptance of the revised Terms.</p>
      </>
    ),
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: Mail,
    body: (
      <>
        <p>If you have legal or service questions related to these Terms, contact us at:</p>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">
            Email:{' '}
            <a href="mailto:legal@eipsinsight.com" className="text-primary hover:text-primary/80">
              legal@eipsinsight.com
            </a>
          </p>
        </div>
      </>
    ),
  },
];

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const sections = useMemo(() => termsSections, []);

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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_280px]">
          <main className="min-w-0">
            <section className="mb-8">
              <div className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Legal
              </div>
              <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
                Terms of Service
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Rules for using EIPsInsight, including accounts, API access, acceptable use, service limitations, and legal boundaries.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex h-8 items-center rounded-full border border-border bg-muted/40 px-3 text-xs text-muted-foreground">
                  Last updated: February 27, 2026
                </span>
                <Link
                  href="/privacy"
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  Privacy Policy
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
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
                <Link href="/about" className="text-muted-foreground hover:text-foreground">
                  About
                </Link>
              </div>
            </div>
          </main>

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
        </div>
      </div>
    </div>
  );
}
