import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, setAdminCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isLoginRateLimited, recordFailedLogin } from "@/lib/rate-limit";
import { exceedsBodyLimit } from "@/lib/request-limits";
import { loginSchema } from "@/lib/validation";

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "This request was not allowed." }, { status: 403 });
  }
  if (exceedsBodyLimit(request, 4 * 1024)) {
    return NextResponse.json({ error: "The sign-in request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
    }
    throw error;
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email and password." }, { status: 400 });
  }

  if (isLoginRateLimited(request, parsed.data.email)) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait 15 minutes and try again." },
      { status: 429 },
    );
  }

  const admin = getDb()
    .prepare("SELECT id, email, password_hash FROM admins WHERE email = ?")
    .get(parsed.data.email) as
    | { id: string; email: string; password_hash: string }
    | undefined;

  const passwordMatches = admin
    ? await bcrypt.compare(parsed.data.password, admin.password_hash)
    : false;
  if (!admin || !passwordMatches) {
    recordFailedLogin(request, parsed.data.email);
    return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  }

  const token = await createSessionToken(admin.id, admin.email);
  const response = NextResponse.json({ email: admin.email });
  setAdminCookie(response, token);
  return response;
}
