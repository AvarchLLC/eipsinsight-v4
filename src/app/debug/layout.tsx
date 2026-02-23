import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Debug",
  description: "Internal debugging tools for EIPsInsight.",
  path: "/debug",
  noIndex: true,
});

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
