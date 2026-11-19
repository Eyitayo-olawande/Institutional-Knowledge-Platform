import { intelligenceReport } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

export default async function IntelligenceReport() {
  const ctx = await requirePermission("reports.view");
  const rows = await intelligenceReport(ctx.db);

  const totalStaff = rows.reduce((s, r) => s + r.staffCount, 0);
  const totalAttempts = rows.reduce((s, r) => s + r.assessmentAttempts, 0);

  const activeDepts = rows.filter((r) => r.pathsEnrolled > 0);
  const avgCompletion = activeDepts.length > 0
    ? Math.round(activeDepts.reduce((s, r) => s + r.completionRate, 0) / activeDepts.length)
    : 0;
  const avgPassRate = totalAttempts > 0
    ? Math.round(rows.reduce((s, r) => s + r.assessmentAttempts * r.assessmentPassRate, 0) / totalAttempts)
    : 0;

  const topDepts = [...activeDepts].sort((a, b) => b.completionRate - a.completionRate).slice(0, 3);
  const attentionDepts = rows.filter((r) => r.staffCount > 0 && r.pathsEnrolled === 0).slice(0, 3);

  return (
    <AppShell ctx={ctx} active="reports">
      <PageHead
        title={t("reports.intelligence.title")}
        sub={t("reports.intelligence.sub")}
        action={
          <Link href="/admin/reports/export?category=intelligence" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
          <div className="report-kpi-stat-label">{t("reports.kpi.departments")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{totalStaff}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_staff")}</div>
        </div>
        <div className={`report-kpi-stat${activeDepts.length > 0 && avgCompletion < 40 ? " report-kpi-stat--danger" : activeDepts.length > 0 && avgCompletion < 70 ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{activeDepts.length > 0 ? `${avgCompletion}%` : "—"}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.avg_completion")}</div>
        </div>
        <div className={`report-kpi-stat${totalAttempts > 0 && avgPassRate < 50 ? " report-kpi-stat--danger" : totalAttempts > 0 && avgPassRate < 70 ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{totalAttempts > 0 ? `${avgPassRate}%` : "—"}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.avg_pass_rate")}</div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="report-chart-container">
          <div className="report-chart-title">{t("reports.intelligence.chart_title")}</div>
          {activeDepts.length === 0 ? (
            <div className="report-chart-empty">{t("reports.empty")}</div>
          ) : (
            activeDepts.map((row) => {
              const tone = row.completionRate >= 70 ? "" : row.completionRate >= 40 ? "--warning" : "--danger";
              return (
                <div key={row.departmentId} className="report-bar-row">
                  <div className="report-bar-row-label" title={row.department}>{row.department}</div>
                  <div className="report-bar-track">
                    <div className={`report-bar-fill${tone}`} style={{ width: `${row.completionRate}%` }} />
                  </div>
                  <div className="report-bar-pct">{row.completionRate}%</div>
                </div>
              );
            })
          )}
        </div>
      )}

      {(topDepts.length > 0 || attentionDepts.length > 0) && (
        <div className="report-insight-row">
          <div className="report-insight-panel">
            <div className="report-insight-title">{t("reports.insight.top_depts")}</div>
            {topDepts.length === 0 ? (
              <div className="report-insight-empty">{t("reports.insight.no_data")}</div>
            ) : topDepts.map((r, i) => (
              <div key={r.departmentId} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.department}</div>
                <div className="report-insight-score">{r.completionRate}%</div>
              </div>
            ))}
          </div>
          <div className="report-insight-panel report-insight-panel--attention">
            <div className="report-insight-title">{t("reports.insight.attention_depts")}</div>
            {attentionDepts.length === 0 ? (
              <div className="report-insight-empty">All departments enrolled</div>
            ) : attentionDepts.map((r, i) => (
              <div key={r.departmentId} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.department}</div>
                <div className="report-insight-score">0 enrolled</div>
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
                  <th>{t("reports.intelligence.columns.department")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.intelligence.columns.staff")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.intelligence.columns.enrolled")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.intelligence.columns.modules")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.intelligence.columns.completion_rate")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.intelligence.columns.attempts")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.intelligence.columns.pass_rate")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.intelligence.columns.nominations")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.departmentId}>
                    <td>{row.department}</td>
                    <td style={{ textAlign: "right" }}>{row.staffCount}</td>
                    <td style={{ textAlign: "right" }}>{row.pathsEnrolled}</td>
                    <td style={{ textAlign: "right" }}>{row.modulesCompleted}</td>
                    <td style={{ textAlign: "right" }}>
                      {row.modulesCompleted > 0 || row.pathsEnrolled > 0 ? (
                        <Badge tone={row.completionRate >= 70 ? "success" : row.completionRate >= 40 ? "warning" : "danger"}>
                          {row.completionRate}%
                        </Badge>
                      ) : (
                        <span className="sub">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>{row.assessmentAttempts}</td>
                    <td style={{ textAlign: "right" }}>
                      {row.assessmentAttempts > 0 ? (
                        <Badge tone={row.assessmentPassRate >= 70 ? "success" : row.assessmentPassRate >= 50 ? "warning" : "danger"}>
                          {row.assessmentPassRate}%
                        </Badge>
                      ) : (
                        <span className="sub">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>{row.nominationsCount}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/admin/reports/people?dept=${encodeURIComponent(row.department)}`} className="report-drilldown-link">
                        {t("reports.insight.view_people")}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M7 17L17 7M17 7H7M17 7v10" />
                        </svg>
                      </Link>
                    </td>
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
