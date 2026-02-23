import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Settings",
  description: "Configure your account and workspace settings.",
  path: "/settings",
  noIndex: true,
});

export default async function SettingsLayout({ children }: { children: ReactNode }) {
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
    console.error("SettingsLayout session lookup failed:", error);
    redirect("/login");
  }

  if (!result?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}
