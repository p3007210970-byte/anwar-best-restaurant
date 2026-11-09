import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request was not allowed." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  clearAdminCookie(response);
  return response;
}
