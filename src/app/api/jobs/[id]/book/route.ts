import { NextResponse } from "next/server";
import { bookJob } from "@/lib/booking";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { option } = (await req.json().catch(() => ({}))) as { option?: number };
  const r = bookJob(id, Number(option));
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
