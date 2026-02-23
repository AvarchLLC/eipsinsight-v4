import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Explore Ethereum Proposals",
  description:
    "Explore Ethereum proposal trends by year, status, category, and governance role.",
  path: "/explore",
  keywords: ["explore EIPs", "Ethereum proposal trends", "EIP status explorer"],
});

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
