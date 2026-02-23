import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ persona: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { persona } = await params;
  const label = persona
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

  return buildMetadata({
    title: label ? `${label} Persona` : "Persona",
    description: "Persona-specific view of Ethereum standards intelligence.",
    path: `/p/${persona}`,
    noIndex: true,
  });
}

export default function PersonaSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
