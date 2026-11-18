import { peopleReport } from "@mantle/db/tenant";
import { Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

export default async function PeopleReport() {
  const ctx = await requirePermission("reports.view");
  const rows = await peopleReport(ctx.db);

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

      <div style={{ marginBottom: 12 }}>
        <Link href="/admin/reports" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.back")}
        </Link>
      </div>

      <Card>
        {rows.length === 0 ? (
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
                {rows.map((row) => (
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
