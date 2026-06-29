"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QResult {
  questionId: string;
  score:      number;
  maxScore:   number;
}

interface Submission {
  id:              string;
  name:            string;
  department:      string;
  totalScore:      number;
  maxScore:        number;
  percentage:      number;
  questionResults: QResult[];
  submittedAt:     string | null;
  code:            string;
}

interface AccessCodeDoc {
  code:   string;
  title:  string;
  active: boolean;
}

type SortKey = "totalScore" | "submittedAt" | "name";
type SortDir = "asc" | "desc";

const Q_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5"];

// ── CSV helper ────────────────────────────────────────────────────────────────

function downloadCSV(rows: Submission[], code: string) {
  const headers = ["이름", "소속부서", "총점", "Q1", "Q2", "Q3", "Q4", "Q5", "정답률(%)", "제출시각"];

  function cell(v: string | number) {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const lines = [
    headers.map(cell).join(","),
    ...rows.map(r => {
      const qScores = Q_IDS.map(qid => {
        const q = r.questionResults?.find(x => x.questionId === qid);
        return q ? q.score : "";
      });
      return [
        cell(r.name),
        cell(r.department ?? ""),
        cell(r.totalScore),
        ...qScores.map(cell),
        cell(r.percentage),
        cell(r.submittedAt ? new Date(r.submittedAt).toLocaleString("ko-KR") : ""),
      ].join(",");
    }),
  ];

  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `진단결과_${code}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="admin-stat-card">
      <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8", marginBottom: "8px" }}>
        {label}
      </p>
      <p style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.04em", color: "#0F172A", lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>{sub}</p>}
    </div>
  );
}

function SortButton({
  label, sortKey, currentKey, dir, onClick,
}: { label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir; onClick: (k: SortKey) => void }) {
  const active = currentKey === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      style={{
        height: "34px", padding: "0 14px",
        background: active ? "#0F172A" : "transparent",
        color: active ? "white" : "#94A3B8",
        border: "1px solid",
        borderColor: active ? "#0F172A" : "rgba(15,23,42,0.12)",
        borderRadius: "8px",
        fontSize: "12px", fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", gap: "4px",
        fontFamily: "inherit", whiteSpace: "nowrap",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {label}
      {active && <span style={{ fontSize: "10px" }}>{dir === "desc" ? "↓" : "↑"}</span>}
    </button>
  );
}

function ScoreCell({ score, max }: { score: number | undefined; max: number }) {
  if (score === undefined) return <td style={tdBase}>—</td>;
  const full = score === max;
  return (
    <td style={{ ...tdBase, textAlign: "center" }}>
      <span style={{
        fontWeight: full ? 700 : 400,
        color: full ? "#059669" : score === 0 ? "#DC2626" : "#0F172A",
        fontSize: "13px",
      }}>
        {score}
      </span>
    </td>
  );
}

const thBase: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "11px", fontWeight: 700,
  color: "#94A3B8",
  borderBottom: "1px solid rgba(15,23,42,0.07)",
  whiteSpace: "nowrap", textAlign: "left",
  textTransform: "uppercase", letterSpacing: "0.05em",
  background: "#F8FAFC",
};
const tdBase: React.CSSProperties = {
  padding: "13px 14px",
  fontSize: "14px",
  borderBottom: "1px solid rgba(15,23,42,0.05)",
  verticalAlign: "middle",
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CodeResultPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code   = params.code;

  const [codeDoc,     setCodeDoc]     = useState<AccessCodeDoc | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [search,      setSearch]      = useState("");
  const [sortKey,     setSortKey]     = useState<SortKey>("submittedAt");
  const [sortDir,     setSortDir]     = useState<SortDir>("asc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/codes/${code}/results`);
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (res.status === 404) { setNotFound(true); return; }
      const data = (await res.json()) as { codeDoc?: AccessCodeDoc; submissions?: Submission[] };
      setCodeDoc(data.codeDoc ?? null);
      setSubmissions(data.submissions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [code, router]);

  useEffect(() => { load(); }, [load]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? submissions.filter(s =>
          s.name?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q)
        )
      : [...submissions];

    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === "totalScore") diff = a.totalScore - b.totalScore;
      else if (sortKey === "name")  diff = (a.name ?? "").localeCompare(b.name ?? "");
      else {
        const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        diff = at - bt;
      }
      return sortDir === "desc" ? -diff : diff;
    });

    return list;
  }, [submissions, search, sortKey, sortDir]);

  const stats = useMemo(() => {
    if (submissions.length === 0) return null;
    const scores = submissions.map(s => s.totalScore);
    return {
      count: submissions.length,
      avg:   Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      max:   Math.max(...scores),
      min:   Math.min(...scores),
    };
  }, [submissions]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  // ── Loading / Not found ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F7FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#94A3B8", fontSize: "14px" }}>불러오는 중…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F7FA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <p style={{ fontSize: "16px", color: "#64748B" }}>코드 <strong>{code}</strong>를 찾을 수 없습니다.</p>
        <Link href="/admin" className="button-secondary" style={{ minHeight: "42px", textDecoration: "none" }}>← 대시보드로</Link>
      </div>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FA" }}>

      {/* Top bar */}
      <div className="admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, overflow: "hidden" }}>
          <Link href="/admin" className="btn-ghost" style={{ fontSize: "13px", flexShrink: 0 }}>
            ← 대시보드
          </Link>
          <span style={{ color: "rgba(15,23,42,0.15)", fontSize: "14px" }}>·</span>
          <span style={{
            fontSize: "14px", fontWeight: 700, color: "#0F172A",
            letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {code} — {codeDoc?.title ?? ""}
          </span>
          <span style={{
            flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: "4px",
            height: "22px", padding: "0 9px", borderRadius: "9999px",
            fontSize: "11px", fontWeight: 700,
            background: codeDoc?.active ? "#DCFCE7" : "#F1F5F9",
            color:      codeDoc?.active ? "#15803D" : "#64748B",
          }}>
            {codeDoc?.active ? "활성" : "비활성"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <Link href="/" className="btn-ghost" style={{ fontSize: "13px" }}>홈으로</Link>
          <button onClick={handleLogout} className="btn-ghost" style={{ fontSize: "13px" }}>로그아웃</button>
        </div>
      </div>

      <main style={{ maxWidth: "1060px", margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Page header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.03em", color: "#0F172A", marginBottom: "4px" }}>
            세션 리포트
          </h1>
          <p style={{ fontSize: "14px", color: "#94A3B8" }}>
            코드 {code} · {codeDoc?.title}
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "28px" }}>
          <StatCard label="제출자" value={stats?.count ?? 0} sub="명" />
          <StatCard label="평균 점수" value={stats ? `${stats.avg}점` : "—"} sub="100점 만점" />
          <StatCard label="최고점" value={stats ? `${stats.max}점` : "—"} />
          <StatCard label="최저점" value={stats ? `${stats.min}점` : "—"} />
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="이름 또는 부서 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              height: "36px", padding: "0 14px",
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: "9999px",
              fontSize: "13px", outline: "none",
              background: "white", color: "#0F172A",
              minWidth: "200px", fontFamily: "inherit",
            }}
          />

          <div style={{ display: "flex", gap: "6px" }}>
            <SortButton label="점수순"     sortKey="totalScore"  currentKey={sortKey} dir={sortDir} onClick={handleSort} />
            <SortButton label="제출시간순" sortKey="submittedAt" currentKey={sortKey} dir={sortDir} onClick={handleSort} />
            <SortButton label="이름순"     sortKey="name"        currentKey={sortKey} dir={sortDir} onClick={handleSort} />
          </div>

          <button
            onClick={() => downloadCSV(displayed, code)}
            disabled={submissions.length === 0}
            style={{
              marginLeft: "auto",
              height: "36px", padding: "0 18px",
              background: submissions.length === 0 ? "#F1F5F9" : "#0F172A",
              color: submissions.length === 0 ? "#94A3B8" : "white",
              border: "none", borderRadius: "9999px",
              fontSize: "13px", fontWeight: 600,
              cursor: submissions.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            CSV 내보내기
          </button>
        </div>

        {/* Table / empty state */}
        {submissions.length === 0 ? (
          <div style={{
            background: "white",
            border: "1px solid rgba(15,23,42,0.07)",
            borderRadius: "20px",
            padding: "72px 32px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>
              아직 제출된 응답이 없습니다.
            </p>
            <p style={{ fontSize: "14px", color: "#94A3B8" }}>
              코드 <strong style={{ color: "#0F172A" }}>{code}</strong>로 답안을 제출하면 여기에 표시됩니다.
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{
            background: "white",
            border: "1px solid rgba(15,23,42,0.07)",
            borderRadius: "20px",
            padding: "48px 32px",
            textAlign: "center",
            color: "#94A3B8", fontSize: "14px",
          }}>
            &ldquo;<strong>{search}</strong>&rdquo;에 해당하는 결과가 없습니다.
          </div>
        ) : (
          <div style={{
            background: "white",
            border: "1px solid rgba(15,23,42,0.07)",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
          }}>
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(15,23,42,0.07)",
              fontSize: "13px", color: "#94A3B8", fontWeight: 500,
              background: "#FAFBFC",
            }}>
              {search ? `${displayed.length} / ${submissions.length}명` : `${displayed.length}명`} 표시 중
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "780px" }}>
                <thead>
                  <tr>
                    <th style={thBase}>#</th>
                    <th style={thBase}>이름</th>
                    <th style={thBase}>소속부서</th>
                    <th style={{ ...thBase, textAlign: "center" }}>총점</th>
                    {Q_IDS.map(qid => (
                      <th key={qid} style={{ ...thBase, textAlign: "center" }}>{qid}</th>
                    ))}
                    <th style={{ ...thBase, textAlign: "right" }}>제출시각</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((s, i) => {
                    const rank = sortKey === "totalScore" && sortDir === "desc" ? i + 1 : null;
                    return (
                      <tr key={s.id} style={{ transition: "background 0.1s" }}>
                        <td style={{ ...tdBase, color: "#94A3B8", fontSize: "12px", width: "36px" }}>
                          {rank ?? i + 1}
                        </td>
                        <td style={{ ...tdBase, fontWeight: 700, color: "#0F172A" }}>{s.name}</td>
                        <td style={{ ...tdBase, color: "#64748B", fontSize: "13px" }}>
                          {s.department || "—"}
                        </td>
                        <td style={{ ...tdBase, textAlign: "center" }}>
                          <span style={{ display: "inline-flex", alignItems: "baseline", gap: "2px" }}>
                            <span style={{
                              fontSize: "17px", fontWeight: 800, letterSpacing: "-0.03em",
                              color: s.totalScore >= 80 ? "#059669"
                                   : s.totalScore >= 60 ? "#2563EB"
                                   : s.totalScore >= 40 ? "#D97706"
                                   : "#DC2626",
                            }}>
                              {s.totalScore}
                            </span>
                            <span style={{ fontSize: "11px", color: "#94A3B8" }}>/100</span>
                          </span>
                        </td>
                        {Q_IDS.map(qid => {
                          const qr = s.questionResults?.find(r => r.questionId === qid);
                          return <ScoreCell key={qid} score={qr?.score} max={qr?.maxScore ?? 20} />;
                        })}
                        <td style={{ ...tdBase, textAlign: "right", fontSize: "12px", color: "#94A3B8", whiteSpace: "nowrap" }}>
                          {s.submittedAt
                            ? new Date(s.submittedAt).toLocaleString("ko-KR", {
                                month: "2-digit", day: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : "—"
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
