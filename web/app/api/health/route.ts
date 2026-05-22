import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  return NextResponse.json({
    status: "ok",
    message: "職人料理大腦 Web",
    ai_configured: hasKey,
  });
}
