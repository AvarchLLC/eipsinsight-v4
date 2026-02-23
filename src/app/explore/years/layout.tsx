import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Explore By Year",
  description: "Navigate Ethereum standards evolution year by year with timeline context.",
  path: "/explore/years",
  keywords: ["EIP timeline", "Ethereum history", "yearly proposal activity"],
});

export default function ExploreYearsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
