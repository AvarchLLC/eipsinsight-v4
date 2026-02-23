import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Governance And Process",
  description: "Governance workflow insights for Ethereum proposals and standards lifecycle processes.",
  path: "/insights/governance-and-process",
  keywords: ["Ethereum governance", "EIP process", "proposal workflow"],
});

export default function GovernanceAndProcessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
