import { dispatch, fallbackDispatch } from "./ai";
import { sendSms } from "./sms";
import { getJob, store, updateJob } from "./store";
import type { Assignment, Job } from "./types";

const MAX_OPTIONS = 3;

// AI picks the best tech; we turn that into up to 3 time slots for the customer.
export async function runDispatch(id: string) {
  const job = getJob(id);
  if (!job) return;
  const s = store();
  try {
    const rules = s.rules;
    const best = await dispatch(job, s.techs, rules);
    updateJob(id, {
      options: buildOptions(job, best, rules),
      status: "awaiting_customer",
      rulesApplied: rules || undefined,
    });
  } catch (e) {
    console.error("[dispatch] failed", e);
    updateJob(id, { status: "error" });
  }
}

function buildOptions(job: Job, best: Assignment, rules: string): Assignment[] {
  const techs = store().techs;
  const opts: Assignment[] = [best];
  const bestTech = techs.find((t) => t.id === best.tech_id);
  for (const w of bestTech?.windows ?? []) {
    if (opts.length >= MAX_OPTIONS) break;
    if (w !== best.window) opts.push({ ...best, window: w, reason: swapWindow(best.reason, best.window, w) });
  }
  // With an active rule the AI's tech choice is a hard constraint, so don't offer other techs.
  if (opts.length < MAX_OPTIONS && !rules.trim()) {
    const others = techs.filter((t) => t.id !== best.tech_id && t.windows.length > 0);
    if (others.length) opts.push(fallbackDispatch(job, others));
  }
  return opts;
}

function swapWindow(reason: string, from: string, to: string) {
  return reason.includes(from) ? reason.replace(from, to) : reason;
}

export type BookResult = { ok: true } | { ok: false; error: string; status: number };

export function bookJob(id: string, optionIndex: number): BookResult {
  const job = getJob(id);
  if (!job) return { ok: false, error: "Job not found", status: 404 };
  if (job.status === "assigned") return { ok: true }; // double tap
  const choice = job.options?.[optionIndex];
  if (!choice) return { ok: false, error: "Invalid option", status: 400 };

  // Synchronous check-and-book, so two customers can't take the same slot.
  const tech = store().techs.find((t) => t.id === choice.tech_id);
  if (!tech || !tech.windows.includes(choice.window)) {
    return { ok: false, error: "That time was just taken. Please pick another.", status: 409 };
  }
  tech.windows = tech.windows.filter((w) => w !== choice.window);
  updateJob(id, { assignment: choice, status: "assigned", callbackRequested: false });
  void sendConfirmation(id);
  return { ok: true };
}

async function sendConfirmation(id: string) {
  const job = getJob(id);
  if (!job?.assignment || !job.diagnosis) return;
  const a = job.assignment;
  const d = job.diagnosis;
  const first = job.customer.name.split(" ")[0];
  const techFirst = a.tech_name.split(" ")[0];
  const brand = d.brand && d.brand !== "Unknown" ? `${d.brand} ` : "";
  const appliance = d.appliance_type === "refrigerator" ? "fridge" : d.appliance_type;
  const body = `Hi ${first}, you're booked! ${techFirst} from NewShift will arrive ${a.window} for your ${brand}${appliance} (likely ${d.likely_issue}). Reply C to confirm.`;
  const sms = job.customer.phone
    ? await sendSms(job.customer.phone, body)
    : { status: "preview" as const, to: "", body, error: "No phone number" };
  updateJob(id, { sms });
}

export function requestCallback(id: string): BookResult {
  const job = getJob(id);
  if (!job) return { ok: false, error: "Job not found", status: 404 };
  updateJob(id, { callbackRequested: true });
  return { ok: true };
}
