import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "PR Analytics",
  description: "Pull request throughput and governance review trends for Ethereum standards.",
  path: "/analytics/prs",
  keywords: ["PR analytics", "EIP pull requests", "Ethereum review velocity"],
});

export default function PrsAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
