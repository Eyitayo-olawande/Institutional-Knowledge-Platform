import { getCandidateStatus, listCandidates } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { AppShell } from "../../_components/AppShell.tsx";
import { Icon } from "../../_components/Icon.tsx";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const ctx = await requirePermission("candidates.manage");
  await requireFeature(ctx.tenant, "aptitude_testing");
  const params = await searchParams;
  const candidates = await listCandidates(ctx.db);
  const statuses = await Promise.all(candidates.map((c) => getCandidateStatus(ctx.db, c.id)));

  return (
    <AppShell ctx={ctx} active="candidates">
      <div className="admin-hero-wrap">
        <div className="admin-banner">
          <div className="admin-banner-bg" />
          <div className="admin-banner-shade" />
          <div className="admin-banner-copy">
            <h1>
              {t("candidates.banner_heading").split(" ")[0]}{" "}
              <span>{t("candidates.banner_heading").split(" ").slice(1).join(" ")}</span>
            </h1>
            <p>{t("candidates.banner_sub")}</p>
            <div className="admin-banner-rule" />
          </div>
        </div>
        <img src="/images/learning-professional.png" alt="" aria-hidden="true" className="admin-banner-person" />
      </div>

      {params.registered ? (
        <div className="alert alert-success" role="status"><p>{t("candidates.registered_success")}</p></div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Link href="/admin/candidates/new" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={16} />
          {t("candidates.register_btn")}
        </Link>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <p className="sub" style={{ margin: 0 }}>{t("candidates.empty")}</p>
        </Card>
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("candidates.columns.ref")}</th>
                  <th>{t("candidates.columns.name")}</th>
                  <th>{t("candidates.columns.position")}</th>
                  <th>{t("candidates.columns.department")}</th>
                  <th>{t("candidates.columns.status")}</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => {
                  const s = statuses[i]!;
                  return (
                    <tr key={c.id}>
                      <td><code style={{ fontSize: 12 }}>{c.candidateRef}</code></td>
                      <td><Link href={`/admin/candidates/${c.id}`}><strong>{c.firstName} {c.surname}</strong></Link></td>
                      <td>{c.positionAppliedFor}</td>
                      <td>{c.department}</td>
                      <td>
                        {s.status === "completed" ? (
                          <Badge tone={s.passed ? "success" : "danger"}>{t("candidates.status.completed")} {s.totalScore !== null && s.totalScore !== undefined ? `(${s.totalScore})` : ""}</Badge>
                        ) : s.status === "not_started" ? (
                          <Badge tone="warning">{t("candidates.status.not_started")}</Badge>
                        ) : (
                          <Badge tone="neutral">{t("candidates.status.not_assigned")}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
