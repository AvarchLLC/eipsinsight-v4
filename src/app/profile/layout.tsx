import { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers();
  const ck = await cookies();
  const headerObj = Object.fromEntries(hdrs.entries());
  headerObj["cookie"] = ck.toString();

  const result = await auth.api.getSession({
    headers: headerObj,
  });

  if (!result?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}
