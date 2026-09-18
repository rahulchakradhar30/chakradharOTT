import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow login page and API routes
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Protect admin and sub-admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/sub-admin")) {
    const session = request.cookies.get("admin-session")?.value;

    if (!session) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/sub-admin/:path*"],
};