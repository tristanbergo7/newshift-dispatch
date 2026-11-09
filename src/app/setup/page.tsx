"use client";

import Link from "next/link";

import { useMemo, useState } from "react";

const BRANDS = ["Samsung", "LG", "Whirlpool", "GE", "Maytag", "KitchenAid", "Frigidaire", "Bosch", "Electrolux", "Sub-Zero", "Wolf", "Viking", "Thermador", "Miele"];
const TYPES = ["refrigerator", "freezer", "washer", "dryer", "dishwasher", "range", "oven", "cooktop", "microwave", "ice maker"];
const SLOTS = ["8–10 AM", "10 AM–12 PM", "1–3 PM", "3–5 PM"];
const STEPS = ["Company", "Pricing", "Technicians", "Rules", "Plan"];

interface TechDraft {
  name: string;
  phone: string;
  brands: string[];
  certified: string[];
  appliance_types: string[];
  areas: string;
  windows: string[];
}

const emptyTech = (): TechDraft => ({ name: "", phone: "", brands: [], certified: [], appliance_types: [], areas: "", windows: [] });

function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.now() + (i + 1) * 864e5).toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Los_Angeles" }),
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Chip({ on, onClick, children, tone = "sky" }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: "sky" | "amber" | "emerald" }) {
  const onCls = { sky: "border-sky-400 bg-sky-400 text-[var(--navy-950)]", amber: "border-amber-300 bg-amber-300 text-[var(--navy-950)]", emerald: "border-emerald-400 bg-emerald-400 text-[var(--navy-950)]" }[tone];
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-sm capitalize ${on ? `${onCls} font-semibold` : "border-white/15 bg-white/5 text-slate-200"}`}>
      {children}
    </button>
  );
}

export default function SetupPage() {
  const days = useMemo(() => nextDays(2), []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [serviceCall, setServiceCall] = useState(89);
  const [laborPerHour, setLaborPerHour] = useState(120);
  const [techs, setTechs] = useState<TechDraft[]>([emptyTech()]);
  const [rules, setRules] = useState("");
  const [plan, setPlan] = useState<"starter" | "pro">("pro");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  const input =
    "w-full rounded-xl border border-white/10 bg-[var(--navy-800)] px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none";
  const setTech = (i: number, patch: Partial<TechDraft>) => setTechs((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  function fillExample() {
    setName("Coastal Appliance Repair");
    setPhone("(619) 555-0123");
    setServiceArea("San Diego County");
    setServiceCall(95);
    setLaborPerHour(130);
    setTechs([
      { name: "Carlos Rivera", phone: "", brands: ["Samsung", "LG", "Whirlpool"], certified: ["LG"], appliance_types: ["washer", "dryer", "refrigerator"], areas: "Chula Vista, National City, 91910", windows: [`${days[0]} 8–10 AM`, `${days[0]} 1–3 PM`, `${days[1]} 10 AM–12 PM`] },
      { name: "Jenna Park", phone: "", brands: ["Sub-Zero", "Wolf", "GE", "Bosch"], certified: ["Sub-Zero", "Wolf"], appliance_types: ["refrigerator", "range", "oven", "dishwasher"], areas: "La Jolla, Del Mar, Carmel Valley, 92037", windows: [`${days[0]} 10 AM–12 PM`, `${days[0]} 3–5 PM`] },
    ]);
    setRules("Emergencies go to the earliest available tech.");
  }

  function canNext() {
    if (step === 0) return name.trim().length > 1;
    if (step === 2) return techs.some((t) => t.name.trim() && t.windows.length);
    return true;
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          serviceArea,
          serviceCall,
          laborPerHour,
          plan,
          rules,
          techs: techs.map((t) => ({ ...t, areas: t.areas.split(",").map((a) => a.trim()).filter(Boolean) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSlug(data.slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (slug) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const customer = `${origin}/c/${slug}/upload`;
    return (
      <main className="min-h-screen bg-gradient-to-b from-[var(--navy-900)] to-[var(--navy-950)] px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 text-3xl font-bold">{name} is live</h1>
          <p className="mt-2 text-slate-300">
            Your 14-day free trial of the {plan === "pro" ? "Pro" : "Starter"} plan has started. Customers can send photos right now.
          </p>
          <a
            href={`/c/${slug}/board`}
            className="mt-6 block rounded-2xl bg-sky-400 px-6 py-4 text-center text-lg font-bold text-[var(--navy-950)] shadow-lg shadow-sky-500/20"
          >
            Open my dashboard →
          </a>
          <div className="mt-4 rounded-xl border border-white/10 bg-[var(--navy-800)] p-4">
            <div className="text-sm text-slate-400">📱 Your customer link</div>
            <div className="mt-1 break-all font-mono text-sky-300">{customer}</div>
            <div className="mt-2 text-xs text-slate-500">
              Your QR code, this link and a website button are always one click away under <b>Share &amp; QR</b> on your dashboard.
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--navy-900)] to-[var(--navy-950)] px-4 pb-16">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
              ←
            </Link>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-400 text-xl font-black text-[var(--navy-950)]">N</div>
            <div>
              <div className="text-lg font-semibold">Set up NewShift for your shop</div>
              <div className="text-xs text-slate-400">About 2 minutes</div>
            </div>
          </div>
          <button onClick={fillExample} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:text-white">
            Fill example
          </button>
        </header>

        <ol className="mb-6 flex gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-sky-400" : "bg-white/10"}`} />
              <div className={`mt-1 text-[11px] ${i === step ? "text-sky-300" : "text-slate-500"}`}>{s}</div>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border border-white/10 bg-[var(--navy-900)] p-5">
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Your company</h2>
              <input className={input} placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={input} placeholder="Office phone (for customers who want a call)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input className={input} placeholder="Service area (e.g. San Diego County)" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your pricing</h2>
              <p className="text-sm text-slate-400">Used for the price estimate customers see before they book.</p>
              <label className="block">
                <span className="text-sm text-slate-300">Service call fee ($)</span>
                <input type="number" className={`${input} mt-1`} value={serviceCall} onChange={(e) => setServiceCall(Number(e.target.value))} />
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Labor rate ($ per hour)</span>
                <input type="number" className={`${input} mt-1`} value={laborPerHour} onChange={(e) => setLaborPerHour(Number(e.target.value))} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Your technicians</h2>
                <p className="text-sm text-slate-400">The AI uses this to pick the right tech for every job.</p>
              </div>
              {techs.map((t, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-white/10 bg-[var(--navy-800)] p-4">
                  <div className="flex items-center gap-2">
                    <input className={input} placeholder="Technician name" value={t.name} onChange={(e) => setTech(i, { name: e.target.value })} />
                    {techs.length > 1 && (
                      <button onClick={() => setTechs((ts) => ts.filter((_, j) => j !== i))} className="px-2 text-slate-400 hover:text-red-300" aria-label="Remove technician">
                        ✕
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 text-sm text-slate-300">Brands they service <span className="text-slate-500">(tap again for ★ certified)</span></div>
                    <div className="flex flex-wrap gap-1.5">
                      {BRANDS.map((b) => {
                        const on = t.brands.includes(b);
                        const cert = t.certified.includes(b);
                        return (
                          <Chip
                            key={b}
                            on={on}
                            tone={cert ? "amber" : "sky"}
                            onClick={() =>
                              !on
                                ? setTech(i, { brands: [...t.brands, b] })
                                : !cert
                                  ? setTech(i, { certified: [...t.certified, b] })
                                  : setTech(i, { brands: t.brands.filter((x) => x !== b), certified: t.certified.filter((x) => x !== b) })
                            }
                          >
                            {cert ? "★ " : ""}
                            {b}
                          </Chip>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-sm text-slate-300">Appliances</div>
                    <div className="flex flex-wrap gap-1.5">
                      {TYPES.map((a) => (
                        <Chip key={a} on={t.appliance_types.includes(a)} onClick={() => setTech(i, { appliance_types: toggle(t.appliance_types, a) })}>
                          {a}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <input className={input} placeholder="Areas they cover (neighborhoods or zips, comma separated)" value={t.areas} onChange={(e) => setTech(i, { areas: e.target.value })} />
                  <div>
                    <div className="mb-1.5 text-sm text-slate-300">Open time slots</div>
                    {days.map((d) => (
                      <div key={d} className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="w-10 text-sm text-slate-400">{d}</span>
                        {SLOTS.map((s) => {
                          const w = `${d} ${s}`;
                          return (
                            <Chip key={w} tone="emerald" on={t.windows.includes(w)} onClick={() => setTech(i, { windows: toggle(t.windows, w) })}>
                              {s}
                            </Chip>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => setTechs((ts) => [...ts, emptyTech()])} className="w-full rounded-xl border border-dashed border-white/20 py-3 text-sm text-slate-300 hover:border-sky-400">
                + Add another technician
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Dispatch rules (optional)</h2>
              <p className="text-sm text-slate-400">Plain English, one per line. You can change these anytime from your board.</p>
              <textarea
                rows={4}
                className={input}
                placeholder={"Never send Sub-Zero jobs to anyone but Jenna\nNo jobs south of the 8 for Jenna"}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Choose a plan</h2>
              {(
                [
                  ["starter", "Starter", "$99/mo", "Up to 3 technicians · photo diagnosis · auto-dispatch · SMS"],
                  ["pro", "Pro", "$249/mo", "Unlimited technicians · dispatch rules · every language · priority support"],
                ] as const
              ).map(([id, label, price, desc]) => (
                <button
                  key={id}
                  onClick={() => setPlan(id)}
                  className={`w-full rounded-xl border p-4 text-left ${plan === id ? "border-sky-400 bg-sky-400/10" : "border-white/10 bg-white/5"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{label}</span>
                    <span className="font-bold text-sky-300">{price}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">{desc}</div>
                </button>
              ))}
              <p className="text-xs text-slate-500">14-day free trial. No card needed today.</p>
            </div>
          )}

          {error && <div className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</div>}

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} className={`px-3 py-2 text-sm text-slate-400 ${step === 0 ? "invisible" : ""}`}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className="rounded-xl bg-sky-400 px-6 py-3 font-bold text-[var(--navy-950)] disabled:opacity-40"
              >
                Next →
              </button>
            ) : (
              <button onClick={finish} disabled={saving} className="rounded-xl bg-sky-400 px-6 py-3 font-bold text-[var(--navy-950)] disabled:opacity-60">
                {saving ? "Setting up…" : "Start free trial"}
              </button>
            )}
          </div>
          {step === 2 && !canNext() && <p className="mt-2 text-right text-xs text-slate-500">Add a name and at least one time slot</p>}
        </section>
      </div>
    </main>
  );
}
