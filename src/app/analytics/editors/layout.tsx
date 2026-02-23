import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Editor Analytics",
  description: "Editor contribution patterns and throughput across Ethereum standards.",
  path: "/analytics/editors",
  keywords: ["EIP editors", "editor activity", "Ethereum standards maintainers"],
});

export default function EditorsAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
