import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Upgrade Insights",
  description: "Insights into Ethereum network upgrades, inclusion decisions, and execution progress.",
  path: "/insights/upgrade-insights",
  keywords: ["Ethereum upgrade analysis", "EIP inclusion", "hard fork insights"],
});

export default function UpgradeInsightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
