import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Assignment, Diagnosis, Job, Tech } from "./types";
import { SMS_EN, UI_EN, type UiKey } from "./i18n";

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
  parts_to_bring: z.array(z.string()),
  first_checks: z.array(z.string()),
  est_minutes: z.number(),
  est_price_low: z.number(),
  est_price_high: z.number(),
  safety_steps: z.array(z.string()),
  language: z.string(),
  language_name: z.string(),
  issue_for_customer: z.string(),
  ui: z.object(Object.fromEntries(Object.keys(UI_EN).map((k) => [k, z.string()])) as Record<UiKey, z.ZodString>),
  sms_template: z.string(),
});

// Shop pricing the estimate is based on (would be per-shop settings in production).
export const SHOP_PRICING = { serviceCall: 89, laborPerHour: 140 };

const DIAG_SYSTEM = `You are a senior appliance repair diagnostician working for an independent repair shop in San Diego.
You look at one customer photo (the appliance, a fault display, or the model/serial sticker) plus the customer's short note, and produce a field diagnosis a dispatcher can act on.

Rules:
- brand: read it from the logo or sticker. If not visible, infer from design cues and say so via lower confidence. Use "Unknown" only if you truly cannot tell.
- model: the exact model number if legible on a sticker or display, otherwise null. Never invent one.
- appliance_type: one lowercase word or two, e.g. "refrigerator", "washer", "dryer", "dishwasher", "range", "oven", "freezer", "microwave".
- likely_issue: the most probable failing component or system, specific and short, max 5 words, no parentheses (e.g. "defrost system issue", "failed drain pump"). It is inserted into a customer SMS as "likely <issue>".
- urgency: emergency = gas smell, sparks, active flooding; high = food spoilage risk or no heat/cooling; medium = degraded but usable; low = cosmetic/noise.
- confidence: 0 to 1, your honest probability that likely_issue is right. Classic symptom patterns (e.g. fridge warm but freezer cold, washer won't drain with an OE code, dryer tumbles but no heat) justify 0.65–0.85; vague notes like "broken" stay low.
- summary: one friendly sentence for the customer explaining what is probably wrong, max 25 words.
- parts_to_bring: 1–3 specific replacement parts the tech should load on the truck so the job is fixed on the first visit (e.g. "defrost heater", "defrost thermostat", "evaporator fan motor"). Use the brand and model when known.
- first_checks: 2–3 short checks the tech should do first on arrival, max 8 words each.
- est_minutes: realistic on-site repair time in minutes if the likely issue is right.
- est_price_low / est_price_high: realistic total the customer would pay in USD for this repair, including the shop's $${SHOP_PRICING.serviceCall} service call, labor at $${SHOP_PRICING.laborPerHour}/hour for est_minutes, and typical retail price of the parts. Keep the range honest and reasonably tight (high is usually 1.3–1.8x low).
- urgency "emergency" ONLY for real safety risks: gas smell, burning smell, smoke, sparks, exposed wiring, or water actively flooding.
- safety_steps: if urgency is "emergency", 2–3 short, plain instructions the customer should do RIGHT NOW (e.g. leave the house and call your gas company or 911 from outside; shut off the water valve; unplug only if safe or flip the breaker). Never include phone numbers other than 911. Otherwise an empty array.

Language (the customer may write in ANY language):
- language: ISO 639-1 code of the language the customer wrote their note in. If the note is empty or too short to tell, use the phone language hint, else "en".
- language_name: that language's name in itself (e.g. "English", "Español", "한국어", "Tiếng Việt").
- issue_for_customer: likely_issue phrased for the customer in their language, max 6 words (identical to likely_issue for English).
- ui: if language is "en", return every value as an empty string. Otherwise translate each of these English screen labels into the customer's language, keeping {placeholders} exactly as written:
${JSON.stringify(UI_EN)}
- sms_template: if language is "en", return an empty string. Otherwise translate this confirmation text into the customer's language, keeping every {placeholder} exactly as written:
"${SMS_EN}"
- Write summary, issue_for_customer, safety_steps, ui and sms_template in the customer's language. Write everything else (brand, likely_issue, parts_to_bring, first_checks) in English: it is for the shop.`;

export async function diagnose(input: {
  note: string;
  photo?: { mediaType: string; base64: string };
  appliance?: string;
  brand?: string;
  lang?: string;
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
  const lines = [`Customer note: "${input.note || "(no note)"}"`];
  if (input.appliance && input.appliance !== "other") lines.push(`Customer says the appliance is: ${input.appliance}`);
  if (input.brand) lines.push(`Customer says the brand is: ${input.brand}`);
  if (input.appliance || input.brand) {
    lines.push("Use the customer's appliance/brand when the photo doesn't show it. If the photo clearly shows something different, trust the photo.");
  }
  if (input.lang) lines.push(`Phone language hint: ${input.lang}`);
  if (!input.photo) lines.push("(No photo was provided — diagnose from the text alone and lower confidence.)");
  content.push({ type: "text", text: lines.join("\n") });

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
      parts_to_bring: out.parts_to_bring.map(clean).filter(Boolean).slice(0, 3),
      first_checks: out.first_checks.map(clean).filter(Boolean).slice(0, 3),
      est_minutes: Math.max(15, Math.min(480, Math.round(out.est_minutes || 60))),
      ...priceRange(out.est_price_low, out.est_price_high),
      safety_steps: out.urgency === "emergency" ? out.safety_steps.map(clean).filter(Boolean).slice(0, 3) : [],
      issue_for_customer: clean(out.issue_for_customer) || clean(out.likely_issue),
      language: (out.language || "en").toLowerCase().slice(0, 5),
      ui: safeUi(out.ui),
      sms_template: safeTemplate(out.sms_template),
      confidence: Math.max(0, Math.min(1, out.confidence)),
      source: "ai",
    };
  }
  return fallbackDiagnosis([input.note, input.appliance, input.brand].filter(Boolean).join(" "), input.lang);
}

// A translated label is only used if it kept its {placeholders}; otherwise fall back to English.
function placeholders(s: string) {
  return (s.match(/\{\w+\}/g) ?? []).sort().join();
}
function safeUi(ui: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, en] of Object.entries(UI_EN)) {
    const t = (ui?.[k] ?? "").trim();
    out[k] = t && placeholders(t) === placeholders(en) ? t : en;
  }
  return out;
}
function safeTemplate(t: string) {
  const s = (t ?? "").trim();
  return s && ["{name}", "{tech}", "{window}"].every((p) => s.includes(p)) ? s : SMS_EN;
}

// Round to $10 and keep the range sane even if the model returns odd numbers.
function priceRange(low: number, high: number) {
  const r = (n: number) => Math.round(n / 10) * 10;
  const lo = Math.max(SHOP_PRICING.serviceCall, r(Math.min(low, high) || 0));
  const hi = Math.max(lo + 40, r(Math.max(low, high) || 0));
  return { est_price_low: lo, est_price_high: hi };
}

// Used only when the AI is unavailable: keyword-based, English.
function fallbackDiagnosis(note: string, _lang?: string): Diagnosis {
  const n = note.toLowerCase();
  const danger = /\bgas\b|smoke|spark|burning|fire|flood/.test(n);
  const brands = ["Samsung", "LG", "Whirlpool", "GE", "Sub-Zero", "Maytag", "KitchenAid", "Bosch", "Frigidaire", "Wolf", "Viking"];
  const brand = brands.find((b) => n.includes(b.toLowerCase())) ?? "Unknown";
  // [match, type, likely issue, parts to bring]; dishwasher must come before washer.
  const types: [RegExp, string, string, string[]][] = [
    [/fridge|refrigerator|freezer|cool|cold|ice/, "refrigerator", "cooling system fault", ["evaporator fan motor", "defrost heater", "defrost thermostat"]],
    [/dishwasher|dishes/, "dishwasher", "drain or wash pump fault", ["drain pump", "wash pump"]],
    [/washer|washing|spin|drain/, "washer", "drain pump or drive fault", ["drain pump", "lid switch"]],
    [/dryer|dry|heat/, "dryer", "heating element or thermal fuse failure", ["heating element", "thermal fuse"]],
    [/oven|range|stove|burner/, "range", "igniter or heating element failure", ["oven igniter", "bake element"]],
  ];
  const hit = types.find(([re]) => re.test(n));
  return {
    brand,
    model: null,
    appliance_type: hit?.[1] ?? "appliance",
    likely_issue: hit?.[2] ?? "needs on-site inspection",
    urgency: danger ? "emergency" : hit?.[1] === "refrigerator" ? "high" : "medium",
    confidence: 0.4,
    summary: "Based on your description, a technician will confirm the exact fault on site.",
    parts_to_bring: hit?.[3] ?? [],
    first_checks: ["Confirm the symptom with the customer", "Check power and error codes"],
    est_minutes: 60,
    est_price_low: 180,
    est_price_high: 350,
    safety_steps: danger
      ? ["Leave the house if you smell gas", "Call the gas company or 911 from outside", "Don't switch lights or appliances on or off"]
      : [],
    language: "en",
    language_name: "English",
    issue_for_customer: hit?.[2] ?? "needs on-site inspection",
    ui: { ...UI_EN },
    sms_template: SMS_EN,
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
