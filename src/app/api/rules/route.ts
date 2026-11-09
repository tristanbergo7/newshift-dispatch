import { NextResponse } from "next/server";
import { getCompany, saveCompanies } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const company = getCompany(new URL(req.url).searchParams.get("c"));
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json({ rules: company.rules });
}

export async function POST(req: Request) {
  const company = getCompany(new URL(req.url).searchParams.get("c"));
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  const { rules } = (await req.json().catch(() => ({}))) as { rules?: string };
  company.rules = (rules ?? "").slice(0, 4000);
  saveCompanies();
  return NextResponse.json({ rules: company.rules });
}
