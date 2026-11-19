import { knowledgeReport } from "@mantle/db/tenant";
import { Badge, type BadgeTone, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";

const STATUS_TONE: Record<string, BadgeTone> = { draft: "neutral", published: "success", retired: "neutral" };

export default async function KnowledgeReport() {
  const ctx = await requirePermission("reports.view");
  const rows = await knowledgeReport(ctx.db);

  const totalViews = rows.reduce((s, r) => s + r.viewCount, 0);
  const totalAttested = rows.reduce((s, r) => s + r.attestedCount, 0);
  const totalPendingAcks = rows.reduce((s, r) => s + r.pendingAcks, 0);

  const topViewedItems = [...rows].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10);
  const maxViews = topViewedItems[0]?.viewCount ?? 1;

  const topInsight = [...rows].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3);
  const topAttest = [...rows].sort((a, b) => b.attestedCount - a.attestedCount).slice(0, 3);

  return (
    <AppShell ctx={ctx} active="reports">
      <PageHead
        title={t("reports.knowledge.title")}
        sub={t("reports.knowledge.sub")}
        action={
          <Link href="/admin/reports/export?category=knowledge" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
          <div className="report-kpi-stat-label">{t("reports.kpi.total_items")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{totalViews}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_views")}</div>
        </div>
        <div className="report-kpi-stat report-kpi-stat--neutral">
          <div className="report-kpi-stat-value">{totalAttested}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_attested")}</div>
        </div>
        <div className={`report-kpi-stat${totalPendingAcks > 0 ? " report-kpi-stat--warning" : ""}`}>
          <div className="report-kpi-stat-value">{totalPendingAcks}</div>
          <div className="report-kpi-stat-label">{t("reports.kpi.total_overdue")}</div>
        </div>
      </div>

      {topViewedItems.length > 0 && maxViews > 0 && (
        <div className="report-chart-container">
          <div className="report-chart-title">{t("reports.insight.most_viewed")}</div>
          {topViewedItems.map((item) => (
            <div key={item.id} className="report-bar-row">
              <div className="report-bar-row-label" title={item.title}>{item.title}</div>
              <div className="report-bar-track">
                <div className="report-bar-fill" style={{ width: `${Math.round((item.viewCount / maxViews) * 100)}%` }} />
              </div>
              <div className="report-bar-pct">{item.viewCount}</div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="report-insight-row">
          <div className="report-insight-panel">
            <div className="report-insight-title">{t("reports.insight.most_viewed")}</div>
            {topInsight.length === 0 ? (
              <div className="report-insight-empty">{t("reports.insight.no_data")}</div>
            ) : topInsight.map((r, i) => (
              <div key={r.id} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.title}</div>
                <div className="report-insight-score">{r.viewCount} views</div>
              </div>
            ))}
          </div>
          <div className="report-insight-panel">
            <div className="report-insight-title">{t("reports.insight.fully_attested")}</div>
            {topAttest.length === 0 ? (
              <div className="report-insight-empty">{t("reports.insight.no_data")}</div>
            ) : topAttest.map((r, i) => (
              <div key={r.id} className="report-insight-item">
                <div className="report-insight-rank">{i + 1}</div>
                <div className="report-insight-name">{r.title}</div>
                <div className="report-insight-score">{r.attestedCount} attested</div>
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
                  <th>{t("reports.knowledge.columns.item")}</th>
                  <th>{t("reports.knowledge.columns.area")}</th>
                  <th>{t("reports.knowledge.columns.type")}</th>
                  <th>{t("reports.knowledge.columns.status")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.knowledge.columns.views")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.knowledge.columns.attested")}</th>
                  <th style={{ textAlign: "right" }}>{t("reports.knowledge.columns.pending_acks")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.area}</td>
                    <td>{row.contentType}</td>
                    <td><Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</Badge></td>
                    <td style={{ textAlign: "right" }}>{row.viewCount}</td>
                    <td style={{ textAlign: "right" }}>{row.attestedCount}</td>
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
