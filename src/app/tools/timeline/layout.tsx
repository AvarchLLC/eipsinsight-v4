import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Timeline Tool",
  description: "Track chronological progress and milestones across Ethereum standards.",
  path: "/tools/timeline",
  keywords: ["EIP timeline tool", "proposal milestones", "Ethereum timeline"],
});

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
