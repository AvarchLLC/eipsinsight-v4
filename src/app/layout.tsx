import type { Metadata } from "next";
import { Libre_Baskerville as LibreBaskervilleFont, Space_Grotesk as SpaceGroteskFont } from "next/font/google";
import "./globals.css";
import "@/lib/orpc.server";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";

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
  title: {
    default: "EIPsInsight — Ethereum Standards Intelligence",
    template: "%s · EIPsInsight",
  },

  description:
    "EIPsInsight provides clear, visual insights into Ethereum Improvement Proposals. Track EIPs, ERCs, and RIPs with analytics, governance signals, and historical context.",

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

  authors: [{ name: "EIPsInsight" }],

  creator: "EIPsInsight",
  publisher: "EIPsInsight",

  metadataBase: new URL("https://eipsinsight.com"),

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: "https://eipsinsight.com",
    title: "EIPsInsight — Ethereum Standards Intelligence",
    description:
      "Track the progress, governance, and lifecycle of Ethereum Improvement Proposals with clarity.",
    siteName: "EIPsInsight",
    images: [
      {
        url: "/og/og-default.png",
        width: 1200,
        height: 630,
        alt: "EIPsInsight — Ethereum Standards Intelligence",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "EIPsInsight — Ethereum Standards Intelligence",
    description:
      "Clear, visual insights into Ethereum Improvement Proposals, ERCs, and RIPs.",
    images: ["/og/og-default.png"],
    creator: "@EIPsInsight",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "technology",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth dark">
      <body
        className={`${Libre_Baskerville.variable} ${Space_Grotesk.variable} antialiased overflow-x-hidden`}
      >
        <SidebarProvider>
          <div className="flex min-h-screen w-full overflow-x-hidden">
            <AppSidebar />
            <SidebarInset className="flex flex-1 flex-col max-w-full overflow-x-hidden">
              <header className="sticky top-0 z-50">
                <Navbar />
              </header>
              <main className="flex-1">{children}</main>
              <Footer />
            </SidebarInset>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
