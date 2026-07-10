import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Upgrade (Legacy)",
  description: "Legacy view of Ethereum network upgrade tracking.",
  path: "/oldupgrade",
  noIndex: true,
});

export default function OldUpgradeSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
