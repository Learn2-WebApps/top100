"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { QuestionsData, Participant } from "@/types";
import ChallengeForm from "./ChallengeForm";

const STORAGE_KEY = "wdc_participant";

const BG = "radial-gradient(ellipse at 60% -10%, #E0E7FF 0%, #F5F7FA 50%, #EFF6FF 100%)";

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(15,23,42,0.06)",
  borderRadius: "28px",
  boxShadow: "0 24px 80px rgba(15,23,42,0.10)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const INPUT_STYLE: React.CSSProperties = {
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
  transition: "border-color 0.15s, box-shadow 0.15s",
};

// ── Landing ───────────────────────────────────────────────────────────────────

function LandingView({ onStart }: { onStart: () => void }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: BG,
    }}>
      <div style={{ ...CARD_STYLE, width: "100%", maxWidth: "460px", padding: "52px 44px", textAlign: "center" }}>

        <span style={{
          display: "inline-block",
          fontSize: "11px", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "#2563EB",
          background: "rgba(37,99,235,0.08)",
          padding: "4px 12px", borderRadius: "9999px",
          marginBottom: "24px",
        }}>
          업무 정보 분석 미션
        </span>

        <h1 style={{
          fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 800,
          letterSpacing: "-0.04em", lineHeight: 1.1,
          color: "#0F172A", marginBottom: "14px",
        }}>
          인수인계 없는 첫 출근
        </h1>

        <p style={{
          fontSize: "15px", color: "#64748B",
          lineHeight: 1.7, marginBottom: "40px",
        }}>
          흩어진 자료 속에서 핵심 정보를 찾아<br />업무 상황을 파악하는 실전 미션입니다.
        </p>

        <button
          onClick={onStart}
          className="button-primary"
          style={{ width: "100%", minHeight: "56px", fontSize: "17px", borderRadius: "14px", marginBottom: "10px" }}
        >
          진단 시작하기
        </button>

        <Link
          href="/admin/login"
          style={{
            display: "block",
            fontSize: "13px", color: "#94A3B8",
            textDecoration: "none", padding: "10px",
            transition: "color 0.15s",
          }}
        >
          관리자 모드
        </Link>
      </div>
    </div>
  );
}

// ── Entry Form ────────────────────────────────────────────────────────────────

function EntryView({
  onBack,
  onEntered,
}: {
  onBack: () => void;
  onEntered: (p: Participant) => void;
}) {
  const [name,       setName]       = useState("");
  const [department, setDepartment] = useState("");
  const [code,       setCode]       = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!/^\d{4}$/.test(code)) { setError("입장코드는 숫자 4자리입니다."); return; }

    setError(null);
    setLoading(true);
    try {
      const res  = await fetch("/api/enter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), department: department.trim(), code }),
      });
      const data = await res.json() as Record<string, string>;
      if (!res.ok) { setError(data.error ?? "입장 실패. 다시 시도해주세요."); return; }
      onEntered(data as unknown as Participant);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: BG,
    }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>

        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer",
            color: "#64748B", fontSize: "14px", fontWeight: 500,
            marginBottom: "16px", padding: "0", fontFamily: "inherit",
          }}
        >
          ← 홈으로
        </button>

        <div style={{ ...CARD_STYLE, padding: "40px 36px" }}>
          <h2 style={{
            fontSize: "22px", fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: "6px", color: "#0F172A",
          }}>
            진단 입장
          </h2>
          <p style={{ fontSize: "14px", color: "#94A3B8", marginBottom: "28px" }}>
            진행자에게 받은 4자리 입장코드를 입력하세요.
          </p>

          {error && (
            <div style={{
              background: "#FEF2F2",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#DC2626", fontSize: "13px", marginBottom: "18px",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#475569", marginBottom: "6px" }}>
                이름 *
              </label>
              <input
                type="text" placeholder="홍길동"
                value={name} onChange={e => setName(e.target.value)}
                autoComplete="name"
                style={INPUT_STYLE}
                onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#475569", marginBottom: "6px" }}>
                소속 부서 <span style={{ fontWeight: 400, color: "#94A3B8" }}>(선택)</span>
              </label>
              <input
                type="text" placeholder="마케팅팀"
                value={department} onChange={e => setDepartment(e.target.value)}
                style={INPUT_STYLE}
                onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#475569", marginBottom: "6px" }}>
                입장코드 *
              </label>
              <input
                type="text" inputMode="numeric" maxLength={4}
                placeholder="0000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={{ ...INPUT_STYLE, fontSize: "28px", fontWeight: 700, letterSpacing: "0.3em", textAlign: "center" }}
                onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <button
              type="submit"
              className="button-primary"
              disabled={loading}
              style={{ width: "100%", minHeight: "54px", marginTop: "4px", borderRadius: "13px", fontSize: "16px" }}
            >
              {loading ? "확인 중…" : "입장하기"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function ChallengeApp({ data }: { data: QuestionsData }) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [showEntry,   setShowEntry]   = useState(false);
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setParticipant(JSON.parse(stored) as Participant);
    } catch {}
    setMounted(true);
  }, []);

  function handleEntered(p: Participant) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setParticipant(p);
    setShowEntry(false);
  }

  if (!mounted) return null;

  if (participant) return <ChallengeForm data={data} participant={participant} />;
  if (showEntry)  return <EntryView onBack={() => setShowEntry(false)} onEntered={handleEntered} />;
  return <LandingView onStart={() => setShowEntry(true)} />;
}
