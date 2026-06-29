import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import type { GradeRequest, GradeResponse, QuestionResult } from "@/types";

interface AnswerEntry {
  type: string;
  answer: string | number | string[] | Record<string, string>;
  score: number;
  grading: string;
  feedback_correct: string;
  feedback_incorrect: string;
  score_per_correct?: number;
  penalty_per_wrong?: number;
  min_score?: number;
  score_per_pair?: number;
  tolerance?: number;
}

interface AnswerKey  { answers: Record<string, AnswerEntry>; }
interface QData      { challenge: { total_score: number }; questions: { id: string; title: string }[]; }

function loadJson<T>(relPath: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "..", relPath), "utf-8")) as T;
}

function gradeQuestion(
  qId: string,
  entry: AnswerEntry,
  title: string,
  submitted: string | string[] | Record<string, string> | undefined
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
        earned = n === Number(entry.answer) ? maxScore : 0;
      } else {
        earned = String(submitted) === String(entry.answer) ? maxScore : 0;
      }
      break;
    }

    case "partial_with_penalty": {
      const correctArr = entry.answer as string[];
      const correctSet = new Set(correctArr);
      const subArr     = submitted as string[];
      const subSet     = new Set(subArr);
      const perRight   = entry.score_per_correct ?? 1;
      const perWrong   = entry.penalty_per_wrong  ?? 1;
      const minScore   = entry.min_score ?? 0;

      // Exact match → full marks
      if (correctArr.length === subArr.length && correctArr.every(a => subSet.has(a))) {
        earned = maxScore;
        break;
      }

      let raw = 0;
      for (const sel of subArr) {
        if (correctSet.has(sel)) raw += perRight;
        else raw -= perWrong;
      }
      earned = Math.max(minScore, Math.min(raw, maxScore - 1));
      break;
    }

    case "partial_per_pair": {
      const correctMap = entry.answer as Record<string, string>;
      const subMap     = submitted as Record<string, string>;
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
  return { questionId: qId, title, score: earned, maxScore, correct: isCorrect,
    feedback: isCorrect ? entry.feedback_correct : entry.feedback_incorrect };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GradeRequest;
    const { participantId, name, department, code, answers } = body;

    const answerKey     = loadJson<AnswerKey>("web_data/answer_key.json");
    const questionsData = loadJson<QData>("web_data/questions.json");

    const results: QuestionResult[] = [];
    let totalScore = 0;
    let maxTotal   = 0;

    for (const q of questionsData.questions) {
      const entry = answerKey.answers[q.id];
      if (!entry) continue;
      const r = gradeQuestion(q.id, entry, q.title, answers?.[q.id]);
      results.push(r);
      totalScore += r.score;
      maxTotal   += r.maxScore;
    }

    const percentage  = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
    const submittedAt = new Date().toISOString();

    // ── Firestore save (best-effort, won't fail the response if unavailable) ──
    if (participantId) {
      try {
        const db = getAdminDb();

        await db.collection("submissions").add({
          participantId,
          code,
          name,
          department,
          answers,
          totalScore,
          maxScore: maxTotal,
          percentage,
          questionResults: results,
          submittedAt: FieldValue.serverTimestamp(),
        });

        await db.collection("participants").doc(participantId).update({
          finalScore:      totalScore,
          lastSubmittedAt: FieldValue.serverTimestamp(),
          status:          "submitted",
        });
      } catch (fsErr) {
        // Log but don't fail — grading result is still returned to client
        console.warn("[/api/grade] Firestore save failed:", fsErr);
      }
    }

    console.log(JSON.stringify({ name, totalScore, maxTotal, percentage }, null, 2));

    const response: GradeResponse = { totalScore, maxScore: maxTotal, percentage, results, submittedAt };
    return NextResponse.json(response);

  } catch (err) {
    console.error("[/api/grade]", err);
    return NextResponse.json({ error: "채점 중 오류가 발생했습니다." }, { status: 500 });
  }
}
