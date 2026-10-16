import { wording, type WordingKey } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import { t } from "../../../i18n.ts";
import { requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";
import { saveWording } from "./actions.ts";

export default async function Wording({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const ctx = await requirePermission("wording.edit");
  const labels = await wording(ctx.db);
  const { saved, error } = await searchParams;

  return (
    <AppShell ctx={ctx} active="wording">
      <PageHead title={t("wording.title")} sub={t("wording.explain")} />
      {saved ? <div className="alert alert-success" role="status"><p>{t("wording.saved")}</p></div> : null}
      {error ? <div className="alert alert-danger" role="alert"><p>{t("wording.error")}</p></div> : null}
      <Card style={{ maxWidth: 820 }}>
        <ul className="list">
          {(Object.keys(labels) as WordingKey[]).map((key) => (
            <li key={key}>
              <form action={saveWording} className="row grow" style={{ alignItems: "flex-end" }}>
                <input type="hidden" name="key" value={key} />
                <label className="field" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                  {t("wording.singular", { term: t(`wording.terms.${key}`) })}
                  <input className="input" name="singular" defaultValue={labels[key].singular} required />
                </label>
                <label className="field" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                  {t("wording.plural")}
                  <input className="input" name="plural" defaultValue={labels[key].plural} required />
                </label>
                <Button type="submit" variant="secondary">{t("wording.save")}</Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
