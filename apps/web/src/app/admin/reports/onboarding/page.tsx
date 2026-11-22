import { onboardingReport } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

export default async function OnboardingReport({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePermission("reports.view");
  const params = await searchParams;

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const fromStr = typeof params.from === "string" ? params.from : thirtyDaysAgo;
  const toStr = typeof params.to === "string" ? params.to : today;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const rows = await onboardingReport(ctx.db, { from, to });

  return (
    <AppShell ctx={ctx} active="reports">
      <PageHead
        title={t("reports.onboarding.title")}
        sub={t("reports.onboarding.sub")}
      />

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/reports" className="sub" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          {t("reports.back")}
        </Link>
      </div>

      <form method="GET" style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          {t("reports.onboarding.from_label")}
          <input className="input" type="date" name="from" defaultValue={fromStr} style={{ fontSize: 13 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          {t("reports.onboarding.to_label")}
          <input className="input" type="date" name="to" defaultValue={toStr} style={{ fontSize: 13 }} />
        </label>
        <button className="btn btn-secondary" type="submit" style={{ fontSize: 13 }}>
          {t("reports.onboarding.filter_btn")}
        </button>
      </form>

      <div className="report-kpi-strip" role="region" aria-label="Summary metrics">
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{rows.length}</div>
          <div className="report-kpi-stat-label">{t("reports.onboarding.kpi.joiners")}</div>
        </div>
        <div className={`report-kpi-stat${rows.some((r) => r.pendingAttestations > 0) ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{rows.reduce((s, r) => s + r.pendingAttestations, 0)}</div>
          <div className="report-kpi-stat-label">{t("reports.onboarding.kpi.pending_attestations")}</div>
        </div>
        <div className={`report-kpi-stat${rows.some((r) => r.overdueAcks > 0) ? " report-kpi-stat--danger" : ""}`}>
          <div className="report-kpi-stat-value">{rows.reduce((s, r) => s + r.overdueAcks, 0)}</div>
          <div className="report-kpi-stat-label">{t("reports.onboarding.kpi.overdue_acks")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{rows.reduce((s, r) => s + r.pathsEnrolled, 0)}</div>
          <div className="report-kpi-stat-label">{t("reports.onboarding.kpi.paths_enrolled")}</div>
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="sub">{t("reports.onboarding.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("reports.onboarding.columns.name")}</th>
                  <th>{t("reports.onboarding.columns.department")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.onboarding.columns.joined")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.onboarding.columns.days")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.onboarding.columns.paths")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.onboarding.columns.attestations")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.onboarding.columns.overdue_acks")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.personId}>
                    <td style={{ fontWeight: 500 }}>{row.fullName}</td>
                    <td>{row.department}</td>
                    <td style={{ textAlign: "right" }}>{row.joinedAt.toISOString().slice(0, 10)}</td>
                    <td style={{ textAlign: "right" }}>{row.daysSinceJoining}</td>
                    <td style={{ textAlign: "right" }}>
                      {row.pathsEnrolled > 0 ? row.pathsEnrolled : <span className="sub">{0}</span>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {row.pendingAttestations > 0 ? (
                        <Badge tone="warning">{row.pendingAttestations}</Badge>
                      ) : (
                        <Badge tone="success">{0}</Badge>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {row.overdueAcks > 0 ? (
                        <Badge tone="danger">{row.overdueAcks}</Badge>
                      ) : (
                        0
                      )}
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
