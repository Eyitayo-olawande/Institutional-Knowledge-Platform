import { peopleReport } from "@mantle/db/tenant";
import { Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

type Props = {
  searchParams: Promise<{ dept?: string }>;
};

export default async function PeopleReport({ searchParams }: Props) {
  const ctx = await requirePermission("reports.view");
  const rows = await peopleReport(ctx.db);
  const sp = await searchParams;
  const deptFilter = sp.dept ?? null;

  const displayRows = deptFilter ? rows.filter((r) => r.department === deptFilter) : rows;

  const totalEnrolled = rows.filter((r) => r.pathsEnrolled > 0).length;
  const totalModules = rows.reduce((s, r) => s + r.modulesCompleted, 0);
  const totalNominations = rows.reduce((s, r) => s + r.nominationsCount, 0);
  const totalPaths = rows.reduce((s, r) => s + r.pathsEnrolled, 0);

  const deptEngagement: Record<string, number> = {};
  for (const r of rows) {
    if (r.department) {
      deptEngagement[r.department] = (deptEngagement[r.department] ?? 0) + r.modulesCompleted;
    }
  }
  const deptEngagementRows = Object.entries(deptEngagement)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxDeptModules = deptEngagementRows[0]?.[1] ?? 1;

  const topPeople = [...rows].sort((a, b) => b.modulesCompleted - a.modulesCompleted).slice(0, 3);

  return (
    <AppShell ctx={ctx} active="reports">
      <PageHead
        title={t("reports.people.title")}
        sub={t("reports.people.sub")}
        action={
          <Link href="/admin/reports/export?category=people" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
          <div className="report-kpi-stat-label">{t("reports.kpi.total_employees")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{totalEnrolled}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_enrolled")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{totalPaths}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_paths")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{totalModules}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.modules_completed")}</div>
        </div>
        <div className={`report-kpi-stat${totalNominations > 0 ? "" : " report-kpi-stat--neutral"}`}>
          <div className="report-kpi-stat-value">{totalNominations}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_nominations")}</div>
        </div>
      </div>

      {deptEngagementRows.length > 0 && maxDeptModules > 0 && (
        <div className="report-chart-container">
          <div className="report-chart-title">{t("reports.insight.engagement_chart")}</div>
          {deptEngagementRows.map(([dept, count]) => (
            <div key={dept} className="report-bar-row">
              <div className="report-bar-row-label" title={dept}>{dept}</div>
              <div className="report-bar-track">
                <div className="report-bar-fill" style={{ width: `${Math.round((count / maxDeptModules) * 100)}%` }} />
              </div>
              <div className="report-bar-pct">{count}</div>
            </div>
          ))}
        </div>
      )}

      {topPeople.length > 0 && (
        <div className="report-insight-row">
          <div className="report-insight-panel">
            <div className="report-insight-title">{t("reports.insight.top_people")}</div>
            {topPeople.map((r, i) => (
              <div key={r.personId} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.fullName}</div>
                <div className="report-insight-score">{r.modulesCompleted} modules</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deptFilter && (
        <div className="report-filter-chip">
          <span>{t("reports.insight.people_dept_filter")}: <strong>{deptFilter}</strong></span>
          <Link href="/admin/reports/people">{t("reports.insight.clear_filter")}</Link>
        </div>
      )}

      <Card>
        {displayRows.length === 0 ? (
          <p className="sub">{t("reports.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("reports.people.columns.name")}</th>
                  <th>{t("reports.people.columns.department")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.people.columns.paths")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.people.columns.modules")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.people.columns.nominations")}</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr key={row.personId}>
                    <td>{row.fullName}</td>
                    <td>{row.department || <span className="sub">—</span>}</td>
                    <td style={{ textAlign: "right" }}>{row.pathsEnrolled}</td>
                    <td style={{ textAlign: "right" }}>{row.modulesCompleted}</td>
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
