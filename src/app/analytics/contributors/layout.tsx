import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contributor Analytics",
  description: "Contributor impact and participation trends in Ethereum standards workflows.",
  path: "/analytics/contributors",
  keywords: ["EIP contributors", "contributor analytics", "Ethereum collaboration"],
});

export default function ContributorsAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
