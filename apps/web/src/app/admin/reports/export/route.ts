import {
  assessmentReport,
  complianceReport,
  intelligenceReport,
  knowledgeReport,
  learningReport,
  peopleReport,
  toCsv,
} from "@mantle/db/tenant";
import { requirePermission } from "../../../../server/session.ts";

export async function GET(req: Request) {
  const ctx = await requirePermission("reports.view");
  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? "";

  let csv = "";
  let filename = "report.csv";

  if (category === "knowledge") {
    const rows = await knowledgeReport(ctx.db);
    csv = toCsv(["Item", "Learning Area", "Type", "Status", "Views", "Attested", "Pending Acks"],
      rows.map((r) => [r.title, r.area, r.contentType, r.status, r.viewCount, r.attestedCount, r.pendingAcks]));
    filename = "knowledge-report.csv";
  } else if (category === "learning" || category === "learning-dept") {
    const { deptRows } = await learningReport(ctx.db);
    csv = toCsv(["Department", "Enrolled", "Modules Completed", "Total Modules Started", "Completion Rate %"],
      deptRows.map((r) => [r.department, r.enrolledCount, r.completedModules, r.totalModulesStarted, r.completionRate]));
    filename = "learning-dept-report.csv";
  } else if (category === "learning-nominations") {
    const { nominationSummary } = await learningReport(ctx.db);
    csv = toCsv(["Nomination Status", "Count"],
      nominationSummary.map((r) => [r.status, r.count]));
    filename = "learning-nominations-report.csv";
  } else if (category === "assessment") {
    const rows = await assessmentReport(ctx.db);
    csv = toCsv(["Assessment", "Attempts", "People", "Passed", "Failed", "Pass Rate %", "Avg Score %"],
      rows.map((r) => [r.itemTitle, r.totalAttempts, r.uniquePeople, r.passCount, r.failCount, r.passRate, r.avgScore]));
    filename = "assessment-report.csv";
  } else if (category === "compliance") {
    const rows = await complianceReport(ctx.db);
    csv = toCsv(["Document", "Version", "Attested", "Active Staff", "Attestation Rate %", "Pending Acks", "Overdue"],
      rows.map((r) => [r.title, r.publishedVersion, r.attestedCount, r.activeStaff, r.attestationRate, r.pendingAcks, r.overdueAcks]));
    filename = "compliance-report.csv";
  } else if (category === "people") {
    const rows = await peopleReport(ctx.db);
    csv = toCsv(["Name", "Department", "Paths Enrolled", "Modules Completed", "Nominations"],
      rows.map((r) => [r.fullName, r.department, r.pathsEnrolled, r.modulesCompleted, r.nominationsCount]));
    filename = "people-report.csv";
  } else if (category === "intelligence") {
    const rows = await intelligenceReport(ctx.db);
    csv = toCsv(["Department", "Staff", "Paths Enrolled", "Modules Completed", "Completion Rate %", "Assessment Attempts", "Assessment Pass Rate %", "Nominations"],
      rows.map((r) => [r.department, r.staffCount, r.pathsEnrolled, r.modulesCompleted, r.completionRate, r.assessmentAttempts, r.assessmentPassRate, r.nominationsCount]));
    filename = "intelligence-report.csv";
  } else {
    return new Response("Unknown category", { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
