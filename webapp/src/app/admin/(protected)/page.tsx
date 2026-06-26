"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, type Timestamp,
} from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebaseClient";
import { useAdminAuth } from "@/hooks/useAdminAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccessCode {
  code:      string;
  title:     string;
  active:    boolean;
  createdAt: Timestamp | null;
  createdBy: string;
  expiresAt: Timestamp | null;
}

// ── Admin top bar ─────────────────────────────────────────────────────────────

function AdminBar({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--color-hairline)",
      height: "52px", padding: "0 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em" }}>
        웰컴데이 챌린지 — 관리자
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <span style={{ fontSize: "13px", color: "var(--color-ink-muted-48)" }}>{email}</span>
        <button
          className="button-secondary"
          onClick={onLogout}
          style={{ height: "32px", padding: "0 16px", fontSize: "13px" }}
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}

// ── Stats cards ───────────────────────────────────────────────────────────────

function StatCard({ label, value, desc }: { label: string; value: string | number; desc: string }) {
  return (
    <div style={{
      background: "var(--color-canvas)",
      border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-card)",
      padding: "22px 24px",
    }}>
      <p style={{ fontSize: "12px", color: "var(--color-ink-muted-48)", marginBottom: "6px" }}>{label}</p>
      <p style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--color-ink)", marginBottom: "2px" }}>
        {value}
      </p>
      <p style={{ fontSize: "12px", color: "var(--color-ink-muted-48)" }}>{desc}</p>
    </div>
  );
}

// ── Active badge ──────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      height: "22px", padding: "0 10px",
      borderRadius: "var(--radius-pill)",
      fontSize: "11px", fontWeight: 600,
      background: active ? "#dcfce7" : "#f3f4f6",
      color:      active ? "#166534" : "var(--color-ink-muted-48)",
    }}>
      {active ? "활성" : "비활성"}
    </span>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

function DeleteModal({
  code, title,
  onConfirm, onCancel,
}: {
  code: string; title: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px",
        background: "var(--color-canvas)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-card)",
        padding: "32px",
      }}>
        <h3 style={{ fontWeight: 600, fontSize: "17px", marginBottom: "8px" }}>입장코드 삭제</h3>
        <p style={{ color: "var(--color-ink-muted-80)", fontSize: "15px", marginBottom: "16px", lineHeight: 1.6 }}>
          <strong>{code}</strong> ({title}) 코드를 삭제합니다.
        </p>
        <div style={{
          background: "#fefce8", border: "1px solid #fde047",
          borderRadius: "var(--radius-sm)", padding: "10px 14px",
          fontSize: "13px", color: "#713f12", marginBottom: "24px", lineHeight: 1.5,
        }}>
          💡 삭제 대신 비활성화를 권장합니다. 비활성화하면 데이터를 유지하면서 입장을 막을 수 있습니다.
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button className="button-secondary" onClick={onCancel}>취소</button>
          <button
            onClick={onConfirm}
            style={{
              height: "38px", padding: "0 18px",
              background: "var(--color-red)", color: "white",
              border: "none", borderRadius: "var(--radius-pill)",
              fontSize: "14px", fontWeight: 500, cursor: "pointer",
            }}
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create code card ──────────────────────────────────────────────────────────

function CreateCodeCard({
  existingCodes,
  creatorEmail,
  onCreated,
}: {
  existingCodes: string[];
  creatorEmail:  string;
  onCreated:     () => void;
}) {
  const [title,  setTitle]  = useState("");
  const [code,   setCode]   = useState("");
  const [error,  setError]  = useState<string | null>(null);
  const [busy,   setBusy]   = useState(false);
  const [success, setSuccess] = useState(false);

  function generateRandom() {
    let attempt = "";
    for (let i = 0; i < 20; i++) {
      const n = String(Math.floor(1000 + Math.random() * 9000));
      if (!existingCodes.includes(n)) { attempt = n; break; }
    }
    if (attempt) setCode(attempt);
    else setError("사용 가능한 4자리 코드를 찾지 못했습니다.");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("교육명을 입력하세요."); return; }
    if (!/^\d{4}$/.test(code)) { setError("4자리 숫자 코드를 입력하세요."); return; }
    if (existingCodes.includes(code)) { setError(`코드 ${code}는 이미 존재합니다.`); return; }

    setError(null);
    setBusy(true);

    try {
      const db = getClientDb();
      await setDoc(doc(db, "accessCodes", code), {
        code,
        title:     title.trim(),
        active:    true,
        createdAt: serverTimestamp(),
        expiresAt: null,
        createdBy: creatorEmail,
      });
      setTitle("");
      setCode("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      onCreated();
    } catch (err) {
      console.error(err);
      setError("코드 생성에 실패했습니다. Firebase 설정을 확인하세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      background: "var(--color-canvas)",
      border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-card)",
      padding: "28px",
      marginBottom: "28px",
    }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px", letterSpacing: "-0.01em" }}>
        새 입장코드 생성
      </h2>

      {error && (
        <div style={{
          background: "#fff1f2", border: "1px solid #fca5a5",
          borderRadius: "var(--radius-sm)", padding: "9px 13px",
          color: "var(--color-red)", fontSize: "13px", marginBottom: "14px",
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #86efac",
          borderRadius: "var(--radius-sm)", padding: "9px 13px",
          color: "#166534", fontSize: "13px", marginBottom: "14px",
        }}>
          코드가 생성되었습니다.
        </div>
      )}

      <form onSubmit={handleCreate}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--color-ink-muted-48)", marginBottom: "5px" }}>
              교육명 *
            </label>
            <input
              className="input"
              type="text"
              placeholder="예: 2025년 하반기 웰컴데이"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ borderRadius: "var(--radius-sm)" }}
            />
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--color-ink-muted-48)", marginBottom: "5px" }}>
              4자리 코드 *
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={{
                  width: "90px", textAlign: "center",
                  letterSpacing: "0.25em", fontSize: "18px",
                  borderRadius: "var(--radius-sm)",
                }}
              />
              <button
                type="button"
                className="button-secondary"
                onClick={generateRandom}
                style={{ height: "44px", padding: "0 14px", fontSize: "13px", borderRadius: "var(--radius-sm)", flexShrink: 0 }}
              >
                랜덤
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="button-primary"
            disabled={busy}
            style={{ height: "44px", padding: "0 22px", borderRadius: "var(--radius-sm)", flexShrink: 0 }}
          >
            {busy ? "생성 중…" : "코드 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Code table ────────────────────────────────────────────────────────────────

function CodeTable({
  codes,
  participantCounts,
  submissionCounts,
  onToggle,
  onDelete,
}: {
  codes:             AccessCode[];
  participantCounts: Record<string, number>;
  submissionCounts:  Record<string, number>;
  onToggle:          (code: string, active: boolean) => void;
  onDelete:          (code: string, title: string) => void;
}) {
  if (codes.length === 0) {
    return (
      <div style={{
        background: "var(--color-canvas)",
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--radius-card)",
        padding: "48px", textAlign: "center",
        color: "var(--color-ink-muted-48)", fontSize: "15px",
      }}>
        생성된 입장코드가 없습니다.
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left",
    fontSize: "12px", fontWeight: 600,
    color: "var(--color-ink-muted-48)",
    borderBottom: "1px solid var(--color-hairline)",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "14px 14px",
    fontSize: "14px",
    borderBottom: "1px solid var(--color-divider-soft)",
    verticalAlign: "middle",
  };

  return (
    <div style={{
      background: "var(--color-canvas)",
      border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-card)",
      overflow: "hidden",
    }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
          <thead>
            <tr style={{ background: "var(--color-canvas-parchment)" }}>
              <th style={thStyle}>코드</th>
              <th style={thStyle}>교육명</th>
              <th style={thStyle}>상태</th>
              <th style={thStyle}>생성일</th>
              <th style={{ ...thStyle, textAlign: "center" }}>참여자</th>
              <th style={{ ...thStyle, textAlign: "center" }}>제출</th>
              <th style={{ ...thStyle, textAlign: "right" }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {codes.map(c => (
              <tr key={c.code} style={{ transition: "background 0.1s" }}>
                <td style={tdStyle}>
                  <span style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "16px", fontWeight: 700,
                    letterSpacing: "0.15em", color: "var(--color-primary)",
                  }}>
                    {c.code}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 500 }}>{c.title}</span>
                  <br />
                  <span style={{ fontSize: "12px", color: "var(--color-ink-muted-48)" }}>
                    생성자: {c.createdBy}
                  </span>
                </td>
                <td style={tdStyle}>
                  <ActiveBadge active={c.active} />
                </td>
                <td style={{ ...tdStyle, color: "var(--color-ink-muted-48)", fontSize: "13px" }}>
                  {c.createdAt
                    ? c.createdAt.toDate().toLocaleDateString("ko-KR")
                    : "—"
                  }
                </td>
                <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>
                  {participantCounts[c.code] ?? 0}
                </td>
                <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>
                  {submissionCounts[c.code] ?? 0}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <Link
                      href={`/admin/codes/${c.code}`}
                      style={{
                        height: "30px", padding: "0 12px",
                        background: "var(--color-primary)", color: "white",
                        border: "none", borderRadius: "var(--radius-pill)",
                        fontSize: "12px", fontWeight: 500, cursor: "pointer",
                        display: "inline-flex", alignItems: "center",
                        textDecoration: "none",
                      }}
                    >
                      결과보기
                    </Link>
                    <button
                      className="button-secondary"
                      onClick={() => onToggle(c.code, c.active)}
                      style={{ height: "30px", padding: "0 12px", fontSize: "12px", borderRadius: "var(--radius-pill)" }}
                    >
                      {c.active ? "비활성화" : "활성화"}
                    </button>
                    <button
                      onClick={() => onDelete(c.code, c.title)}
                      style={{
                        height: "30px", padding: "0 12px",
                        background: "transparent",
                        color: "var(--color-red)",
                        border: "1px solid #fca5a5",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "12px", cursor: "pointer",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAdminAuth();
  const router   = useRouter();

  const [codes,             setCodes]             = useState<AccessCode[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [submissionCounts,  setSubmissionCounts]  = useState<Record<string, number>>({});
  const [loadingData,       setLoadingData]       = useState(true);
  const [deleteTarget,      setDeleteTarget]      = useState<{ code: string; title: string } | null>(null);
  const [actionBusy,        setActionBusy]        = useState<string | null>(null);

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const db = getClientDb();

      // Codes
      const codesSnap = await getDocs(
        query(collection(db, "accessCodes"), orderBy("createdAt", "desc"))
      );
      const loadedCodes = codesSnap.docs.map(d => d.data() as AccessCode);
      setCodes(loadedCodes);

      // Participant counts per code
      const partSnap = await getDocs(collection(db, "participants"));
      const pCounts: Record<string, number> = {};
      partSnap.docs.forEach(d => {
        const code = (d.data() as { code: string }).code;
        if (code) pCounts[code] = (pCounts[code] ?? 0) + 1;
      });
      setParticipantCounts(pCounts);

      // Submission counts per code
      const subSnap = await getDocs(collection(db, "submissions"));
      const sCounts: Record<string, number> = {};
      subSnap.docs.forEach(d => {
        const code = (d.data() as { code: string }).code;
        if (code) sCounts[code] = (sCounts[code] ?? 0) + 1;
      });
      setSubmissionCounts(sCounts);

    } catch (err) {
      console.error("[admin] Firestore load failed:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Toggle active ───────────────────────────────────────────────────────────
  async function handleToggle(code: string, currentActive: boolean) {
    setActionBusy(code);
    try {
      await updateDoc(doc(getClientDb(), "accessCodes", code), { active: !currentActive });
      setCodes(prev => prev.map(c => c.code === code ? { ...c, active: !currentActive } : c));
    } catch (err) {
      console.error(err);
      alert("업데이트에 실패했습니다.");
    } finally {
      setActionBusy(null);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    const { code } = deleteTarget;
    setDeleteTarget(null);
    setActionBusy(code);
    try {
      await deleteDoc(doc(getClientDb(), "accessCodes", code));
      setCodes(prev => prev.filter(c => c.code !== code));
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    } finally {
      setActionBusy(null);
    }
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalCodes       = codes.length;
  const activeCodes      = codes.filter(c => c.active).length;
  const totalParticipants = Object.values(participantCounts).reduce((s, n) => s + n, 0);
  const totalSubmissions  = Object.values(submissionCounts).reduce((s, n) => s + n, 0);

  async function handleLogout() {
    await signOut(getClientAuth());
    router.replace("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-canvas-parchment)" }}>
      <AdminBar email={user?.email ?? ""} onLogout={handleLogout} />

      {deleteTarget && (
        <DeleteModal
          code={deleteTarget.code}
          title={deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Page header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>
            입장코드 관리
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-ink-muted-48)" }}>
            입장코드를 생성하고 참여자 현황을 확인합니다.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}>
          <StatCard label="전체 코드" value={loadingData ? "…" : totalCodes}        desc="생성된 입장코드 수" />
          <StatCard label="활성 코드" value={loadingData ? "…" : activeCodes}       desc="현재 입장 가능한 코드" />
          <StatCard label="총 참여자" value={loadingData ? "…" : totalParticipants} desc="입장 완료 기준" />
          <StatCard label="총 제출"   value={loadingData ? "…" : totalSubmissions}  desc="답안 제출 기준" />
        </div>

        {/* Create */}
        <CreateCodeCard
          existingCodes={codes.map(c => c.code)}
          creatorEmail={user?.email ?? ""}
          onCreated={loadData}
        />

        {/* Table */}
        <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            코드 목록
          </h2>
          <button
            className="button-secondary"
            onClick={loadData}
            style={{ height: "30px", padding: "0 14px", fontSize: "12px" }}
          >
            새로고침
          </button>
        </div>

        {loadingData ? (
          <div style={{
            background: "var(--color-canvas)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-card)",
            padding: "48px", textAlign: "center",
            color: "var(--color-ink-muted-48)",
          }}>
            불러오는 중…
          </div>
        ) : (
          <CodeTable
            codes={codes}
            participantCounts={participantCounts}
            submissionCounts={submissionCounts}
            onToggle={(code, active) => { if (!actionBusy) handleToggle(code, active); }}
            onDelete={(code, title) => setDeleteTarget({ code, title })}
          />
        )}
      </main>
    </div>
  );
}
