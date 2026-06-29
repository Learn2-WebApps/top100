import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// GET /api/admin/codes/[code]/results — code doc + submissions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const { code } = await params;
    const db = getAdminDb();

    const [codeSnap, subSnap] = await Promise.all([
      db.collection("accessCodes").doc(code).get(),
      db.collection("submissions")
        .where("code", "==", code)
        .orderBy("submittedAt", "asc")
        .get(),
    ]);

    if (!codeSnap.exists) {
      return NextResponse.json({ error: "코드를 찾을 수 없습니다." }, { status: 404 });
    }

    const codeData = codeSnap.data()!;
    const codeDoc = {
      code:   codeData.code   as string,
      title:  codeData.title  as string,
      active: codeData.active as boolean,
    };

    const submissions = subSnap.docs.map(d => {
      const data = d.data();
      return {
        id:              d.id,
        name:            data.name            as string,
        department:      data.department      as string ?? "",
        totalScore:      data.totalScore      as number,
        maxScore:        data.maxScore        as number,
        percentage:      data.percentage      as number,
        questionResults: data.questionResults as unknown[],
        submittedAt:     tsToIso(data.submittedAt),
        code:            data.code            as string,
      };
    });

    return NextResponse.json({ codeDoc, submissions });
  } catch (err) {
    console.error("[GET /api/admin/codes/[code]/results]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
