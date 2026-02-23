import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "EIP Analytics",
  description: "Metrics and trends for Ethereum Improvement Proposals.",
  path: "/analytics/eips",
  keywords: ["EIP analytics", "proposal metrics", "Ethereum data"],
});

export default function EipsAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
