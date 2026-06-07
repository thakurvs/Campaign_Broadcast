import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  // Public routes - allow access
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register")
  ) {
    return NextResponse.next();
  }

  // Not logged in - redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin routes - only allow ADMIN role
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dashboard routes - redirect ADMIN to admin panel
  if (pathname.startsWith("/dashboard") && token.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/campaigns/:path*",
    "/api/search/:path*",
  ],
};
