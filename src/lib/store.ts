import type { Job, Tech } from "./types";
import { seedTechs } from "./techs";

// In-memory store, pinned to globalThis so it survives dev hot-reloads.
interface Store {
  jobs: Job[];
  photos: Map<string, { mediaType: string; data: Buffer }>;
  techs: Tech[];
  rules: string;
}

const g = globalThis as unknown as { __nsStore?: Store };

export function store(): Store {
  if (!g.__nsStore) {
    g.__nsStore = { jobs: [], photos: new Map(), techs: seedTechs(), rules: "" };
  }
  return g.__nsStore;
}

export function resetStore() {
  g.__nsStore = { jobs: [], photos: new Map(), techs: seedTechs(), rules: "" };
}

export function getJob(id: string) {
  return store().jobs.find((j) => j.id === id);
}

export function updateJob(id: string, patch: Partial<Job>) {
  const job = getJob(id);
  if (job) Object.assign(job, patch);
  return job;
}
