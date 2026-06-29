import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { DocumentReference } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

// Delete a list of document refs in Firestore batches (max 500 per batch).
async function deleteRefs(
  db: ReturnType<typeof getAdminDb>,
  refs: DocumentReference[]
): Promise<number> {
  const CHUNK = 499;
  let deleted = 0;
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + CHUNK)) batch.delete(ref);
    await batch.commit();
    deleted += refs.slice(i, i + CHUNK).length;
  }
  return deleted;
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

// DELETE /api/admin/codes/[code] — hard delete: removes code + all linked participants/submissions
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdminRequest(req)) return unauthorized();
  try {
    const { code } = await params;
    const db       = getAdminDb();
    const codeRef  = db.collection("accessCodes").doc(code);
    const codeSnap = await codeRef.get();

    if (!codeSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "코드를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const sessionId = codeSnap.data()?.sessionId as string | undefined;

    // Query participants and submissions scoped to this session.
    // Fall back to code-based query for legacy docs without sessionId.
    let partSnap, subSnap;
    if (sessionId) {
      [partSnap, subSnap] = await Promise.all([
        db.collection("participants").where("sessionId", "==", sessionId).get(),
        db.collection("submissions").where("sessionId", "==", sessionId).get(),
      ]);
    } else {
      [partSnap, subSnap] = await Promise.all([
        db.collection("participants").where("code", "==", code).get(),
        db.collection("submissions").where("code", "==", code).get(),
      ]);
    }

    const allRefs: DocumentReference[] = [
      ...partSnap.docs.map(d => d.ref),
      ...subSnap.docs.map(d => d.ref),
    ];

    // Delete participants and submissions in safe batches
    await deleteRefs(db, allRefs);

    // Delete the access code document itself
    await codeRef.delete();

    return NextResponse.json({
      ok:                  true,
      deletedCode:         code,
      deletedParticipants: partSnap.size,
      deletedSubmissions:  subSnap.size,
    });
  } catch (err) {
    console.error("[DELETE /api/admin/codes/[code]]", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
