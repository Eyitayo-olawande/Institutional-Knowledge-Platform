import { isStructureKind, wording, type WordingKey } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import { cookies } from "next/headers";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";
import { importStructure } from "./actions.ts";
import { IMPORT_RESULT_COOKIE, type StructureImportResult } from "./import_result.ts";

export default async function StructureImport({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const ctx = await requirePermission("structure.manage");
  const { kind: kindParam } = await searchParams;
  const kind = isStructureKind(kindParam ?? "") ? kindParam! : "department";
  const labels = await wording(ctx.db);

  const raw = (await cookies()).get(IMPORT_RESULT_COOKIE)?.value;
  const result: StructureImportResult | undefined = raw ? (JSON.parse(raw) as StructureImportResult) : undefined;

  const kindLabel = labels[kind as WordingKey]?.plural.toLowerCase() ?? kind;

  return (
    <AppShell ctx={ctx} active="structure">
      <PageHead
        title={t("structure.import_heading")}
        sub={t("structure.import_sub", { kind: kindLabel })}
      />

      <div style={{ maxWidth: 640 }}>
        <Card>
          <h2 style={{ marginTop: 0 }}>{t("structure.import_heading")}</h2>

          <form action={importStructure}>
            <input type="hidden" name="kind" value={kind} />

            <div style={{ marginBottom: 16 }}>
              <label className="label" htmlFor="kind-select">{t("structure.import_kind_label")}</label>
              <select id="kind-select" className="input" name="kind" defaultValue={kind} style={{ width: "100%" }}>
                <option value="department">{labels.department.plural}</option>
                <option value="unit">{labels.unit.plural}</option>
                <option value="role_level">{labels.role_level.plural}</option>
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <p className="muted" style={{ marginTop: 0 }}>
                {t("structure.import_format_note")}
              </p>
              <a
                href={`/admin/structure/import/template?kind=${kind}`}
                className="btn btn-ghost btn-sm"
                download
              >
                {t("structure.download_template")}
              </a>
            </div>

            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <label className="label" htmlFor="file-upload">{t("structure.import_file_label")}</label>
              <input id="file-upload" className="input" type="file" name="file" accept=".csv" required />
            </div>

            <div className="row" style={{ gap: 8 }}>
              <Button type="submit" variant="primary">{t("structure.import_run_btn")}</Button>
              <Link href={`/admin/structure?tab=${kind}`} className="btn btn-ghost">
                {t("structure.import_cancel")}
              </Link>
            </div>
          </form>
        </Card>

        {result && result.kind === kind ? (
          <Card style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>{t("structure.import_result_heading")}</h3>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", marginBottom: 16 }}>
              <dt>{t("structure.import_created")}</dt>
              <dd><strong>{result.created}</strong></dd>
              <dt>{t("structure.import_skipped")}</dt>
              <dd>{result.skipped}</dd>
            </dl>
            {result.errors.length > 0 ? (
              <div>
                <p className="muted" style={{ marginTop: 0 }}>{t("structure.import_errors_note")}</p>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("structure.import_col_line")}</th>
                        <th>{t("structure.import_col_message")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i}>
                          <td>{e.line > 0 ? e.line : t("structure.import_col_file")}</td>
                          <td>{t(`structure.import_errors.${e.message.split(":")[0]}`, { value: e.message.split(":")[1] ?? "" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {result.created > 0 ? (
              <Link href={`/admin/structure?tab=${kind}`} className="btn btn-primary" style={{ marginTop: 12 }}>
                {t("structure.import_view_btn")}
              </Link>
            ) : null}
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
