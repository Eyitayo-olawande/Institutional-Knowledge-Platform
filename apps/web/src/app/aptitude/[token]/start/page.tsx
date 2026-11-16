import { getTestForCandidate, startAttempt, verifyToken } from "@mantle/db/tenant";
import { Button } from "@mantle/ui";
import { notFound, redirect } from "next/navigation";
import { t } from "../../../../i18n.ts";
import { tenantDb } from "../../../../server/session.ts";
import { resolveRequestTenant } from "../../../../server/tenant.ts";
import { signToken } from "@mantle/db/tenant";

export default async function AptitudeStartPage({
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

  const { testId, candidateId } = parsed;

  // Check if already started/submitted
  const { attemptId, alreadySubmitted } = await startAttempt(db, testId, candidateId);
  if (alreadySubmitted) {
    redirect(`/aptitude/${signToken(testId, candidateId, attemptId)}/results`);
  }

  const data = await getTestForCandidate(db, testId, attemptId);
  if (!data) notFound();

  const { test } = data;
  const testToken = signToken(testId, candidateId, attemptId);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantle-color-bg_subtle)", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        <div style={{ background: "var(--mantle-color-bg)", borderRadius: 10, border: "1px solid var(--mantle-color-border)", padding: "32px 32px 28px" }}>
          <h1 style={{ marginTop: 0, marginBottom: 16, fontSize: 22 }}>{t("aptitude.start_heading")}</h1>
          <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", display: "block" }}>{t("aptitude.start_duration")}</span>
              <strong>{test.durationMinutes} {t("aptitude.start_minutes")}</strong>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", display: "block" }}>{t("aptitude.start_questions")}</span>
              <strong>{test.numQuestions}</strong>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", display: "block" }}>{t("aptitude.start_pass_mark")}</span>
              <strong>{test.passMark}/{test.totalMarks}</strong>
            </div>
          </div>
          {test.instructions ? (
            <p style={{ fontSize: 14, lineHeight: 1.6, borderLeft: "3px solid var(--mantle-color-brand)", paddingLeft: 12, marginBottom: 24 }}>
              {test.instructions}
            </p>
          ) : null}
          <form action={`/aptitude/${testToken}/test`} method="GET">
            <Button type="submit" style={{ width: "100%" }}>{t("aptitude.start_btn_begin")}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
