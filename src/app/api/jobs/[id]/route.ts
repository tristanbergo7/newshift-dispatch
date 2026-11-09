import { NextResponse } from "next/server";
import { getJob } from "@/lib/store";

export const dynamic = "force-dynamic";

// Lets the customer's phone follow its own job: time options, booking, SMS.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const slim = (a: { tech_name: string; window: string }) => ({ tech_name: a.tech_name, window: a.window });
  return NextResponse.json({
    status: job.status,
    options: job.options?.map(slim) ?? null,
    assignment: job.assignment ? slim(job.assignment) : null,
    callbackRequested: !!job.callbackRequested,
    sms: job.sms ? { status: job.sms.status } : null,
  });
}
