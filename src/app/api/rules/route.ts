import { NextResponse } from "next/server";
import { canAccess } from "@/lib/auth";
import { getCompany, saveCompanies } from "@/lib/store";

export const dynamic = "force-dynamic";

async function authed(req: Request) {
  const company = getCompany(new URL(req.url).searchParams.get("c"));
  if (!company) return { error: NextResponse.json({ error: "Company not found" }, { status: 404 }) };
  if (!(await canAccess(company.slug))) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  return { company };
}

export async function GET(req: Request) {
  const { company, error } = await authed(req);
  if (error) return error;
  return NextResponse.json({ rules: company.rules });
}

export async function POST(req: Request) {
  const { company, error } = await authed(req);
  if (error) return error;
  const { rules } = (await req.json().catch(() => ({}))) as { rules?: string };
  company.rules = (rules ?? "").slice(0, 4000);
  saveCompanies();
  return NextResponse.json({ rules: company.rules });
}
