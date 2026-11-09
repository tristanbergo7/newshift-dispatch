import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = store().photos.get(id);
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(p.data), {
    headers: { "Content-Type": p.mediaType, "Cache-Control": "public, max-age=3600" },
  });
}
