import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Explore Status",
  description: "Analyze Ethereum standards by lifecycle status and category distribution.",
  path: "/explore/status",
  keywords: ["EIP status", "Ethereum proposal lifecycle", "status explorer"],
});

export default function ExploreStatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
