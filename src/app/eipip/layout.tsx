import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { EipipShell } from "./_shell";

export const metadata: Metadata = buildMetadata({
  title: "EIPIP Meetings",
  description:
    "EIP Improvement Process (EIPIP) working group hub — editorial activity, pull requests, and status changes around each meeting, plus recaps.",
  path: "/eipip",
  keywords: ["EIPIP", "EIP Improvement Process", "EIP editors", "Ethereum governance"],
  image: null,
});

export default function EipipLayout({ children }: { children: React.ReactNode }) {
  return <EipipShell>{children}</EipipShell>;
}
