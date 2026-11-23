import { directReports, myLearning, outstandingRequirements, tenantSchema } from "@mantle/db/tenant";
// eslint-disable-next-line no-restricted-imports
import { eq } from "drizzle-orm";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { requirePermission } from "../../server/session.ts";
import { AppShell } from "../_components/AppShell.tsx";

export default async function TeamPage() {
  const ctx = await requirePermission("team.view");
  const { db, user } = ctx;

  const [managerRow] = await db
    .select({ id: tenantSchema.people.id, fullName: tenantSchema.people.fullName, employeeId: tenantSchema.people.employeeId })
    .from(tenantSchema.people)
    .where(eq(tenantSchema.people.userId, user.id));

  if (!managerRow) {
    return (
      <AppShell ctx={ctx} active="team">
        <h1>{t("team.heading")}</h1>
        <p className="sub">{t("team.no_profile")}</p>
      </AppShell>
    );
  }

  const reports = await directReports(db, managerRow.employeeId);

  if (reports.length === 0) {
    return (
      <AppShell ctx={ctx} active="team">
        <h1>{t("team.heading")}</h1>
        <p className="sub">{t("team.no_reports")}</p>
      </AppShell>
    );
  }

  // Fetch completion and outstanding for each report in parallel.
  const enriched = await Promise.all(
    reports.map(async (person) => {
      const [learning, outstanding] = await Promise.all([
        myLearning(db, person.id),
        outstandingRequirements(db, person.id),
      ]);
      return {
        ...person,
        completionRate: learning.completionRate,
        outstandingCount: outstanding.length,
      };
    }),
  );

  return (
    <AppShell ctx={ctx} active="team">
      <h1>{t("team.heading")}</h1>
      <p className="sub" style={{ marginBottom: 24 }}>
        {enriched.length === 1
          ? "1 active direct report"
          : `${enriched.length} active direct reports`}
      </p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t("team.col_name")}</th>
              <th style={{ textAlign: "right" }}>{t("team.col_completion")}</th>
              <th style={{ textAlign: "right" }}>{t("team.col_outstanding")}</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((person) => (
              <tr key={person.id}>
                <td style={{ fontWeight: 500 }}>{person.fullName}</td>
                <td style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: person.completionRate >= 80
                        ? "var(--mantle-color-success_bg, #dcfce7)"
                        : person.completionRate >= 40
                        ? "var(--mantle-color-warning_bg, #fef9c3)"
                        : "var(--mantle-color-surface_muted)",
                      color: person.completionRate >= 80
                        ? "var(--mantle-color-success, #15803d)"
                        : person.completionRate >= 40
                        ? "var(--mantle-color-warning, #a16207)"
                        : "var(--mantle-color-text_muted)",
                    }}
                  >
                    {person.completionRate}{"%"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  {person.outstandingCount > 0 ? (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: "var(--mantle-color-warning_bg, #fef9c3)",
                        color: "var(--mantle-color-warning, #a16207)",
                      }}
                    >
                      {person.outstandingCount}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--mantle-color-text_muted)" }}>{t("team.none_outstanding")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
        {t("team.outstanding_desc")}{" "}
        <Link href="/admin/reports" style={{ color: "var(--mantle-color-primary)" }}>{t("team.reports_link")}{"→"}</Link>
      </p>
    </AppShell>
  );
}
