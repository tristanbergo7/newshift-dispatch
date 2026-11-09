"use client";

import { useEffect, useRef, useState } from "react";
import type { Job, Tech } from "@/lib/types";

const URGENCY: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-orange-500/20 text-orange-300",
  emergency: "bg-red-500/25 text-red-200",
};

function ago(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />;
}

export default function BoardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [rules, setRules] = useState("");
  const [online, setOnline] = useState(true);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch("/api/jobs", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        const list: Job[] = data.jobs;
        if (seen.current) {
          const newIds = list.filter((j) => !seen.current!.has(j.id)).map((j) => j.id);
          if (newIds.length) setFresh((f) => new Set([...f, ...newIds]));
        }
        seen.current = new Set(list.map((j) => j.id));
        setJobs(list);
        setTechs(data.techs);
        setRules(data.rules ?? "");
        setOnline(true);
      } catch {
        if (alive) setOnline(false);
      }
    }
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  async function reset() {
    if (!confirm("Clear all jobs and reset tech availability?")) return;
    await fetch("/api/reset", { method: "POST" });
    seen.current = null;
    setJobs([]);
  }

  const assigned = jobs.filter((j) => j.status === "assigned").length;
  const techById = Object.fromEntries(techs.map((t) => [t.id, t]));

  return (
    <main className="min-h-screen bg-[var(--navy-950)]">
      <header className="flex items-center justify-between border-b border-white/10 bg-[var(--navy-900)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-400 text-xl font-black text-[var(--navy-950)]">N</div>
          <div>
            <div className="text-xl font-semibold">NewShift Dispatch</div>
            <div className="text-xs text-slate-400">AI photo diagnosis · auto-dispatch · customer SMS</div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Stat label="Jobs today" value={jobs.length} />
          <Stat label="Dispatched" value={assigned} />
          <span className={`flex items-center gap-2 ${online ? "text-emerald-300" : "text-red-300"}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${online ? "animate-pulse bg-emerald-400" : "bg-red-400"}`} />
            {online ? "Live" : "Reconnecting"}
          </span>
          <a href="/qr" target="_blank" className="rounded-lg border border-sky-400/40 px-3 py-1.5 text-sky-300 hover:text-white">
            Show QR
          </a>
          <button onClick={reset} className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-400 hover:text-white">
            Reset
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Incoming jobs</h2>
          {jobs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-16 text-center text-slate-400">
              Waiting for the first customer photo…
              <div className="mt-2 text-sm">
                Scan the{" "}
                <a href="/qr" target="_blank" className="text-sky-300 underline">
                  QR code
                </a>{" "}
                to submit one.
              </div>
            </div>
          )}
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} tech={j.assignment ? techById[j.assignment.tech_id] : undefined} fresh={fresh.has(j.id)} />
          ))}
        </section>

        <aside className="space-y-4">
          <RulesPanel rules={rules} onSaved={setRules} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Technicians</h2>
          {techs.map((t) => {
            const load = jobs.filter((j) => j.assignment?.tech_id === t.id).length;
            return (
              <div key={t.id} className="rounded-xl border border-white/10 bg-[var(--navy-900)] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                    <span className="font-semibold">{t.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">{load} job{load === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">📍 {t.zone}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.brands.map((b) => (
                    <span
                      key={b}
                      className={`rounded px-1.5 py-0.5 text-[11px] ${t.certified.includes(b) ? "bg-sky-400/20 text-sky-200" : "bg-white/5 text-slate-300"}`}
                    >
                      {t.certified.includes(b) ? "★ " : ""}
                      {b}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.windows.length ? (
                    t.windows.map((w) => (
                      <span key={w} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-300">
                        {w}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">Fully booked</span>
                  )}
                </div>
              </div>
            );
          })}

        </aside>
      </div>
    </main>
  );
}

function RulesPanel({ rules, onSaved }: { rules: string; onSaved: (r: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const active = rules.split("\n").filter((r) => r.trim());

  async function save() {
    setSaving(true);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: draft }),
    });
    const data = await res.json();
    onSaved(data.rules ?? "");
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className={`rounded-xl border bg-[var(--navy-900)] p-4 ${active.length ? "border-amber-400/40" : "border-white/10"}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Dispatch rules</h3>
        {!editing && (
          <button
            onClick={() => {
              setDraft(rules);
              setEditing(true);
            }}
            className="text-xs text-sky-300 hover:underline"
          >
            {active.length ? "Edit" : "+ Add rule"}
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2">
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Plain English, one per line. e.g. Never send Sub-Zero jobs to anyone but Mike"
            className="w-full rounded-lg border border-white/10 bg-[var(--navy-800)] p-2 text-sm text-white focus:border-sky-400 focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={save} disabled={saving} className="rounded-lg bg-sky-400 px-3 py-1.5 text-sm font-semibold text-[var(--navy-950)]">
              {saving ? "Saving…" : "Save rules"}
            </button>
            <button onClick={() => setEditing(false)} className="px-2 text-sm text-slate-400">
              Cancel
            </button>
          </div>
        </div>
      ) : active.length ? (
        <ul className="mt-2 space-y-1 text-sm text-amber-200">
          {active.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 text-xs text-slate-500">No custom rules. AI uses brand, skills, zone and availability.</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function JobCard({ job, tech, fresh }: { job: Job; tech?: Tech; fresh: boolean }) {
  const d = job.diagnosis;
  const a = job.assignment;
  return (
    <article className={`rounded-2xl border border-white/10 bg-[var(--navy-900)] p-4 ${fresh ? "flash-in" : ""}`}>
      <div className="flex gap-4">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-[var(--navy-800)]">
          {job.hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/photo/${job.id}`} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-3xl text-slate-500">📝</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">
                {d ? (
                  <>
                    {d.brand !== "Unknown" ? d.brand + " " : ""}
                    <span className="capitalize">{d.appliance_type}</span>
                    {d.model && <span className="ml-2 text-sm font-normal text-slate-400">#{d.model}</span>}
                  </>
                ) : (
                  <span className="flex items-center gap-2 text-sky-200">
                    <Spinner /> Diagnosing photo…
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400">
                {job.customer.name} · {job.customer.address || "no address"} · {ago(job.createdAt)}
              </div>
            </div>
            {d && (
              <div className="flex shrink-0 gap-2 text-xs">
                {job.diagnosedMs != null && d.source === "ai" && (
                  <span className="rounded-full bg-sky-400/15 px-2.5 py-1 text-sky-200">⚡ {(job.diagnosedMs / 1000).toFixed(1)}s</span>
                )}
                <span className={`rounded-full px-2.5 py-1 capitalize ${URGENCY[d.urgency] ?? ""}`}>{d.urgency}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1">{Math.round(d.confidence * 100)}%</span>
              </div>
            )}
          </div>

          {d && (
            <div className="mt-2 text-sm">
              <span className="text-slate-400">Likely issue: </span>
              <span className="font-medium text-white">{d.likely_issue}</span>
              {job.note && <span className="text-slate-500"> — “{job.note}”</span>}
              {d.source === "fallback" && <span className="ml-2 text-xs text-amber-300">(fallback)</span>}
            </div>
          )}

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-[var(--navy-800)] p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Assigned tech</div>
              {a ? (
                <>
                  <div className="mt-1 flex items-center gap-2 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: tech?.color ?? "#38bdf8" }} />
                    {a.tech_name} <span className="font-normal text-emerald-300">· {a.window}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-300">{a.reason}</div>
                  {job.rulesApplied && <div className="mt-1 text-[11px] text-amber-300">⚑ Dispatch rules applied</div>}
                </>
              ) : job.status === "error" ? (
                <div className="mt-1 text-sm text-red-300">Dispatch failed</div>
              ) : (
                <div className="mt-1 flex items-center gap-2 text-sm text-sky-200">
                  <Spinner /> {d ? "AI picking best tech…" : "Waiting for diagnosis"}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[var(--navy-800)] p-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
                <span>Customer SMS</span>
                {job.sms && (
                  <span className={job.sms.status === "sent" ? "text-emerald-300" : "text-amber-300"}>
                    {job.sms.status === "sent" ? "✓ Sent" : "Preview"}
                  </span>
                )}
              </div>
              {job.sms ? (
                <div className="mt-2 rounded-2xl rounded-bl-sm bg-sky-500/20 px-3 py-2 text-sm text-sky-50">{job.sms.body}</div>
              ) : (
                <div className="mt-1 text-sm text-slate-500">{a ? "Sending…" : "—"}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
