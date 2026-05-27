import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Editorial Commentary",
  description: "Editorial perspectives on Ethereum standards decisions and governance direction.",
  path: "/insights/commentary",
  keywords: ["Ethereum editorial", "EIP commentary", "governance perspective"],
});

export default function EditorialCommentaryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
