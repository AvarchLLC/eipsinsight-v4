import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Insights",
  description:
    "Read analysis on Ethereum governance, upgrade execution, proposal velocity, and editorial commentary.",
  path: "/insights",
  keywords: ["Ethereum insights", "governance analysis", "EIP commentary"],
});

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
