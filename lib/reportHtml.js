/**
 * Plain server-side HTML templating for the "Download Intelligence Report"
 * PDF export (Catalyst SmartBrowz renders whatever HTML string it's given —
 * no React/client rendering involved, so this is intentionally template
 * literals, not JSX).
 */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const STYLES = `
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1f2e; margin: 0; padding: 0 8px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #d8dce6; padding-bottom: 4px; }
  .meta { font-size: 11px; color: #5a6478; margin-bottom: 16px; }
  .kpi-row { display: flex; gap: 12px; margin-bottom: 8px; }
  .kpi { flex: 1; border: 1px solid #d8dce6; border-radius: 6px; padding: 10px 12px; }
  .kpi .label { font-size: 10px; color: #5a6478; text-transform: uppercase; letter-spacing: 0.03em; }
  .kpi .value { font-size: 20px; font-weight: 600; margin-top: 2px; }
  .summary { font-size: 12px; line-height: 1.6; background: #f4f6fb; border-radius: 6px; padding: 12px 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e4e7ee; }
  th { color: #5a6478; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.03em; }
  .tier-badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
  .tier-5, .tier-4 { background: #fde2e2; color: #9c1f1f; }
  .tier-3 { background: #fdf1d6; color: #8a5a00; }
  .tier-1, .tier-2 { background: #dff3e6; color: #1b6b3a; }
`;

/** Builds the full report HTML for the dashboard + risk pages, scoped to the requesting session. */
export function buildIntelligenceReportHtml({ session, summary, riskTiles, anomalies }) {
  const generatedAt = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const scopeLabel = session.isStateLevel ? "Statewide" : session.districtName ?? "District";

  const topTiles = riskTiles.slice(0, 15);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${STYLES}</style></head>
<body>
  <h1>SCRB Crime Intelligence Report</h1>
  <p class="meta">${escapeHtml(scopeLabel)} · Generated ${escapeHtml(generatedAt)} by ${escapeHtml(session.name)} (${escapeHtml(session.designationName)})</p>

  <div class="kpi-row">
    <div class="kpi"><div class="label">Total cases in scope</div><div class="value">${summary.totalCases}</div></div>
    <div class="kpi"><div class="label">Cases, last 90 days</div><div class="value">${summary.recentCases}</div></div>
    <div class="kpi"><div class="label">Active hotspots</div><div class="value">${summary.hotspotCount}</div></div>
    <div class="kpi"><div class="label">Trend anomalies</div><div class="value">${summary.anomalyCount}</div></div>
  </div>

  <h2>Strategic summary</h2>
  <p class="summary">${escapeHtml(summary.strategicSummary)}</p>

  ${
    anomalies.length > 0
      ? `<h2>Anomaly callouts</h2>
  <table>
    <thead><tr><th>Unit</th><th>District</th><th>Detail</th></tr></thead>
    <tbody>
      ${anomalies
        .slice(0, 12)
        .map(
          (a) =>
            `<tr><td>${escapeHtml(a.unitName)}</td><td>${escapeHtml(a.districtName ?? "—")}</td><td>${escapeHtml(a.message)}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : ""
  }

  <h2>Top crime categories, last 90 days</h2>
  <table>
    <thead><tr><th>Category</th><th>Cases</th></tr></thead>
    <tbody>
      ${summary.topCategories.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${c.count}</td></tr>`).join("")}
    </tbody>
  </table>

  <h2>Predictive risk tiles</h2>
  <table>
    <thead><tr><th>Unit</th><th>District</th><th>Category</th><th>Recent</th><th>Typical</th><th>Forecast next qtr</th><th>Tier</th></tr></thead>
    <tbody>
      ${topTiles
        .map(
          (t) =>
            `<tr>
              <td>${escapeHtml(t.unitName)}</td>
              <td>${escapeHtml(t.districtName ?? "—")}</td>
              <td>${escapeHtml(t.crimeSubHeadName)}</td>
              <td>${t.recentCount}</td>
              <td>${t.baselineAvgPer90}</td>
              <td>${t.predictedNextCount ?? "—"}</td>
              <td><span class="tier-badge tier-${t.tier}">Tier ${t.tier}</span></td>
            </tr>`
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;
}
