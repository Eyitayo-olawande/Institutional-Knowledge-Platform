import { complianceReport } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

export default async function ComplianceReport() {
  const ctx = await requirePermission("reports.view");
  const rows = await complianceReport(ctx.db);

  return (
    <AppShell ctx={ctx} active="reports">
      <PageHead
        title={t("reports.compliance.title")}
        sub={t("reports.compliance.sub")}
        action={
          <Link href="/admin/reports/export?category=compliance" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
          <div className="report-chart-title">Attestation rate by document</div>
          {rows.map((row) => {
            const tone = row.attestationRate >= 80 ? "" : row.attestationRate >= 50 ? "--warning" : "--danger";
            return (
              <div key={row.id} className="report-bar-row">
                <div className="report-bar-row-label" title={row.title}>{row.title}</div>
                <div className="report-bar-track">
                  <div className={`report-bar-fill${tone}`} style={{ width: `${row.attestationRate}%` }} />
                </div>
                <div className="report-bar-pct">{row.attestationRate}%</div>
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
                  <th>{t("reports.compliance.columns.item")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.version")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.attested")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.total_staff")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.rate")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.pending_acks")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td style={{ textAlign: "right" }}>{row.publishedVersion}</td>
                    <td style={{ textAlign: "right" }}>{row.attestedCount}</td>
                    <td style={{ textAlign: "right" }}>{row.activeStaff}</td>
                    <td style={{ textAlign: "right" }}>
                      <Badge tone={row.attestationRate >= 80 ? "success" : row.attestationRate >= 50 ? "warning" : "danger"}>
                        {row.attestationRate}%
                      </Badge>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {row.pendingAcks > 0 ? <Badge tone="warning">{row.pendingAcks}</Badge> : 0}
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
