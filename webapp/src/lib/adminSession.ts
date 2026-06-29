import crypto from "crypto";
import type { NextRequest } from "next/server";

export const COOKIE_NAME = "admin_session";
const TOKEN = "admin";

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "dev-secret-change-in-production";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function createSessionValue(): string {
  return `${TOKEN}.${sign(TOKEN)}`;
}

export function verifySessionValue(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const dotIdx = cookieValue.lastIndexOf(".");
  if (dotIdx === -1) return false;
  const value = cookieValue.slice(0, dotIdx);
  const sig   = cookieValue.slice(dotIdx + 1);
  try {
    const expected = sign(value);
    const expBuf   = Buffer.from(expected, "hex");
    const sigBuf   = Buffer.from(sig, "hex");
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}

export function isAdminRequest(req: NextRequest): boolean {
  return verifySessionValue(req.cookies.get(COOKIE_NAME)?.value);
}
