import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const result = await auth.api.getSession({
    headers: Object.fromEntries((await headers()).entries()),
  });

  if (!result?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, image } = await req.json();

  await prisma.user.update({
    where: { id: result.user.id },
    data: {
      name: typeof name === "string" ? name : undefined,
      image: typeof image === "string" ? image : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
