import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Tools",
  description:
    "Use practical tools for Ethereum standards workflows, dependencies, timeline tracking, and drafting.",
  path: "/tools",
  keywords: ["Ethereum tools", "EIP builder", "proposal workflow tools"],
});

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
