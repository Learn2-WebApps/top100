"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy, type Timestamp,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebaseClient";

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
  submittedAt:     Timestamp;
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
        cell(r.submittedAt ? r.submittedAt.toDate().toLocaleString("ko-KR") : ""),
      ].join(",");
    }),
  ];

  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `챌린지_결과_${code}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "var(--color-canvas)",
      border: "1px solid var(--color-hairline)",
      borderRadius: "var(--radius-card)",
      padding: "20px 22px",
    }}>
      <p style={{ fontSize: "12px", color: "var(--color-ink-muted-48)", marginBottom: "6px" }}>{label}</p>
      <p style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--color-ink)" }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: "12px", color: "var(--color-ink-muted-48)", marginTop: "2px" }}>{sub}</p>}
    </div>
  );
}

function SortButton({
  label, sortKey, currentKey, dir,
  onClick,
}: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      style={{
        height: "32px", padding: "0 14px",
        background: active ? "var(--color-primary)" : "transparent",
        color: active ? "white" : "var(--color-ink-muted-48)",
        border: "1px solid",
        borderColor: active ? "var(--color-primary)" : "var(--color-hairline)",
        borderRadius: "var(--radius-pill)",
        fontSize: "13px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "5px",
      }}
    >
      {label}
      {active && <span>{dir === "desc" ? "↓" : "↑"}</span>}
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
        color: full ? "var(--color-green)" : score === 0 ? "var(--color-red)" : "var(--color-ink)",
      }}>
        {score}
      </span>
    </td>
  );
}

const thBase: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "12px", fontWeight: 600,
  color: "var(--color-ink-muted-48)",
  borderBottom: "1px solid var(--color-hairline)",
  whiteSpace: "nowrap", textAlign: "left",
};
const tdBase: React.CSSProperties = {
  padding: "13px 14px",
  fontSize: "14px",
  borderBottom: "1px solid var(--color-divider-soft)",
  verticalAlign: "middle",
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CodeResultPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code   = params.code;

  const [codeDoc,      setCodeDoc]      = useState<AccessCodeDoc | null>(null);
  const [submissions,  setSubmissions]  = useState<Submission[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [sortKey,      setSortKey]      = useState<SortKey>("submittedAt");
  const [sortDir,      setSortDir]      = useState<SortDir>("asc");

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = getClientDb();

      const codeSnap = await getDoc(doc(db, "accessCodes", code));
      if (!codeSnap.exists()) { setNotFound(true); return; }
      setCodeDoc(codeSnap.data() as AccessCodeDoc);

      const subSnap = await getDocs(
        query(collection(db, "submissions"), where("code", "==", code), orderBy("submittedAt", "asc"))
      );
      setSubmissions(
        subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Submission))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { load(); }, [load]);

  // ── Sort toggle ───────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  // ── Filtered + sorted list ────────────────────────────────────────────────
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
        const at = a.submittedAt?.toDate?.()?.getTime() ?? 0;
        const bt = b.submittedAt?.toDate?.()?.getTime() ?? 0;
        diff = at - bt;
      }
      return sortDir === "desc" ? -diff : diff;
    });

    return list;
  }, [submissions, search, sortKey, sortDir]);

  // ── Stats ─────────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-canvas-parchment)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <p style={{ color: "var(--color-ink-muted-48)", fontSize: "14px" }}>불러오는 중…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-canvas-parchment)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px",
      }}>
        <p style={{ fontSize: "16px", color: "var(--color-ink-muted-48)" }}>코드 <strong>{code}</strong>를 찾을 수 없습니다.</p>
        <button className="button-secondary" onClick={() => router.back()}>뒤로가기</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-canvas-parchment)" }}>

      {/* Top bar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-hairline)",
        height: "52px", padding: "0 24px",
        display: "flex", alignItems: "center", gap: "14px",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            height: "32px", padding: "0 14px",
            background: "transparent",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-pill)",
            fontSize: "13px", cursor: "pointer",
            color: "var(--color-ink-muted-48)",
            display: "flex", alignItems: "center", gap: "4px",
          }}
        >
          ← 뒤로
        </button>
        <span style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em", flex: 1 }}>
          코드 {code} — {codeDoc?.title ?? ""}
        </span>
        <span style={{
          height: "22px", padding: "0 10px",
          display: "inline-flex", alignItems: "center",
          borderRadius: "var(--radius-pill)",
          fontSize: "11px", fontWeight: 600,
          background: codeDoc?.active ? "#dcfce7" : "#f3f4f6",
          color: codeDoc?.active ? "#166534" : "var(--color-ink-muted-48)",
        }}>
          {codeDoc?.active ? "활성" : "비활성"}
        </span>
      </header>

      <main style={{ maxWidth: "1060px", margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Summary cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "14px", marginBottom: "28px",
        }}>
          <StatCard label="제출자 수"  value={stats?.count ?? 0}             sub="명" />
          <StatCard label="평균 점수"  value={stats ? `${stats.avg}점` : "—"} sub="100점 만점" />
          <StatCard label="최고점"     value={stats ? `${stats.max}점` : "—"} />
          <StatCard label="최저점"     value={stats ? `${stats.min}점` : "—"} />
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          flexWrap: "wrap", marginBottom: "16px",
        }}>
          {/* Search */}
          <input
            type="text"
            placeholder="이름 또는 부서 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              height: "36px", padding: "0 14px",
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--radius-pill)",
              fontSize: "13px", outline: "none",
              background: "var(--color-canvas)",
              color: "var(--color-ink)",
              minWidth: "200px",
            }}
          />

          {/* Sort */}
          <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
            <SortButton label="점수순"      sortKey="totalScore"  currentKey={sortKey} dir={sortDir} onClick={handleSort} />
            <SortButton label="제출시간순"  sortKey="submittedAt" currentKey={sortKey} dir={sortDir} onClick={handleSort} />
            <SortButton label="이름순"      sortKey="name"        currentKey={sortKey} dir={sortDir} onClick={handleSort} />
          </div>

          {/* CSV */}
          <button
            onClick={() => downloadCSV(displayed, code)}
            disabled={submissions.length === 0}
            style={{
              height: "36px", padding: "0 16px",
              background: submissions.length === 0 ? "var(--color-hairline)" : "var(--color-ink)",
              color: submissions.length === 0 ? "var(--color-ink-muted-48)" : "white",
              border: "none", borderRadius: "var(--radius-pill)",
              fontSize: "13px", fontWeight: 500, cursor: submissions.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            CSV 다운로드
          </button>
        </div>

        {/* Table / empty state */}
        {submissions.length === 0 ? (
          <div style={{
            background: "var(--color-canvas)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-card)",
            padding: "72px 32px", textAlign: "center",
          }}>
            <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-ink)", marginBottom: "8px" }}>
              제출된 결과가 없습니다
            </p>
            <p style={{ fontSize: "14px", color: "var(--color-ink-muted-48)" }}>
              코드 <strong>{code}</strong>로 답안을 제출하면 이 곳에 표시됩니다.
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{
            background: "var(--color-canvas)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-card)",
            padding: "48px 32px", textAlign: "center",
            color: "var(--color-ink-muted-48)", fontSize: "14px",
          }}>
            "<strong>{search}</strong>"에 해당하는 결과가 없습니다.
          </div>
        ) : (
          <div style={{
            background: "var(--color-canvas)",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--radius-card)",
            overflow: "hidden",
          }}>
            {/* Result count */}
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-hairline)",
              fontSize: "13px", color: "var(--color-ink-muted-48)",
            }}>
              {search ? `${displayed.length} / ${submissions.length}명` : `${displayed.length}명`} 표시 중
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "var(--color-canvas-parchment)" }}>
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
                      <tr key={s.id}>
                        <td style={{ ...tdBase, color: "var(--color-ink-muted-48)", fontSize: "12px", width: "36px" }}>
                          {rank ?? i + 1}
                        </td>
                        <td style={{ ...tdBase, fontWeight: 600 }}>{s.name}</td>
                        <td style={{ ...tdBase, color: "var(--color-ink-muted-48)" }}>
                          {s.department || "—"}
                        </td>
                        <td style={{ ...tdBase, textAlign: "center" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "baseline", gap: "2px",
                          }}>
                            <span style={{
                              fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em",
                              color: s.totalScore >= 80 ? "var(--color-green)"
                                   : s.totalScore >= 60 ? "var(--color-primary)"
                                   : s.totalScore >= 40 ? "var(--color-amber)"
                                   : "var(--color-red)",
                            }}>
                              {s.totalScore}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--color-ink-muted-48)" }}>
                              /100
                            </span>
                          </span>
                        </td>
                        {Q_IDS.map(qid => {
                          const qr = s.questionResults?.find(r => r.questionId === qid);
                          return <ScoreCell key={qid} score={qr?.score} max={qr?.maxScore ?? 20} />;
                        })}
                        <td style={{ ...tdBase, textAlign: "right", fontSize: "12px", color: "var(--color-ink-muted-48)", whiteSpace: "nowrap" }}>
                          {s.submittedAt
                            ? s.submittedAt.toDate().toLocaleString("ko-KR", {
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
