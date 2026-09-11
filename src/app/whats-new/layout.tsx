import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "What’s New",
  description:
    "Discover what's new in EIPsInsight, platform feature highlights, navigation guide, and workflow tools.",
  path: "/whats-new",
  keywords: [
    "EIPsInsight",
    "what's new",
    "explore",
    "insights",
    "ethereum standards",
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

