import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Persona View",
  description: "Persona-based views for Ethereum standards workflows.",
  path: "/p",
  noIndex: true,
});

export default function PersonaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
