export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/districts/:path*", "/network/:path*", "/risk/:path*", "/alerts/:path*"],
};
