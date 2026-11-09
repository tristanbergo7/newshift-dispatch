"use client";

import { useEffect, useState } from "react";

export default function RulesPage() {
  const [rules, setRules] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/rules").then((r) => r.json()).then((d) => setRules(d.rules ?? ""));
  }, []);

  async function save() {
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="min-h-screen bg-[var(--navy-950)] p-8">
      <div className="mx-auto max-w-2xl">
        <a href="/board" className="text-sm text-sky-300 hover:underline">← Board</a>
        <h1 className="mt-4 text-2xl font-semibold">Dispatch rules</h1>
        <p className="mt-1 text-slate-400">Plain English, one per line. Applied to the next assignment.</p>
        <textarea
          className="mt-4 h-56 w-full rounded-xl border border-white/10 bg-[var(--navy-800)] p-4 text-white focus:border-sky-400 focus:outline-none"
          placeholder="Never send Sub-Zero jobs to anyone but Mike"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
        />
        <button onClick={save} className="mt-3 rounded-xl bg-sky-400 px-6 py-3 font-bold text-[var(--navy-950)]">
          {saved ? "Saved ✓" : "Save rules"}
        </button>
      </div>
    </main>
  );
}
