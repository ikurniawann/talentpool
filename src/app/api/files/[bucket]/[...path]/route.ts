import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
  try {
    const { bucket, path: segments } = await params;
    const rel = segments.map(decodeURIComponent).join("/");
    const abs = path.join(UPLOAD_ROOT, bucket, rel);
    const data = await fs.readFile(abs);
    const ext = path.extname(rel).slice(1).toLowerCase();
    const type =
      ext === "pdf" ? "application/pdf" :
      ext === "png" ? "image/png" :
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "webp" ? "image/webp" :
      "application/octet-stream";
    return new NextResponse(data, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
