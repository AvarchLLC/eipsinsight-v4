import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Blogs",
  description: "Read in-depth articles and updates on Ethereum standards and governance.",
  path: "/resources/blogs",
  keywords: ["Ethereum blogs", "EIP articles", "governance updates"],
});

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
