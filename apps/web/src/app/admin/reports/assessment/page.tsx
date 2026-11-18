import { assessmentReport } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

export default async function AssessmentReport() {
  const ctx = await requirePermission("reports.view");
  const rows = await assessmentReport(ctx.db);

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

      <div style={{ marginBottom: 12 }}>
        <Link href="/admin/reports" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.back")}
        </Link>
      </div>

      {rows.length > 0 && (
        <div className="report-chart" style={{ marginBottom: 8 }}>
          <div className="report-chart-title">{t("reports.assessment.chart_title")}</div>
          {rows.map((row) => {
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
