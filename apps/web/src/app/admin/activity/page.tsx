import { recentActivity } from "@mantle/db/tenant";
import { space } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requirePermission } from "../../../server/session.ts";

export default async function Activity() {
  const { tenant, db } = await requirePermission("activity.view");
  const entries = await recentActivity(db, 100);

  return (
    <main style={{ padding: space.md, maxWidth: 960 }}>
      <p>
        <Link href="/">{t("people.back")}</Link>
      </p>
      <h1>{t("activity.heading", { name: tenant.name })}</h1>
      <p>{t("activity.explain")}</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">{t("activity.columns.at")}</th>
            <th align="left">{t("activity.columns.action")}</th>
            <th align="left">{t("activity.columns.actor")}</th>
            <th align="left">{t("activity.columns.entity")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.at.toISOString().replace("T", " ").slice(0, 19)}</td>
              <td>{e.action}</td>
              <td>{e.actor}</td>
              <td>{e.entityType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
