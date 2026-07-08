import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getGlobalSearchResults } from "@/lib/search";

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const results = await getGlobalSearchResults(user, q);
  return NextResponse.json(results);
}
