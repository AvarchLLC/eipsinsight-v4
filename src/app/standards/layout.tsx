import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Standards",
  description:
    "Search, filter, and inspect Ethereum standards with detailed lifecycle and governance metadata.",
  path: "/standards",
  keywords: ["Ethereum standards", "EIP search", "EIP metadata"],
});

export default function StandardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
