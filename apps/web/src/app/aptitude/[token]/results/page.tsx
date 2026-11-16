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
  const gaPercent = result.generalAptitudeMarks > 0 ? Math.round((result.generalAptitudeScore / result.generalAptitudeMarks) * 100) : 0;
  const ckPercent = result.companyKnowledgeMarks > 0 ? Math.round((result.companyKnowledgeScore / result.companyKnowledgeMarks) * 100) : 0;
  const passMarkPercent = result.totalMarks > 0 ? Math.round((result.passMark / result.totalMarks) * 100) : 0;

  const scoreColor = result.passed ? "var(--mantle-color-success)" : "var(--mantle-color-danger)";
  const badgeBg = result.passed
    ? "color-mix(in srgb, var(--mantle-color-success) 12%, transparent)"
    : "color-mix(in srgb, var(--mantle-color-danger) 10%, transparent)";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantle-color-bg_subtle)", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ background: "var(--mantle-color-bg)", borderRadius: 10, border: "1px solid var(--mantle-color-border)", padding: "32px 28px", textAlign: "center" }}>

          <p style={{ margin: "0 0 20px", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--mantle-color-text_muted)" }}>
            {t("aptitude.results_heading")}
          </p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, color: scoreColor, letterSpacing: "-2px" }}>
              {passPercent}%
            </div>
            <div style={{ fontSize: 15, color: "var(--mantle-color-text_muted)", marginTop: 6 }}>
              {result.totalScore} / {result.totalMarks}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: badgeBg, color: scoreColor, fontWeight: 700, fontSize: 14 }}>
              {result.passed ? t("aptitude.results_pass") : t("aptitude.results_fail")}
            </span>
          </div>

          <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
            {result.passed ? t("aptitude.results_message_pass") : t("aptitude.results_message_fail")}
          </p>

          <div style={{ background: "var(--mantle-color-bg_subtle)", borderRadius: 8, padding: "16px 20px", marginBottom: 16, textAlign: "left" }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "var(--mantle-color-text_muted)" }}>{t("aptitude.results_section_ga")}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{result.generalAptitudeScore} / {result.generalAptitudeMarks}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--mantle-color-border)" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${gaPercent}%`, background: "var(--mantle-color-brand)", transition: "width 0.4s ease" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "var(--mantle-color-text_muted)" }}>{t("aptitude.results_section_ck")}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{result.companyKnowledgeScore} / {result.companyKnowledgeMarks}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--mantle-color-border)" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${ckPercent}%`, background: "var(--mantle-color-brand)", transition: "width 0.4s ease" }} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--mantle-color-text_muted)" }}>
            <span>{t("aptitude.results_pass_mark")}: {result.passMark} / {result.totalMarks} ({passMarkPercent}%)</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeOpacity="0.5" />
                <path d="M3.5 6L5.5 8L8.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("aptitude.results_recorded")}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
