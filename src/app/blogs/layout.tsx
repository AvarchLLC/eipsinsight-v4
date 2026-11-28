import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "The Journal · Blogs",
  description: "Weekly Ethereum recaps, upgrade coverage, governance decisions, and protocol standards.",
  path: "/blogs",
  keywords: ["Ethereum blogs", "Weekly Ethereum", "EIP articles", "governance updates"],
});

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
