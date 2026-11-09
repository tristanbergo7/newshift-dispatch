import { NextResponse } from "next/server";
import { canAccess } from "@/lib/auth";
import { DEMO_SLUG, resetCompany } from "@/lib/store";

export async function POST(req: Request) {
  const slug = new URL(req.url).searchParams.get("c") || DEMO_SLUG;
  if (!(await canAccess(slug))) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  resetCompany(slug);
  return NextResponse.json({ ok: true });
}
