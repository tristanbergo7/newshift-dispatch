import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { diagnose, dispatch } from "@/lib/ai";
import { sendSms } from "@/lib/sms";
import { getJob, store, updateJob } from "@/lib/store";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = store();
  return NextResponse.json({
    jobs: [...s.jobs].sort((a, b) => b.createdAt - a.createdAt),
    techs: s.techs,
    rules: s.rules,
  });
}

function parseDataUrl(dataUrl: string | undefined) {
  if (!dataUrl) return undefined;
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return undefined;
  return { mediaType: m[1].toLowerCase(), base64: m[2] };
}

export async function POST(req: Request) {
  let body: { photo?: string; note?: string; name?: string; phone?: string; address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const photo = parseDataUrl(body.photo);
  const s = store();
  const job: Job = {
    id: randomUUID().slice(0, 8),
    createdAt: Date.now(),
    customer: {
      name: (body.name ?? "").trim() || "Customer",
      phone: (body.phone ?? "").trim(),
      address: (body.address ?? "").trim(),
    },
    note: (body.note ?? "").trim(),
    hasPhoto: !!photo,
    status: "diagnosing",
  };
  s.jobs.push(job);
  if (photo) s.photos.set(job.id, { mediaType: photo.mediaType, data: Buffer.from(photo.base64, "base64") });

  // Diagnosis is awaited so the customer's phone shows it.
  const diagnosis = await diagnose({ note: job.note, photo });
  updateJob(job.id, { diagnosis, status: "dispatching" });

  // Dispatch + SMS run after the response is sent.
  // Serialized so two simultaneous jobs can't book the same tech slot.
  after(() => {
    const g = globalThis as unknown as { __nsDispatchQueue?: Promise<void> };
    const next = (g.__nsDispatchQueue ?? Promise.resolve()).then(() => runDispatch(job.id));
    g.__nsDispatchQueue = next.catch(() => {});
    return next;
  });

  return NextResponse.json({ id: job.id, diagnosis });
}

async function runDispatch(id: string) {
  const job = getJob(id);
  if (!job) return;
  const s = store();
  try {
    const rules = s.rules;
    const assignment = await dispatch(job, s.techs, rules);
    // Book the slot so the next job gets a different one.
    const tech = s.techs.find((t) => t.id === assignment.tech_id);
    if (tech) tech.windows = tech.windows.filter((w) => w !== assignment.window);
    updateJob(id, { assignment, status: "assigned", rulesApplied: rules || undefined });

    const first = job.customer.name.split(" ")[0];
    const techFirst = assignment.tech_name.split(" ")[0];
    const d = job.diagnosis!;
    const brand = d.brand && d.brand !== "Unknown" ? `${d.brand} ` : "";
    const appliance = d.appliance_type === "refrigerator" ? "fridge" : d.appliance_type;
    const smsBody = `Hi ${first}, ${techFirst} from NewShift will arrive ${assignment.window} for your ${brand}${appliance} (likely ${d.likely_issue}). Reply C to confirm.`;
    const sms = job.customer.phone
      ? await sendSms(job.customer.phone, smsBody)
      : { status: "preview" as const, to: "", body: smsBody, error: "No phone number" };
    updateJob(id, { sms });
  } catch (e) {
    console.error("[dispatch] failed", e);
    updateJob(id, { status: "error" });
  }
}
