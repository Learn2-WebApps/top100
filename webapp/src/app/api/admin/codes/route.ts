import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function unauthorized() {
  return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
}

function tsToIso(val: unknown): string | null {
  if (!val) return null;
  if (typeof (val as { toDate?: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

// GET /api/admin/codes — list all codes with participant & submission counts
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const db = getAdminDb();

    const [codesSnap, partSnap, subSnap] = await Promise.all([
      db.collection("accessCodes").orderBy("createdAt", "desc").get(),
      db.collection("participants").get(),
      db.collection("submissions").get(),
    ]);

    const participantCounts: Record<string, number> = {};
    partSnap.docs.forEach(d => {
      const code = d.data().code as string;
      if (code) participantCounts[code] = (participantCounts[code] ?? 0) + 1;
    });

    const submissionCounts: Record<string, number> = {};
    subSnap.docs.forEach(d => {
      const code = d.data().code as string;
      if (code) submissionCounts[code] = (submissionCounts[code] ?? 0) + 1;
    });

    const codes = codesSnap.docs.map(d => {
      const data = d.data();
      return {
        code:             data.code as string,
        title:            data.title as string,
        active:           data.active as boolean,
        createdAt:        tsToIso(data.createdAt),
        createdBy:        (data.createdBy as string) ?? "",
        participantCount: participantCounts[data.code as string] ?? 0,
        submissionCount:  submissionCounts[data.code as string] ?? 0,
      };
    });

    return NextResponse.json({ codes });
  } catch (err) {
    console.error("[GET /api/admin/codes]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/admin/codes — create new code
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const { code, title } = (await req.json()) as { code?: string; title?: string };

    if (!title?.trim()) {
      return NextResponse.json({ error: "교육명을 입력하세요." }, { status: 400 });
    }
    if (!/^\d{4}$/.test(code ?? "")) {
      return NextResponse.json({ error: "4자리 숫자 코드를 입력하세요." }, { status: 400 });
    }

    const db  = getAdminDb();
    const ref = db.collection("accessCodes").doc(code!);
    const existing = await ref.get();
    if (existing.exists) {
      return NextResponse.json({ error: `코드 ${code}는 이미 존재합니다.` }, { status: 409 });
    }

    await ref.set({
      code,
      title:     title!.trim(),
      active:    true,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: null,
      createdBy: "관리자",
    });

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    console.error("[POST /api/admin/codes]", err);
    return NextResponse.json({ error: "코드 생성에 실패했습니다." }, { status: 500 });
  }
}
