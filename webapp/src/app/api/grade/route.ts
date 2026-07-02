import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import type { GradeRequest, GradeResponse, QuestionResult } from "@/types";

import answerKeyData from "@/data/answer_key.json";
import questionsData from "@/data/questions.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnswerEntry {
  type:               string;
  answer:             string | number | string[] | Record<string, string>;
  score:              number;
  grading:            string;
  feedback_correct:   string;
  feedback_incorrect: string;
  score_per_correct?: number;
  penalty_per_wrong?: number;
  min_score?:         number;
  score_per_pair?:    number;
  tolerance?:         number;
  score_scale?:       number[];
}

function gradeQuestion(
  qId:       string,
  entry:     AnswerEntry,
  title:     string,
  submitted: string | string[] | Record<string, string> | undefined | null
): QuestionResult {
  const maxScore = entry.score;

  if (submitted === undefined || submitted === null || submitted === "") {
    return { questionId: qId, title, score: 0, maxScore, correct: false, feedback: entry.feedback_incorrect };
  }

  let earned = 0;

  switch (entry.grading) {
    case "exact_match": {
      if (entry.type === "number_input") {
        const n = parseInt(String(submitted).replace(/\s/g, ""), 10);
        earned = !isNaN(n) && n === Number(entry.answer) ? maxScore : 0;
      } else {
        earned = String(submitted) === String(entry.answer) ? maxScore : 0;
      }
      break;
    }

    case "partial_with_penalty": {
      if (!Array.isArray(submitted)) {
        earned = 0;
        break;
      }
      const correctArr = entry.answer as string[];
      const correctSet = new Set(correctArr);
      const subArr     = submitted as string[];
      const perRight   = entry.score_per_correct ?? 1;
      const perWrong   = entry.penalty_per_wrong  ?? 1;
      const minScore   = entry.min_score ?? 0;

      if (correctArr.length === subArr.length && correctArr.every(a => correctSet.has(a) && subArr.includes(a))) {
        const subSet = new Set(subArr);
        if (correctArr.every(a => subSet.has(a))) {
          earned = maxScore;
          break;
        }
      }

      let raw = 0;
      const subSet2 = new Set(subArr);
      for (const sel of subArr) {
        if (correctSet.has(sel)) raw += perRight;
        else                     raw -= perWrong;
      }
      // Full-correct shortcut
      if (subSet2.size === correctSet.size && correctArr.every(a => subSet2.has(a))) {
        earned = maxScore;
      } else {
        earned = Math.max(minScore, Math.min(raw, maxScore - 1));
      }
      break;
    }

    // 선택한 항목 중 정답과 일치하는 개수에 따라 정해진 점수를 부여한다.
    // 선택 개수는 UI에서 이미 최대 (score_scale.length - 1)개로 제한되지만,
    // 서버에 그 이상이 들어와도 500 없이 0점으로 안전하게 처리한다.
    case "match_count_scale": {
      if (!Array.isArray(submitted)) {
        earned = 0;
        break;
      }
      const correctSet     = new Set(entry.answer as string[]);
      const scale          = entry.score_scale ?? [];
      const maxSelectable  = Math.max(scale.length - 1, 0);
      const uniqueSelected = Array.from(new Set(submitted as string[]));

      if (uniqueSelected.length === 0 || uniqueSelected.length > maxSelectable) {
        earned = 0;
        break;
      }

      const matchCount = uniqueSelected.filter(sel => correctSet.has(sel)).length;
      earned = scale[matchCount] ?? 0;
      break;
    }

    case "partial_per_pair": {
      if (typeof submitted !== "object" || Array.isArray(submitted) || submitted === null) {
        earned = 0;
        break;
      }
      const correctMap = entry.answer as Record<string, string>;
      const subMap     = submitted   as Record<string, string>;
      const perPair    = entry.score_per_pair ?? 1;
      let pairs = 0;
      for (const [k, v] of Object.entries(correctMap)) {
        if (subMap[k] === v) pairs++;
      }
      earned = pairs * perPair;
      break;
    }

    default:
      earned = 0;
  }

  const isCorrect = earned >= maxScore;
  return {
    questionId: qId, title, score: earned, maxScore, correct: isCorrect,
    feedback: isCorrect ? entry.feedback_correct : entry.feedback_incorrect,
  };
}

/** Strip undefined values so Firestore doesn't reject the document. */
function sanitize<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export async function POST(req: NextRequest) {
  try {
    let body: GradeRequest;
    try {
      body = (await req.json()) as GradeRequest;
    } catch {
      return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 });
    }

    const { participantId, name, department, code, answers } = body ?? {};

    const answerKey     = answerKeyData as { answers: Record<string, AnswerEntry> };
    const qData         = questionsData as { challenge: { total_score: number }; questions: { id: string; title: string }[] };

    const safeAnswers = answers && typeof answers === "object" && !Array.isArray(answers)
      ? answers
      : {};

    const results: QuestionResult[] = [];
    let totalScore = 0;
    let maxTotal   = 0;

    for (const q of qData.questions) {
      const entry = answerKey.answers[q.id];
      if (!entry) continue;
      const submitted = safeAnswers[q.id] ?? undefined;
      const r = gradeQuestion(q.id, entry, q.title, submitted);
      results.push(r);
      totalScore += r.score;
      maxTotal   += r.maxScore;
    }

    const percentage  = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
    const submittedAt = new Date().toISOString();

    // ── Firestore save (best-effort) ──────────────────────────────────────────
    if (participantId) {
      try {
        const db = getAdminDb();

        let sessionId: string | null = null;
        try {
          const partDoc = await db.collection("participants").doc(participantId).get();
          sessionId = (partDoc.data()?.sessionId as string) ?? null;
        } catch {
          // sessionId stays null
        }

        await db.collection("submissions").add(sanitize({
          participantId,
          code:            code ?? null,
          sessionId,
          name:            name ?? null,
          department:      department ?? null,
          answers:         safeAnswers,
          totalScore,
          maxScore:        maxTotal,
          percentage,
          questionResults: results,
          submittedAt:     FieldValue.serverTimestamp(),
        }));

        await db.collection("participants").doc(participantId).update({
          finalScore:      totalScore,
          lastSubmittedAt: FieldValue.serverTimestamp(),
          status:          "submitted",
        });
      } catch (fsErr) {
        console.error("[/api/grade] Firestore save failed:", fsErr instanceof Error ? fsErr.message : fsErr);
      }
    }

    console.log("[/api/grade] graded", JSON.stringify({ name, totalScore, maxTotal, percentage }));

    const response: GradeResponse = { totalScore, maxScore: maxTotal, percentage, results, submittedAt };
    return NextResponse.json(response);

  } catch (err) {
    console.error("[/api/grade] unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "채점 중 오류가 발생했습니다." }, { status: 500 });
  }
}
