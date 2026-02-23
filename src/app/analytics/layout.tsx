import type { Metadata } from "next";
import AnalyticsLayoutClient from "./analytics-layout-client";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Analytics",
  description:
    "Analyze Ethereum standards activity across EIPs, pull requests, editors, reviewers, authors, and contributors.",
  path: "/analytics",
  keywords: ["Ethereum analytics", "EIP analytics", "governance analytics"],
});

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsLayoutClient>{children}</AnalyticsLayoutClient>;
}
