import { assessmentReport } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

export default async function AssessmentReport() {
  const ctx = await requirePermission("reports.view");
  const rows = await assessmentReport(ctx.db);

  const totalAttempts = rows.reduce((s, r) => s + r.totalAttempts, 0);
  const totalPassed = rows.reduce((s, r) => s + r.passCount, 0);
  const overallPassRate = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0;
  const avgScore = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.avgScore, 0) / rows.length) : 0;

  const activeRows = rows.filter((r) => r.totalAttempts > 0);
  const topAssessments = [...activeRows].sort((a, b) => b.passRate - a.passRate).slice(0, 3);
  const strugglingAssessments = [...activeRows].sort((a, b) => a.passRate - b.passRate).slice(0, 3);

  return (
    <AppShell ctx={ctx} active="reports">
      <PageHead
        title={t("reports.assessment.title")}
        sub={t("reports.assessment.sub")}
        action={
          <Link href="/admin/reports/export?category=assessment" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {t("reports.export_csv")}
          </Link>
        }
      />

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/reports" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.back")}
        </Link>
      </div>

      <div className="report-kpi-strip" role="region" aria-label="Summary metrics">
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{rows.length}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_assessments")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{totalAttempts}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_attempts")}</div>
        </div>
        <div className={`report-kpi-stat${totalAttempts > 0 && overallPassRate < 50 ? " report-kpi-stat--danger" : totalAttempts > 0 && overallPassRate < 70 ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{totalAttempts > 0 ? `${overallPassRate}%` : "—"}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.overall_pass_rate")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{rows.length > 0 ? `${avgScore}%` : "—"}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.avg_score")}</div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="report-chart-container">
          <div className="report-chart-title">{t("reports.assessment.chart_title")}</div>
          {activeRows.length === 0 ? (
            <div className="report-chart-empty">{t("reports.empty")}</div>
          ) : (
            activeRows.map((row) => {
              const tone = row.passRate >= 70 ? "" : row.passRate >= 50 ? "--warning" : "--danger";
              return (
                <div key={row.assessmentId} className="report-bar-row">
                  <div className="report-bar-row-label" title={row.itemTitle}>{row.itemTitle}</div>
                  <div className="report-bar-track">
                    <div className={`report-bar-fill${tone}`} style={{ width: `${row.passRate}%` }} />
                  </div>
                  <div className="report-bar-pct">{row.totalAttempts > 0 ? `${row.passRate}%` : "—"}</div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeRows.length > 0 && (
        <div className="report-insight-row">
          <div className="report-insight-panel">
            <div className="report-insight-title">{t("reports.insight.top_assessments")}</div>
            {topAssessments.map((r, i) => (
              <div key={r.assessmentId} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.itemTitle}</div>
                <div className="report-insight-score">{r.passRate}% pass</div>
              </div>
            ))}
          </div>
          <div className="report-insight-panel report-insight-panel--danger">
            <div className="report-insight-title">{t("reports.insight.struggling")}</div>
            {strugglingAssessments.map((r, i) => (
              <div key={r.assessmentId} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.itemTitle}</div>
                <div className="report-insight-score">{r.passRate}% pass</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        {rows.length === 0 ? (
          <p className="sub">{t("reports.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("reports.assessment.columns.item")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.assessment.columns.attempts")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.assessment.columns.people")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.assessment.columns.passed")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.assessment.columns.failed")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.assessment.columns.pass_rate")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.assessment.columns.avg_score")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.assessmentId}>
                    <td>{row.itemTitle}</td>
                    <td style={{ textAlign: "right" }}>{row.totalAttempts}</td>
                    <td style={{ textAlign: "right" }}>{row.uniquePeople}</td>
                    <td style={{ textAlign: "right" }}>{row.passCount}</td>
                    <td style={{ textAlign: "right" }}>{row.failCount}</td>
                    <td style={{ textAlign: "right" }}>
                      <Badge tone={row.passRate >= 70 ? "success" : row.passRate >= 50 ? "warning" : "danger"}>
                        {row.passRate}%
                      </Badge>
                    </td>
                    <td style={{ textAlign: "right" }}>{row.avgScore}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
