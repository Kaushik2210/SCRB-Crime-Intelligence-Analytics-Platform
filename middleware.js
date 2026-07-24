import { NextResponse } from "next/server";

// Next 16 rejected the previous `export { default } from "next-auth/middleware"`
// re-export ("must export a function"). Route protection is already enforced
// server-side by app/(app)/layout.jsx (getSession() → redirect to /login), so
// this is a valid pass-through that keeps the matcher wired without duplicating
// that gate here.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/districts/:path*",
    "/network/:path*",
    "/risk/:path*",
    "/alerts/:path*",
    "/cases/:path*",
  ],
};
