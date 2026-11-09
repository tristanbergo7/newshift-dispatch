"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Big QR + customer link + website button, shown over the dashboard (no new tab).
export default function SharePanel({ company, onClose }: { company: { slug: string; name: string }; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public-url?c=${company.slug}`)
      .then((r) => r.json())
      .then(async (d) => {
        setUrl(d.url);
        setSvg(await QRCode.toString(d.url, { type: "svg", margin: 1, color: { dark: "#0b1530", light: "#ffffff" } }));
      })
      .catch(() => {});
  }, [company.slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const snippet = `<a href="${url}" style="background:#38bdf8;color:#060d1f;padding:12px 20px;border-radius:12px;font-weight:700;text-decoration:none">📸 Get your appliance diagnosed</a>`;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-[var(--navy-900)] p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-3 text-2xl text-slate-400 hover:text-white" aria-label="Close">
          ✕
        </button>
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="text-center">
            <div className="mx-auto w-72 max-w-full rounded-2xl bg-white p-4 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="mt-3 text-lg font-semibold">Broken appliance? Snap it.</div>
            <div className="text-sm text-slate-400">Scan to get an AI diagnosis and a technician</div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-sky-300">{company.name}</div>
              <div className="text-2xl font-bold">Share your customer link</div>
              <p className="mt-1 text-sm text-slate-400">On your website, in missed-call texts, on invoices and on QR stickers.</p>
            </div>
            <div className="rounded-xl bg-[var(--navy-800)] p-3">
              <div className="text-xs text-slate-400">Customer link</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex-1 break-all font-mono text-sm text-sky-200">{url || "…"}</span>
                <button onClick={() => copy(url, "link")} className="shrink-0 rounded-lg bg-sky-400 px-3 py-1.5 text-sm font-semibold text-[var(--navy-950)]">
                  {copied === "link" ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>
            <div className="rounded-xl bg-[var(--navy-800)] p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Website button</span>
                <button onClick={() => copy(snippet, "html")} className="text-sky-300 hover:underline">
                  {copied === "html" ? "Copied ✓" : "Copy HTML"}
                </button>
              </div>
              <div className="mt-2">
                <span className="inline-block rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-[var(--navy-950)]">📸 Get your appliance diagnosed</span>
              </div>
            </div>
            {url.includes("localhost") && (
              <div className="text-xs text-amber-300">Tunnel not running, so this link only works on this computer.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
