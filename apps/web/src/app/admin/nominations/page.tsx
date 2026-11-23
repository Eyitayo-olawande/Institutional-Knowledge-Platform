import { listNominations } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { AppShell } from "../../_components/AppShell.tsx";
import { Icon } from "../../_components/Icon.tsx";

export default async function Nominations({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; approved?: string; rejected?: string; error?: string }>;
}) {
  const ctx = await requirePermission("nominations.manage");
  await requireFeature(ctx.tenant, "learning_paths");
  const params = await searchParams;

  const nominations = await listNominations(ctx.db);

  const pending = nominations.filter((n) => n.status === "pending");
  const approved = nominations.filter((n) => n.status === "approved");
  const rejected = nominations.filter((n) => n.status === "rejected");

  const statusBadge = (status: "pending" | "approved" | "rejected") => {
    if (status === "approved") return <Badge tone="success">{t("nominations.statuses.approved")}</Badge>;
    if (status === "rejected") return <Badge tone="danger">{t("nominations.statuses.rejected")}</Badge>;
    return <Badge tone="warning">{t("nominations.statuses.pending")}</Badge>;
  };

  return (
    <AppShell ctx={ctx} active="nominations">
      <div className="admin-hero-wrap">
        <div className="admin-banner">
          <div className="admin-banner-bg" />
          <div className="admin-banner-shade" />
          <div className="admin-banner-copy">
            <h1>
              {t("nominations.banner_heading").split(" ")[0]}{" "}
              <span>{t("nominations.banner_heading").split(" ").slice(1).join(" ")}</span>
            </h1>
            <p>{t("nominations.banner_sub")}</p>
            <div className="admin-banner-rule" />
          </div>
        </div>
        <img src="/images/learning-professional.png" alt="" aria-hidden="true" className="admin-banner-person" />
      </div>

      {params.submitted ? (
        <div className="alert alert-success" role="status"><p>{t("nominations.submitted_success")}</p></div>
      ) : params.approved ? (
        <div className="alert alert-success" role="status"><p>{t("nominations.success_approved")}</p></div>
      ) : params.rejected ? (
        <div className="alert alert-brand" role="status"><p>{t("nominations.success_rejected")}</p></div>
      ) : params.error === "unauthorized" ? (
        <div className="alert alert-danger" role="alert"><p>{t("nominations.unauthorized_error")}</p></div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Link href="/admin/nominations/new" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={16} />
          {t("nominations.nominate_btn")}
        </Link>
      </div>

      {nominations.length === 0 ? (
        <Card>
          <p className="sub" style={{ margin: 0 }}>{t("nominations.empty")}</p>
        </Card>
      ) : (
        <>
          {pending.length > 0 ? (
            <Card style={{ marginBottom: 20 }}>
              <h2 style={{ marginTop: 0 }}>{t("nominations.pending_tab")}{" ("}{pending.length}{")"}</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("nominations.columns.person")}</th>
                      <th>{t("nominations.columns.path")}</th>
                      <th>{t("nominations.columns.reason")}</th>
                      <th>{t("nominations.columns.date")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((n) => (
                      <tr key={n.id}>
                        <td><strong>{n.personName}</strong></td>
                        <td>{n.pathName}</td>
                        <td>{t(`nominations.reasons.${n.reason}`)}</td>
                        <td>{n.createdAt.toISOString().slice(0, 10)}</td>
                        <td>
                          <Link href={`/admin/nominations/${n.id}`} className="muted" style={{ fontSize: 13 }}>
                            {t("nominations.review_link")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {approved.length > 0 || rejected.length > 0 ? (
            <Card>
              <h2 style={{ marginTop: 0 }}>{t("nominations.approved_tab")}{" & "}{t("nominations.rejected_tab")}</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("nominations.columns.person")}</th>
                      <th>{t("nominations.columns.path")}</th>
                      <th>{t("nominations.columns.reason")}</th>
                      <th>{t("nominations.columns.status")}</th>
                      <th>{t("nominations.columns.date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...approved, ...rejected].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((n) => (
                      <tr key={n.id}>
                        <td><strong>{n.personName}</strong></td>
                        <td>{n.pathName}</td>
                        <td>{t(`nominations.reasons.${n.reason}`)}</td>
                        <td>{statusBadge(n.status)}</td>
                        <td>{n.createdAt.toISOString().slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
