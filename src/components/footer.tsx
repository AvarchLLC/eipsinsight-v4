"use client";

import Link from "next/link";
import { Bug, Globe, Heart, Linkedin, Youtube } from "lucide-react";
import { ThemedLogoGif } from "@/components/themed-logo-gif";

const productLinks = [
  { name: "All", href: "/standards" },
  { name: "Status", href: "/standards?view=status" },
  { name: "March 2026 Insights", href: "/insights/year-month-analysis?month=2026-03" },
  { name: "About Us", href: "/about" },
  { name: "Resources", href: "/resources" },
];

const supportLinks = [
  { name: "Found a bug?", href: "https://github.com/AvarchLLC/eipsinsight-v4/issues/new" },
  { name: "Donate", href: "/donate" },
  { name: "Feedback", href: "/feedback" },
  { name: "Want to use our data?", href: "/api-tokens" },
];

const socialLinks = [
  { name: "YouTube", href: "https://www.youtube.com/@avarch", icon: Youtube },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/avarch", icon: Linkedin },
  { name: "EtherWorld", href: "https://etherworld.co/", icon: Globe },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

      <div className="w-full px-3 py-10 sm:px-4 lg:px-6 xl:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <section className="lg:col-span-4">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <ThemedLogoGif
                alt="EIPs Insight"
                width={34}
                height={34}
                unoptimized
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <span className="dec-title text-xl font-semibold tracking-tight text-foreground">
                EIPs Insight
              </span>
            </Link>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Build With <Heart className="mx-1 inline h-3.5 w-3.5 text-primary" /> by Avarch
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Join us:
            </p>
            <div className="mt-2 inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              v4.0.0
            </div>
          </section>

          <section className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Links
            </h3>
            <ul className="mt-3 space-y-2.5">
              {productLinks.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-foreground/90 transition-colors hover:text-primary"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Support
            </h3>
            <ul className="mt-3 space-y-2.5">
              {supportLinks.map((item) => (
                <li key={item.name}>
                  {item.href.startsWith("http") ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-foreground/90 transition-colors hover:text-primary"
                    >
                      {item.name.includes("bug") && <Bug className="h-3.5 w-3.5" />}
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-sm text-foreground/90 transition-colors hover:text-primary"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Follow Us
            </h3>
            <ul className="mt-3 space-y-2.5">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-foreground/90 transition-colors hover:text-primary"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="mt-8 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            © 2026 EIPs Insight. Governance and standards intelligence for Ethereum.
          </p>
        </div>
      </div>
    </footer>
  );
}
