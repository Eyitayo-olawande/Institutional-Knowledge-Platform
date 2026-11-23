import { learningReport } from "@mantle/db/tenant";
import { Badge, type BadgeTone, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

const STATUS_TONE: Record<string, BadgeTone> = { pending: "warning", approved: "success", rejected: "danger" };

export default async function LearningReport() {
  const ctx = await requirePermission("reports.view");
  const { deptRows, nominationSummary } = await learningReport(ctx.db);

  const totalEnrolled = deptRows.reduce((s, r) => s + r.enrolledCount, 0);
  const totalCompleted = deptRows.reduce((s, r) => s + r.completedModules, 0);
  const totalStarted = deptRows.reduce((s, r) => s + r.totalModulesStarted, 0);
  const avgCompletion = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;
  const totalPending = nominationSummary.find((r) => r.status === "pending")?.count ?? 0;

  const activeDepts = deptRows.filter((r) => r.totalModulesStarted > 0);
  const topDepts = [...activeDepts].sort((a, b) => b.completionRate - a.completionRate).slice(0, 3);
  const attentionDepts = [...activeDepts].sort((a, b) => a.completionRate - b.completionRate).slice(0, 3);

  return (
    <AppShell ctx={ctx} active="reports">
      <PageHead
        title={t("reports.learning.title")}
        sub={t("reports.learning.sub")}
        action={
          <div style={{ display: "inline-flex", gap: 8 }}>
            <Link href="/admin/reports/export?category=learning-dept" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {t("reports.learning.export_dept_csv")}
            </Link>
            <Link href="/admin/reports/export?category=learning-nominations" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {t("reports.learning.export_nominations_csv")}
            </Link>
          </div>
        }
      />

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/reports" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.back")}
        </Link>
      </div>

      <div className="report-kpi-strip" role="region" aria-label="Summary metrics">
        <div className="report-kpi-stat">
          <div className="report-kpi-stat-value">{totalEnrolled}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_enrolled")}</div>
        </div>
        <div className={`report-kpi-stat${avgCompletion < 40 ? " report-kpi-stat--danger" : avgCompletion < 70 ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{totalStarted > 0 ? `${avgCompletion}%` : "—"}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.avg_completion")}</div>
        </div>
        <div className="report-kpi-stat">
          <div className="report-kpi-stat-value">{totalCompleted}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.modules_completed")}</div>
        </div>
        <div className={`report-kpi-stat${totalPending > 0 ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{totalPending}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.pending_nominations")}</div>
        </div>
      </div>

      {deptRows.length > 0 && (
        <div className="report-chart-container">
          <div className="report-chart-title">{t("reports.learning.chart_title")}</div>
          {activeDepts.length === 0 ? (
            <div className="report-chart-empty">{t("reports.empty")}</div>
          ) : (
            activeDepts.map((row) => {
              const tone = row.completionRate >= 70 ? "" : row.completionRate >= 40 ? "--warning" : "--danger";
              return (
                <div key={row.department} className="report-bar-row">
                  <div className="report-bar-row-label" title={row.department}>{row.department}</div>
                  <div className="report-bar-track">
                    <div className={`report-bar-fill${tone}`} style={{ width: `${row.completionRate}%` }} />
                  </div>
                  <div className="report-bar-pct">{row.completionRate}{"%"}</div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeDepts.length > 0 && (
        <div className="report-insight-row">
          <div className="report-insight-panel">
            <div className="report-insight-title">{t("reports.insight.top_depts")}</div>
            {topDepts.length === 0 ? (
              <div className="report-insight-empty">{t("reports.insight.no_data")}</div>
            ) : topDepts.map((r, i) => (
              <div key={r.departmentId} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.department}</div>
                <div className="report-insight-score">{r.completionRate}{"%"}</div>
              </div>
            ))}
          </div>
          <div className="report-insight-panel report-insight-panel--attention">
            <div className="report-insight-title">{t("reports.insight.attention_depts")}</div>
            {attentionDepts.length === 0 ? (
              <div className="report-insight-empty">{t("reports.insight.no_data")}</div>
            ) : attentionDepts.map((r, i) => (
              <div key={r.departmentId} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.department}</div>
                <div className="report-insight-score">{r.completionRate}{"%"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>{t("reports.learning.dept_heading")}</h2>
        {deptRows.length === 0 ? (
          <p className="sub">{t("reports.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("reports.learning.columns.department")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.learning.columns.enrolled")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.learning.columns.completed")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.learning.columns.total")}</th>
                  <th style={{ textAlign: "right" }} title={t("reports.learning.columns.rate_tooltip")}>{t("reports.learning.columns.rate")}{"ⓘ"}</th>
                </tr>
              </thead>
              <tbody>
                {deptRows.map((row) => (
                  <tr key={row.departmentId}>
                    <td>{row.department}</td>
                    <td style={{ textAlign: "right" }}>{row.enrolledCount}</td>
                    <td style={{ textAlign: "right" }}>{row.completedModules}</td>
                    <td style={{ textAlign: "right" }}>{row.totalModulesStarted}</td>
                    <td style={{ textAlign: "right" }}>
                      {row.totalModulesStarted > 0 ? (
                        <Badge tone={row.completionRate >= 70 ? "success" : row.completionRate >= 40 ? "warning" : "danger"}>
                          {row.completionRate}{"%"}
                        </Badge>
                      ) : (
                        <span className="sub">{"—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 style={{ marginBottom: 16 }}>{t("reports.learning.nominations_heading")}</h2>
        {nominationSummary.length === 0 ? (
          <p className="sub">{t("reports.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("reports.learning.nomination_columns.status")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.learning.nomination_columns.count")}</th>
                </tr>
              </thead>
              <tbody>
                {nominationSummary.map((row) => (
                  <tr key={row.status}>
                    <td><Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</Badge></td>
                    <td style={{ textAlign: "right" }}>{row.count}</td>
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
