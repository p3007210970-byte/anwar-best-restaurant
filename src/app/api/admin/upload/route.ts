import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { exceedsBodyLimit } from "@/lib/request-limits";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", { extension: "jpg", signature: (data: Buffer) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff }],
  ["image/png", { extension: "png", signature: (data: Buffer) => data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) }],
  ["image/webp", { extension: "webp", signature: (data: Buffer) => data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" }],
]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request was not allowed." }, { status: 403 });
  }
  if (!(await getAdminFromRequest(request))) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (exceedsBodyLimit(request, MAX_FILE_SIZE + 64 * 1024)) {
    return NextResponse.json({ error: "Images must be smaller than 5 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json({ error: "Please upload an image file." }, { status: 400 });
    }
    throw error;
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Images must be smaller than 5 MB." }, { status: 400 });
  }

  const imageType = allowedTypes.get(file.type);
  if (!imageType) {
    return NextResponse.json({ error: "Choose a JPG, PNG or WebP image." }, { status: 400 });
  }
  const contents = Buffer.from(await file.arrayBuffer());
  if (!imageType.signature(contents)) {
    return NextResponse.json({ error: "The image file could not be verified." }, { status: 400 });
  }

  const filename = `${randomUUID()}.${imageType.extension}`;
  const uploadDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, filename), contents, { flag: "wx" });

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
