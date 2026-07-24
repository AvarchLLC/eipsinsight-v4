import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Agenda Maker",
  description: "Build the EIP Editing Office Hour agenda from the live PR board - status moves and drafts pre-sorted.",
  path: "/board/agenda",
  keywords: ["EIP editing office hour", "agenda", "EIP editors", "protocol call agenda"],
});

export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
