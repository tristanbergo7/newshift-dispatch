import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ rules: store().rules });
}

export async function POST(req: Request) {
  const { rules } = (await req.json().catch(() => ({}))) as { rules?: string };
  store().rules = (rules ?? "").slice(0, 4000);
  return NextResponse.json({ rules: store().rules });
}
