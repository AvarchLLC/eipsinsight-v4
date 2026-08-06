import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "EIP Editing Office Hours",
  description:
    "Editorial-activity dashboard for EIP Editing Office Hours — editor leaderboard, status changes, and proposals worked on, for any day or date range.",
  path: "/office-hours",
  keywords: ["EIP Editing Office Hour", "EIP editors", "editorial activity", "Ethereum"],
  image: null,
});

export default function OfficeHoursLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
