import { NextRequest, NextResponse } from "next/server";
import { createSessionValue, COOKIE_NAME } from "@/lib/adminSession";

export async function POST(req: NextRequest) {
  try {
    const { password } = (await req.json()) as { password?: string };

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("[/api/admin/login] ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.");
      return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, createSessionValue(), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   60 * 60 * 24,
    });
    return res;
  } catch (err) {
    console.error("[/api/admin/login]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
