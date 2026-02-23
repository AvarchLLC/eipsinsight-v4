import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "FAQ",
  description: "Frequently asked questions about Ethereum standards and EIPsInsight workflows.",
  path: "/resources/faq",
  keywords: ["EIP FAQ", "Ethereum standards FAQ", "proposal process FAQ"],
});

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
