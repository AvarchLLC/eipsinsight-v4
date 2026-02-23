import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Videos",
  description: "Curated video resources on Ethereum standards, governance calls, and upgrades.",
  path: "/resources/videos",
  keywords: ["Ethereum videos", "EIP talks", "governance call recordings"],
});

export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
