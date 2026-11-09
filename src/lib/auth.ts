import "server-only";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { getDb } from "@/lib/db";

const SESSION_COOKIE = "anwar_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(adminId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionKey());
}

export function setAdminCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function getAdminFromToken(token: string | undefined) {
  if (!token) return null;
  const key = sessionKey();

  let adminId: string;
  try {
    const verified = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    if (typeof verified.payload.sub !== "string") return null;
    adminId = verified.payload.sub;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return null;
  }

  return (
    (getDb()
      .prepare("SELECT id, email FROM admins WHERE id = ?")
      .get(adminId) as { id: string; email: string } | undefined) ?? null
  );
}

export function getAdminFromRequest(request: NextRequest) {
  return getAdminFromToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  return getAdminFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export const sessionCookieName = SESSION_COOKIE;
