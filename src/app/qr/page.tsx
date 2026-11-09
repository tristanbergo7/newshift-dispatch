import { headers } from "next/headers";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

async function publicBase(): Promise<string> {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  // Written by `npm run tunnel`
  try {
    const u = fs.readFileSync(path.join(process.cwd(), ".tunnel-url"), "utf8").trim();
    if (u) return u.replace(/\/$/, "");
  } catch {}
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function QrPage() {
  const url = `${await publicBase()}/upload`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0b1530", light: "#ffffff" } });
  const isLocal = url.includes("localhost");
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--navy-950)] p-6">
      <div className="w-full max-w-xl text-center">
        <div className="text-3xl font-bold sm:text-5xl">Broken appliance? Snap it.</div>
        <div className="mt-2 text-lg text-slate-400 sm:text-xl">Scan to get an AI diagnosis and a technician</div>
        <div className="mx-auto mt-8 w-full max-w-[420px] rounded-3xl bg-white p-5 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="mt-6 break-all font-mono text-lg text-sky-300">{url}</div>
        {isLocal && <div className="mt-2 text-sm text-amber-300">Tunnel not running — start it with `npm run tunnel`</div>}
      </div>
    </main>
  );
}
