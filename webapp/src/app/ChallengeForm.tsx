"use client";

import { useState } from "react";
import type { QuestionsData, Question, Answers, GradeResponse, Participant } from "@/types";

// ── Progress Steps ────────────────────────────────────────────────────────────

const STEPS = ["입장", "자료 다운로드", "AI 분석", "답안 제출", "결과 확인"];

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{
      background: "var(--color-canvas)",
      borderBottom: "1px solid var(--color-hairline)",
      padding: "14px 24px",
      overflowX: "auto",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        maxWidth: "860px",
        margin: "0 auto",
        minWidth: "fit-content",
      }}>
        {STEPS.map((label, i) => {
          const num    = i + 1;
          const done   = num < step;
          const active = num === step;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{
                  width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                  background: done || active ? "var(--color-primary)" : "transparent",
                  border: done || active ? "none" : "1.5px solid var(--color-hairline)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 700,
                  color: done || active ? "white" : "var(--color-ink-muted-48)",
                }}>
                  {done ? "✓" : num}
                </div>
                <span style={{
                  fontSize: "13px",
                  fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap",
                  color: active ? "var(--color-ink)" : done ? "var(--color-primary)" : "var(--color-ink-muted-48)",
                }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: "28px", height: "1px", margin: "0 8px", flexShrink: 0,
                  background: done ? "var(--color-primary)" : "var(--color-hairline)",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Confirmation Modal ────────────────────────────────────────────────────────

function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0, 0, 0, 0.32)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div className="card" style={{ maxWidth: "400px", width: "100%" }}>
        <h3 style={{ fontWeight: 600, fontSize: "19px", marginBottom: "10px", letterSpacing: "-0.01em" }}>
          답안 제출
        </h3>
        <p style={{ color: "var(--color-ink-muted-80)", marginBottom: "28px", lineHeight: 1.6 }}>
          답안을 제출하면 결과가 저장됩니다.<br />제출하시겠습니까?
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button className="button-secondary" onClick={onCancel}>취소</button>
          <button className="button-primary"   onClick={onConfirm}>제출하기</button>
        </div>
      </div>
    </div>
  );
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({
  result,
  participant,
  onRetry,
}: {
  result: GradeResponse;
  participant: Participant;
  onRetry: () => void;
}) {
  const pct   = result.percentage;
  const grade = pct >= 90 ? "우수" : pct >= 70 ? "양호" : pct >= 50 ? "보통" : "미흡";
  const gradeColor = pct >= 90 ? "var(--color-green)"
    : pct >= 70 ? "var(--color-primary)"
    : pct >= 50 ? "var(--color-amber)"
    : "var(--color-red)";

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 24px 80px" }}>

      {/* Hero Score Card */}
      <div className="card" style={{ textAlign: "center", padding: "52px 32px", marginBottom: "40px" }}>
        <p className="muted-text" style={{ marginBottom: "16px" }}>
          {participant.department ? `${participant.department} · ` : ""}
          <strong style={{ color: "var(--color-ink)" }}>{participant.name}</strong>님의 챌린지 결과
        </p>
        <div style={{
          fontSize: "80px", fontWeight: 700, lineHeight: 1,
          letterSpacing: "-0.04em", color: gradeColor, marginBottom: "6px",
        }}>
          {result.totalScore}
        </div>
        <div style={{ fontSize: "22px", color: "var(--color-ink-muted-48)", marginBottom: "24px" }}>
          / {result.maxScore}점
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center",
          height: "34px", padding: "0 18px",
          background: gradeColor, color: "white",
          borderRadius: "var(--radius-pill)",
          fontSize: "14px", fontWeight: 600,
        }}>
          {grade} · 정답률 {result.percentage}%
        </span>
        <p className="muted-text" style={{ marginTop: "16px", fontSize: "13px" }}>
          제출 시각: {new Date(result.submittedAt).toLocaleString("ko-KR")}
        </p>
      </div>

      {/* Question Result Grid */}
      <h2 className="section-title" style={{ marginBottom: "20px" }}>문항별 결과</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "16px",
        marginBottom: "48px",
      }}>
        {result.results.map((r) => {
          const isCorrect = r.score === r.maxScore;
          const isPartial = r.score > 0 && r.score < r.maxScore;
          const statusColor = isCorrect ? "var(--color-green)" : isPartial ? "var(--color-amber)" : "var(--color-red)";
          const statusLabel = isCorrect ? "정답" : isPartial ? "부분" : "오답";
          const cardBg      = isCorrect ? "#f0fdf4" : isPartial ? "#fefce8" : "#fff1f2";
          const cardBorder  = isCorrect ? "#86efac" : isPartial ? "#fde047" : "#fca5a5";
          return (
            <div key={r.questionId} style={{
              background: cardBg, border: `1px solid ${cardBorder}`,
              borderRadius: "var(--radius-card)", padding: "22px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "16px", color: statusColor }}>{r.questionId}</span>
                <span style={{
                  background: statusColor, color: "white",
                  borderRadius: "var(--radius-pill)", padding: "2px 10px",
                  fontSize: "11px", fontWeight: 700,
                }}>
                  {statusLabel}
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--color-ink-muted-80)", marginBottom: "12px", lineHeight: 1.5 }}>
                {r.title}
              </p>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: 700, color: statusColor, letterSpacing: "-0.02em" }}>
                  {r.score}
                </span>
                <span style={{ fontSize: "14px", color: "var(--color-ink-muted-48)" }}>
                  /{r.maxScore}점
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "var(--color-ink-muted-48)", lineHeight: 1.55 }}>
                {r.feedback}
              </p>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center" }}>
        <button className="button-secondary" onClick={onRetry}>다시 시도하기</button>
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
        <span className="question-score">{q.score}점</span>
      </div>
      <div className="question-title">{q.title}</div>
      <div className="question-text">{q.question}</div>
      {q.note && <div className="question-note">⚠ {q.note}</div>}

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
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted-48)", marginBottom: "10px" }}>
            {q.select_count}개 선택 ({((answer as string[]) ?? []).length}/{q.select_count})
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
          <p style={{ fontSize: "13px", color: "var(--color-ink-muted-48)", marginBottom: "10px" }}>
            {q.select_count}개 선택 ({((answer as string[]) ?? []).length}/{q.select_count})
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
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.88em" }}>
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChallengeForm({
  data,
  participant,
}: {
  data: QuestionsData;
  participant: Participant;
}) {
  const { challenge, questions } = data;

  const [answers,     setAnswers]     = useState<Answers>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState<GradeResponse | null>(null);
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

    console.log("제출 answers:", answers);

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
      if (!res.ok) throw new Error("서버 오류");
      const gradeData = (await res.json()) as GradeResponse;
      setResult(gradeData);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("채점 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  // ── Result view ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <>
        <ProgressBar step={5} />
        <ResultView
          result={result}
          participant={participant}
          onRetry={() => { setResult(null); setAnswers({}); }}
        />
      </>
    );
  }

  // ── Challenge view ──────────────────────────────────────────────────────────
  return (
    <>
      <ProgressBar step={4} />

      {showConfirm && (
        <ConfirmModal onConfirm={confirmSubmit} onCancel={() => setShowConfirm(false)} />
      )}

      <div className="container">

        {/* Challenge header */}
        <header className="header">
          <div className="badge">{challenge.company}</div>
          <h1>{challenge.title}</h1>
          <p className="subtitle">{challenge.subtitle}</p>
          <div className="meta">
            <span>📅 {challenge.event_date}</span>
            <span>⏱ 제한시간 {challenge.time_limit_minutes}분</span>
            <span>🏆 총점 {challenge.total_score}점</span>
          </div>
        </header>

        {/* Download */}
        <section className="section">
          <h2 className="section-title">📥 전임자 워크스페이스 다운로드</h2>
          <div className="download-area">
            <div className="download-info">
              <p>ZIP 파일을 내려받아 AI 도구와 함께 분석하세요.</p>
              <p>압축 해제 후 65개 파일을 검토하고 문항의 답을 찾으세요.</p>
            </div>
            <a href="/downloads/welcome_day_workspace.zip" download className="btn btn-primary">
              ⬇ 워크스페이스 ZIP 다운로드
            </a>
          </div>
        </section>

        {/* Situation */}
        <section className="section">
          <h2 className="section-title">📋 상황 설명</h2>
          <p className="description">{challenge.description}</p>
          <div className="info-grid">
            <div className="info-card"><div className="label">행사명</div><div className="value">{challenge.event}</div></div>
            <div className="info-card"><div className="label">행사일</div><div className="value">{challenge.event_date}</div></div>
            <div className="info-card"><div className="label">제한 시간</div><div className="value">{challenge.time_limit_minutes}분</div></div>
            <div className="info-card"><div className="label">총 배점</div><div className="value">{challenge.total_score}점</div></div>
          </div>
        </section>

        {/* Steps */}
        <section className="section">
          <h2 className="section-title">🗂 진행 방법</h2>
          <div className="steps">
            {[
              "위 버튼을 눌러 워크스페이스 ZIP 파일을 다운로드하세요.",
              "압축을 해제하면 전임자(김하늘 매니저)의 폴더 구조가 나타납니다.",
              "파일들을 꼼꼼히 검토하며 각 문항의 답을 찾으세요.",
              "AI 도구(ChatGPT, Claude 등)를 자유롭게 활용할 수 있습니다.",
              "5개 문항에 모두 답을 입력한 후 제출 버튼을 누르세요.",
            ].map((text, i) => (
              <div key={i} className="step">
                <span className="step-num">{i + 1}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Questions */}
        <section className="section">
          <h2 className="section-title">✏️ 답안 입력</h2>

          {/* Participant info (read-only) */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 16px", marginBottom: "20px",
            background: "var(--color-canvas-parchment)",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--color-hairline)",
          }}>
            <span style={{ fontSize: "14px", color: "var(--color-ink-muted-48)" }}>제출자</span>
            <span style={{ fontWeight: 600 }}>{participant.name}</span>
            {participant.department && (
              <span style={{ fontSize: "14px", color: "var(--color-ink-muted-48)" }}>{participant.department}</span>
            )}
            <span className="badge" style={{ marginLeft: "auto" }}>코드 {participant.code}</span>
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
