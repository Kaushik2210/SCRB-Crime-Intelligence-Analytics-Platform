import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCaseScopeFilter } from "@/lib/scope";
import { getDashboardSummary } from "@/lib/dashboard";
import { getRiskTiles, getAnomalyAlerts } from "@/lib/risk";
import { buildIntelligenceReportHtml } from "@/lib/reportHtml";
import { renderHtmlToPdfBuffer } from "@/lib/pdfReport";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scopeFilter = getCaseScopeFilter(user);
  const [summary, riskTiles, anomalies] = await Promise.all([
    getDashboardSummary(user),
    getRiskTiles(scopeFilter),
    getAnomalyAlerts(scopeFilter),
  ]);

  const html = buildIntelligenceReportHtml({ session: user, summary, riskTiles, anomalies });
  const pdfBuffer = await renderHtmlToPdfBuffer(html);

  const filename = `scrb-intelligence-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
