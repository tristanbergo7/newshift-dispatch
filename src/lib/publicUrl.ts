import fs from "fs";
import path from "path";
import { headers } from "next/headers";

// Public base URL for QR codes: PUBLIC_URL, else the quick-tunnel URL file, else the request host.
export async function publicBase(): Promise<string> {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  try {
    const u = fs.readFileSync(path.join(process.cwd(), ".tunnel-url"), "utf8").trim();
    if (u) return u.replace(/\/$/, "");
  } catch {}
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function uploadPath(slug: string) {
  return slug === "demo" ? "/upload" : `/c/${slug}/upload`;
}
