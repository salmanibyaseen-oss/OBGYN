import { NextRequest, NextResponse } from "next/server";

// باسورد واحد مشترك للريسبشن والدكتور، متخزن في متغير بيئة STAFF_PASSWORD
// (لاحقًا لو حبيت تفرق صلاحيات الريسبشن عن الدكتور، تقدر تعمل باسوردين منفصلين
// وتخزن في الكوكي أي دور بالظبط)
export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!password || password !== process.env.STAFF_PASSWORD) {
    return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("staff_session", "valid", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 ساعة
    path: "/",
  });
  return res;
}
