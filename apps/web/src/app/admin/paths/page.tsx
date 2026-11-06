import { listPaths, listStructure } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { AppShell } from "../../_components/AppShell.tsx";
import { createPathAction } from "./actions.ts";

export default async function Paths() {
  const ctx = await requirePermission("paths.edit");
  await requireFeature(ctx.tenant, "learning_paths");
  const [paths, departments] = await Promise.all([listPaths(ctx.db), listStructure(ctx.db, "department")]);
  const departmentName = (id: string | null) => (id ? departments.find((d) => d.id === id)?.name ?? "" : t("paths.admin.all_departments"));

  return (
    <AppShell ctx={ctx} active="paths">
      <div className="paths-banner">
        <div className="paths-banner-bg" />
        <div className="paths-banner-shade" />
        <div className="paths-banner-copy">
          <h1>
            {t("paths.banner_heading").split(" ")[0]}{" "}
            <span>{t("paths.banner_heading").split(" ").slice(1).join(" ")}</span>
          </h1>
          <p>{t("paths.banner_sub")}</p>
          <div className="paths-banner-rule" />
        </div>
      </div>

      <div className="admin-2col">
        {/* Paths table */}
        <Card>
          {paths.length === 0 ? (
            <p className="sub">{t("paths.admin.empty")}</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("paths.admin.columns.name")}</th>
                    <th>{t("paths.admin.columns.department")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paths.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{departmentName(p.departmentId)}</td>
                      <td><Link href={`/admin/paths/${p.id}`}>{t("paths.admin.open")}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create form sidebar */}
        <div className="admin-2col-aside">
          <Card>
            <h2 style={{ marginTop: 0 }}>{t("paths.admin.create_heading")}</h2>
            <form action={createPathAction}>
              <label className="field">
                {t("paths.admin.fields.name")}
                <input className="input" name="name" required />
              </label>
              <label className="field">
                {t("paths.admin.fields.department")}
                <select className="input" name="departmentId" defaultValue="">
                  <option value="">{t("paths.admin.all_departments")}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <Button type="submit">{t("paths.admin.create")}</Button>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
