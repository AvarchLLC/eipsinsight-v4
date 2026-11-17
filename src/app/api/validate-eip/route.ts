import { NextRequest, NextResponse } from "next/server";
import { validateEIPMarkdown, type ValidationResult } from "@/lib/eip-validation";

export async function POST(req: NextRequest) {
  try {
    const { markdownContent } = await req.json();

    if (!markdownContent || typeof markdownContent !== "string") {
      return NextResponse.json(
        {
          success: false,
          messages: [{ level: "error", message: "Markdown content is required" }],
        } satisfies ValidationResult,
        { status: 400 }
      );
    }

    const result = validateEIPMarkdown(markdownContent);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      {
        success: false,
        messages: [{ level: "error", message: "Validation failed" }],
      } satisfies ValidationResult,
      { status: 500 }
    );
  }
}
