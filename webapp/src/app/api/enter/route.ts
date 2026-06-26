import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface EnterRequest {
  name: string;
  department: string;
  code: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EnterRequest;
    const { name, department, code } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    if (!/^\d{4}$/.test(code ?? "")) {
      return NextResponse.json({ error: "입장코드는 숫자 4자리여야 합니다." }, { status: 400 });
    }

    let db;
    try {
      db = getAdminDb();
    } catch {
      return NextResponse.json(
        { error: "서버 설정이 완료되지 않았습니다. Firebase 환경변수를 확인하세요." },
        { status: 500 }
      );
    }

    const codeSnap = await db.collection("accessCodes").doc(code).get();

    if (!codeSnap.exists) {
      return NextResponse.json({ error: "존재하지 않는 입장코드입니다." }, { status: 403 });
    }

    const codeData = codeSnap.data()!;

    if (!codeData.active) {
      return NextResponse.json({ error: "비활성화된 입장코드입니다." }, { status: 403 });
    }

    if (codeData.expiresAt && (codeData.expiresAt.toDate() as Date) < new Date()) {
      return NextResponse.json({ error: "만료된 입장코드입니다." }, { status: 403 });
    }

    const ref = await db.collection("participants").add({
      name:             name.trim(),
      department:       (department ?? "").trim(),
      code,
      enteredAt:        FieldValue.serverTimestamp(),
      status:           "entered",
      finalScore:       null,
      lastSubmittedAt:  null,
    });

    return NextResponse.json({
      participantId: ref.id,
      name:          name.trim(),
      department:    (department ?? "").trim(),
      code,
    });
  } catch (err) {
    console.error("[/api/enter]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
