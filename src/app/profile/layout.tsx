import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Profile",
  description: "Manage your EIPsInsight profile and account preferences.",
  path: "/profile",
  noIndex: true,
});

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers();
  const ck = await cookies();
  const headerObj = Object.fromEntries(hdrs.entries());
  headerObj["cookie"] = ck.toString();

  let result: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    result = await auth.api.getSession({
      headers: headerObj,
    });
  } catch (error) {
    console.error("ProfileLayout session lookup failed:", error);
    redirect("/login");
  }

  if (!result?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}
