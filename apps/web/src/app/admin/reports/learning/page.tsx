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

      <div style={{ marginBottom: 12 }}>
        <Link href="/admin/reports" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.back")}
        </Link>
      </div>

      {deptRows.length > 0 && (
        <div className="report-chart" style={{ marginBottom: 8 }}>
          <div className="report-chart-title">{t("reports.learning.chart_title")}</div>
          {deptRows.map((row) => {
            const tone = row.completionRate >= 70 ? "" : row.completionRate >= 40 ? "--warning" : "--danger";
            return (
              <div key={row.department} className="report-bar-row">
                <div className="report-bar-row-label" title={row.department}>{row.department}</div>
                <div className="report-bar-track">
                  <div className={`report-bar-fill${tone}`} style={{ width: `${row.completionRate}%` }} />
                </div>
                <div className="report-bar-pct">{row.completionRate}%</div>
              </div>
            );
          })}
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
                  <th style={{ textAlign: "right" }} title={t("reports.learning.columns.rate_tooltip")}>{t("reports.learning.columns.rate")} ⓘ</th>
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
                          {row.completionRate}%
                        </Badge>
                      ) : (
                        <span className="sub">—</span>
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
