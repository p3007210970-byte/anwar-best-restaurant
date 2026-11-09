import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const imageTypes = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const match = /^([a-f0-9-]{36})\.(jpg|png|webp)$/.exec(filename);
  if (!match) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", filename);
  try {
    const image = await readFile(filePath);
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": imageTypes[match[2] as keyof typeof imageTypes],
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
    throw error;
  }
}
