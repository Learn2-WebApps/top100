"use client";

import { useState } from "react";
import type { QuestionsData, Question, Answers, GradeResponse, Participant } from "@/types";

// ── Confirmation Modal ────────────────────────────────────────────────────────

function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15, 23, 42, 0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        maxWidth: "400px", width: "100%",
        background: "white", borderRadius: "20px",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 24px 80px rgba(15,23,42,0.15)",
        padding: "36px 32px",
      }}>
        <h3 style={{ fontWeight: 700, fontSize: "20px", marginBottom: "10px", letterSpacing: "-0.02em", color: "#0F172A" }}>
          답안 제출
        </h3>
        <p style={{ color: "#64748B", marginBottom: "28px", lineHeight: 1.65, fontSize: "15px" }}>
          제출 후에는 답안을 수정할 수 없습니다.<br />지금 제출하시겠습니까?
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button className="button-secondary" onClick={onCancel} style={{ minHeight: "42px" }}>취소</button>
          <button className="button-primary" onClick={onConfirm} style={{ minHeight: "42px", fontSize: "15px" }}>제출하기</button>
        </div>
      </div>
    </div>
  );
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({
  result,
  participant,
  onExit,
}: {
  result: GradeResponse;
  participant: Participant;
  onExit: () => void;
}) {
  const pct        = result.percentage;
  const grade      = pct >= 90 ? "우수" : pct >= 70 ? "양호" : pct >= 50 ? "보통" : "미흡";
  const gradeColor = pct >= 90 ? "#059669" : pct >= 70 ? "#2563EB" : pct >= 50 ? "#D97706" : "#DC2626";
  const gradeBg    = pct >= 90 ? "#F0FDF4" : pct >= 70 ? "#EFF6FF" : pct >= 50 ? "#FFFBEB" : "#FFF1F2";

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 60% -10%, #E0E7FF 0%, #F5F7FA 50%, #EFF6FF 100%)",
    }}>
      <div className="top-bar">
        <button className="btn-ghost logout-button" onClick={onExit}>로그아웃</button>
      </div>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Score card */}
        <div style={{
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(15,23,42,0.06)",
          borderRadius: "28px",
          boxShadow: "0 24px 80px rgba(15,23,42,0.10)",
          overflow: "hidden",
          marginBottom: "28px",
          backdropFilter: "blur(16px)",
        }}>
          <div style={{
            background: gradeBg,
            padding: "48px 32px",
            textAlign: "center",
            borderBottom: "1px solid rgba(15,23,42,0.06)",
          }}>
            <p style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "20px" }}>
              {participant.department ? `${participant.department} · ` : ""}
              <strong style={{ color: "#0F172A" }}>{participant.name}</strong>님의 결과
            </p>
            <div style={{
              fontSize: "88px", fontWeight: 800, lineHeight: 1,
              letterSpacing: "-0.05em", color: gradeColor, marginBottom: "6px",
            }}>
              {result.totalScore}
            </div>
            <div style={{ fontSize: "18px", color: "#94A3B8", marginBottom: "20px" }}>
              / {result.maxScore}점
            </div>
            <span style={{
              display: "inline-flex", alignItems: "center",
              height: "36px", padding: "0 20px",
              background: gradeColor, color: "white",
              borderRadius: "9999px",
              fontSize: "14px", fontWeight: 700,
              letterSpacing: "0.02em",
            }}>
              {grade} · 정답률 {result.percentage}%
            </span>
            <p style={{ marginTop: "16px", fontSize: "12px", color: "#B0BFCF" }}>
              제출 시각: {new Date(result.submittedAt).toLocaleString("ko-KR")}
            </p>
          </div>

          {/* Per-question results */}
          <div style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", marginBottom: "16px", letterSpacing: "-0.01em" }}>
              문항별 결과
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {result.results.map((r) => {
                const isCorrect  = r.score === r.maxScore;
                const isPartial  = r.score > 0 && r.score < r.maxScore;
                const statusColor = isCorrect ? "#059669" : isPartial ? "#D97706" : "#DC2626";
                const statusLabel = isCorrect ? "정답" : isPartial ? "부분" : "오답";
                const cardBg      = isCorrect ? "#F0FDF4" : isPartial ? "#FFFBEB" : "#FFF1F2";
                const cardBorder  = isCorrect ? "#A7F3D0" : isPartial ? "#FDE68A" : "#FECACA";
                return (
                  <div key={r.questionId} style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: "14px", padding: "18px 20px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: statusColor, letterSpacing: "0.02em" }}>{r.questionId}</span>
                      <span style={{
                        background: statusColor, color: "white",
                        borderRadius: "9999px", padding: "2px 10px",
                        fontSize: "11px", fontWeight: 700,
                      }}>
                        {statusLabel}
                      </span>
                    </div>
                    <p style={{ fontSize: "14px", color: "#475569", marginBottom: "10px", lineHeight: 1.5, fontWeight: 500 }}>
                      {r.title}
                    </p>
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ fontSize: "26px", fontWeight: 800, color: statusColor, letterSpacing: "-0.03em" }}>
                        {r.score}
                      </span>
                      <span style={{ fontSize: "13px", color: "#94A3B8" }}>/{r.maxScore}점</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>{r.feedback}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <button className="button-secondary" onClick={onExit} style={{ minHeight: "44px" }}>
            처음 화면으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: Question;
  answer:   string | string[] | Record<string, string> | undefined;
  onSingleChange:   (v: string) => void;
  onMultipleToggle: (optId: string) => void;
  onNumberChange:   (v: string) => void;
  onMatchingChange: (leftId: string, rightId: string) => void;
}

function QuestionCard({
  question: q, answer,
  onSingleChange, onMultipleToggle, onNumberChange, onMatchingChange,
}: QuestionCardProps) {
  return (
    <div className="question-card">
      <div className="question-header">
        <span className="question-num">문항 {q.order}</span>
        <span className="question-score">20점</span>
      </div>
      <div className="question-title">{q.title}</div>
      <div className="question-text">{q.question}</div>

      {/* single_choice */}
      {q.type === "single_choice" && (
        <div className="options">
          {q.options?.map(opt => (
            <label key={opt.id} className="option-label">
              <input
                type="radio"
                name={q.id}
                value={opt.id}
                checked={answer === opt.id}
                onChange={() => onSingleChange(opt.id)}
              />
              <span>{opt.id}. {opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* multiple_choice */}
      {q.type === "multiple_choice" && (
        <div className="options">
          <p style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "10px", fontWeight: 500 }}>
            {q.select_count}개 선택
          </p>
          {q.options?.map(opt => {
            const sel = (answer as string[]) ?? [];
            return (
              <label key={opt.id} className="option-label">
                <input
                  type="checkbox"
                  checked={sel.includes(opt.id)}
                  onChange={() => onMultipleToggle(opt.id)}
                />
                <span>{opt.id}. {opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* file_selection */}
      {q.type === "file_selection" && (
        <div className="options">
          <p style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "10px", fontWeight: 500 }}>
            {q.select_count}개 선택
          </p>
          {q.options?.map(opt => {
            const sel = (answer as string[]) ?? [];
            return (
              <label key={opt.id} className="option-label">
                <input
                  type="checkbox"
                  checked={sel.includes(opt.id)}
                  onChange={() => onMultipleToggle(opt.id)}
                />
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "13px" }}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* number_input */}
      {q.type === "number_input" && (
        <div className="number-input-row">
          <input
            type="number"
            placeholder={q.placeholder ?? "숫자 입력"}
            value={(answer as string) ?? ""}
            onChange={e => onNumberChange(e.target.value)}
          />
          {q.unit && <span className="unit">{q.unit}</span>}
        </div>
      )}

      {/* matching */}
      {q.type === "matching" && (
        <div className="matching-grid">
          {q.left_items?.map(left => {
            const matchMap = (answer as Record<string, string>) ?? {};
            return (
              <div key={left.id} className="matching-row">
                <div className="matching-left">{left.label}</div>
                <span className="matching-arrow">→</span>
                <select
                  className="matching-select"
                  value={matchMap[left.id] ?? ""}
                  onChange={e => onMatchingChange(left.id, e.target.value)}
                >
                  <option value="">선택하세요</option>
                  {q.right_items?.map(right => (
                    <option key={right.id} value={right.id}>{right.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Score table row ───────────────────────────────────────────────────────────

function ScoreRow({ label, score, bold }: { label: string; score: string; bold?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 16px",
      background: bold ? "#F1F5F9" : "white",
      borderRadius: "8px",
      fontWeight: bold ? 700 : 400,
      fontSize: bold ? "14px" : "13px",
      color: bold ? "#0F172A" : "#475569",
    }}>
      <span>{label}</span>
      <span style={{ color: bold ? "#2563EB" : "#0F172A", fontWeight: bold ? 800 : 600 }}>{score}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChallengeForm({
  data,
  participant,
  initialResult,
  onSubmitted,
  onExit,
}: {
  data: QuestionsData;
  participant: Participant;
  initialResult?: GradeResponse | null;
  onSubmitted: (result: GradeResponse) => void;
  onExit: () => void;
}) {
  const { questions } = data;

  const [answers,     setAnswers]     = useState<Answers>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<GradeResponse | null>(initialResult ?? null);
  const [error,       setError]       = useState<string | null>(null);

  // ── Answer helpers ──────────────────────────────────────────────────────────
  function setAnswer(qId: string, value: string | string[] | Record<string, string>) {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  }

  function toggleMultiple(qId: string, optId: string, maxCount: number) {
    setAnswers(prev => {
      const cur = (prev[qId] as string[]) ?? [];
      if (cur.includes(optId)) return { ...prev, [qId]: cur.filter(x => x !== optId) };
      if (cur.length >= maxCount) return prev;
      return { ...prev, [qId]: [...cur, optId] };
    });
  }

  function setMatchingPair(qId: string, leftId: string, rightId: string) {
    setAnswers(prev => {
      const cur = ((prev[qId] as Record<string, string>) ?? {});
      return { ...prev, [qId]: { ...cur, [leftId]: rightId } };
    });
  }

  // ── Submit flow ─────────────────────────────────────────────────────────────
  async function confirmSubmit() {
    setShowConfirm(false);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/grade", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.participantId,
          name:          participant.name,
          department:    participant.department,
          code:          participant.code,
          answers,
        }),
      });
      const ct = res.headers.get("content-type") ?? "";
      const payload = ct.includes("application/json")
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) {
        const msg = (payload as { error?: string }).error;
        setError(msg ?? "채점 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      const gradeResult = payload as GradeResponse;
      setResult(gradeResult);
      onSubmitted(gradeResult);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  // ── Result view ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <ResultView
        result={result}
        participant={participant}
        onExit={onExit}
      />
    );
  }

  // ── Challenge view ──────────────────────────────────────────────────────────
  return (
    <>
      {showConfirm && (
        <ConfirmModal onConfirm={confirmSubmit} onCancel={() => setShowConfirm(false)} />
      )}

      <div className="top-bar">
        <button
          className="btn-ghost logout-button"
          onClick={() => {
            if (window.confirm("로그아웃하시겠습니까? 작성 중인 답안은 저장되지 않습니다.")) onExit();
          }}
        >
          로그아웃
        </button>
      </div>

      <div className="container">

        {/* Header */}
        <header className="header">
          <h1>인수인계 없는 첫 출근</h1>
        </header>

        {/* Mission description */}
        <section className="section">
          <h2 className="section-title">📋 미션 안내</h2>
          <div className="description" style={{ display: "flex", flexDirection: "column", gap: "14px", lineHeight: 1.8 }}>
            <p>
              당신은 웰컴데이 운영 업무를 갑작스럽게 맡게 된 신입사원입니다.<br />
              명확한 인수인계 문서는 없고, 남겨진 것은 메일, 메모, 체크리스트, 첨부자료뿐입니다.<br />
              흩어진 자료 속에서 최종 정보와 미확정 사항을 파악해 업무 상황을 정리하세요.
            </p>
          </div>
        </section>

        {/* Goals */}
        <section className="section">
          <h2 className="section-title">🎯 당신의 목표</h2>
          <div className="steps">
            {[
              "자료 속 핵심 정보 찾기",
              "여러 파일에 흩어진 단서 연결하기",
              "문제에서 요구하는 정보만 선별하기",
              "근거 없는 추측 제거하기",
              "정확하고 간결한 답안 제출하기",
            ].map((text, i) => (
              <div key={i} className="step">
                <span className="step-num">{i + 1}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Scoring & Event Date */}
        <section className="section">
          <h2 className="section-title">📊 문제 구성 및 배점</h2>
          <p style={{ fontSize: "14px", color: "#64748B", marginBottom: "16px", lineHeight: 1.7 }}>
            총 5개의 문제가 제공됩니다. 각 문제는 20점이며, 총점은 100점입니다.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px" }}>
            {["문제 1", "문제 2", "문제 3", "문제 4", "문제 5"].map(label => (
              <ScoreRow key={label} label={label} score="20점" />
            ))}
            <ScoreRow label="총점" score="100점" bold />
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px",
            background: "rgba(37,99,235,0.06)",
            border: "1px solid rgba(37,99,235,0.15)",
            borderRadius: "10px",
          }}>
            <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>웰컴데이 행사일</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>2026년 7월 31일</span>
          </div>
        </section>

        {/* Download */}
        <section className="section">
          <h2 className="section-title">📥 워크스페이스 다운로드</h2>
          <div className="download-area">
            <div className="download-info">
              <p>ZIP 파일을 내려받아 AI 도구와 함께 분석하세요.</p>
              <p>압축 해제 후 파일을 검토하고 문항의 답을 찾으세요.</p>
            </div>
            <a href="/downloads/welcome_day_workspace.zip" download className="btn btn-primary">
              ⬇ 워크스페이스 ZIP 다운로드
            </a>
          </div>
        </section>

        {/* Questions */}
        <section className="section">
          {/* Participant info */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
            padding: "10px 14px", marginBottom: "20px",
            background: "#F8FAFC", borderRadius: "10px",
            border: "1px solid rgba(15,23,42,0.07)",
          }}>
            <span style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 500 }}>제출자</span>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>{participant.name}</span>
            {participant.department && (
              <span style={{ fontSize: "13px", color: "#64748B" }}>{participant.department}</span>
            )}
            <span style={{
              marginLeft: "auto", fontSize: "11px", fontWeight: 700,
              color: "#2563EB", background: "rgba(37,99,235,0.08)",
              padding: "3px 10px", borderRadius: "9999px",
              letterSpacing: "0.04em",
            }}>
              코드 {participant.code}
            </span>
          </div>

          {error && <div className="error-box">{error}</div>}

          {questions.map(q => (
            <QuestionCard
              key={q.id}
              question={q as Question}
              answer={answers[q.id]}
              onSingleChange={v => setAnswer(q.id, v)}
              onMultipleToggle={optId => toggleMultiple(q.id, optId, (q as Question).select_count ?? 99)}
              onNumberChange={v => setAnswer(q.id, v)}
              onMatchingChange={(leftId, rightId) => setMatchingPair(q.id, leftId, rightId)}
            />
          ))}

          <button
            className="btn btn-submit"
            disabled={loading}
            onClick={() => setShowConfirm(true)}
          >
            {loading ? "채점 중…" : "답안 제출하기"}
          </button>
        </section>
      </div>
    </>
  );
}
