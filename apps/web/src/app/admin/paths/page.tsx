import { listPaths, listStructure } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";
import { createPathAction } from "./actions.ts";

export default async function Paths() {
  const ctx = await requirePermission("paths.edit");
  await requireFeature(ctx.tenant, "learning_paths");
  const [paths, departments] = await Promise.all([listPaths(ctx.db), listStructure(ctx.db, "department")]);
  const departmentName = (id: string | null) => (id ? departments.find((d) => d.id === id)?.name ?? "" : t("paths.admin.all_departments"));

  return (
    <AppShell ctx={ctx} active="paths">
      <PageHead title={t("paths.admin.title")} sub={t("paths.admin.explain")} />

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

      <Card style={{ maxWidth: 480, marginTop: 16 }}>
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
    </AppShell>
  );
}
