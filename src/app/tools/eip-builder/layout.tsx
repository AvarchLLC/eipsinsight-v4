import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "EIP Builder",
  description: "Draft and structure Ethereum improvement proposals with guided tooling.",
  path: "/tools/eip-builder",
  keywords: ["EIP builder", "proposal drafting tool", "Ethereum standards writing"],
});

export default function EipBuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
