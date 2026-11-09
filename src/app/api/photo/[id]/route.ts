import { canAccess } from "@/lib/auth";
import { getJob, store } from "@/lib/store";

export const dynamic = "force-dynamic";

// Customer photos are only visible to the shop that owns the job.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  const p = store().photos.get(id);
  if (!job || !p) return new Response("Not found", { status: 404 });
  if (!(await canAccess(job.company))) return new Response("Sign in required", { status: 401 });
  return new Response(new Uint8Array(p.data), {
    headers: { "Content-Type": p.mediaType, "Cache-Control": "private, max-age=3600" },
  });
}
