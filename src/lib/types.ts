export type Urgency = "low" | "medium" | "high" | "emergency";

export interface Diagnosis {
  brand: string;
  model: string | null;
  appliance_type: string;
  likely_issue: string;
  urgency: Urgency;
  confidence: number; // 0..1
  summary: string;
  parts_to_bring: string[]; // likely replacement parts, so the tech can fix it on the first visit
  first_checks: string[]; // what the tech should test first on arrival
  est_minutes: number; // rough on-site repair time
  est_price_low: number; // USD, total to customer incl. service call, labor, parts
  est_price_high: number;
  safety_steps: string[]; // only for emergencies, in the customer's language
  language: string; // customer's language, ISO 639-1 (en, es, ko, vi, zh, tl, ...)
  language_name: string; // e.g. "Español", shown on the board
  issue_for_customer: string; // likely_issue in the customer's language (used in SMS + phone)
  ui: Record<string, string>; // customer-screen labels in their language
  sms_template: string; // confirmation SMS in their language with {name} {tech} {window} {appliance} {issue} {price}
  source: "ai" | "fallback";
}

export interface Tech {
  id: string;
  name: string;
  phone: string;
  brands: string[];
  certified: string[];
  appliance_types: string[];
  zone: string;
  areas: string[]; // neighborhoods + zips covered
  windows: string[]; // open windows (booked ones are removed)
  allWindows?: string[]; // original schedule, restored on reset
  color: string;
}

export interface Assignment {
  tech_id: string;
  tech_name: string;
  window: string;
  reason: string;
  source: "ai" | "fallback";
}

export interface SmsResult {
  status: "sent" | "preview" | "failed";
  to: string;
  body: string;
  error?: string;
  sid?: string;
}

export interface Company {
  slug: string; // used in URLs: /c/<slug>/upload
  name: string; // shown to customers and in the SMS
  phone: string;
  serviceArea: string;
  pricing: { serviceCall: number; laborPerHour: number };
  plan: "starter" | "pro";
  techs: Tech[];
  rules: string;
  createdAt: number;
}

export type JobStatus = "diagnosing" | "dispatching" | "awaiting_customer" | "assigned" | "error";

export interface Job {
  id: string;
  company: string; // company slug
  createdAt: number;
  customer: { name: string; phone: string; address: string };
  note: string;
  applianceHint?: string; // what the customer tapped
  brandHint?: string; // what the customer typed
  hasPhoto: boolean;
  status: JobStatus;
  diagnosis?: Diagnosis;
  diagnosedMs?: number;
  assignment?: Assignment;
  options?: Assignment[]; // time slots offered to the customer; options[0] = AI recommendation
  callbackRequested?: boolean;
  bookedAt?: number;
  langHint?: string; // phone's browser language
  sms?: SmsResult;
  rulesApplied?: string;
}
