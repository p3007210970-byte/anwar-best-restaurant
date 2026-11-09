import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { exceedsBodyLimit } from "@/lib/request-limits";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["confirmed", "rejected"]),
});

export async function PATCH(
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
  if (exceedsBodyLimit(request, 4 * 1024)) {
    return NextResponse.json({ error: "The status request is too large." }, { status: 413 });
  }

  const { id } = await context.params;
  if (!id || id.length > 100) {
    return NextResponse.json({ error: "Choose a valid reservation." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Please choose a valid reservation status." }, { status: 400 });
    }
    throw error;
  }
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Reservations can be confirmed or rejected." }, { status: 400 });
  }

  const result = getDb()
    .prepare("UPDATE reservations SET status = ? WHERE id = ?")
    .run(parsed.data.status, id);
  if (result.changes === 0) {
    return NextResponse.json({ error: "That reservation no longer exists." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
