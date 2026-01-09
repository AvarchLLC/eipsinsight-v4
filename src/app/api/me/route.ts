import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";

export async function GET() {
  try {
    // Better Auth server-side session resolver
    // If the library exposes a helper via next-js, use it; otherwise fall back to request handling.
    const result = await auth.api.getSession({
      headers: Object.fromEntries((await headers()).entries()),
    });

    if (!result?.session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to resolve session" }, { status: 500 });
  }
}
