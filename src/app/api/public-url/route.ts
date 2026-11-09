import { NextResponse } from "next/server";
import { publicBase, uploadPath } from "@/lib/publicUrl";

export const dynamic = "force-dynamic";

// The public customer link for a company (tunnel/domain URL, not localhost).
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("c") || "demo";
  return NextResponse.json({ url: `${await publicBase()}${uploadPath(slug)}` });
}
