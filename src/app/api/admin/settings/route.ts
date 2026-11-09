import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { exceedsBodyLimit } from "@/lib/request-limits";
import {
  openingHourSchema,
  restaurantInfoSchema,
} from "@/lib/validation";
import { z } from "zod";

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const db = getDb();
  const info = db.prepare("SELECT name, tagline, address, phone, email, map_url FROM restaurant_info WHERE id = 1").get();
  const hours = db
    .prepare(
      "SELECT day_of_week, label, open_time, close_time, is_closed FROM opening_hours ORDER BY day_of_week",
    )
    .all();
  return NextResponse.json({ info, hours });
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request was not allowed." }, { status: 403 });
  }
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (exceedsBodyLimit(request, 16 * 1024)) {
    return NextResponse.json({ error: "The restaurant settings are too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Please submit valid restaurant details." }, { status: 400 });
    }
    throw error;
  }

  const schema = z.object({
    info: restaurantInfoSchema,
    hours: z.array(openingHourSchema).length(7),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success || new Set(parsed.data?.hours.map((hour) => hour.day_of_week)).size !== 7) {
    return NextResponse.json(
      { error: "Please provide restaurant details and exactly one entry for each day." },
      { status: 400 },
    );
  }

  const db = getDb();
  const saveSettings = db.transaction(() => {
    db.prepare(
      `UPDATE restaurant_info SET name = ?, tagline = ?, address = ?, phone = ?,
        email = ?, map_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    ).run(
      parsed.data.info.name,
      parsed.data.info.tagline,
      parsed.data.info.address,
      parsed.data.info.phone,
      parsed.data.info.email,
      parsed.data.info.map_url,
    );

    const updateHour = db.prepare(
      `UPDATE opening_hours SET label = ?, open_time = ?, close_time = ?, is_closed = ?
       WHERE day_of_week = ?`,
    );
    for (const hour of parsed.data.hours) {
      if (!hour.is_closed && (!hour.open_time || !hour.close_time || hour.open_time >= hour.close_time)) {
        throw new Error(`Opening and closing times are invalid for ${hour.label}.`);
      }
      updateHour.run(
        hour.label,
        hour.is_closed ? null : hour.open_time,
        hour.is_closed ? null : hour.close_time,
        Number(hour.is_closed),
        hour.day_of_week,
      );
    }
  });

  try {
    saveSettings();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Opening and closing times are invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
