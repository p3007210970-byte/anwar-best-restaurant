import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getPublicMenu } from "@/lib/data";

export async function GET() {
  await connection();
  return NextResponse.json({ items: getPublicMenu() });
}
