import { NextResponse } from "next/server";
import { DEMO_SLUG, resetCompany } from "@/lib/store";

export async function POST(req: Request) {
  resetCompany(new URL(req.url).searchParams.get("c") || DEMO_SLUG);
  return NextResponse.json({ ok: true });
}
