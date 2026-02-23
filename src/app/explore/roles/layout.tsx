import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Explore Roles",
  description: "Understand editor, reviewer, and contributor activity across Ethereum standards.",
  path: "/explore/roles",
  keywords: ["Ethereum editors", "EIP reviewers", "proposal contributors"],
});

export default function ExploreRolesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
