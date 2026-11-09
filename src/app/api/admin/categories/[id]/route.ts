import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request was not allowed." }, { status: 403 });
  }
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const { id } = await context.params;
  if (id.length > 100) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }

  const db = getDb();
  const usage = db
    .prepare("SELECT COUNT(*) AS count FROM menu_items WHERE category_id = ?")
    .get(id) as { count: number };
  if (usage.count > 0) {
    return NextResponse.json(
      { error: "Move or remove this category's menu items before deleting it." },
      { status: 409 },
    );
  }

  const deleted = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  if (deleted.changes === 0) {
    return NextResponse.json({ error: "That category no longer exists." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
