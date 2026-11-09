import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Assignment, Diagnosis, Job, Tech } from "./types";

const MODEL = "claude-sonnet-5-5";

let _client: Anthropic | null = null;
function client() {
  // Our own retry-once below; keep each call bounded so the demo never hangs.
  if (!_client) _client = new Anthropic({ timeout: 20_000, maxRetries: 0 });
  return _client;
}

// Try twice, then give up (caller supplies the fallback).
async function twice<T>(label: string, fn: () => Promise<T | null>): Promise<T | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(`[ai] ${label}: ANTHROPIC_API_KEY not set, using fallback`);
    return null;
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = await fn();
      if (out) return out;
      console.warn(`[ai] ${label}: empty/invalid output (attempt ${attempt})`);
    } catch (e) {
      console.warn(`[ai] ${label} failed (attempt ${attempt}):`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/* ---------------- Diagnosis ---------------- */

const DiagnosisSchema = z.object({
  brand: z.string(),
  model: z.string().nullable(),
  appliance_type: z.string(),
  likely_issue: z.string(),
  urgency: z.enum(["low", "medium", "high", "emergency"]),
  confidence: z.number(),
  summary: z.string(),
});

const DIAG_SYSTEM = `You are a senior appliance repair diagnostician working for an independent repair shop in San Diego.
You look at one customer photo (the appliance, a fault display, or the model/serial sticker) plus the customer's short note, and produce a field diagnosis a dispatcher can act on.

Rules:
- brand: read it from the logo or sticker. If not visible, infer from design cues and say so via lower confidence. Use "Unknown" only if you truly cannot tell.
- model: the exact model number if legible on a sticker or display, otherwise null. Never invent one.
- appliance_type: one lowercase word or two, e.g. "refrigerator", "washer", "dryer", "dishwasher", "range", "oven", "freezer", "microwave".
- likely_issue: the most probable failing component or system, specific and short, max 5 words, no parentheses (e.g. "defrost system issue", "failed drain pump"). It is inserted into a customer SMS as "likely <issue>".
- urgency: emergency = gas smell, sparks, active flooding; high = food spoilage risk or no heat/cooling; medium = degraded but usable; low = cosmetic/noise.
- confidence: 0 to 1, your honest probability that likely_issue is right.
- summary: one friendly sentence for the customer explaining what is probably wrong, max 25 words.`;

export async function diagnose(input: {
  note: string;
  photo?: { mediaType: string; base64: string };
}): Promise<Diagnosis> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.photo) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.photo.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        data: input.photo.base64,
      },
    });
  }
  content.push({
    type: "text",
    text: `Customer note: "${input.note || "(no note)"}"${input.photo ? "" : "\n(No photo was provided — diagnose from the note alone and lower confidence.)"}`,
  });

  const out = await twice("diagnose", async () => {
    const res = await client().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: DIAG_SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(DiagnosisSchema) },
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") return null;
    const parsed = res.parsed_output ? DiagnosisSchema.safeParse(res.parsed_output) : null;
    return parsed?.success ? parsed.data : null;
  });

  if (out) {
    // Strip stray JSON punctuation the model occasionally leaves at the end of a string.
    const clean = (s: string) => s.trim().replace(/[\s{}[\]"]+$/, "").trim();
    return {
      ...out,
      brand: clean(out.brand),
      appliance_type: clean(out.appliance_type),
      likely_issue: clean(out.likely_issue),
      summary: clean(out.summary),
      model: out.model ? clean(out.model) || null : null,
      confidence: Math.max(0, Math.min(1, out.confidence)),
      source: "ai",
    };
  }
  return fallbackDiagnosis(input.note);
}

function fallbackDiagnosis(note: string): Diagnosis {
  const n = note.toLowerCase();
  const brands = ["Samsung", "LG", "Whirlpool", "GE", "Sub-Zero", "Maytag", "KitchenAid", "Bosch", "Frigidaire", "Wolf", "Viking"];
  const brand = brands.find((b) => n.includes(b.toLowerCase())) ?? "Unknown";
  const types: [RegExp, string, string][] = [
    [/fridge|refrigerator|freezer|cool|cold|ice/, "refrigerator", "cooling system fault (fan, defrost or sealed system)"],
    [/washer|washing|spin|drain/, "washer", "drain pump or drive system fault"],
    [/dryer|dry|heat/, "dryer", "heating element or thermal fuse failure"],
    [/dishwasher|dishes/, "dishwasher", "drain or wash pump fault"],
    [/oven|range|stove|burner/, "range", "igniter or heating element failure"],
  ];
  const hit = types.find(([re]) => re.test(n));
  return {
    brand,
    model: null,
    appliance_type: hit?.[1] ?? "appliance",
    likely_issue: hit?.[2] ?? "needs on-site inspection",
    urgency: hit?.[1] === "refrigerator" ? "high" : "medium",
    confidence: 0.4,
    summary: "Based on your description, a technician will confirm the exact fault on site.",
    source: "fallback",
  };
}

/* ---------------- Dispatch ---------------- */

const DispatchSchema = z.object({
  tech_id: z.string(),
  window: z.string(),
  reason: z.string(),
});

const DISPATCH_SYSTEM = `You are the dispatcher for an independent appliance repair shop in San Diego.
Pick the single best technician and time window for a new job.

Weigh, in order:
1. Dispatcher rules (if any) — these are hard constraints set by the shop owner and override everything else.
2. Brand fit — certified for the brand beats merely servicing it; servicing it beats not.
3. Appliance type fit.
4. Service area — the customer's address (neighborhood or zip) should be in or near the tech's areas.
5. Urgency — high/emergency jobs get the earliest available window.

The window MUST be copied exactly from that tech's open windows list.
reason: ONE short line, max 14 words, in this style: "Mike: Samsung certified, covers Mission Valley, free Tue 1–3 PM". If a dispatcher rule decided it, say so (e.g. "Mike: Sub-Zero rule, ...").`;

export async function dispatch(job: Job, techs: Tech[], rules: string): Promise<Assignment> {
  const available = techs.filter((t) => t.windows.length > 0);
  const pool = available.length ? available : techs;
  const payload = {
    job: {
      customer_address: job.customer.address,
      customer_note: job.note,
      diagnosis: job.diagnosis,
    },
    technicians: pool.map((t) => ({
      tech_id: t.id,
      name: t.name,
      brands_serviced: t.brands,
      brands_certified: t.certified,
      appliance_types: t.appliance_types,
      home_zone: t.zone,
      service_areas: t.areas,
      open_windows: t.windows,
    })),
    dispatcher_rules: rules.trim() || "(none)",
  };

  const out = await twice("dispatch", async () => {
    const res = await client().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: DISPATCH_SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(DispatchSchema) },
      messages: [{ role: "user", content: JSON.stringify(payload, null, 2) }],
    });
    if (res.stop_reason === "refusal") return null;
    const parsed = res.parsed_output ? DispatchSchema.safeParse(res.parsed_output) : null;
    if (!parsed?.success) return null;
    const tech = pool.find((t) => t.id === parsed.data.tech_id);
    if (!tech) return null; // invalid tech_id → retry / fallback
    const window = tech.windows.includes(parsed.data.window) ? parsed.data.window : tech.windows[0] ?? "Next available";
    return { tech_id: tech.id, tech_name: tech.name, window, reason: parsed.data.reason, source: "ai" as const };
  });

  return out ?? fallbackDispatch(job, pool);
}

export function fallbackDispatch(job: Job, techs: Tech[]): Assignment {
  const brand = (job.diagnosis?.brand ?? "").toLowerCase();
  const type = (job.diagnosis?.appliance_type ?? "").toLowerCase();
  const addr = job.customer.address.toLowerCase();

  const scored = techs.map((t) => {
    let s = 0;
    const why: string[] = [];
    if (t.certified.some((b) => b.toLowerCase() === brand)) { s += 5; why.push(`${job.diagnosis?.brand} certified`); }
    else if (t.brands.some((b) => b.toLowerCase() === brand)) { s += 3; why.push(`services ${job.diagnosis?.brand}`); }
    if (t.appliance_types.some((a) => type.includes(a) || a.includes(type))) s += 2;
    const area = t.areas.find((a) => addr.includes(a.toLowerCase()));
    if (area) { s += 3; why.push(`covers ${area}`); }
    if (t.windows.length) s += 1;
    return { t, s, why };
  });
  scored.sort((a, b) => b.s - a.s);
  const best = scored[0];
  const window = best.t.windows[0] ?? "Next available";
  const first = best.t.name.split(" ")[0];
  return {
    tech_id: best.t.id,
    tech_name: best.t.name,
    window,
    reason: `${first}: ${[...best.why, `free ${window}`].join(", ")}`,
    source: "fallback",
  };
}
