import { getCandidate, getCandidateStatus } from "@mantle/db/tenant";
import { Badge, Button, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../../server/session.ts";
import { AppShell } from "../../../_components/AppShell.tsx";
import { editCandidateAction } from "../actions.ts";

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const ctx = await requirePermission("candidates.manage");
  await requireFeature(ctx.tenant, "aptitude_testing");
  const { id } = await params;
  const qp = await searchParams;

  const [candidate, status] = await Promise.all([
    getCandidate(ctx.db, id),
    getCandidateStatus(ctx.db, id),
  ]);
  if (!candidate) notFound();

  return (
    <AppShell ctx={ctx} active="candidates">
      <div style={{ maxWidth: 680 }}>
        <Link href="/admin/candidates" className="muted" style={{ fontSize: 13, display: "inline-block", marginBottom: 20 }}>
          {"←"} {t("candidates.back")}
        </Link>
        <h1 style={{ marginTop: 0 }}>{candidate.firstName} {candidate.surname}</h1>

        {qp.saved ? (
          <div className="alert alert-success" role="status"><p>{t("candidates.saved_success")}</p></div>
        ) : qp.error ? (
          <div className="alert alert-danger" role="alert"><p>{t("candidates.required_fields_error")}</p></div>
        ) : null}

        <Card style={{ marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {([
                ["Reference", candidate.candidateRef],
                ["Registered", candidate.registeredAt.toISOString().slice(0, 10)],
              ] as [string, string][]).map(([label, val]) => (
                <tr key={label}>
                  <th style={{ textAlign: "left", padding: "6px 16px 6px 0", fontSize: 13, color: "var(--mantle-color-text_muted)", width: "35%", fontWeight: 600 }}>{label}</th>
                  <td style={{ padding: "6px 0", fontSize: 14 }}>{val}</td>
                </tr>
              ))}
              <tr>
                <th style={{ textAlign: "left", padding: "6px 16px 6px 0", fontSize: 13, color: "var(--mantle-color-text_muted)", fontWeight: 600 }}>{t("candidates.assessment_status_label")}</th>
                <td style={{ padding: "6px 0" }}>
                  {status.status === "completed" ? (
                    <Badge tone={status.passed ? "success" : "danger"}>
                      {t("candidates.status_completed_prefix")}{status.totalScore}{"/"}{status.testName ? ` (${status.testName})` : ""}
                    </Badge>
                  ) : status.status === "not_started" ? (
                    <Badge tone="warning">{t("candidates.status_not_started_prefix")}{status.testName ? ` (${status.testName})` : ""}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("candidates.status_not_assigned_badge")}</Badge>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>{t("candidates.edit_heading")}</h2>
          <form action={editCandidateAction}>
            <input type="hidden" name="candidateId" value={candidate.id} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <label className="field">
                {t("candidates.fields.first_name")} <span style={{ color: "var(--mantle-color-brand)" }}>{"*"}</span>
                <input className="input" name="firstName" defaultValue={candidate.firstName} required />
              </label>
              <label className="field">
                {t("candidates.fields.surname")} <span style={{ color: "var(--mantle-color-brand)" }}>{"*"}</span>
                <input className="input" name="surname" defaultValue={candidate.surname} required />
              </label>
            </div>
            <label className="field">
              {t("candidates.fields.middle_name")}
              <input className="input" name="middleName" defaultValue={candidate.middleName ?? ""} />
            </label>
            <label className="field">
              {t("candidates.fields.email")} <span style={{ color: "var(--mantle-color-brand)" }}>{"*"}</span>
              <input className="input" type="email" name="email" defaultValue={candidate.email} required />
            </label>
            <label className="field">
              {t("candidates.fields.phone")} <span style={{ color: "var(--mantle-color-brand)" }}>{"*"}</span>
              <input className="input" type="tel" name="phone" defaultValue={candidate.phone} required />
            </label>
            <label className="field">
              {t("candidates.fields.position")} <span style={{ color: "var(--mantle-color-brand)" }}>{"*"}</span>
              <input className="input" name="positionAppliedFor" defaultValue={candidate.positionAppliedFor} required />
            </label>
            <label className="field">
              {t("candidates.fields.department")} <span style={{ color: "var(--mantle-color-brand)" }}>{"*"}</span>
              <input className="input" name="department" defaultValue={candidate.department} required />
            </label>
            <label className="field">
              {t("candidates.fields.qualification")}
              <input className="input" name="highestQualification" defaultValue={candidate.highestQualification ?? ""} />
            </label>
            <label className="field">
              {t("candidates.fields.institution")}
              <input className="input" name="institution" defaultValue={candidate.institution ?? ""} />
            </label>
            <Button type="submit">{t("candidates.save_btn")}</Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
