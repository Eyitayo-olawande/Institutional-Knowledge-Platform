import { listAptitudeTests } from "@mantle/db/tenant";
import { Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { AppShell } from "../../_components/AppShell.tsx";
import { Icon } from "../../_components/Icon.tsx";

export default async function AptitudeTestsPage() {
  const ctx = await requirePermission("candidates.manage");
  await requireFeature(ctx.tenant, "aptitude_testing");
  const tests = await listAptitudeTests(ctx.db);

  return (
    <AppShell ctx={ctx} active="aptitude_tests">
      <div className="admin-hero-wrap">
        <div className="admin-banner">
          <div className="admin-banner-bg" />
          <div className="admin-banner-shade" />
          <div className="admin-banner-copy">
            <h1>
              {t("aptitude_tests.banner_heading").split(" ")[0]}{" "}
              <span>{t("aptitude_tests.banner_heading").split(" ").slice(1).join(" ")}</span>
            </h1>
            <p>{t("aptitude_tests.banner_sub")}</p>
            <div className="admin-banner-rule" />
          </div>
        </div>
        <img src="/images/learning-professional.png" alt="" aria-hidden="true" className="admin-banner-person" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Link href="/admin/aptitude-tests/new" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={16} />
          {t("aptitude_tests.new_btn")}
        </Link>
      </div>

      {tests.length === 0 ? (
        <Card>
          <p className="sub" style={{ margin: 0 }}>{t("aptitude_tests.empty")}</p>
        </Card>
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("aptitude_tests.columns.name")}</th>
                  <th>{t("aptitude_tests.columns.questions")}</th>
                  <th>{t("aptitude_tests.columns.assigned")}</th>
                  <th>{t("aptitude_tests.columns.pass_mark")}</th>
                  <th>{t("aptitude_tests.columns.duration")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.id}>
                    <td><Link href={`/admin/aptitude-tests/${test.id}`}><strong>{test.name}</strong></Link></td>
                    <td>{test.questionCount}</td>
                    <td>{test.assignedCount}</td>
                    <td>{test.passMark}{"/"}{test.totalMarks}</td>
                    <td>{test.durationMinutes}{" min"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/admin/aptitude-tests/${test.id}/results`} className="btn btn-sm btn-secondary">
                        {t("aptitude_tests.results_btn")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
