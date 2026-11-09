"use client";

import { useEffect, useRef, useState } from "react";

interface Slot {
  tech_name: string;
  window: string;
}
interface JobStatus {
  status: string;
  options: Slot[] | null;
  assignment: Slot | null;
  callbackRequested: boolean;
  sms: { status: string } | null;
}
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

const APPLIANCES = [
  { value: "refrigerator", label: "Fridge", icon: "🧊" },
  { value: "freezer", label: "Freezer", icon: "❄️" },
  { value: "washer", label: "Washer", icon: "🫧" },
  { value: "dryer", label: "Dryer", icon: "🌀" },
  { value: "dishwasher", label: "Dishwasher", icon: "🍽️" },
  { value: "oven/range", label: "Oven / Range", icon: "🔥" },
  { value: "microwave", label: "Microwave", icon: "📡" },
  { value: "other", label: "Other", icon: "🔧" },
];

const URGENCY_STYLE: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-orange-500/20 text-orange-300",
  emergency: "bg-red-500/20 text-red-300",
};

function Step({ done, label }: { done?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400 text-sm font-bold text-[var(--navy-950)]">✓</span>
      ) : (
        <span className="h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      )}
      <span className={done ? "font-semibold text-white" : "text-slate-300"}>{label}</span>
    </div>
  );
}

export default function UploadPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [appliance, setAppliance] = useState("");
  const [brand, setBrand] = useState("");
  const [state, setState] = useState<"form" | "loading" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [live, setLive] = useState<JobStatus | null>(null);
  const [booking, setBooking] = useState<number | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  async function refresh(id: string) {
    const r = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
    if (r.ok) setLive(await r.json());
  }

  // Follow the job: time options → booked → SMS sent.
  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        if (r.ok) {
          const d: JobStatus = await r.json();
          if (!stop) setLive(d);
          if (d.sms) return; // done
        }
      } catch {}
      if (!stop) setTimeout(tick, 1500);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [jobId]);

  async function book(i: number) {
    if (!jobId || booking !== null) return;
    setBooking(i);
    setBookError(null);
    try {
      const r = await fetch(`/api/jobs/${jobId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option: i }),
      });
      if (!r.ok) setBookError((await r.json().catch(() => ({}))).error ?? "Couldn't book that time. Try another.");
      await refresh(jobId);
    } catch {
      setBookError("Connection problem. Please try again.");
    } finally {
      setBooking(null);
    }
  }

  async function askForCall() {
    if (!jobId) return;
    await fetch(`/api/jobs/${jobId}/callback`, { method: "POST" }).catch(() => {});
    await refresh(jobId);
  }
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
    if (!photo && !note.trim() && !appliance) {
      setError("Add a photo, pick the appliance, or describe the problem.");
      return;
    }
    setError(null);
    setState("loading");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo, note, name, phone, address, appliance, brand }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data.diagnosis);
      setJobId(data.id);
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
            {live?.assignment ? (
              <div className="space-y-3 rounded-2xl bg-emerald-500/10 p-5">
                <Step done label={`Booked: ${live.assignment.tech_name.split(" ")[0]}, ${live.assignment.window}`} />
                <Step
                  done={!!live.sms}
                  label={live.sms ? (live.sms.status === "sent" ? "Confirmation text sent to your phone" : "Confirmation on its way") : "Texting you a confirmation…"}
                />
              </div>
            ) : live?.status === "awaiting_customer" && live.options?.length ? (
              <div className="rounded-2xl bg-[var(--navy-800)] p-5">
                <div className="text-lg font-semibold">Pick a time for your repair</div>
                <div className="mt-3 space-y-2">
                  {live.options.map((o, i) => (
                    <button
                      key={i}
                      onClick={() => book(i)}
                      disabled={booking !== null}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left active:scale-[0.99] disabled:opacity-60 ${
                        i === 0 ? "border-sky-400 bg-sky-400/10" : "border-white/10 bg-white/5"
                      }`}
                    >
                      <span>
                        <span className="block text-base font-semibold">{o.window}</span>
                        <span className="text-sm text-slate-400">with {o.tech_name.split(" ")[0]}</span>
                      </span>
                      {booking === i ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />
                      ) : i === 0 ? (
                        <span className="rounded-full bg-sky-400 px-2.5 py-1 text-xs font-bold text-[var(--navy-950)]">Recommended</span>
                      ) : null}
                    </button>
                  ))}
                </div>
                {bookError && <div className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{bookError}</div>}
                <div className="mt-4 border-t border-white/10 pt-4 text-center">
                  {live.callbackRequested ? (
                    <div className="text-sm text-emerald-300">✓ Got it. A team member will call you shortly.</div>
                  ) : (
                    <button onClick={askForCall} className="text-sm text-slate-300 underline">
                      Rather talk to a person? Request a call
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--navy-800)] p-5">
                <Step label={live?.status === "error" ? "We'll call you to schedule." : "Finding the best technician and times…"} done={live?.status === "error"} />
              </div>
            )}
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

            <div>
              <div className="mb-2 text-sm text-slate-400">What needs fixing?</div>
              <div className="flex flex-wrap gap-2">
                {APPLIANCES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAppliance(appliance === a.value ? "" : a.value)}
                    className={`rounded-full border px-3.5 py-2 text-sm ${
                      appliance === a.value ? "border-sky-400 bg-sky-400 font-semibold text-[var(--navy-950)]" : "border-white/15 bg-white/5 text-slate-200"
                    }`}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              className={input}
              placeholder="Brand (optional), e.g. Samsung"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              list="brands"
            />
            <datalist id="brands">
              {["Samsung", "LG", "Whirlpool", "GE", "Sub-Zero", "Maytag", "KitchenAid", "Bosch", "Frigidaire", "Wolf", "Viking", "Thermador", "Electrolux"].map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            <textarea
              className={input}
              rows={2}
              placeholder="What's wrong? e.g. not cooling, won't drain, no heat"
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
