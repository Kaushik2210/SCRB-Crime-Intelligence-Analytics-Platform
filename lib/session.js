import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Server-side session lookup for route handlers and server components. */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Returns the authenticated employee or null. Route handlers should check for
 * null and return a 401 themselves, e.g.:
 *   const user = await getSessionUser();
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function getSessionUser() {
  const session = await getSession();
  return session?.user ?? null;
}
