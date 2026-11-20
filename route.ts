import { NextResponse } from "next/server";
import { MODEL_CATALOG } from "@/lib/ai/models";

export const runtime = "nodejs";

export async function GET() {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  return NextResponse.json({
    ok: geminiConfigured,
    providers: {
      gemini: geminiConfigured,
    },
    models: MODEL_CATALOG,
  });
}
