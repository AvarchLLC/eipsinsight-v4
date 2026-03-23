import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      name?: string;
      useCase?: string;
      source?: string;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    const name = (body.name ?? "").trim();
    const useCase = (body.useCase ?? "").trim();
    const source = (body.source ?? "general").trim();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }

    const payload = JSON.stringify({
      email,
      name,
      useCase,
      source,
      submittedAt: new Date().toISOString(),
    });

    // Store waitlist intents in existing Feedback table to avoid schema migration for now.
    await prisma.feedback.create({
      data: {
        page_path: "/waitlist",
        category: "waitlist",
        severity: "low",
        content: payload,
        status: "new",
        is_anonymous: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("waitlist submit failed:", error);
    return NextResponse.json({ error: "Failed to join waitlist." }, { status: 500 });
  }
}

