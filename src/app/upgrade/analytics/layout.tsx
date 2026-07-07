import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Upgrade Analytics",
  description:
    "Distribution charts, author leaderboards, and historical EIP tables across all Ethereum network upgrades.",
  path: "/upgrade/analytics",
  keywords: ["Ethereum upgrade analytics", "EIP authors", "hard fork statistics"],
});

export default function UpgradeAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
