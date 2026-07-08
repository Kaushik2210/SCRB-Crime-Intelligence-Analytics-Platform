import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { resolveAllowedDistrictId } from "@/lib/scope";
import { getDistrictHotspots } from "@/lib/geo";

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { districtId: districtIdParam } = await params;
  const districtId = Number(districtIdParam);
  const allowedId = resolveAllowedDistrictId(user, districtId);
  if (allowedId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const sinceDays = daysParam ? Number(daysParam) : undefined;

  const hotspots = await getDistrictHotspots(allowedId, { sinceDays });
  return NextResponse.json({ hotspots });
}
