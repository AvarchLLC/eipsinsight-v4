import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Board Tool",
  description: "Visual board for managing and monitoring Ethereum proposal workflows.",
  path: "/tools/board",
  keywords: ["proposal board", "Ethereum workflow board", "EIP management"],
});

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
