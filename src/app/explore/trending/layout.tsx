import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Explore Trending",
  description: "Track trending Ethereum proposals based on governance and activity signals.",
  path: "/explore/trending",
  keywords: ["trending EIPs", "Ethereum proposal activity", "governance trends"],
});

export default function ExploreTrendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
