import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Proposal Details",
  description:
    "Inspect full Ethereum proposal details including status history, governance state, and linked upgrades.",
  path: "/eip",
  keywords: ["EIP details", "proposal timeline", "Ethereum governance status"],
});

export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
