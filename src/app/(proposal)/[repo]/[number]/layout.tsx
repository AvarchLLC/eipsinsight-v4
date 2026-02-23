import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ repo: string; number: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { repo, number } = await params;
  const normalizedRepo = repo.toUpperCase().replace(/S$/, "");
  const title = `${normalizedRepo}-${number}`;

  return buildMetadata({
    title,
    description:
      "View proposal details, governance history, status transitions, and linked discussions.",
    path: `/${repo}/${number}`,
    keywords: ["proposal detail", "Ethereum governance", "EIP status history"],
  });
}

export default function ProposalDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
