import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

  return buildMetadata({
    title: title ? `${title} Upgrade` : "Upgrade",
    description:
      "Track upgrade composition, timeline updates, and implementation progress for this Ethereum network upgrade.",
    path: `/upgrade/${slug}`,
    keywords: ["Ethereum upgrade", "fork composition", "EIP inclusion"],
  });
}

export default function UpgradeSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
