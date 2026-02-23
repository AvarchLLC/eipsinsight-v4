import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Documentation",
  description: "Documentation and references for understanding Ethereum standards workflows.",
  path: "/resources/docs",
  keywords: ["Ethereum docs", "EIP documentation", "standards references"],
});

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
