import fs from "fs";
import path from "path";
import type { Company, Job } from "./types";
import { seedTechs } from "./techs";

export const DEMO_SLUG = "demo";

// In-memory store, pinned to globalThis so it survives dev hot-reloads.
// Companies are also saved to data/companies.json so sign-ups survive a restart.
interface Store {
  jobs: Job[];
  photos: Map<string, { mediaType: string; data: Buffer }>;
  companies: Map<string, Company>;
}

const DATA_FILE = path.join(process.cwd(), "data", "companies.json");
const g = globalThis as unknown as { __nsStore?: Store };

function demoCompany(): Company {
  return {
    slug: DEMO_SLUG,
    name: "NewShift Repair",
    phone: "",
    serviceArea: "San Diego",
    pricing: { serviceCall: 89, laborPerHour: 140 },
    plan: "pro",
    techs: seedTechs(),
    rules: "",
    createdAt: 0,
  };
}

function loadCompanies(): Map<string, Company> {
  const map = new Map<string, Company>();
  map.set(DEMO_SLUG, demoCompany());
  try {
    const saved: Company[] = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    for (const c of saved) if (c.slug !== DEMO_SLUG) map.set(c.slug, c);
  } catch {}
  return map;
}

export function saveCompanies() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const list = [...store().companies.values()].filter((c) => c.slug !== DEMO_SLUG);
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  } catch (e) {
    console.warn("[store] could not save companies", e);
  }
}

export function store(): Store {
  if (!g.__nsStore) {
    g.__nsStore = { jobs: [], photos: new Map(), companies: loadCompanies() };
  }
  return g.__nsStore;
}

export function getCompany(slug: string | null | undefined): Company | undefined {
  return store().companies.get((slug || DEMO_SLUG).toLowerCase());
}

// Reset one company's board: clear its jobs, reopen tech slots, clear rules.
export function resetCompany(slug: string) {
  const s = store();
  const company = getCompany(slug);
  if (!company) return;
  for (const j of s.jobs.filter((j) => j.company === company.slug)) s.photos.delete(j.id);
  s.jobs = s.jobs.filter((j) => j.company !== company.slug);
  company.rules = "";
  if (company.slug === DEMO_SLUG) company.techs = seedTechs();
  else company.techs.forEach((t) => (t.windows = [...(t.allWindows ?? t.windows)]));
}

export function getJob(id: string) {
  return store().jobs.find((j) => j.id === id);
}

export function updateJob(id: string, patch: Partial<Job>) {
  const job = getJob(id);
  if (job) Object.assign(job, patch);
  return job;
}
