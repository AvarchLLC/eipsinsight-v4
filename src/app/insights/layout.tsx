import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
// Insights shares the merged Analytics/Insights hub shell (grouped tab bar +
// header). The shell hides the time-range/repo controls on /insights routes.
import DataHubLayout from "@/app/analytics/analytics-layout-client";

export const metadata: Metadata = buildMetadata({
  title: "Insights",
  description:
    "Read analysis on Ethereum governance, upgrade execution, proposal velocity, and editorial commentary.",
  path: "/insights",
  keywords: ["Ethereum insights", "governance analysis", "EIP commentary"],
});

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return <DataHubLayout>{children}</DataHubLayout>;
}
