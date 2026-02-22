import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const hdrs = await headers();
  const ck = await cookies();
  const headerObj = Object.fromEntries(hdrs.entries());
  headerObj["cookie"] = ck.toString();

  const result = await auth.api.getSession({ headers: headerObj });
  if (!result?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: result.user.id },
    select: { role: true },
  });
  if (!user || (user.role !== "admin" && user.role !== "editor")) {
    redirect("/");
  }

  return <>{children}</>;
}
