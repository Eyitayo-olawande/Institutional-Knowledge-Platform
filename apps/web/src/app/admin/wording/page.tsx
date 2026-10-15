import { wording, type WordingKey } from "@mantle/db/tenant";
import { Button, color, space } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireRole } from "../../../server/session.ts";
import { saveWording } from "./actions.ts";

const input = { minHeight: 44, padding: space.sm, fontSize: 16 } as const;

export default async function Wording({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { tenant, db } = await requireRole("learning_administrator");
  const labels = await wording(db);
  const { saved, error } = await searchParams;

  return (
    <main style={{ padding: space.md, maxWidth: 720 }}>
      <p>
        <Link href="/">{t("people.back")}</Link>
      </p>
      <h1>{t("wording.heading", { name: tenant.name })}</h1>
      <p>{t("wording.explain")}</p>
      {saved && <p role="status" style={{ color: color.success }}>{t("wording.saved")}</p>}
      {error && <p role="alert" style={{ color: color.danger }}>{t("wording.error")}</p>}
      {(Object.keys(labels) as WordingKey[]).map((key) => (
        <form key={key} action={saveWording} style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "end", marginBottom: space.md }}>
          <input type="hidden" name="key" value={key} />
          <label style={{ display: "grid", gap: space.xs }}>
            {t("wording.singular", { term: t(`wording.terms.${key}`) })}
            <input name="singular" defaultValue={labels[key].singular} required style={input} />
          </label>
          <label style={{ display: "grid", gap: space.xs }}>
            {t("wording.plural")}
            <input name="plural" defaultValue={labels[key].plural} required style={input} />
          </label>
          <Button type="submit" variant="secondary">{t("wording.save")}</Button>
        </form>
      ))}
    </main>
  );
}
