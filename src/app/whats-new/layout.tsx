import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "What’s New in v4",
  description:
    "See what changed in EIPsInsight v4, where pages moved, and how to use the new experience faster.",
  path: "/whats-new",
  keywords: [
    "EIPsInsight v4",
    "what's new",
    "explore",
    "insights",
    "people analytics",
  ],
});

export default function WhatsNewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

