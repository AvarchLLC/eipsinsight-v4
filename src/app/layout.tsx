import type { Metadata } from "next";
import localFont from "next/font/local";
import {
  Libre_Baskerville as LibreBaskervilleFont,
  Inter as InterFont,
  Fraunces as FrauncesFont,
  Instrument_Serif as InstrumentSerifFont,
  Plus_Jakarta_Sans as PlusJakartaSansFont,
  Geist as GeistFont,
  Geist_Mono as GeistMonoFont,
} from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import "@/lib/orpc.server";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { ShellSwitcher } from "@/components/shell-switcher";
import { SiteAssistant } from "@/components/site-assistant";
import { Toaster } from "@/components/ui/sonner";
import { WhatsNewV4Dialog } from "@/components/whats-new-v4-dialog";
import { CommandPalette } from "@/components/command-palette";
import { Providers } from "@/providers/Providers";
import { buildMetadata } from "@/lib/seo";
// Giveth support banner removed

const Libre_Baskerville = LibreBaskervilleFont({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Body font: Inter — high legibility for UI/body text at small sizes.
const Inter = InterFont({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Advercase: retro Apple-Garamond editorial serif for headlines and figures
const Advercase = localFont({
  src: [
    {
      path: "../../public/fonts/Advercase-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Advercase-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-advercase",
  display: "swap",
});

// ── Ledger design system fonts (docs/DESIGN.md) ──
// Fraunces: titles, figures, the logo wordmark (optical-size axis + italic).
const Fraunces = FrauncesFont({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
});
// Instrument Serif: high-contrast display serif (single 400 weight) — trying as
// the Ledger title face.
const Instrument_Serif = InstrumentSerifFont({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
// Geist: body and interface text.
const Geist = GeistFont({
  variable: "--font-geist",
  subsets: ["latin"],
});
// Plus Jakarta Sans: trying as the Ledger body/interface face.
const Plus_Jakarta_Sans = PlusJakartaSansFont({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});
// Geist Mono: identifiers, dates, counts, eyebrows, keyboard hints.
const Geist_Mono = GeistMonoFont({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  ...buildMetadata({
    title: "EIPsInsight - Ethereum Standards Intelligence",
    description:
      "EIPsInsight provides clear, visual insights into Ethereum Improvement Proposals. Track EIPs, ERCs, and RIPs with analytics, governance signals, and historical context.",
    path: "/",
    keywords: [
      "Ethereum",
      "EIPs",
      "ERCs",
      "RIPs",
      "Ethereum Improvement Proposals",
      "Ethereum Governance",
      "Blockchain Standards",
      "Ethereum Analytics",
      "Ethereum Research",
    ],
  }),
  title: {
    default: "EIPsInsight - Ethereum Standards Intelligence",
    template: "%s · EIPsInsight",
  },
  authors: [{ name: "EIPsInsight" }],
  creator: "EIPsInsight",
  publisher: "EIPsInsight",
  metadataBase: new URL("https://eipsinsight.com"),
  category: "technology",
};


import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-N59QCDB9WN" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-N59QCDB9WN');
            `,
          }}
        />
        <script
          defer
          src="https://analytics.eipsinsight.com/script.js"
          data-website-id="a97f8bdd-320b-4fcf-9d87-9edd568f29d7"
        />
      </head>
      <body
        className={`${Advercase.variable} ${Libre_Baskerville.variable} ${Inter.variable} ${Fraunces.variable} ${Instrument_Serif.variable} ${Plus_Jakarta_Sans.variable} ${Geist.variable} ${Geist_Mono.variable} antialiased`}
      >
        <Providers>
          <CommandPalette />
          <ShellSwitcher>{children}</ShellSwitcher>
          <SiteAssistant />
          <WhatsNewV4Dialog />
          <CookieConsentBanner />
          <ScrollToTopButton />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
