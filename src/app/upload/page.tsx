"use client";

import { useRef, useState } from "react";
import type { Diagnosis } from "@/lib/types";

// Downscale on the phone so uploads over the tunnel are fast (~150–300 KB).
async function resizeImage(file: File, max = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const URGENCY_STYLE: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-orange-500/20 text-orange-300",
  emergency: "bg-red-500/20 text-red-300",
};

export default function UploadPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState<"form" | "loading" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setPhoto(await resizeImage(f));
    } catch {
      setError("Couldn't read that photo — try another one.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo && !note.trim()) {
      setError("Add a photo or describe the problem.");
      return;
    }
    setError(null);
    setState("loading");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo, note, name, phone, address }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data.diagnosis);
      setState("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setState("form");
    }
  }

  const input =
    "w-full rounded-xl bg-[var(--navy-800)] border border-white/10 px-4 py-3.5 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-400";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[var(--navy-900)] to-[var(--navy-950)] px-4 pb-10">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-2 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-400 font-black text-[var(--navy-950)]">N</div>
          <div>
            <div className="text-lg font-semibold leading-tight">NewShift Repair</div>
            <div className="text-xs text-slate-400">Snap a photo. Get a tech.</div>
          </div>
        </header>

        {state === "done" && result ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-sky-400/30 bg-[var(--navy-800)] p-5">
              <div className="text-xs uppercase tracking-wider text-sky-300">AI diagnosis</div>
              <div className="mt-1 text-2xl font-bold">
                {result.brand !== "Unknown" ? result.brand + " " : ""}
                <span className="capitalize">{result.appliance_type}</span>
              </div>
              {result.model && <div className="text-sm text-slate-400">Model {result.model}</div>}
              <div className="mt-4 text-sm text-slate-400">Likely issue</div>
              <div className="text-lg font-semibold">{result.likely_issue}</div>
              <p className="mt-3 text-slate-300">{result.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className={`rounded-full px-3 py-1 capitalize ${URGENCY_STYLE[result.urgency] ?? ""}`}>
                  {result.urgency} urgency
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">{Math.round(result.confidence * 100)}% confident</span>
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 p-5 text-center text-emerald-200">
              <div className="text-3xl">✓</div>
              <div className="mt-1 text-lg font-semibold">Request received</div>
              <div className="text-sm">A technician will text you shortly.</div>
            </div>
          </section>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
            <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

            {photo ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="Your appliance" className="max-h-72 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="absolute bottom-3 right-3 rounded-full bg-black/60 px-4 py-2 text-sm"
                >
                  Retake
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-400/50 bg-sky-400/5 text-sky-200 active:bg-sky-400/10"
                >
                  <span className="text-4xl">📷</span>
                  <span className="mt-2 text-lg font-semibold">Take a photo</span>
                  <span className="text-sm text-slate-400">The appliance or its model sticker</span>
                </button>
                <button type="button" onClick={() => libraryRef.current?.click()} className="text-sm text-slate-400 underline">
                  or choose from your photos
                </button>
              </div>
            )}

            <textarea
              className={input}
              rows={2}
              placeholder="What's wrong? e.g. fridge not cooling"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <input className={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            <input className={input} placeholder="Mobile number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
            <input className={input} placeholder="Address (street, neighborhood or zip)" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" required />

            {error && <div className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</div>}

            <button
              type="submit"
              disabled={state === "loading"}
              className="w-full rounded-2xl bg-sky-400 py-4 text-lg font-bold text-[var(--navy-950)] shadow-lg shadow-sky-500/20 disabled:opacity-80"
            >
              {state === "loading" ? (
                <span className="inline-flex items-center gap-3">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--navy-950)] border-t-transparent" />
                  Diagnosing…
                </span>
              ) : (
                "Get my repair diagnosed"
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
