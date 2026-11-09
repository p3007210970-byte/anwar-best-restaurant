import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getDb, Reservation } from "@/lib/db";
import { z } from "zod";

const dateSchema = z.iso.date();

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (date && !dateSchema.safeParse(date).success) {
    return NextResponse.json({ error: "Choose a valid calendar date." }, { status: 400 });
  }

  const db = getDb();
  const reservations = date
    ? (db
        .prepare(
          "SELECT * FROM reservations WHERE reservation_date = ? ORDER BY reservation_time, created_at",
        )
        .all(date) as Reservation[])
    : (db
        .prepare(
          "SELECT * FROM reservations ORDER BY reservation_date DESC, reservation_time, created_at DESC LIMIT 200",
        )
        .all() as Reservation[]);
  return NextResponse.json({ reservations });
}
