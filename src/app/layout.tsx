import type { Metadata } from "next";
import { Libre_Baskerville as LibreBaskervilleFont, Space_Grotesk as SpaceGroteskFont } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "@/lib/orpc.server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers/Providers";
import { buildMetadata } from "@/lib/seo";

const Libre_Baskerville = LibreBaskervilleFont({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const Space_Grotesk = SpaceGroteskFont({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${Libre_Baskerville.variable} ${Space_Grotesk.variable} antialiased`}
      >
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="flex h-screen flex-col overflow-hidden">
              <div className="shrink-0">
                <Navbar />
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                <main className="min-h-full w-full">{children}</main>
                <Footer />
              </div>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
