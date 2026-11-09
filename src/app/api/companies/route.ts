import { NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, hashPassword, makeToken } from "@/lib/auth";
import { saveCompanies, store } from "@/lib/store";
import type { Company, Tech } from "@/lib/types";

const COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#fb923c", "#60a5fa", "#4ade80"];

interface TechInput {
  name?: string;
  phone?: string;
  brands?: string[];
  certified?: string[];
  appliance_types?: string[];
  areas?: string[];
  windows?: string[];
}

const list = (v: unknown, max = 30) =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : [];

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "shop"
  );
}

// POST /api/companies: create a company from the setup wizard.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    serviceArea?: string;
    serviceCall?: number;
    laborPerHour?: number;
    plan?: string;
    rules?: string;
    techs?: TechInput[];
  } | null;
  const name = (body?.name ?? "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  const email = (body?.email ?? "").trim().toLowerCase().slice(0, 120);
  const password = body?.password ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  if ([...store().companies.values()].some((c) => c.email === email)) {
    return NextResponse.json({ error: "That email already has an account. Sign in instead." }, { status: 409 });
  }

  const techs: Tech[] = (body?.techs ?? [])
    .filter((t) => (t.name ?? "").trim())
    .slice(0, 25)
    .map((t, i) => {
      const windows = list(t.windows, 12);
      const brands = list(t.brands);
      return {
        id: `t${i + 1}`,
        name: (t.name ?? "").trim().slice(0, 60),
        phone: (t.phone ?? "").trim().slice(0, 30),
        brands,
        certified: list(t.certified).filter((b) => brands.includes(b)),
        appliance_types: list(t.appliance_types),
        zone: list(t.areas)[0] ?? "",
        areas: list(t.areas),
        windows,
        allWindows: [...windows],
        color: COLORS[i % COLORS.length],
      };
    });
  if (!techs.length) return NextResponse.json({ error: "Add at least one technician" }, { status: 400 });

  const s = store();
  let slug = slugify(name);
  for (let n = 2; s.companies.has(slug); n++) slug = `${slugify(name)}-${n}`;

  const num = (v: unknown, def: number, lo: number, hi: number) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= lo && x <= hi ? Math.round(x) : def;
  };
  const company: Company = {
    slug,
    name,
    phone: (body?.phone ?? "").trim().slice(0, 30),
    serviceArea: (body?.serviceArea ?? "").trim().slice(0, 80),
    pricing: { serviceCall: num(body?.serviceCall, 89, 0, 1000), laborPerHour: num(body?.laborPerHour, 120, 0, 1000) },
    plan: body?.plan === "starter" ? "starter" : "pro",
    techs,
    rules: (body?.rules ?? "").slice(0, 4000),
    createdAt: Date.now(),
    email,
    passwordHash: hashPassword(password),
  };
  s.companies.set(slug, company);
  saveCompanies();
  // Signed in right away, so "Open my dashboard" works.
  const res = NextResponse.json({ slug });
  res.cookies.set(SESSION_COOKIE, makeToken(slug), cookieOptions);
  return res;
}
