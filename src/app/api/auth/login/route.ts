import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_COOKIE, adminPasswordOk, cookieOptions, makeToken, verifyPassword } from "@/lib/auth";
import { store } from "@/lib/store";

// POST /api/auth/login  { email, password }  or  { admin: true, password }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; admin?: boolean };
  const password = body.password ?? "";

  if (body.admin) {
    if (!adminPasswordOk(password)) return NextResponse.json({ error: "Wrong admin password" }, { status: 401 });
    const res = NextResponse.json({ redirect: "/" });
    res.cookies.set(ADMIN_COOKIE, makeToken("admin"), cookieOptions);
    return res;
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const company = [...store().companies.values()].find((c) => c.email && c.email === email);
  // Same message whether the email or the password is wrong.
  if (!company || !verifyPassword(password, company.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
  }
  const res = NextResponse.json({ redirect: `/c/${company.slug}/board` });
  res.cookies.set(SESSION_COOKIE, makeToken(company.slug), cookieOptions);
  return res;
}
