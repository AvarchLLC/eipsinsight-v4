import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Year Month Analysis",
  description: "Month-by-month analysis of Ethereum standards activity and governance momentum.",
  path: "/insights/year-month-analysis",
  keywords: ["Ethereum monthly analysis", "EIP activity", "governance cadence"],
});

export default function YearMonthAnalysisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
