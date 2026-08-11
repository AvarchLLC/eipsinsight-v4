import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ethereum Technical & Governance Milestones | EIPsInsight",
  description:
    "Explore the complete historical roadmap of Ethereum network upgrades, core EIPs/ERCs, account abstraction standards, and governance milestones from 2015 to 2026.",
  keywords: [
    "Ethereum milestones",
    "Ethereum hard forks",
    "Pectra upgrade",
    "Fusaka upgrade",
    "Dencun EIP-4844",
    "The Merge",
    "PeerDAS",
    "EIP-7702",
    "ERC-4337",
    "EIP-1559",
  ],
  openGraph: {
    title: "Ethereum Technical & Governance Milestones | EIPsInsight",
    description:
      "Historical and upcoming timeline of Ethereum network upgrades, protocol milestones, and governance evolutions.",
    type: "website",
  },
};

export default function MilestonesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
