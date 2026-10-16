import { recentActivity } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import { t } from "../../../i18n.ts";
import { requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";

export default async function Activity() {
  const ctx = await requirePermission("activity.view");
  const entries = await recentActivity(ctx.db, 100);

  return (
    <AppShell ctx={ctx} active="activity">
      <PageHead title={t("activity.title")} sub={t("activity.explain")} />
      <Card>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("activity.columns.at")}</th>
                <th>{t("activity.columns.action")}</th>
                <th>{t("activity.columns.actor")}</th>
                <th>{t("activity.columns.entity")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{e.at.toISOString().replace("T", " ").slice(0, 19)}</td>
                  <td><Badge tone="neutral">{e.action}</Badge></td>
                  <td>{e.actor}</td>
                  <td>{e.entityType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
