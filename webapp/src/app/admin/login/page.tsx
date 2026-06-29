"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BG = "radial-gradient(ellipse at 60% -10%, #E0E7FF 0%, #F5F7FA 50%, #EFF6FF 100%)";

export default function AdminLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;

    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/admin/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "로그인 중 오류가 발생했습니다.");
        return;
      }

      router.replace("/admin");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>

      {/* Back to home */}
      <div style={{ width: "100%", maxWidth: "420px", marginBottom: "12px" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "14px", fontWeight: 500, color: "#64748B",
            textDecoration: "none", padding: "6px 0",
          }}
        >
          ← 홈으로
        </Link>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "420px",
        background: "rgba(255,255,255,0.88)",
        border: "1px solid rgba(15,23,42,0.06)",
        borderRadius: "28px",
        boxShadow: "0 24px 80px rgba(15,23,42,0.10)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        padding: "44px 40px",
      }}>

        <div style={{ marginBottom: "32px" }}>
          <span style={{
            display: "inline-block",
            fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#2563EB",
            background: "rgba(37,99,235,0.08)",
            padding: "3px 10px", borderRadius: "9999px",
            marginBottom: "14px",
          }}>
            ADMIN
          </span>
          <h1 style={{
            fontSize: "24px", fontWeight: 800,
            letterSpacing: "-0.03em", color: "#0F172A",
            marginBottom: "6px",
          }}>
            관리자 로그인
          </h1>
          <p style={{ fontSize: "14px", color: "#94A3B8" }}>
            관리자 비밀번호를 입력해주세요.
          </p>
        </div>

        {error && (
          <div style={{
            background: "#FEF2F2",
            border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#DC2626",
            fontSize: "13px",
            marginBottom: "20px",
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{
              display: "block", fontSize: "13px", fontWeight: 500,
              color: "#475569", marginBottom: "6px",
            }}>
              비밀번호
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              style={{
                width: "100%",
                minHeight: "50px",
                padding: "0 16px",
                border: "1.5px solid rgba(15,23,42,0.12)",
                borderRadius: "12px",
                fontSize: "16px",
                color: "#0F172A",
                outline: "none",
                background: "white",
                fontFamily: "inherit",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
              onBlur={e  => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          <button
            type="submit"
            className="button-primary"
            disabled={busy}
            style={{ width: "100%", minHeight: "54px", marginTop: "4px", fontSize: "16px", borderRadius: "13px" }}
          >
            {busy ? "확인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
