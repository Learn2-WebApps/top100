import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isAdminRequest } from "@/lib/adminSession";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

function tsToIso(val: unknown): string | null {
  if (!val) return null;
  if (typeof (val as { toDate?: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

// GET /api/admin/codes — list active (non-deleted) codes with sessionId-based counts
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const db = getAdminDb();

    const [codesSnap, partSnap, subSnap] = await Promise.all([
      db.collection("accessCodes").get(),
      db.collection("participants").get(),
      db.collection("submissions").get(),
    ]);

    // Index participant counts by sessionId (new) and code (legacy fallback)
    const partBySession: Record<string, number> = {};
    const partByCode:    Record<string, number> = {};
    for (const d of partSnap.docs) {
      const data = d.data();
      const sid  = data.sessionId as string | undefined;
      const code = data.code      as string | undefined;
      if (sid)  partBySession[sid]  = (partBySession[sid]  ?? 0) + 1;
      if (code) partByCode[code]    = (partByCode[code]    ?? 0) + 1;
    }

    // Index submission counts by sessionId (new) and code (legacy fallback)
    const subBySession: Record<string, number> = {};
    const subByCode:    Record<string, number> = {};
    for (const d of subSnap.docs) {
      const data = d.data();
      const sid  = data.sessionId as string | undefined;
      const code = data.code      as string | undefined;
      if (sid)  subBySession[sid]  = (subBySession[sid]  ?? 0) + 1;
      if (code) subByCode[code]    = (subByCode[code]    ?? 0) + 1;
    }

    const codes = codesSnap.docs
      .filter(d => d.data().deleted !== true)
      .map(d => {
        const data      = d.data();
        const sessionId = data.sessionId as string | undefined;
        const codeStr   = data.code      as string;

        const participantCount = sessionId
          ? (partBySession[sessionId] ?? 0)
          : (partByCode[codeStr]     ?? 0);
        const submissionCount  = sessionId
          ? (subBySession[sessionId] ?? 0)
          : (subByCode[codeStr]      ?? 0);

        return {
          code:             codeStr,
          sessionId:        sessionId ?? null,
          title:            data.title  as string,
          active:           data.active as boolean,
          createdAt:        tsToIso(data.createdAt),
          createdBy:        (data.createdBy as string) ?? "",
          participantCount,
          submissionCount,
        };
      })
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });

    return NextResponse.json({ codes });
  } catch (err) {
    console.error("[GET /api/admin/codes]", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/admin/codes — create (or re-create after soft-delete) a code
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const { code, title } = (await req.json()) as { code?: string; title?: string };

    if (!title?.trim()) {
      return NextResponse.json(
        { ok: false, error: "INVALID_TITLE", message: "교육명을 입력하세요." },
        { status: 400 }
      );
    }
    if (!/^\d{4}$/.test(code ?? "")) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CODE", message: "4자리 숫자 코드를 입력하세요." },
        { status: 400 }
      );
    }

    const db  = getAdminDb();
    const ref = db.collection("accessCodes").doc(code!);
    const existing = await ref.get();

    if (existing.exists) {
      return NextResponse.json(
        { ok: false, error: "CODE_ALREADY_EXISTS", message: `코드 ${code}는 이미 존재합니다.` },
        { status: 409 }
      );
    }

    const sessionId = crypto.randomUUID();
    await ref.set({
      code,
      sessionId,
      title:     title!.trim(),
      active:    true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: "관리자",
    });

    return NextResponse.json({ ok: true, code, sessionId });
  } catch (err) {
    console.error("[POST /api/admin/codes]", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "코드 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
