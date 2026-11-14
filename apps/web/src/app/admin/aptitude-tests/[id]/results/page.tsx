import { getAptitudeTest, getTestResults } from "@mantle/db/tenant";
import { Badge, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../../../server/session.ts";
import { AppShell } from "../../../../_components/AppShell.tsx";

export default async function AptitudeResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePermission("candidates.manage");
  await requireFeature(ctx.tenant, "aptitude_testing");
  const { id } = await params;

  const [test, results] = await Promise.all([
    getAptitudeTest(ctx.db, id),
    getTestResults(ctx.db, id),
  ]);
  if (!test) notFound();

  const passCount = results.filter((r) => r.passed).length;
  const submitCount = results.filter((r) => r.submittedAt !== null).length;

  return (
    <AppShell ctx={ctx} active="aptitude_tests">
      <Link href={`/admin/aptitude-tests/${id}`} className="muted" style={{ fontSize: 13, display: "inline-block", marginBottom: 20 }}>
        {"←"} Back to test
      </Link>
      <h1 style={{ marginTop: 0 }}>{t("aptitude_tests.results_heading")}: {test.name}</h1>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <Card style={{ flex: "0 0 auto", minWidth: 120, textAlign: "center", padding: "16px 24px" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{results.length}</div>
          <div style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", marginTop: 4 }}>Assigned</div>
        </Card>
        <Card style={{ flex: "0 0 auto", minWidth: 120, textAlign: "center", padding: "16px 24px" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{submitCount}</div>
          <div style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", marginTop: 4 }}>Submitted</div>
        </Card>
        <Card style={{ flex: "0 0 auto", minWidth: 120, textAlign: "center", padding: "16px 24px" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: submitCount > 0 ? "var(--mantle-color-success)" : undefined }}>
            {submitCount > 0 ? Math.round((passCount / submitCount) * 100) : 0}%
          </div>
          <div style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", marginTop: 4 }}>Pass rate</div>
        </Card>
      </div>

      {results.length === 0 ? (
        <Card>
          <p className="sub" style={{ margin: 0 }}>No candidates assigned to this test yet.</p>
        </Card>
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("aptitude_tests.columns_results.ref")}</th>
                  <th>{t("aptitude_tests.columns_results.candidate")}</th>
                  <th>{t("aptitude_tests.columns_results.position")}</th>
                  <th>{t("aptitude_tests.columns_results.ga_score")}</th>
                  <th>{t("aptitude_tests.columns_results.ck_score")}</th>
                  <th>{t("aptitude_tests.columns_results.total")}</th>
                  <th>{t("aptitude_tests.columns_results.result")}</th>
                  <th>{t("aptitude_tests.columns_results.submitted")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.assignmentId}>
                    <td><code style={{ fontSize: 12 }}>{r.candidateRef}</code></td>
                    <td>
                      <Link href={`/admin/candidates/${r.candidateId}`}>
                        {r.firstName} {r.surname}
                      </Link>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.positionAppliedFor}</td>
                    <td>{r.submittedAt !== null ? (r.generalAptitudeScore ?? "-") : "-"}</td>
                    <td>{r.submittedAt !== null ? (r.companyKnowledgeScore ?? "-") : "-"}</td>
                    <td style={{ fontWeight: 600 }}>{r.submittedAt !== null ? (r.totalScore ?? "-") : "-"}</td>
                    <td>
                      {r.submittedAt === null ? (
                        <Badge tone="neutral">{t("aptitude_tests.not_started")}</Badge>
                      ) : r.passed ? (
                        <Badge tone="success">{t("aptitude_tests.pass")}</Badge>
                      ) : (
                        <Badge tone="danger">{t("aptitude_tests.fail")}</Badge>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--mantle-color-text_muted)" }}>
                      {r.submittedAt !== null ? new Date(r.submittedAt).toISOString().slice(0, 16).replace("T", " ") : "-"}
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
