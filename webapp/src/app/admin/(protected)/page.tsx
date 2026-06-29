"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccessCode {
  code:             string;
  sessionId:        string | null;
  title:            string;
  active:           boolean;
  createdAt:        string | null;
  createdBy:        string;
  participantCount: number;
  submissionCount:  number;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="admin-stat-card">
      <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8", marginBottom: "8px" }}>
        {label}
      </p>
      <p style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.04em", color: "#0F172A", lineHeight: 1, marginBottom: "2px" }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>{sub}</p>}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      height: "24px", padding: "0 10px",
      borderRadius: "9999px",
      fontSize: "11px", fontWeight: 700,
      background: active ? "#DCFCE7" : "#F1F5F9",
      color:      active ? "#15803D" : "#64748B",
    }}>
      <span style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: active ? "#22C55E" : "#CBD5E1",
      }} />
      {active ? "활성" : "비활성"}
    </span>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({
  existingCodes,
  onCreated,
  onClose,
}: {
  existingCodes: string[];
  onCreated:     () => void;
  onClose:       () => void;
}) {
  const [title,   setTitle]   = useState("");
  const [code,    setCode]    = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [busy,    setBusy]    = useState(false);
  const [success, setSuccess] = useState(false);

  function generateRandom() {
    for (let i = 0; i < 20; i++) {
      const n = String(Math.floor(1000 + Math.random() * 9000));
      if (!existingCodes.includes(n)) { setCode(n); return; }
    }
    setError("사용 가능한 코드를 찾지 못했습니다.");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("세션 이름을 입력하세요."); return; }
    if (!/^\d{4}$/.test(code)) { setError("4자리 숫자 코드를 입력하세요."); return; }
    if (existingCodes.includes(code)) { setError(`코드 ${code}는 이미 존재합니다.`); return; }

    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/codes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code, title: title.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) { setError(data.message ?? data.error ?? "생성에 실패했습니다."); return; }
      setSuccess(true);
      onCreated();
      setTimeout(onClose, 800);
    } catch (err) {
      console.error(err);
      setError("생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", minHeight: "46px", padding: "0 14px",
    border: "1.5px solid rgba(15,23,42,0.12)", borderRadius: "10px",
    fontSize: "15px", color: "#0F172A", outline: "none",
    background: "white", fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        width: "100%", maxWidth: "460px",
        background: "white", borderRadius: "24px",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 24px 80px rgba(15,23,42,0.15)",
        padding: "36px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", color: "#0F172A", marginBottom: "4px" }}>
              새 세션 생성
            </h2>
            <p style={{ fontSize: "13px", color: "#94A3B8" }}>4자리 입장코드를 발급합니다.</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "#F1F5F9", border: "none", cursor: "pointer",
              fontSize: "16px", color: "#64748B", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {success ? (
          <div style={{
            textAlign: "center", padding: "24px",
            background: "#F0FDF4", borderRadius: "12px",
            color: "#15803D", fontWeight: 600,
          }}>
            ✓ 세션이 생성되었습니다.
          </div>
        ) : (
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {error && (
              <div style={{
                background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: "8px", padding: "10px 14px",
                color: "#DC2626", fontSize: "13px",
              }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                세션 이름 *
              </label>
              <input
                type="text" placeholder="예: 2025년 상반기 역량 진단"
                value={title} onChange={e => setTitle(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; }}
                onBlur={e  => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                입장코드 (4자리) *
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text" inputMode="numeric" maxLength={4}
                  placeholder="0000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  style={{ ...inputStyle, width: "100px", textAlign: "center", fontSize: "20px", fontWeight: 700, letterSpacing: "0.2em" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)"; }}
                />
                <button
                  type="button" className="button-secondary"
                  onClick={generateRandom}
                  style={{ minHeight: "46px", padding: "0 14px", fontSize: "13px", borderRadius: "10px" }}
                >
                  랜덤 생성
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
              <button type="button" className="button-secondary" onClick={onClose} style={{ minHeight: "44px" }}>
                취소
              </button>
              <button type="submit" className="button-primary" disabled={busy} style={{ minHeight: "44px", fontSize: "15px" }}>
                {busy ? "생성 중…" : "세션 생성"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteModal({
  code, title, onConfirm, onCancel,
}: { code: string; title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,23,42,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px",
        background: "white", borderRadius: "20px",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 24px 80px rgba(15,23,42,0.15)",
        padding: "32px",
      }}>
        <h3 style={{ fontWeight: 700, fontSize: "18px", marginBottom: "8px", color: "#0F172A" }}>
          세션 삭제
        </h3>
        <p style={{ color: "#64748B", fontSize: "14px", marginBottom: "12px", lineHeight: 1.6 }}>
          <strong style={{ color: "#0F172A" }}>{code}</strong> ({title}) 세션을 삭제합니다.
        </p>
        <div style={{
          background: "#FFFBEB", border: "1px solid #FDE68A",
          borderRadius: "8px", padding: "10px 14px",
          fontSize: "13px", color: "#92400E", marginBottom: "24px", lineHeight: 1.5,
        }}>
          삭제 대신 비활성화를 권장합니다. 비활성화하면 데이터를 유지하면서 입장을 막을 수 있습니다.
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button className="button-secondary" onClick={onCancel} style={{ minHeight: "40px" }}>취소</button>
          <button
            onClick={onConfirm}
            style={{
              minHeight: "40px", padding: "0 18px",
              background: "#DC2626", color: "white",
              border: "none", borderRadius: "9999px",
              fontSize: "14px", fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Code card ─────────────────────────────────────────────────────────────────

function CodeCard({
  c,
  onToggle,
  onDelete,
}: {
  c: AccessCode;
  onToggle: (code: string, active: boolean) => void;
  onDelete:  (code: string, title: string)  => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="admin-code-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>

        {/* Left info */}
        <div style={{ flex: 1, minWidth: "180px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "28px", fontWeight: 800,
              letterSpacing: "0.12em", color: "#0F172A",
            }}>
              {c.code}
            </span>
            <StatusBadge active={c.active} />
          </div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0F172A", marginBottom: "10px", letterSpacing: "-0.01em" }}>
            {c.title}
          </p>
          <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#94A3B8", flexWrap: "wrap" }}>
            <span>참여 {c.participantCount}명</span>
            <span>·</span>
            <span>제출 {c.submissionCount}건</span>
            <span>·</span>
            <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("ko-KR") : "—"}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={handleCopy}
            className="btn-ghost"
            style={{ minHeight: "34px", padding: "0 12px", fontSize: "12px", borderRadius: "8px" }}
          >
            {copied ? "✓ 복사됨" : "코드 복사"}
          </button>
          <Link
            href={`/admin/codes/${c.code}`}
            style={{
              display: "inline-flex", alignItems: "center",
              minHeight: "34px", padding: "0 14px",
              background: "#0F172A", color: "white",
              borderRadius: "8px", fontSize: "12px", fontWeight: 600,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            리포트 보기
          </Link>
          <button
            onClick={() => onToggle(c.code, c.active)}
            className="btn-ghost"
            style={{ minHeight: "34px", padding: "0 12px", fontSize: "12px", borderRadius: "8px" }}
          >
            {c.active ? "비활성화" : "활성화"}
          </button>
          <button
            onClick={() => onDelete(c.code, c.title)}
            className="btn-danger"
            style={{ minHeight: "34px", padding: "0 10px", fontSize: "12px", borderRadius: "8px" }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  const [codes,        setCodes]        = useState<AccessCode[]>([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ code: string; title: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/codes");
      if (res.status === 401) { router.replace("/admin/login"); return; }
      const data = (await res.json()) as { codes?: AccessCode[] };
      setCodes(data.codes ?? []);
    } catch (err) {
      console.error("[admin] 데이터 로드 실패:", err);
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleToggle(code: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/codes/${code}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ active: !currentActive }),
      });
      if (!res.ok) { alert("업데이트에 실패했습니다."); return; }
      setCodes(prev => prev.map(c => c.code === code ? { ...c, active: !currentActive } : c));
    } catch (err) {
      console.error(err);
      alert("업데이트에 실패했습니다.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { code } = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/admin/codes/${code}`, { method: "DELETE" });
      if (!res.ok) { alert("삭제에 실패했습니다."); return; }
      setCodes(prev => prev.filter(c => c.code !== code));
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  const totalCodes        = codes.length;
  const activeCodes       = codes.filter(c => c.active).length;
  const totalParticipants = codes.reduce((s, c) => s + c.participantCount, 0);
  const totalSubmissions  = codes.reduce((s, c) => s + c.submissionCount,  0);

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FA" }}>

      {/* Modals */}
      {showCreate && (
        <CreateModal
          existingCodes={codes.map(c => c.code)}
          onCreated={loadData}
          onClose={() => setShowCreate(false)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          code={deleteTarget.code}
          title={deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Top bar */}
      <div className="admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2563EB" }}>
            Admin
          </span>
          <span style={{ color: "rgba(15,23,42,0.15)", fontSize: "14px" }}>·</span>
          <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.01em", color: "#0F172A" }}>
            진단 세션 관리
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link href="/" className="btn-ghost" style={{ fontSize: "13px" }}>
            홈으로
          </Link>
          <button
            onClick={loadData}
            className="btn-ghost"
            style={{ fontSize: "13px" }}
          >
            새로고침
          </button>
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{ fontSize: "13px" }}
          >
            로그아웃
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="button-primary"
            style={{ minHeight: "38px", padding: "0 18px", fontSize: "13px", borderRadius: "9px" }}
          >
            + 새 세션 생성
          </button>
        </div>
      </div>

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Page title */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.03em", color: "#0F172A", marginBottom: "4px" }}>
            세션 대시보드
          </h1>
          <p style={{ fontSize: "14px", color: "#94A3B8" }}>
            입장코드를 발급하고 참여 현황을 확인합니다.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "32px",
        }}>
          <StatCard label="전체 세션" value={loadingData ? "…" : totalCodes}        sub="생성된 입장코드 수" />
          <StatCard label="활성 세션" value={loadingData ? "…" : activeCodes}       sub="현재 입장 가능" />
          <StatCard label="총 참여자" value={loadingData ? "…" : totalParticipants} sub="입장 완료 기준" />
          <StatCard label="총 제출"   value={loadingData ? "…" : totalSubmissions}  sub="답안 제출 기준" />
        </div>

        {/* Code list */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
            세션 목록
          </h2>
          <span style={{ fontSize: "13px", color: "#94A3B8" }}>
            {loadingData ? "" : `${codes.length}개 세션`}
          </span>
        </div>

        {loadingData ? (
          <div style={{
            background: "white", border: "1px solid rgba(15,23,42,0.07)",
            borderRadius: "20px", padding: "60px",
            textAlign: "center", color: "#94A3B8", fontSize: "14px",
          }}>
            불러오는 중…
          </div>
        ) : codes.length === 0 ? (
          <div style={{
            background: "white", border: "1px solid rgba(15,23,42,0.07)",
            borderRadius: "20px", padding: "60px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#0F172A", marginBottom: "8px" }}>
              세션이 없습니다
            </p>
            <p style={{ fontSize: "14px", color: "#94A3B8", marginBottom: "24px" }}>
              우측 상단 버튼을 눌러 첫 번째 세션을 생성해보세요.
            </p>
            <button
              className="button-primary"
              onClick={() => setShowCreate(true)}
              style={{ minHeight: "44px", fontSize: "14px" }}
            >
              + 새 세션 생성
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {codes.map(c => (
              <CodeCard
                key={c.code}
                c={c}
                onToggle={handleToggle}
                onDelete={(code, title) => setDeleteTarget({ code, title })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
