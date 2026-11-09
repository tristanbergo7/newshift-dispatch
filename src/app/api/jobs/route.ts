import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { diagnose } from "@/lib/ai";
import { runDispatch } from "@/lib/booking";
import { getCompany, store, updateJob } from "@/lib/store";
import { canAccess } from "@/lib/auth";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/jobs?c=<company slug>  (defaults to the demo company)
export async function GET(req: Request) {
  const company = getCompany(new URL(req.url).searchParams.get("c"));
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!(await canAccess(company.slug))) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({
    company: { slug: company.slug, name: company.name },
    jobs: store()
      .jobs.filter((j) => j.company === company.slug)
      .sort((a, b) => b.createdAt - a.createdAt),
    techs: company.techs,
    rules: company.rules,
  });
}

function parseDataUrl(dataUrl: string | undefined) {
  if (!dataUrl) return undefined;
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return undefined;
  return { mediaType: m[1].toLowerCase(), base64: m[2] };
}

export async function POST(req: Request) {
  let body: {
    company?: string;
    photo?: string;
    note?: string;
    name?: string;
    phone?: string;
    address?: string;
    appliance?: string;
    brand?: string;
    lang?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const company = getCompany(body.company);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const photo = parseDataUrl(body.photo);
  const s = store();
  const job: Job = {
    id: randomUUID().slice(0, 8),
    company: company.slug,
    createdAt: Date.now(),
    customer: {
      name: (body.name ?? "").trim() || "Customer",
      phone: (body.phone ?? "").trim(),
      address: (body.address ?? "").trim(),
    },
    note: (body.note ?? "").trim(),
    applianceHint: (body.appliance ?? "").trim().slice(0, 40) || undefined,
    brandHint: (body.brand ?? "").trim().slice(0, 40) || undefined,
    langHint: (body.lang ?? "").trim().slice(0, 10) || undefined,
    hasPhoto: !!photo,
    status: "diagnosing",
  };
  s.jobs.push(job);
  if (photo) s.photos.set(job.id, { mediaType: photo.mediaType, data: Buffer.from(photo.base64, "base64") });

  // Diagnosis is awaited so the customer's phone shows it.
  const t0 = Date.now();
  const diagnosis = await diagnose({ note: job.note, photo, appliance: job.applianceHint, brand: job.brandHint, lang: job.langHint, pricing: company.pricing });
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
