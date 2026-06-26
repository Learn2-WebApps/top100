"use client";

import { useState, useEffect } from "react";
import type { QuestionsData, Participant } from "@/types";
import ChallengeForm from "./ChallengeForm";

const STORAGE_KEY = "wdc_participant";

// ── Sticky Bar ────────────────────────────────────────────────────────────────

function StickyBar({ participant }: { participant: Participant | null }) {
  return (
    <header className="sticky-bar">
      <div className="sticky-bar-inner">
        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.01em" }}>
          넥스트웨이브 코리아 · 웰컴데이
        </span>
        {participant ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", color: "var(--color-ink-muted-48)" }}>
              {participant.department ? `${participant.department} · ` : ""}{participant.name}
            </span>
            <span className="badge">코드 {participant.code}</span>
          </div>
        ) : (
          <span className="badge">AI 챌린지 2025</span>
        )}
      </div>
    </header>
  );
}

// ── Entry Form ────────────────────────────────────────────────────────────────

function EntryCard({ onEntered }: { onEntered: (p: Participant) => void }) {
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
    <div className="card" style={{ maxWidth: "440px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "21px", fontWeight: 600, letterSpacing: "-0.01em", marginBottom: "6px" }}>
        챌린지 입장
      </h2>
      <p className="muted-text" style={{ marginBottom: "24px" }}>
        진행자에게 받은 4자리 입장코드를 입력하세요.
      </p>

      {error && (
        <div style={{
          background: "#fff1f2",
          border: "1px solid #fca5a5",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          color: "var(--color-red)",
          fontSize: "14px",
          marginBottom: "16px",
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-ink-muted-48)", marginBottom: "6px" }}>
            이름 *
          </label>
          <input
            className="input"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-ink-muted-48)", marginBottom: "6px" }}>
            소속 부서 <span style={{ fontWeight: 400 }}>(선택)</span>
          </label>
          <input
            className="input"
            type="text"
            placeholder="마케팅팀"
            value={department}
            onChange={e => setDepartment(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-ink-muted-48)", marginBottom: "6px" }}>
            입장코드 *
          </label>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            style={{
              letterSpacing: "0.3em",
              textAlign: "center",
              fontVariantNumeric: "tabular-nums" as React.CSSProperties["fontVariantNumeric"],
              fontSize: "22px",
            }}
          />
        </div>

        <button
          type="submit"
          className="button-primary"
          disabled={loading}
          style={{ width: "100%", marginTop: "4px" }}
        >
          {loading ? "확인 중…" : "챌린지 입장"}
        </button>
      </form>
    </div>
  );
}

// ── Root Component ────────────────────────────────────────────────────────────

export default function ChallengeApp({ data }: { data: QuestionsData }) {
  const [participant, setParticipant] = useState<Participant | null>(null);
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
  }

  // Avoid hydration mismatch — show minimal shell until client is ready
  if (!mounted) {
    return (
      <div className="page-shell">
        <header className="sticky-bar">
          <div className="sticky-bar-inner">
            <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-ink)" }}>
              넥스트웨이브 코리아 · 웰컴데이
            </span>
            <span className="badge">AI 챌린지 2025</span>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <StickyBar participant={participant} />

      {participant ? (
        // ── Post-entry: challenge form ──────────────────────────────────────
        <ChallengeForm data={data} participant={participant} />
      ) : (
        // ── Pre-entry: hero + entry card ────────────────────────────────────
        <>
          <section className="hero-section">
            <div style={{ marginBottom: "20px" }}>
              <span className="badge">2025 웰컴데이 미션</span>
            </div>
            <h1 className="hero-title">
              전임자의<br />워크스페이스를<br />복구하라
            </h1>
            <p className="hero-subtitle">
              AI와 함께 흩어진 자료를 분석하고<br />
              운영 점검 미션을 완수하세요.
            </p>
          </section>

          <div style={{ padding: "48px 24px 80px" }}>
            <EntryCard onEntered={handleEntered} />
          </div>
        </>
      )}
    </div>
  );
}
