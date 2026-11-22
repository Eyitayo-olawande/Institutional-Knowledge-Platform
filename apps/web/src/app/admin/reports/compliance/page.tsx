import { complianceReport } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

export default async function ComplianceReport() {
  const ctx = await requirePermission("reports.view");
  const rows = await complianceReport(ctx.db);

  const totalAttested = rows.reduce((s, r) => s + r.attestedCount, 0);
  const totalOverdue = rows.reduce((s, r) => s + r.overdueAcks, 0);
  const avgAttestation = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.attestationRate, 0) / rows.length) : 0;

  const topCompliance = [...rows].sort((a, b) => b.attestationRate - a.attestationRate).slice(0, 3);
  const lowCompliance = [...rows].filter((r) => r.activeStaff > 0).sort((a, b) => a.attestationRate - b.attestationRate).slice(0, 3);

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

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/reports" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.back")}
        </Link>
      </div>

      <div className="report-kpi-strip" role="region" aria-label="Summary metrics">
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{rows.length}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_documents")}</div>
        </div>
        <div className={`report-kpi-stat${rows.length > 0 && avgAttestation < 50 ? " report-kpi-stat--danger" : rows.length > 0 && avgAttestation < 80 ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{rows.length > 0 ? `${avgAttestation}%` : "—"}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.avg_attestation")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{totalAttested}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_attested")}</div>
        </div>
        <div className={`report-kpi-stat${totalOverdue > 0 ? " report-kpi-stat--danger" : ""}`}>
          <div className="report-kpi-stat-value">{totalOverdue}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_overdue")}</div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="report-chart-container">
          <div className="report-chart-title">{t("reports.compliance.chart_title")}</div>
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

      {rows.length > 0 && (
        <div className="report-insight-row">
          <div className="report-insight-panel">
            <div className="report-insight-title">{t("reports.insight.fully_attested")}</div>
            {topCompliance.length === 0 ? (
              <div className="report-insight-empty">{t("reports.insight.no_data")}</div>
            ) : topCompliance.map((r, i) => (
              <div key={r.id} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.title}</div>
                <div className="report-insight-score">{r.attestationRate}%</div>
              </div>
            ))}
          </div>
          <div className="report-insight-panel report-insight-panel--danger">
            <div className="report-insight-title">{t("reports.insight.low_attestation")}</div>
            {lowCompliance.length === 0 ? (
              <div className="report-insight-empty">{t("reports.insight.no_data")}</div>
            ) : lowCompliance.map((r, i) => (
              <div key={r.id} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.title}</div>
                <div className="report-insight-score">{r.attestationRate}%</div>
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
                  <th>{t("reports.compliance.columns.item")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.version")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.attested")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.total_staff")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.rate")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.pending_acks")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.compliance.columns.overdue_acks")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/reports/compliance/${row.id}`} style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "var(--mantle-color-text_muted)" }}>
                        {row.title}
                      </Link>
                    </td>
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
                    <td style={{ textAlign: "right" }}>
                      {row.overdueAcks > 0 ? <Badge tone="danger">{row.overdueAcks}</Badge> : 0}
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
