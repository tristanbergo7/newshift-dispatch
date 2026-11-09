import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { diagnose } from "@/lib/ai";
import { runDispatch } from "@/lib/booking";
import { store, updateJob } from "@/lib/store";
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
  const t0 = Date.now();
  const diagnosis = await diagnose({ note: job.note, photo });
  updateJob(job.id, { diagnosis, diagnosedMs: Date.now() - t0, status: "dispatching" });

  // Dispatch runs after the response; serialized so concurrent jobs see consistent availability.
  after(() => {
    const g = globalThis as unknown as { __nsDispatchQueue?: Promise<void> };
    const next = (g.__nsDispatchQueue ?? Promise.resolve()).then(() => runDispatch(job.id));
    g.__nsDispatchQueue = next.catch(() => {});
    return next;
  });

  return NextResponse.json({ id: job.id, diagnosis });
}
