import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { OfficeHoursShell } from "./_shell";

export const metadata: Metadata = buildMetadata({
  title: "EIP Editing Office Hours",
  description:
    "EIP Editing Office Hours hub — editorial activity, the review board (main + ACD agenda), breakdown analytics, and office-hour / EIPIP calls.",
  path: "/officehours",
  keywords: ["EIP Editing Office Hour", "EIP editors", "editorial activity", "Ethereum"],
  image: null,
});

export default function OfficeHoursLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <OfficeHoursShell>{children}</OfficeHoursShell>
    </Suspense>
  );
}
