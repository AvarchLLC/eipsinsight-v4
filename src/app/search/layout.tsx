import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Search",
  description: "Search Ethereum proposals, standards metadata, and governance records.",
  path: "/search",
  noIndex: true,
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
