import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// Legacy copy of the pre-redesign /upgrade pages, kept for reference and
// rollback while the new /upgrade tree settles. Not linked from navigation.
export const metadata: Metadata = buildMetadata({
  title: "Network Upgrades (Legacy)",
  description: "Legacy view of Ethereum network upgrade tracking.",
  path: "/oldupgrade",
  noIndex: true,
});

export default function OldUpgradeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
