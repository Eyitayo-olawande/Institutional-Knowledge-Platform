import { getAttemptResult, verifyToken } from "@mantle/db/tenant";
import { notFound } from "next/navigation";
import { t } from "../../../../i18n.ts";
import { tenantDb } from "../../../../server/session.ts";
import { resolveRequestTenant } from "../../../../server/tenant.ts";

export default async function AptitudeResultsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const parsed = verifyToken(token);
  if (!parsed) notFound();

  const resolution = await resolveRequestTenant();
  if (!resolution.ok) notFound();
  const db = tenantDb(resolution.tenant);

  const { attemptId } = parsed;
  if (attemptId === "pending") notFound();

  const result = await getAttemptResult(db, attemptId);
  if (!result) notFound();

  const passPercent = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantle-color-bg_subtle)", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ background: "var(--mantle-color-bg)", borderRadius: 10, border: "1px solid var(--mantle-color-border)", padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {result.passed ? "✓" : "✗"}
          </div>
          <h1 style={{ marginTop: 0, marginBottom: 4, fontSize: 24 }}>{t("aptitude.results_heading")}</h1>
          <p style={{ margin: "0 0 24px", color: result.passed ? "var(--mantle-color-success)" : "var(--mantle-color-danger)", fontWeight: 700, fontSize: 18 }}>
            {result.passed ? t("aptitude.results_pass") : t("aptitude.results_fail")}
          </p>

          <div style={{ background: "var(--mantle-color-bg_subtle)", borderRadius: 8, padding: "20px 24px", marginBottom: 20, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--mantle-color-border)" }}>
              <strong>{t("aptitude.results_overall")}</strong>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{result.totalScore} / {result.totalMarks} ({passPercent}%)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
              <span>{t("aptitude.results_section_ga")}</span>
              <span>{result.generalAptitudeScore} / {result.generalAptitudeMarks}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>{t("aptitude.results_section_ck")}</span>
              <span>{result.companyKnowledgeScore} / {result.companyKnowledgeMarks}</span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
            {t("aptitude.results_pass_mark")}: {result.passMark} / {result.totalMarks}
          </p>
        </div>
      </div>
    </div>
  );
}
