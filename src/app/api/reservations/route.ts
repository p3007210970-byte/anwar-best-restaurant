import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { allowReservationAttempt } from "@/lib/rate-limit";
import { exceedsBodyLimit } from "@/lib/request-limits";
import { getReservationDateLimits } from "@/lib/reservation-dates";
import { reservationSchema } from "@/lib/validation";

function isWithinOpeningHours(date: string, time: string): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const hours = getDb()
    .prepare(
      "SELECT open_time, close_time, is_closed FROM opening_hours WHERE day_of_week = ?",
    )
    .get(day) as
    | { open_time: string | null; close_time: string | null; is_closed: number }
    | undefined;

  if (!hours || hours.is_closed || !hours.open_time || !hours.close_time) return false;
  return time >= hours.open_time && time < hours.close_time;
}

export async function POST(request: NextRequest) {
  if (exceedsBodyLimit(request, 8 * 1024)) {
    return NextResponse.json({ error: "The booking request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Please submit a valid booking request." }, { status: 400 });
    }
    throw error;
  }

  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your name, phone number, guest count, date and time." },
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ message: "Thanks! Your request is in." }, { status: 201 });
  }

  if (!allowReservationAttempt(request)) {
    return NextResponse.json(
      { error: "Too many booking requests. Please wait a little and try again." },
      { status: 429 },
    );
  }

  const { today, lastDate, firstAvailableTime } = getReservationDateLimits();
  if (parsed.data.date < today || parsed.data.date > lastDate) {
    return NextResponse.json(
      { error: "Please choose a date within the next six months." },
      { status: 400 },
    );
  }

  if (parsed.data.date === today && parsed.data.time < firstAvailableTime) {
    return NextResponse.json(
      { error: "That time has passed. Please choose a later reservation time." },
      { status: 400 },
    );
  }

  if (!isWithinOpeningHours(parsed.data.date, parsed.data.time)) {
    return NextResponse.json(
      { error: "That time is outside our opening hours. Please choose another time." },
      { status: 400 },
    );
  }

  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO reservations
      (id, name, phone, guests, reservation_date, reservation_time, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    parsed.data.name,
    parsed.data.phone,
    parsed.data.guests,
    parsed.data.date,
    parsed.data.time,
    parsed.data.note,
  );

  return NextResponse.json({ id, message: "Your reservation request has been received." }, { status: 201 });
}
