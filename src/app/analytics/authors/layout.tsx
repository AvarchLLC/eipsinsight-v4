import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Author Analytics",
  description: "Author-level proposal activity and publishing behavior across standards.",
  path: "/analytics/authors",
  keywords: ["EIP authors", "author activity", "proposal authorship"],
});

export default function AuthorsAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
