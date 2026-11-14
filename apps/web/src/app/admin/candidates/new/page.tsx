import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../../server/session.ts";
import { AppShell } from "../../../_components/AppShell.tsx";
import { registerAction } from "../actions.ts";

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requirePermission("candidates.manage");
  await requireFeature(ctx.tenant, "aptitude_testing");
  const params = await searchParams;

  return (
    <AppShell ctx={ctx} active="candidates">
      <div style={{ maxWidth: 640 }}>
        <Link href="/admin/candidates" className="muted" style={{ fontSize: 13, display: "inline-block", marginBottom: 20 }}>
          {"←"} {t("candidates.back")}
        </Link>
        <h1 style={{ marginTop: 0 }}>{t("candidates.new_heading")}</h1>

        {params.error === "duplicate" ? (
          <div className="alert alert-danger" role="alert"><p>A candidate with this email address is already registered.</p></div>
        ) : params.error ? (
          <div className="alert alert-danger" role="alert"><p>Please fill in all required fields correctly.</p></div>
        ) : null}

        <Card>
          <form action={registerAction}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <label className="field">
                {t("candidates.fields.first_name")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
                <input className="input" name="firstName" required />
              </label>
              <label className="field">
                {t("candidates.fields.surname")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
                <input className="input" name="surname" required />
              </label>
            </div>
            <label className="field">
              {t("candidates.fields.middle_name")}
              <input className="input" name="middleName" />
            </label>
            <label className="field">
              {t("candidates.fields.email")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" type="email" name="email" required />
            </label>
            <label className="field">
              {t("candidates.fields.phone")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" type="tel" name="phone" required />
            </label>
            <label className="field">
              {t("candidates.fields.position")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" name="positionAppliedFor" required />
            </label>
            <label className="field">
              {t("candidates.fields.department")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" name="department" required />
            </label>
            <label className="field">
              {t("candidates.fields.qualification")}
              <input className="input" name="highestQualification" />
            </label>
            <label className="field">
              {t("candidates.fields.institution")}
              <input className="input" name="institution" />
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Button type="submit">{t("candidates.submit_btn")}</Button>
              <Link href="/admin/candidates" className="btn btn-secondary">Cancel</Link>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
