import { ReactNode } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Landing",
  description:
    "Discover EIPsInsight with a guided overview of Ethereum standards analytics, governance workflows, and tools.",
  path: "/landing",
  keywords: ["Ethereum standards platform", "EIP dashboard", "governance tooling"],
});

export default function LayoutPublic({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f6f2] dark:bg-[#093a3e] text-[#093a3e] dark:text-[#f8f6f2]">
      <main>{children}</main>
    </div>
  );
}
