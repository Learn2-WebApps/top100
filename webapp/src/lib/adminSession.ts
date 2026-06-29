import crypto from "crypto";
import type { NextRequest } from "next/server";

export const COOKIE_NAME = "admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24; // 24 hours

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "dev-secret-change-in-production";
}

function toBase64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signPayload(payload: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createSessionValue(): string {
  const now     = Math.floor(Date.now() / 1000);
  const payload = toBase64url(
    JSON.stringify({ role: "admin", iat: now, exp: now + SESSION_DURATION_SECONDS })
  );
  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionValue(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  const dotIdx = cookieValue.lastIndexOf(".");
  if (dotIdx === -1) return false;

  const payload = cookieValue.slice(0, dotIdx);
  const sig     = cookieValue.slice(dotIdx + 1);

  try {
    // Timing-safe signature verification
    const expected = signPayload(payload);
    const expBuf   = Buffer.from(expected);
    const sigBuf   = Buffer.from(sig);
    if (expBuf.length !== sigBuf.length) return false;
    if (!crypto.timingSafeEqual(expBuf, sigBuf)) return false;

    // Decode payload and check role + expiry
    const json    = Buffer.from(payload, "base64url").toString("utf8");
    const decoded = JSON.parse(json) as { role?: string; exp?: number };
    if (decoded.role !== "admin") return false;
    if (!decoded.exp || Math.floor(Date.now() / 1000) > decoded.exp) return false;

    return true;
  } catch {
    return false;
  }
}

export function isAdminRequest(req: NextRequest): boolean {
  return verifySessionValue(req.cookies.get(COOKIE_NAME)?.value);
}
