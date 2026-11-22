import { complianceDetailForItem } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../../../i18n.ts";
import { requirePermission } from "../../../../../server/session.ts";
import { AppShell, PageHead } from "../../../../_components/AppShell.tsx";

export default async function ComplianceDrillDown({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePermission("reports.view");
  const { id } = await params;
  const { item, nonAttested } = await complianceDetailForItem(ctx.db, id);

  if (!item) notFound();

  return (
    <AppShell ctx={ctx} active="reports">
      <PageHead
        title={item.title}
        sub={t("reports.compliance_detail.sub")}
      />

      <div style={{ marginBottom: 20, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/admin/reports/compliance" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.compliance_detail.back")}
        </Link>
        <span className="sub" style={{ fontSize: 13 }}>
          {t("reports.compliance_detail.current_version_label", { version: item.publishedVersion })}
        </span>
      </div>

      <div className="report-kpi-strip" role="region" aria-label="Summary metrics">
        <div className={`report-kpi-stat${nonAttested.length > 0 ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{nonAttested.length}</div>
          <div className="report-kpi-stat-label">{t("reports.compliance_detail.not_attested_kpi")}</div>
        </div>
      </div>

      <Card>
        {nonAttested.length === 0 ? (
          <p className="sub">{t("reports.compliance_detail.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("reports.compliance_detail.columns.name")}</th>
                  <th>{t("reports.compliance_detail.columns.department")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance_detail.columns.last_attested")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance_detail.columns.attested_version")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance_detail.columns.current_version")}</th>
                </tr>
              </thead>
              <tbody>
                {nonAttested.map((row) => (
                  <tr key={row.personId}>
                    <td style={{ fontWeight: 500 }}>{row.fullName}</td>
                    <td>{row.department}</td>
                    <td style={{ textAlign: "right" }}>
                      {row.lastAttestedAt ? row.lastAttestedAt.toISOString().slice(0, 10) : <span className="sub">{t("reports.compliance_detail.never")}</span>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {row.attestedVersion !== null ? (
                        <Badge tone={row.attestedVersion < row.currentVersion ? "warning" : "success"}>
                          {t("reports.compliance_detail.version", { version: row.attestedVersion })}
                        </Badge>
                      ) : (
                        <span className="sub">{t("reports.compliance_detail.never")}</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>{t("reports.compliance_detail.version", { version: row.currentVersion })}</td>
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
