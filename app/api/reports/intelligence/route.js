import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getDashboardSummary } from "@/lib/dashboard";
import { buildIntelligenceReportHtml } from "@/lib/reportHtml";
import { renderHtmlToPdfBuffer } from "@/lib/pdfReport";
import { isDemoMode } from "@/lib/demoData";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // getDashboardSummary already computes riskTiles/anomalies internally and
  // returns them (additive fields) — reuse those instead of calling
  // getRiskTiles/getAnomalyAlerts again, which would retrain
  // lib/riskModel.js's Random Forest a second time for this one request.
  const summary = await getDashboardSummary(user);
  const { riskTiles, anomalies } = summary;

  const html = buildIntelligenceReportHtml({ session: user, summary, riskTiles, anomalies });

  // Catalyst SmartBrowz (PDF generation) is only reachable from a genuinely
  // deployed Catalyst app — it's unavailable in local demo mode and also under
  // `catalyst serve`. Rather than 500 the whole report, fall back to a
  // self-contained, print-ready HTML page (it carries a "Print / Save as PDF"
  // button and print styles), which is a usable report everywhere.
  if (!isDemoMode()) {
    try {
      const pdfBuffer = await renderHtmlToPdfBuffer(html);
      const filename = `scrb-intelligence-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (err) {
      console.warn("SmartBrowz PDF generation unavailable, serving HTML report instead:", err?.message ?? err);
    }
  }

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
