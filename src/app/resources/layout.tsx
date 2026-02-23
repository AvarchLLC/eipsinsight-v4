import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Resources",
  description:
    "Browse Ethereum standards resources including blogs, docs, videos, FAQs, and ecosystem news.",
  path: "/resources",
  keywords: ["Ethereum resources", "EIP docs", "Ethereum governance guides"],
});

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
