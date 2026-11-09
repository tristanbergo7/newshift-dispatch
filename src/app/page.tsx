import Link from "next/link";
import { currentSession } from "@/lib/auth";
import { DEMO_SLUG, getCompany, store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "NewShift Dispatch" };

export default async function Home() {
  const { admin, shop } = await currentSession();
  if (admin) return <AdminHome />;
  return <PublicHome shopSlug={shop && getCompany(shop) ? shop : null} />;
}

// Public front door: try the demo, sign in, or set up a shop.
function PublicHome({ shopSlug }: { shopSlug: string | null }) {
  const shop = shopSlug ? getCompany(shopSlug) : null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[var(--navy-900)] to-[var(--navy-950)] px-4 py-12">
      <div className="w-full max-w-3xl text-center">
        <img src="/newshift-logo-white.svg" alt="NewShift AI" className="mx-auto h-16 w-auto" />
        <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
          From one photo to a <span className="text-sky-300">booked repair</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
          AI photo diagnosis and automatic dispatch for independent appliance repair shops. Any brand, any age, any language.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <a href="/board" className="rounded-2xl border border-sky-400/40 bg-sky-400/10 p-5 hover:border-sky-400">
            <div className="text-2xl">🎬</div>
            <div className="mt-2 font-semibold">Try the live demo</div>
            <div className="text-sm text-slate-400">NewShift Repair, San Diego</div>
          </a>
          {shop ? (
            <a href={`/c/${shop.slug}/board`} className="rounded-2xl border border-white/10 bg-[var(--navy-900)] p-5 hover:border-sky-400">
              <div className="text-2xl">🗂️</div>
              <div className="mt-2 font-semibold">Go to my dashboard</div>
              <div className="text-sm text-slate-400">{shop.name}</div>
            </a>
          ) : (
            <Link href="/login" className="rounded-2xl border border-white/10 bg-[var(--navy-900)] p-5 hover:border-sky-400">
              <div className="text-2xl">🔐</div>
              <div className="mt-2 font-semibold">Sign in</div>
              <div className="text-sm text-slate-400">Already a NewShift shop</div>
            </Link>
          )}
          <a href="/setup" className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5 hover:border-emerald-400">
            <div className="text-2xl">🚀</div>
            <div className="mt-2 font-semibold">Set up your shop</div>
            <div className="text-sm text-slate-400">About 2 minutes, free trial</div>
          </a>
        </div>
        <a href="/how" className="mt-6 inline-block text-sm text-slate-400 hover:text-white">
          How it works →
        </a>
      </div>
    </main>
  );
}

// Owner view: every shop on NewShift, one click into each shop's dashboard.
function AdminHome() {
  const s = store();
  const shops = [...s.companies.values()].sort((a, b) =>
    a.slug === DEMO_SLUG ? -1 : b.slug === DEMO_SLUG ? 1 : b.createdAt - a.createdAt,
  );
  const stats = (slug: string) => {
    const jobs = s.jobs.filter((j) => j.company === slug);
    return {
      jobs: jobs.length,
      booked: jobs.filter((j) => j.status === "assigned").length,
      waiting: jobs.filter((j) => j.status === "awaiting_customer").length,
      emergencies: jobs.filter((j) => j.diagnosis?.urgency === "emergency" && j.status !== "assigned").length,
    };
  };
  const total = shops.reduce(
    (t, c) => {
      const x = stats(c.slug);
      return { jobs: t.jobs + x.jobs, booked: t.booked + x.booked, techs: t.techs + c.techs.length };
    },
    { jobs: 0, booked: 0, techs: 0 },
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--navy-900)] to-[var(--navy-950)] px-4 pb-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3 py-6">
          <div className="flex items-center gap-3">
            <img src="/newshift-logo-white.svg" alt="NewShift AI" className="h-10 w-auto" />
            <div>
              <div className="text-xl font-semibold">Dispatch</div>
              <div className="text-xs text-slate-400">Admin · all shops</div>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <a href="/how" className="rounded-lg border border-white/15 px-3 py-2 text-slate-300 hover:text-white">
              How it works
            </a>
            <a href="/setup" className="rounded-lg bg-sky-400 px-4 py-2 font-semibold text-[var(--navy-950)]">
              + Add a shop
            </a>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-3 sm:max-w-xl">
          {[
            ["Shops", shops.length],
            ["Technicians", total.techs],
            ["Jobs today", total.jobs],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[var(--navy-900)] p-4">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </section>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-400">Shops</h2>
        <section className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((c) => {
            const x = stats(c.slug);
            const board = c.slug === DEMO_SLUG ? "/board" : `/c/${c.slug}/board`;
            const brands = [...new Set(c.techs.flatMap((t) => t.brands))];
            return (
              <a
                key={c.slug}
                href={board}
                className={`group block rounded-2xl border bg-[var(--navy-900)] p-5 transition hover:border-sky-400 ${
                  x.emergencies ? "border-red-400" : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-400/15 text-lg font-bold text-sky-300">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-slate-400">
                        {c.serviceArea || "—"} · {c.plan === "pro" ? "Pro" : "Starter"}
                        {c.slug === DEMO_SLUG ? " · demo" : ""}
                      </div>
                    </div>
                  </div>
                  {x.emergencies > 0 && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-200">⚠️ {x.emergencies}</span>}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Jobs", x.jobs],
                    ["Booked", x.booked],
                    ["Techs", c.techs.length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white/5 py-2">
                      <div className="text-lg font-bold">{value}</div>
                      <div className="text-[11px] text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 truncate text-xs text-slate-500">{brands.slice(0, 6).join(" · ")}</div>
                <div className="mt-3 text-sm font-semibold text-sky-300 group-hover:underline">Open dashboard →</div>
              </a>
            );
          })}
          <a
            href="/setup"
            className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 p-5 text-slate-400 hover:border-sky-400 hover:text-sky-300"
          >
            <div className="text-3xl">＋</div>
            <div className="mt-1 font-semibold">Add a shop</div>
            <div className="text-xs">About 2 minutes</div>
          </a>
        </section>
      </div>
    </main>
  );
}
