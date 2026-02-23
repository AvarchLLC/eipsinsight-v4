import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Ethereum Standards Intelligence",
  description:
    "Track Ethereum Improvement Proposals with live status, governance signals, lifecycle data, and historical context.",
  path: "/",
  keywords: ["Ethereum", "EIP tracker", "EIP status", "Ethereum standards"],
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
