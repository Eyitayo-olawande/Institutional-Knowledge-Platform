import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../../server/session.ts";
import { AppShell } from "../../../_components/AppShell.tsx";
import { createTestAction } from "../actions.ts";

export default async function NewAptitudeTestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requirePermission("candidates.manage");
  await requireFeature(ctx.tenant, "aptitude_testing");
  const params = await searchParams;

  return (
    <AppShell ctx={ctx} active="aptitude_tests">
      <div style={{ maxWidth: 600 }}>
        <Link href="/admin/aptitude-tests" className="muted" style={{ fontSize: 13, display: "inline-block", marginBottom: 20 }}>
          {"←"} {t("aptitude_tests.back")}
        </Link>
        <h1 style={{ marginTop: 0 }}>{t("aptitude_tests.new_heading")}</h1>

        {params.error ? (
          <div className="alert alert-danger" role="alert"><p>Please check all fields. Pass mark must not exceed total marks.</p></div>
        ) : null}

        <Card>
          <form action={createTestAction}>
            <label className="field">
              {t("aptitude_tests.fields.name")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" name="name" required />
            </label>
            <label className="field">
              {t("aptitude_tests.fields.instructions")}
              <textarea className="input" name="instructions" rows={4} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <label className="field">
                {t("aptitude_tests.fields.duration")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
                <input className="input" type="number" name="durationMinutes" min={1} max={480} required />
              </label>
              <label className="field">
                {t("aptitude_tests.fields.num_questions")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
                <input className="input" type="number" name="numQuestions" min={1} required />
              </label>
              <label className="field">
                {t("aptitude_tests.fields.total_marks")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
                <input className="input" type="number" name="totalMarks" min={1} required />
              </label>
              <label className="field">
                {t("aptitude_tests.fields.pass_mark")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
                <input className="input" type="number" name="passMark" min={1} required />
              </label>
            </div>
            <p className="sub" style={{ fontSize: 12, marginTop: 0 }}>
              Two sections are created automatically: General Aptitude (40%) and Company Knowledge (60%).
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Button type="submit">{t("aptitude_tests.submit_btn")}</Button>
              <Link href="/admin/aptitude-tests" className="btn btn-secondary">Cancel</Link>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
