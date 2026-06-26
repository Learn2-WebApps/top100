"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential":      "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/user-not-found":          "등록되지 않은 이메일입니다.",
  "auth/wrong-password":          "비밀번호가 올바르지 않습니다.",
  "auth/invalid-email":           "이메일 형식이 올바르지 않습니다.",
  "auth/user-disabled":           "비활성화된 계정입니다.",
  "auth/too-many-requests":       "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.",
  "auth/network-request-failed":  "네트워크 오류가 발생했습니다.",
  "auth/configuration-not-found": "Firebase 설정이 완료되지 않았습니다. 환경변수를 확인하세요.",
};

export default function AdminLoginPage() {
  const { user, loading } = useAdminAuth();
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/admin");
  }, [user, loading, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setBusy(true);

    try {
      await signInWithEmailAndPassword(getClientAuth(), email.trim(), password);
      router.replace("/admin");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(FIREBASE_ERROR_MESSAGES[code] ?? "로그인 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-canvas-parchment)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <p style={{
          fontSize: "12px", fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--color-ink-muted-48)", marginBottom: "8px",
        }}>
          Admin
        </p>
        <h1 style={{
          fontSize: "26px", fontWeight: 700,
          letterSpacing: "-0.02em", color: "var(--color-ink)",
        }}>
          웰컴데이 챌린지 관리자
        </h1>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "400px",
        background: "var(--color-canvas)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-card)",
        padding: "36px 32px",
      }}>

        {error && (
          <div style={{
            background: "#fff1f2",
            border: "1px solid #fca5a5",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            color: "var(--color-red)",
            fontSize: "14px",
            marginBottom: "20px",
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{
              display: "block", fontSize: "13px", fontWeight: 500,
              color: "var(--color-ink-muted-48)", marginBottom: "6px",
            }}>
              이메일
            </label>
            <input
              className="input"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label style={{
              display: "block", fontSize: "13px", fontWeight: 500,
              color: "var(--color-ink-muted-48)", marginBottom: "6px",
            }}>
              비밀번호
            </label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="button-primary"
            disabled={busy}
            style={{ width: "100%", marginTop: "4px" }}
          >
            {busy ? "로그인 중…" : "관리자 로그인"}
          </button>
        </form>
      </div>

      <p style={{
        marginTop: "24px", fontSize: "13px",
        color: "var(--color-ink-muted-48)", textAlign: "center",
      }}>
        계정 문의: Firebase 콘솔에서 관리자 계정을 생성하세요.
      </p>
    </div>
  );
}
