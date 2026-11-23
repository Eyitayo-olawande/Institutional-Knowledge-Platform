import { listPaths, listPeople, NOMINATION_REASONS } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../../server/session.ts";
import { AppShell } from "../../../_components/AppShell.tsx";
import { nominateAction } from "../actions.ts";

export default async function NewNomination({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requirePermission("nominations.manage");
  await requireFeature(ctx.tenant, "learning_paths");
  const params = await searchParams;

  const [people, paths] = await Promise.all([
    listPeople(ctx.db),
    listPaths(ctx.db),
  ]);

  const activePeople = people.filter((p) => p.status === "active");

  return (
    <AppShell ctx={ctx} active="nominations">
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Link href="/admin/nominations" className="muted" style={{ fontSize: 13 }}>
            {"← "}{t("nominations.back")}
          </Link>
        </div>
        <h1 style={{ marginTop: 0 }}>{t("nominations.new_heading")}</h1>

        {params.error === "invalid" ? (
          <div className="alert alert-danger" role="alert">
            <p>{t("nominations.required_error")}</p>
          </div>
        ) : null}

        <Card>
          <form action={nominateAction}>
            <label className="field">
              {t("nominations.fields.person")}
              <select className="input" name="personId" required>
                <option value="">{t("nominations.select_staff")}</option>
                {activePeople.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}{" ("}{p.workEmail}{")"}</option>
                ))}
              </select>
            </label>

            <label className="field">
              {t("nominations.fields.path")}
              <select className="input" name="pathId" required>
                <option value="">{t("nominations.select_path")}</option>
                {paths.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              {t("nominations.fields.reason")}
              <select className="input" name="reason" required>
                <option value="">{t("nominations.select_reason")}</option>
                {NOMINATION_REASONS.map((r) => (
                  <option key={r} value={r}>{t(`nominations.reasons.${r}`)}</option>
                ))}
              </select>
            </label>

            <label className="field">
              {t("nominations.fields.reason_detail")}
              <textarea className="input" name="reasonDetail" rows={4} placeholder={t("nominations.fields.reason_detail_hint")} />
            </label>
            <p className="muted" style={{ marginTop: -8, fontSize: 12 }}>{t("nominations.confidential_note")}</p>

            <label className="field">
              {t("nominations.fields.suggested_start_date")}
              <input className="input" type="date" name="suggestedStartDate" />
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Button type="submit">{t("nominations.submit_btn")}</Button>
              <Link href="/admin/nominations" className="btn btn-secondary">{t("nominations.cancel_btn")}</Link>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
