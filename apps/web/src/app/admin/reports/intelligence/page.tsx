import { intelligenceReport } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

export default async function IntelligenceReport() {
  const ctx = await requirePermission("reports.view");
  const rows = await intelligenceReport(ctx.db);

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

      <div style={{ marginBottom: 12 }}>
        <Link href="/admin/reports" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.back")}
        </Link>
      </div>

      {rows.length > 0 && (
        <div className="report-chart" style={{ marginBottom: 8 }}>
          <div className="report-chart-title">{t("reports.intelligence.chart_title")}</div>
          {rows.map((row) => {
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
          })}
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
