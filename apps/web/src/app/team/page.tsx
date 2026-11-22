import { directReports, myLearning, outstandingRequirements, tenantSchema } from "@mantle/db/tenant";
import { eq } from "drizzle-orm";
import Link from "next/link";
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
        <h1>My Team</h1>
        <p className="sub">Your staff profile has not been set up yet. Contact your learning administrator.</p>
      </AppShell>
    );
  }

  const reports = await directReports(db, managerRow.employeeId);

  if (reports.length === 0) {
    return (
      <AppShell ctx={ctx} active="team">
        <h1>My Team</h1>
        <p className="sub">No active direct reports found for your employee record.</p>
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
      <h1>My Team</h1>
      <p className="sub" style={{ marginBottom: 24 }}>
        {enriched.length === 1
          ? "1 active direct report"
          : `${enriched.length} active direct reports`}
      </p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ textAlign: "right" }}>Completion</th>
              <th style={{ textAlign: "right" }}>Outstanding</th>
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
                    {person.completionRate}%
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
                    <span style={{ fontSize: 12, color: "var(--mantle-color-text_muted)" }}>None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontSize: 13, color: "var(--mantle-color-text_muted)" }}>
        Outstanding items are library resources assigned as required reading that the team member has not yet read or attested.{" "}
        <Link href="/admin/reports" style={{ color: "var(--mantle-color-primary)" }}>View full reports →</Link>
      </p>
    </AppShell>
  );
}
