import fs from "fs";
import path from "path";
import { headers } from "next/headers";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";
export const metadata = { title: "How it works · NewShift Dispatch" };

async function publicBase(): Promise<string> {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  try {
    const u = fs.readFileSync(path.join(process.cwd(), ".tunnel-url"), "utf8").trim();
    if (u) return u.replace(/\/$/, "");
  } catch {}
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

const STEPS = [
  {
    n: "1",
    icon: "📸",
    title: "Customer snaps a photo",
    body: "The appliance, its model sticker or an error code, plus one sentence. In any language. No app, no account, no phone call.",
  },
  {
    n: "2",
    icon: "🧠",
    title: "AI diagnoses it in seconds",
    body: "Brand, model if visible, likely fault, urgency, honest confidence and a price estimate. Plus a tech brief: parts to bring and what to check first.",
  },
  {
    n: "3",
    icon: "🚐",
    title: "Right tech, booked and texted",
    body: "AI picks the best technician by brand certification, skills, area and availability, and says why. The customer picks a time and gets an SMS confirmation.",
  },
];

const DIFFERENT = [
  { icon: "🏷️", title: "Any brand, any age", body: "Reads logos and rating plates, from a new Samsung to a 1999 Sub-Zero. Never invents a model number." },
  { icon: "🧰", title: "Fixed on the first visit", body: "The tech arrives with the likely parts already on the truck." },
  { icon: "📏", title: "Plain-English rules", body: "“Never send Sub-Zero jobs to anyone but Mike.” Dispatch follows it on the next job." },
  { icon: "🌎", title: "Every language", body: "The customer's screen and SMS come back in their language. The shop's board stays in English." },
  { icon: "⚠️", title: "Safety first", body: "Gas smell, sparks or flooding: instant safety steps for the customer and a red priority card for the shop." },
  { icon: "🙋", title: "A human is one tap away", body: "Customers who prefer it can request a call. The shop sees the flag right away." },
];

export default async function HowPage() {
  const base = await publicBase();
  const uploadUrl = `${base}/upload`;
  const svg = await QRCode.toString(uploadUrl, { type: "svg", margin: 1, color: { dark: "#0b1530", light: "#ffffff" } });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--navy-900)] to-[var(--navy-950)] px-4 pb-16 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-400 text-xl font-black text-[var(--navy-950)]">N</div>
            <div className="text-lg font-semibold">NewShift Dispatch</div>
          </div>
          <a href="/board" className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-300 hover:text-white">
            Dispatch board →
          </a>
        </header>

        {/* Hero */}
        <section className="grid items-center gap-10 py-8 md:grid-cols-[1fr_auto]">
          <div>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              From one photo to a <span className="text-sky-300">booked repair</span>.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-300">
              Samsung and LG diagnose their own smart appliances and send their own technicians. NewShift gives every
              independent repair shop that ability, for any brand and any age.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/upload" className="rounded-xl bg-sky-400 px-5 py-3 font-bold text-[var(--navy-950)]">
                Try it now
              </a>
              <a href="/board" className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white">
                See the dispatch board
              </a>
              <a href="/setup" className="rounded-xl border border-emerald-400/50 px-5 py-3 font-semibold text-emerald-300">
                Set up your shop →
              </a>
            </div>
          </div>
          <div className="mx-auto text-center">
            <div className="w-56 rounded-2xl bg-white p-3 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="mt-2 text-sm text-slate-400">Scan to try it on your phone</div>
          </div>
        </section>

        {/* Problem */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-[var(--navy-900)] p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">The problem today</div>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[
              ["📞", "Phone tag", "Customers call, leave voicemails, wait for a callback to schedule."],
              ["❓", "Guesswork", "The shop learns what's wrong only when the tech is standing in the kitchen."],
              ["🔁", "Second trips", "Wrong part on the truck means another visit, another day for the customer."],
            ].map(([icon, title, body]) => (
              <div key={title}>
                <div className="text-2xl">{icon}</div>
                <div className="mt-1 font-semibold">{title}</div>
                <div className="text-sm text-slate-400">{body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">How it works</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl border border-sky-400/25 bg-[var(--navy-800)] p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-400 font-bold text-[var(--navy-950)]">{s.n}</span>
                  <span className="text-2xl">{s.icon}</span>
                </div>
                <div className="mt-3 text-lg font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-slate-300">{s.body}</p>
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-sky-300 md:block">→</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-emerald-200">
            Photo to booked appointment in about a minute, with no phone calls.
          </div>
        </section>

        {/* What's different */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Built for real repair shops</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENT.map((d) => (
              <div key={d.title} className="rounded-2xl border border-white/10 bg-[var(--navy-900)] p-5">
                <div className="text-2xl">{d.icon}</div>
                <div className="mt-2 font-semibold">{d.title}</div>
                <p className="mt-1 text-sm text-slate-400">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Where it lives */}
        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["🌐", "On the shop's website", "A “Get it diagnosed” button instead of a contact form."],
            ["📱", "After a missed call", "An automatic text: “Sorry we missed you, snap a photo here.”"],
            ["🧲", "On the appliance", "A QR sticker left after every repair: “Broken again? Scan me.”"],
          ].map(([icon, title, body]) => (
            <div key={title} className="rounded-2xl bg-white/5 p-5">
              <div className="text-2xl">{icon}</div>
              <div className="mt-2 font-semibold">{title}</div>
              <p className="mt-1 text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <section className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div>
            Built today by Tristan at <span className="text-white">NewShift AI</span>, which already runs AI dispatch for two US
            appliance repair companies.
          </div>
          <div>Claude Sonnet 5.5 (vision) · Next.js · Twilio · Cloudflare</div>
        </section>
      </div>
    </main>
  );
}
