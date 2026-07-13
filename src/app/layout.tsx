import type { Metadata } from "next";
import { Libre_Baskerville as LibreBaskervilleFont, Inter as InterFont } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import "@/lib/orpc.server";
import { ShellSwitcher } from "@/components/shell-switcher";
import { SiteAssistant } from "@/components/site-assistant";
import { Toaster } from "@/components/ui/sonner";
import { WhatsNewV4Dialog } from "@/components/whats-new-v4-dialog";
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


export const metadata: Metadata = {
  ...buildMetadata({
    title: "EIPsInsight — Ethereum Standards Intelligence",
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
    default: "EIPsInsight — Ethereum Standards Intelligence",
    template: "%s · EIPsInsight",
  },
  authors: [{ name: "EIPsInsight" }],
  creator: "EIPsInsight",
  publisher: "EIPsInsight",
  metadataBase: new URL("https://eipsinsight.com"),
  category: "technology",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          defer
          src="https://analytics.eipsinsight.com/script.js"
          data-website-id="a97f8bdd-320b-4fcf-9d87-9edd568f29d7"
        />
      </head>
      <body
        className={`${Libre_Baskerville.variable} ${Inter.variable} antialiased`}
      >
        <Providers>
          <ShellSwitcher>{children}</ShellSwitcher>
          <SiteAssistant />
          <WhatsNewV4Dialog />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
