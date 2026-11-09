export type Urgency = "low" | "medium" | "high" | "emergency";

export interface Diagnosis {
  brand: string;
  model: string | null;
  appliance_type: string;
  likely_issue: string;
  urgency: Urgency;
  confidence: number; // 0..1
  summary: string;
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
  windows: string[]; // open windows today/tomorrow
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

export type JobStatus = "diagnosing" | "dispatching" | "awaiting_customer" | "assigned" | "error";

export interface Job {
  id: string;
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
  sms?: SmsResult;
  rulesApplied?: string;
}
