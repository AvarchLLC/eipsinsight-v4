import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Reviewer Analytics",
  description: "Review activity and review-cycle behavior in Ethereum standards governance.",
  path: "/analytics/reviewers",
  keywords: ["EIP reviewers", "review analytics", "governance review"],
});

export default function ReviewersAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
