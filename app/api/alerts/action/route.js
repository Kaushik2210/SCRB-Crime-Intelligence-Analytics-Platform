import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { setAlertStatus } from "@/lib/alerts";

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.alertKey) {
    return NextResponse.json({ error: "alertKey is required" }, { status: 400 });
  }

  const status = body.status ?? null;
  if (status !== null && status !== "INVESTIGATING" && status !== "DISMISSED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await setAlertStatus(user, body.alertKey, status);
  return NextResponse.json(result);
}
