import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { getAdminDb } from "@/lib/firebaseAdmin";

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

// GET /api/admin/codes/[code]/results — code doc + submissions (sessionId-scoped)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const { code } = await params;
    const db = getAdminDb();

    const codeSnap = await db.collection("accessCodes").doc(code).get();

    if (!codeSnap.exists || codeSnap.data()?.deleted === true) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "코드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const codeData  = codeSnap.data()!;
    const sessionId = codeData.sessionId as string | undefined;

    // Query submissions scoped to the current sessionId.
    // Fall back to code-only query for legacy docs without sessionId.
    const subQuery = sessionId
      ? db.collection("submissions").where("sessionId", "==", sessionId)
      : db.collection("submissions").where("code", "==", code);

    const subSnap = await subQuery.get();

    const codeDoc = {
      code:      codeData.code   as string,
      sessionId: sessionId       ?? null,
      title:     codeData.title  as string,
      active:    codeData.active as boolean,
    };

    const submissions = subSnap.docs
      .map(d => {
        const data = d.data();
        return {
          id:              d.id,
          name:            data.name            as string,
          department:      (data.department     as string) ?? "",
          totalScore:      data.totalScore      as number,
          maxScore:        data.maxScore        as number,
          percentage:      data.percentage      as number,
          questionResults: data.questionResults as unknown[],
          submittedAt:     tsToIso(data.submittedAt),
          code:            data.code            as string,
          sessionId:       (data.sessionId      as string) ?? null,
        };
      })
      .sort((a, b) => {
        const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return at - bt;
      });

    return NextResponse.json({ codeDoc, submissions });
  } catch (err) {
    console.error("[GET /api/admin/codes/[code]/results]", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
