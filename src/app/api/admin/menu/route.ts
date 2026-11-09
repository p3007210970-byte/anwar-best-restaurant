import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { exceedsBodyLimit } from "@/lib/request-limits";
import { menuItemSchema } from "@/lib/validation";

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function isSafeImageUrl(value: string): boolean {
  if (!value) return true;
  if (/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const db = getDb();
  const categories = db
    .prepare("SELECT id, name, sort_order FROM categories ORDER BY sort_order, name")
    .all();
  const items = db
    .prepare(
      `SELECT m.id, m.category_id, c.name AS category_name, m.name, m.description,
        m.price, m.image_url, m.is_available, m.sort_order
       FROM menu_items m JOIN categories c ON c.id = m.category_id
       ORDER BY c.sort_order, m.sort_order, m.name`,
    )
    .all();

  return NextResponse.json({ categories, items });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request was not allowed." }, { status: 403 });
  }
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (exceedsBodyLimit(request, 16 * 1024)) {
    return NextResponse.json({ error: "The menu item request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Please submit a valid menu item." }, { status: 400 });
    }
    throw error;
  }

  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success || !isSafeImageUrl(parsed.success ? parsed.data.image_url : "")) {
    return NextResponse.json(
      { error: "Please check the menu item details and image URL." },
      { status: 400 },
    );
  }

  const db = getDb();
  const categoryExists = db
    .prepare("SELECT 1 FROM categories WHERE id = ?")
    .get(parsed.data.category_id);
  if (!categoryExists) {
    return NextResponse.json({ error: "Choose an existing food category." }, { status: 400 });
  }

  const id = parsed.data.id ?? randomUUID();
  if (parsed.data.id) {
    const updated = db
      .prepare(
        `UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?,
          image_url = ?, is_available = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(
        parsed.data.category_id,
        parsed.data.name,
        parsed.data.description,
        parsed.data.price,
        parsed.data.image_url,
        Number(parsed.data.is_available),
        parsed.data.sort_order,
        id,
      );
    if (updated.changes === 0) {
      return NextResponse.json({ error: "That menu item no longer exists." }, { status: 404 });
    }
  } else {
    db.prepare(
      `INSERT INTO menu_items
        (id, category_id, name, description, price, image_url, is_available, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      parsed.data.category_id,
      parsed.data.name,
      parsed.data.description,
      parsed.data.price,
      parsed.data.image_url,
      Number(parsed.data.is_available),
      parsed.data.sort_order,
    );
  }

  return NextResponse.json({ id });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request was not allowed." }, { status: 403 });
  }
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id || id.length > 100) {
    return NextResponse.json({ error: "Choose a valid menu item." }, { status: 400 });
  }

  const deleted = getDb().prepare("DELETE FROM menu_items WHERE id = ?").run(id);
  if (deleted.changes === 0) {
    return NextResponse.json({ error: "That menu item no longer exists." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
