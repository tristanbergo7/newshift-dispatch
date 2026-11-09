import { NextResponse } from "next/server";
import { getJob } from "@/lib/store";

export const dynamic = "force-dynamic";

// Lets the customer's phone follow its own job (tech assigned, SMS sent).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    status: job.status,
    diagnosis: job.diagnosis,
    assignment: job.assignment ? { tech_name: job.assignment.tech_name, window: job.assignment.window } : null,
    sms: job.sms ? { status: job.sms.status } : null,
  });
}
