import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { DEMO_SLUG } from "./store";

export const SESSION_COOKIE = "ns_session"; // a shop's login
export const ADMIN_COOKIE = "ns_admin"; // NewShift owner login
const SESSION_DAYS = 7;

/* ---------- passwords (scrypt, salted) ---------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = crypto.scryptSync(password, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- signed session tokens ---------- */

// Secret from AUTH_SECRET, else generated once and kept in data/ (gitignored).
function secret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const g = globalThis as unknown as { __nsSecret?: string };
  if (g.__nsSecret) return g.__nsSecret;
  const file = path.join(process.cwd(), "data", "auth-secret.txt");
  try {
    g.__nsSecret = fs.readFileSync(file, "utf8").trim();
  } catch {
    g.__nsSecret = crypto.randomBytes(32).toString("hex");
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, g.__nsSecret);
    } catch {}
  }
  return g.__nsSecret!;
}

const sign = (data: string) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function makeToken(subject: string): string {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const data = `${subject}.${exp}`;
  return `${data}.${sign(data)}`;
}

export function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const data = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = sign(data);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const j = data.lastIndexOf(".");
  const subject = data.slice(0, j);
  const exp = Number(data.slice(j + 1));
  return exp > Date.now() ? subject : null;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 86400,
};

/* ---------- who is signed in ---------- */

export async function currentSession() {
  const jar = await cookies();
  const shop = readToken(jar.get(SESSION_COOKIE)?.value);
  const admin = readToken(jar.get(ADMIN_COOKIE)?.value) === "admin";
  return { shop, admin };
}

// The demo shop is open to everyone; other shops need their own login (or the admin).
export async function canAccess(slug: string): Promise<boolean> {
  if (slug === DEMO_SLUG) return true;
  const { shop, admin } = await currentSession();
  return admin || shop === slug;
}

export function adminPasswordOk(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
