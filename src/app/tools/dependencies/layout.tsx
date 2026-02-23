import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Dependencies Tool",
  description: "Inspect dependency relationships between Ethereum improvement proposals.",
  path: "/tools/dependencies",
  keywords: ["EIP dependencies", "proposal relations", "Ethereum standards graph"],
});

export default function DependenciesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
