import { NextRequest, NextResponse } from "next/server";

// الصفحات اللي محتاجة تسجيل دخول موظف (ريسبشن أو دكتور)
const PROTECTED_PREFIXES = ["/reception", "/doctor"];

export function middleware(req: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const session = req.cookies.get("staff_session")?.value;
  if (session === "valid") return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/reception/:path*", "/doctor/:path*"],
};
