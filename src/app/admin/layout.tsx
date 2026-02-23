import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Admin",
  description: "Administrative tools for editors and maintainers.",
  path: "/admin",
  noIndex: true,
});

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const hdrs = await headers();
  const ck = await cookies();
  const headerObj = Object.fromEntries(hdrs.entries());
  headerObj["cookie"] = ck.toString();

  let result: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    result = await auth.api.getSession({ headers: headerObj });
  } catch (error) {
    console.error("AdminLayout session lookup failed:", error);
    redirect("/login");
  }
  if (!result?.user) {
    redirect("/login");
  }

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>> | null = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { role: true },
    });
  } catch (error) {
    console.error("AdminLayout role lookup failed:", error);
    redirect("/login");
  }
  if (!user || (user.role !== "admin" && user.role !== "editor")) {
    redirect("/");
  }

  return <>{children}</>;
}
