// English customer-screen labels. The AI translates these into the customer's language.
export const UI_EN = {
  diagnosis: "AI diagnosis",
  likely_issue: "Likely issue",
  confident: "confident",
  urgency: "urgency",
  estimate: "Estimated repair cost",
  estimate_note: "Includes service call, labor and parts. Confirmed on site.",
  safety_title: "Do this right now",
  pick_time: "Pick a time for your repair",
  recommended: "Recommended",
  with_tech: "with {tech}",
  request_call: "Rather talk to a person? Request a call",
  call_requested: "Got it. A team member will call you shortly.",
  finding_tech: "Finding the best technician and times…",
  booked: "Booked: {tech}, {window}",
  bringing_parts: "Bringing likely parts ({parts}) to fix it in one visit",
  text_sent: "Confirmation text sent to your phone",
  text_pending: "Texting you a confirmation…",
} as const;

export type UiKey = keyof typeof UI_EN;

export const SMS_EN =
  "Hi {name}, you're booked! {tech} from NewShift will arrive {window} for your {appliance} (likely {issue}).{price} Reply C to confirm.";

export function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
