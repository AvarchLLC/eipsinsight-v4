import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Network Upgrades",
  description:
    "Follow Ethereum network upgrade timelines, composition changes, and implementation progress across forks.",
  path: "/upgrade",
  keywords: ["Ethereum upgrades", "hard fork timeline", "EIP upgrade tracking"],
  // Defer to the route's opengraph-image.tsx for both og:image and twitter:image.
  image: null,
});

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
