import { getNomination } from "@mantle/db/tenant";
import { Badge, Button, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../../server/session.ts";
import { can } from "@mantle/platform/identity";
import { AppShell } from "../../../_components/AppShell.tsx";
import { approveAction, rejectAction } from "../actions.ts";

export default async function ReviewNomination({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requirePermission("nominations.manage");
  await requireFeature(ctx.tenant, "learning_paths");
  const { id } = await params;
  const qp = await searchParams;

  const nom = await getNomination(ctx.db, id);
  if (!nom) notFound();

  const isAdmin = can(ctx.roles, "activity.view");
  const today = new Date().toISOString().slice(0, 10);

  const statusBadge = () => {
    if (nom.status === "approved") return <Badge tone="success">{t("nominations.statuses.approved")}</Badge>;
    if (nom.status === "rejected") return <Badge tone="danger">{t("nominations.statuses.rejected")}</Badge>;
    return <Badge tone="warning">{t("nominations.statuses.pending")}</Badge>;
  };

  return (
    <AppShell ctx={ctx} active="nominations">
      <div style={{ maxWidth: 680 }}>
        <Link href="/admin/nominations" className="muted" style={{ fontSize: 13, display: "inline-block", marginBottom: 20 }}>
          ← {t("nominations.back")}
        </Link>
        <h1 style={{ marginTop: 0 }}>{t("nominations.review_heading")}</h1>

        {qp.error === "duplicate" ? (
          <div className="alert alert-danger" role="alert"><p>{t("nominations.already_assigned")}</p></div>
        ) : qp.error === "invalid" ? (
          <div className="alert alert-danger" role="alert"><p>Please set an approved start date.</p></div>
        ) : qp.error ? (
          <div className="alert alert-danger" role="alert"><p>An error occurred. Please try again.</p></div>
        ) : null}

        <Card style={{ marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)", width: "35%" }}>
                  {t("nominations.columns.person")}
                </th>
                <td style={{ padding: "8px 0", fontSize: 14 }}><strong>{nom.personName}</strong></td>
              </tr>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
                  {t("nominations.columns.path")}
                </th>
                <td style={{ padding: "8px 0", fontSize: 14 }}>{nom.pathName}</td>
              </tr>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
                  {t("nominations.detail_label_nominated_by")}
                </th>
                <td style={{ padding: "8px 0", fontSize: 14 }}>{nom.nominatedBy.startsWith("user:") ? "Staff member" : nom.nominatedBy}</td>
              </tr>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
                  {t("nominations.detail_label_reason")}
                </th>
                <td style={{ padding: "8px 0", fontSize: 14 }}>{t(`nominations.reasons.${nom.reason}`)}</td>
              </tr>
              {nom.reasonDetail ? (
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)", verticalAlign: "top" }}>
                    {t("nominations.detail_label_detail")}
                  </th>
                  <td style={{ padding: "8px 0", fontSize: 14 }}>
                    <span style={{ display: "block", background: "var(--mantle-color-surface_raised)", borderRadius: 6, padding: "8px 12px" }}>
                      {nom.reasonDetail}
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--mantle-color-text_muted)", marginTop: 4 }}>
                      {t("nominations.confidential_note")}
                    </span>
                  </td>
                </tr>
              ) : null}
              {nom.suggestedStartDate ? (
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
                    {t("nominations.detail_label_suggested")}
                  </th>
                  <td style={{ padding: "8px 0", fontSize: 14 }}>{nom.suggestedStartDate}</td>
                </tr>
              ) : null}
              <tr>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
                  {t("nominations.columns.status")}
                </th>
                <td style={{ padding: "8px 0" }}>{statusBadge()}</td>
              </tr>
              {nom.reviewNote ? (
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)", verticalAlign: "top" }}>
                    Review note
                  </th>
                  <td style={{ padding: "8px 0", fontSize: 14 }}>{nom.reviewNote}</td>
                </tr>
              ) : null}
              {nom.approvedStartDate ? (
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", fontWeight: 600, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
                    Scheduled start
                  </th>
                  <td style={{ padding: "8px 0", fontSize: 14 }}>{nom.approvedStartDate}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        {nom.status === "pending" && isAdmin ? (
          <Card>
            <h2 style={{ marginTop: 0 }}>Decision</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <form action={approveAction}>
                <input type="hidden" name="nominationId" value={nom.id} />
                <label className="field">
                  {t("nominations.review_fields.start_date")}
                  <input
                    className="input"
                    type="date"
                    name="startDate"
                    defaultValue={nom.suggestedStartDate ?? today}
                    required
                  />
                </label>
                <label className="field">
                  {t("nominations.review_fields.note")}
                  <textarea className="input" name="reviewNote" rows={3} />
                </label>
                <Button type="submit">{t("nominations.approve_btn")}</Button>
              </form>

              <div style={{ borderTop: "1px solid var(--mantle-color-border)", paddingTop: 20 }}>
                <form action={rejectAction}>
                  <input type="hidden" name="nominationId" value={nom.id} />
                  <label className="field">
                    {t("nominations.review_fields.note")}
                    <textarea className="input" name="reviewNote" rows={3} placeholder="Reason for not approving (shared with nominator)" />
                  </label>
                  <Button type="submit" variant="danger">{t("nominations.reject_btn")}</Button>
                </form>
              </div>
            </div>
          </Card>
        ) : nom.status === "pending" ? (
          <Card>
            <p className="sub" style={{ margin: 0 }}>This nomination is awaiting review by a Learning Administrator.</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
