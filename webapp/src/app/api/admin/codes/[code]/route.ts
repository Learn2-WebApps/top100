import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

// PATCH /api/admin/codes/[code] — toggle active
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const { code } = await params;
    const body = (await req.json()) as { active?: boolean };

    if (typeof body.active !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY", message: "active 필드가 필요합니다." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection("accessCodes").doc(code).update({ active: body.active });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/admin/codes/[code]]", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "업데이트에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/codes/[code] — soft delete (preserves history, allows code reuse)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const { code } = await params;
    const db = getAdminDb();
    await db.collection("accessCodes").doc(code).update({
      deleted:   true,
      active:    false,
      deletedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/codes/[code]]", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
