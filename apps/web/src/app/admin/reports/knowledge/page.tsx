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
