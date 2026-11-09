import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { exceedsBodyLimit } from "@/lib/request-limits";
import { categorySchema } from "@/lib/validation";

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const categories = getDb()
    .prepare("SELECT id, name, sort_order FROM categories ORDER BY sort_order, name")
    .all();
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request was not allowed." }, { status: 403 });
  }
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (exceedsBodyLimit(request, 4 * 1024)) {
    return NextResponse.json({ error: "The category request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Please submit a valid category." }, { status: 400 });
    }
    throw error;
  }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Category names must be 2–60 characters." }, { status: 400 });
  }

  const id = parsed.data.id ?? randomUUID();
  try {
    if (parsed.data.id) {
      const updated = getDb()
        .prepare("UPDATE categories SET name = ?, sort_order = ? WHERE id = ?")
        .run(parsed.data.name, parsed.data.sort_order, id);
      if (updated.changes === 0) {
        return NextResponse.json({ error: "That category no longer exists." }, { status: 404 });
      }
    } else {
      getDb()
        .prepare("INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)")
        .run(id, parsed.data.name, parsed.data.sort_order);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed: categories.name")
    ) {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ id });
}
