import QRCode from "qrcode";
import { publicBase, uploadPath } from "@/lib/publicUrl";

export default async function QrView({ slug, name }: { slug: string; name?: string }) {
  const url = `${await publicBase()}${uploadPath(slug)}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0b1530", light: "#ffffff" } });
  const isLocal = url.includes("localhost");
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--navy-950)] p-6">
      <div className="w-full max-w-xl text-center">
        {name && <div className="mb-2 text-lg font-semibold text-sky-300">{name}</div>}
        <div className="text-3xl font-bold sm:text-5xl">Broken appliance? Snap it.</div>
        <div className="mt-2 text-lg text-slate-400 sm:text-xl">Scan to get an AI diagnosis and a technician</div>
        <div
          className="mx-auto mt-8 w-full max-w-[420px] rounded-3xl bg-white p-5 [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="mt-6 break-all font-mono text-lg text-sky-300">{url}</div>
        {isLocal && <div className="mt-2 text-sm text-amber-300">Tunnel not running. Start it with `npm run tunnel:fixed`</div>}
      </div>
    </main>
  );
}
