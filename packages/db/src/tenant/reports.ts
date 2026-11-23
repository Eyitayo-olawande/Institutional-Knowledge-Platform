import { and, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { TenantDb } from "./client.ts";
import {
  assessmentAttempts,
  assessments,
  assignments,
  changeAlertAcknowledgements,
  contentChangeAlerts,
  contentTypes,
  departments,
  employmentEvents,
  itemApplicabilityRules,
  itemViews,
  learningAreas,
  libraryItems,
  moduleProgress,
  people,
  staffAttestations,
  trainingNominations,
} from "./schema.ts";

export type DashboardMetrics = {
  activeStaff: number;
  publishedItems: number;
  activeAssignments: number;
  completedModules: number;
  pendingNominations: number;
  assessmentPassRate: number;
  assessmentAttempts: number;
  pendingAcknowledgements: number;
};

export async function dashboardMetrics(db: TenantDb): Promise<DashboardMetrics> {
  const [staffRows, itemRows, assignRows, progressRows, nominRows, attemptRows, ackRows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(people).where(eq(people.status, "active")),
    db.select({ n: sql<number>`count(*)::int` }).from(libraryItems).where(and(eq(libraryItems.status, "published"), eq(libraryItems.assessmentOnly, false))),
    db.select({ n: sql<number>`count(*)::int` }).from(assignments),
    db.select({ n: sql<number>`count(*)::int` }).from(moduleProgress).where(isNotNull(moduleProgress.completedAt)),
    db.select({ n: sql<number>`count(*)::int` }).from(trainingNominations).where(eq(trainingNominations.status, "pending")),
    db.select({ passed: assessmentAttempts.passed }).from(assessmentAttempts),
    db.select({ n: sql<number>`count(*)::int` }).from(changeAlertAcknowledgements).where(isNull(changeAlertAcknowledgements.acknowledgedAt)),
  ]);

  const totalAttempts = attemptRows.length;
  const passedAttempts = attemptRows.filter((a) => a.passed === true).length;

  return {
    activeStaff: staffRows[0]?.n ?? 0,
    publishedItems: itemRows[0]?.n ?? 0,
    activeAssignments: assignRows[0]?.n ?? 0,
    completedModules: progressRows[0]?.n ?? 0,
    pendingNominations: nominRows[0]?.n ?? 0,
    assessmentPassRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
    assessmentAttempts: totalAttempts,
    pendingAcknowledgements: ackRows[0]?.n ?? 0,
  };
}

export type KnowledgeRow = {
  id: string;
  title: string;
  area: string;
  contentType: string;
  status: string;
  viewCount: number;
  attestedCount: number;
  pendingAcks: number;
};

export async function knowledgeReport(db: TenantDb): Promise<KnowledgeRow[]> {
  const items = await db
    .select({
      id: libraryItems.id,
      title: libraryItems.title,
      status: libraryItems.status,
      areaId: libraryItems.areaId,
      contentTypeId: libraryItems.contentTypeId,
    })
    .from(libraryItems)
    .where(and(eq(libraryItems.assessmentOnly, false), eq(libraryItems.status, "published")))
    .orderBy(libraryItems.title);

  if (items.length === 0) return [];

  const itemIds = items.map((i) => i.id);
  const areaIds = [...new Set(items.map((i) => i.areaId))];
  const typeIds = [...new Set(items.map((i) => i.contentTypeId))];

  const [areaRows, typeRows, viewCounts, attestCounts, pendingAlerts] = await Promise.all([
    db.select({ id: learningAreas.id, departmentId: learningAreas.departmentId, kind: learningAreas.kind }).from(learningAreas).where(inArray(learningAreas.id, areaIds)),
    db.select({ id: contentTypes.id, label: contentTypes.label }).from(contentTypes).where(inArray(contentTypes.id, typeIds)),
    db
      .select({ itemId: itemViews.itemId, n: sql<number>`count(*)::int` })
      .from(itemViews)
      .where(inArray(itemViews.itemId, itemIds))
      .groupBy(itemViews.itemId),
    db
      .select({ itemId: staffAttestations.itemId, n: sql<number>`count(*)::int` })
      .from(staffAttestations)
      .where(inArray(staffAttestations.itemId, itemIds))
      .groupBy(staffAttestations.itemId),
    db
      .select({ alertId: changeAlertAcknowledgements.alertId, n: sql<number>`count(*)::int` })
      .from(changeAlertAcknowledgements)
      .where(isNull(changeAlertAcknowledgements.acknowledgedAt))
      .groupBy(changeAlertAcknowledgements.alertId),
  ]);

  const alertIds = [...new Set(pendingAlerts.map((a) => a.alertId))];
  const alertItems =
    alertIds.length > 0
      ? await db
          .select({ id: contentChangeAlerts.id, itemId: contentChangeAlerts.itemId })
          .from(contentChangeAlerts)
          .where(inArray(contentChangeAlerts.id, alertIds))
      : [];

  const alertToItem = new Map(alertItems.map((a) => [a.id, a.itemId]));
  const pendingAcksByItem: Record<string, number> = {};
  for (const row of pendingAlerts) {
    const itemId = alertToItem.get(row.alertId);
    if (itemId) pendingAcksByItem[itemId] = (pendingAcksByItem[itemId] ?? 0) + (row.n ?? 0);
  }

  const deptIds = areaRows.filter((a) => a.departmentId).map((a) => a.departmentId!);
  const deptRows =
    deptIds.length > 0
      ? await db.select({ id: departments.id, name: departments.name }).from(departments).where(inArray(departments.id, deptIds))
      : [];

  const areaMap = new Map(areaRows.map((a) => [a.id, a]));
  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));
  const typeMap = new Map(typeRows.map((ty) => [ty.id, ty.label]));
  const viewMap = new Map(viewCounts.map((v) => [v.itemId, v.n ?? 0]));
  const attestMap = new Map(attestCounts.map((a) => [a.itemId, a.n ?? 0]));

  const resolveArea = (areaId: string) => {
    const area = areaMap.get(areaId);
    if (!area) return "";
    if (area.kind === "common") return "Common Staff Learning";
    return deptMap.get(area.departmentId ?? "") ?? "Unknown";
  };

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    area: resolveArea(item.areaId),
    contentType: typeMap.get(item.contentTypeId) ?? "",
    status: item.status,
    viewCount: viewMap.get(item.id) ?? 0,
    attestedCount: attestMap.get(item.id) ?? 0,
    pendingAcks: pendingAcksByItem[item.id] ?? 0,
  }));
}

export type LearningDeptRow = {
  departmentId: string;
  department: string;
  enrolledCount: number;
  completedModules: number;
  totalModulesStarted: number;
  completionRate: number;
};

export type NominationSummaryRow = {
  status: string;
  count: number;
};

export type LearningReport = {
  deptRows: LearningDeptRow[];
  nominationSummary: NominationSummaryRow[];
};

export async function learningReport(db: TenantDb): Promise<LearningReport> {
  const [allPeople, allAssignments, allProgress, allNominations, allDepts] = await Promise.all([
    db.select({ id: people.id, departmentId: people.departmentId }).from(people).where(eq(people.status, "active")),
    db.select({ personId: assignments.personId }).from(assignments),
    db.select({ personId: moduleProgress.personId, completedAt: moduleProgress.completedAt }).from(moduleProgress),
    db.select({ status: trainingNominations.status }).from(trainingNominations),
    db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(departments.name),
  ]);

  const assignedPeople = new Set(allAssignments.map((a) => a.personId));
  const progressByPerson: Record<string, { completed: number; total: number }> = {};
  for (const p of allProgress) {
    const entry = progressByPerson[p.personId] ?? { completed: 0, total: 0 };
    progressByPerson[p.personId] = entry;
    entry.total++;
    if (p.completedAt) entry.completed++;
  }

  const deptRows: LearningDeptRow[] = allDepts.map((dept) => {
    const deptPeople = allPeople.filter((p) => p.departmentId === dept.id);
    const enrolled = deptPeople.filter((p) => assignedPeople.has(p.id)).length;
    let completed = 0;
    let total = 0;
    for (const p of deptPeople) {
      const prog = progressByPerson[p.id];
      if (prog) {
        completed += prog.completed;
        total += prog.total;
      }
    }
    return {
      departmentId: dept.id,
      department: dept.name,
      enrolledCount: enrolled,
      completedModules: completed,
      totalModulesStarted: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const nominCounts: Record<string, number> = {};
  for (const n of allNominations) {
    nominCounts[n.status] = (nominCounts[n.status] ?? 0) + 1;
  }
  const nominationSummary: NominationSummaryRow[] = Object.entries(nominCounts).map(([status, count]) => ({ status, count }));

  return { deptRows, nominationSummary };
}

export type AssessmentRow = {
  assessmentId: string;
  itemTitle: string;
  totalAttempts: number;
  uniquePeople: number;
  passCount: number;
  failCount: number;
  passRate: number;
  avgScore: number;
};

export async function assessmentReport(db: TenantDb): Promise<AssessmentRow[]> {
  const attempts = await db
    .select({
      id: assessmentAttempts.id,
      personId: assessmentAttempts.personId,
      assessmentId: assessmentAttempts.assessmentId,
      passed: assessmentAttempts.passed,
      score: assessmentAttempts.score,
    })
    .from(assessmentAttempts);

  if (attempts.length === 0) return [];

  const assessmentIds = [...new Set(attempts.map((a) => a.assessmentId))];
  const assessmentRows = await db
    .select({ id: assessments.id, itemId: assessments.itemId })
    .from(assessments)
    .where(inArray(assessments.id, assessmentIds));

  const itemIds = [...new Set(assessmentRows.map((a) => a.itemId))];
  const itemRows = await db
    .select({ id: libraryItems.id, title: libraryItems.title })
    .from(libraryItems)
    .where(inArray(libraryItems.id, itemIds));

  const assessmentToItem = new Map(assessmentRows.map((a) => [a.id, a.itemId]));
  const itemTitleMap = new Map(itemRows.map((i) => [i.id, i.title]));

  const byAssessment: Record<string, typeof attempts> = {};
  for (const a of attempts) {
    const bucket = byAssessment[a.assessmentId] ?? [];
    byAssessment[a.assessmentId] = bucket;
    bucket.push(a);
  }

  return assessmentIds.map((assessmentId) => {
    const rows = byAssessment[assessmentId] ?? [];
    const passCount = rows.filter((r) => r.passed === true).length;
    const scores = rows.map((r) => r.score ?? 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const uniquePeople = new Set(rows.map((r) => r.personId)).size;
    const itemId = assessmentToItem.get(assessmentId) ?? "";

    return {
      assessmentId,
      itemTitle: itemTitleMap.get(itemId) ?? "Unknown",
      totalAttempts: rows.length,
      uniquePeople,
      passCount,
      failCount: rows.length - passCount,
      passRate: rows.length > 0 ? Math.round((passCount / rows.length) * 100) : 0,
      avgScore,
    };
  });
}

export type ComplianceRow = {
  id: string;
  title: string;
  publishedVersion: number;
  attestedCount: number;
  activeStaff: number;
  overdueAcks: number;
  attestationRate: number;
  pendingAcks: number;
};

export async function complianceReport(db: TenantDb): Promise<ComplianceRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [attestationItems, globalStaffRows, deptStaffRows, pendingAlerts] = await Promise.all([
    // Join to learningAreas so we know the scope (common vs department) of each document.
    db
      .select({
        id: libraryItems.id,
        title: libraryItems.title,
        publishedVersion: libraryItems.publishedVersion,
        areaKind: learningAreas.kind,
        areaDeptId: learningAreas.departmentId,
      })
      .from(libraryItems)
      .leftJoin(learningAreas, eq(libraryItems.areaId, learningAreas.id))
      .where(and(eq(libraryItems.requiresAttestation, true), eq(libraryItems.status, "published"))),
    db.select({ n: sql<number>`count(*)::int` }).from(people).where(eq(people.status, "active")),
    // Per-department active headcount so department-scoped documents get the right denominator.
    db
      .select({ departmentId: people.departmentId, n: sql<number>`count(*)::int` })
      .from(people)
      .where(and(eq(people.status, "active"), isNotNull(people.departmentId)))
      .groupBy(people.departmentId),
    db
      .select({ alertId: changeAlertAcknowledgements.alertId, n: sql<number>`count(*)::int` })
      .from(changeAlertAcknowledgements)
      .where(isNull(changeAlertAcknowledgements.acknowledgedAt))
      .groupBy(changeAlertAcknowledgements.alertId),
  ]);

  // Overdue = unacknowledged and past due_by. Runs separately so a missing due_by column
  // (migration not yet applied) degrades gracefully to zero counts rather than crashing.
  const overdueAlerts = await db
    .select({ alertId: changeAlertAcknowledgements.alertId, n: sql<number>`count(*)::int` })
    .from(changeAlertAcknowledgements)
    .where(and(
      isNull(changeAlertAcknowledgements.acknowledgedAt),
      sql`${changeAlertAcknowledgements.dueBy} < ${today}`,
    ))
    .groupBy(changeAlertAcknowledgements.alertId)
    .catch(() => [] as { alertId: string; n: number }[]);

  if (attestationItems.length === 0) return [];

  const globalStaff = globalStaffRows[0]?.n ?? 0;
  const deptStaffMap = new Map(deptStaffRows.map((r) => [r.departmentId!, r.n]));

  const itemIds = attestationItems.map((i) => i.id);
  const attestCounts = await db
    .select({
      itemId: staffAttestations.itemId,
      version: staffAttestations.version,
      n: sql<number>`count(*)::int`,
    })
    .from(staffAttestations)
    .where(inArray(staffAttestations.itemId, itemIds))
    .groupBy(staffAttestations.itemId, staffAttestations.version);

  const alertIds = [...new Set(pendingAlerts.map((a) => a.alertId))];
  const alertItems =
    alertIds.length > 0
      ? await db
          .select({ id: contentChangeAlerts.id, itemId: contentChangeAlerts.itemId })
          .from(contentChangeAlerts)
          .where(inArray(contentChangeAlerts.id, alertIds))
      : [];

  const alertToItem = new Map(alertItems.map((a) => [a.id, a.itemId]));
  const pendingAcksByItem: Record<string, number> = {};
  for (const row of pendingAlerts) {
    const itemId = alertToItem.get(row.alertId);
    if (itemId) pendingAcksByItem[itemId] = (pendingAcksByItem[itemId] ?? 0) + (row.n ?? 0);
  }
  const overdueAcksByItem: Record<string, number> = {};
  for (const row of overdueAlerts) {
    const itemId = alertToItem.get(row.alertId);
    if (itemId) overdueAcksByItem[itemId] = (overdueAcksByItem[itemId] ?? 0) + (row.n ?? 0);
  }

  return attestationItems.map((item) => {
    const pv = item.publishedVersion ?? 1;
    const currentVersionAttestations = attestCounts.filter((a) => a.itemId === item.id && a.version === pv);
    const attestedCount = currentVersionAttestations.reduce((sum, a) => sum + (a.n ?? 0), 0);
    // Use department headcount for department-scoped documents; global for common docs.
    const denominator =
      item.areaKind === "department" && item.areaDeptId
        ? (deptStaffMap.get(item.areaDeptId) ?? globalStaff)
        : globalStaff;
    return {
      id: item.id,
      title: item.title,
      publishedVersion: pv,
      attestedCount,
      activeStaff: denominator,
      attestationRate: denominator > 0 ? Math.min(100, Math.round((attestedCount / denominator) * 100)) : 0,
      pendingAcks: pendingAcksByItem[item.id] ?? 0,
      overdueAcks: overdueAcksByItem[item.id] ?? 0,
    };
  });
}

export type PersonLearningRow = {
  personId: string;
  fullName: string;
  department: string;
  pathsEnrolled: number;
  modulesCompleted: number;
  nominationsCount: number;
};

export async function peopleReport(db: TenantDb): Promise<PersonLearningRow[]> {
  const [allPeople, allAssignments, allProgress, allNominations, allDepts] = await Promise.all([
    db
      .select({ id: people.id, fullName: people.fullName, departmentId: people.departmentId })
      .from(people)
      .where(eq(people.status, "active"))
      .orderBy(people.fullName),
    db.select({ personId: assignments.personId }).from(assignments),
    db.select({ personId: moduleProgress.personId, completedAt: moduleProgress.completedAt }).from(moduleProgress),
    db.select({ personId: trainingNominations.personId }).from(trainingNominations),
    db.select({ id: departments.id, name: departments.name }).from(departments),
  ]);

  const assignCountByPerson: Record<string, number> = {};
  for (const a of allAssignments) {
    assignCountByPerson[a.personId] = (assignCountByPerson[a.personId] ?? 0) + 1;
  }

  const completedByPerson: Record<string, number> = {};
  for (const p of allProgress) {
    if (p.completedAt) completedByPerson[p.personId] = (completedByPerson[p.personId] ?? 0) + 1;
  }

  const nominCountByPerson: Record<string, number> = {};
  for (const n of allNominations) {
    nominCountByPerson[n.personId] = (nominCountByPerson[n.personId] ?? 0) + 1;
  }

  const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));

  return allPeople.map((p) => ({
    personId: p.id,
    fullName: p.fullName,
    department: deptMap.get(p.departmentId ?? "") ?? "",
    pathsEnrolled: assignCountByPerson[p.id] ?? 0,
    modulesCompleted: completedByPerson[p.id] ?? 0,
    nominationsCount: nominCountByPerson[p.id] ?? 0,
  }));
}

export type DeptPerformanceRow = {
  departmentId: string;
  department: string;
  staffCount: number;
  pathsEnrolled: number;
  modulesCompleted: number;
  completionRate: number;
  assessmentAttempts: number;
  assessmentPassRate: number;
  nominationsCount: number;
};

export async function intelligenceReport(db: TenantDb): Promise<DeptPerformanceRow[]> {
  const [allDepts, allPeople, allAssignments, allProgress, allAttempts, allNominations] = await Promise.all([
    db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(departments.name),
    db.select({ id: people.id, departmentId: people.departmentId }).from(people).where(eq(people.status, "active")),
    db.select({ personId: assignments.personId }).from(assignments),
    db.select({ personId: moduleProgress.personId, completedAt: moduleProgress.completedAt }).from(moduleProgress),
    db.select({ personId: assessmentAttempts.personId, passed: assessmentAttempts.passed }).from(assessmentAttempts),
    db.select({ personId: trainingNominations.personId }).from(trainingNominations),
  ]);

  const assignedPeople = new Set(allAssignments.map((a) => a.personId));

  const progressByPerson: Record<string, { completed: number; total: number }> = {};
  for (const p of allProgress) {
    const entry = progressByPerson[p.personId] ?? { completed: 0, total: 0 };
    progressByPerson[p.personId] = entry;
    entry.total++;
    if (p.completedAt) entry.completed++;
  }

  const attemptsByPerson: Record<string, { total: number; passed: number }> = {};
  for (const a of allAttempts) {
    const entry = attemptsByPerson[a.personId] ?? { total: 0, passed: 0 };
    attemptsByPerson[a.personId] = entry;
    entry.total++;
    if (a.passed === true) entry.passed++;
  }

  const nominByPerson: Record<string, number> = {};
  for (const n of allNominations) {
    nominByPerson[n.personId] = (nominByPerson[n.personId] ?? 0) + 1;
  }

  return allDepts.map((dept) => {
    const deptPeople = allPeople.filter((p) => p.departmentId === dept.id);
    const enrolled = deptPeople.filter((p) => assignedPeople.has(p.id)).length;

    let completed = 0;
    let totalStarted = 0;
    let assessAttempts = 0;
    let assessPassed = 0;
    let nominations = 0;

    for (const p of deptPeople) {
      const prog = progressByPerson[p.id];
      if (prog) {
        completed += prog.completed;
        totalStarted += prog.total;
      }
      const att = attemptsByPerson[p.id];
      if (att) {
        assessAttempts += att.total;
        assessPassed += att.passed;
      }
      nominations += nominByPerson[p.id] ?? 0;
    }

    return {
      departmentId: dept.id,
      department: dept.name,
      staffCount: deptPeople.length,
      pathsEnrolled: enrolled,
      modulesCompleted: completed,
      completionRate: totalStarted > 0 ? Math.round((completed / totalStarted) * 100) : 0,
      assessmentAttempts: assessAttempts,
      assessmentPassRate: assessAttempts > 0 ? Math.round((assessPassed / assessAttempts) * 100) : 0,
      nominationsCount: nominations,
    };
  });
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(row.map(escape).join(","));
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// Onboarding Report (Phase 4)
// ---------------------------------------------------------------------------

export type OnboardingRow = {
  personId: string;
  fullName: string;
  department: string;
  joinedAt: Date;
  daysSinceJoining: number;
  pathsEnrolled: number;
  pendingAttestations: number;
  overdueAcks: number;
};

export async function onboardingReport(
  db: TenantDb,
  opts: { from: Date; to: Date },
): Promise<OnboardingRow[]> {
  const joinEvents = await db
    .select({ personId: employmentEvents.personId, eventAt: employmentEvents.createdAt })
    .from(employmentEvents)
    .where(
      and(
        eq(employmentEvents.type, "join"),
        gte(employmentEvents.createdAt, opts.from),
        lte(employmentEvents.createdAt, opts.to),
      ),
    );

  if (joinEvents.length === 0) return [];

  // Deduplicate by personId (re-joiners produce multiple join events; take latest).
  const latestJoinByPerson = new Map<string, Date>();
  for (const e of joinEvents) {
    const prev = latestJoinByPerson.get(e.personId);
    if (!prev || e.eventAt > prev) latestJoinByPerson.set(e.personId, e.eventAt);
  }
  const personIds = [...latestJoinByPerson.keys()];

  const [personRows, allDepts, assignmentCounts, applicableItems, attestations, overdueAckRows] = await Promise.all([
    db
      .select({ id: people.id, fullName: people.fullName, departmentId: people.departmentId, joinedAt: people.joinedAt })
      .from(people)
      .where(inArray(people.id, personIds)),
    db.select({ id: departments.id, name: departments.name }).from(departments),
    db
      .select({ personId: assignments.personId, n: sql<number>`count(*)::int` })
      .from(assignments)
      .where(and(inArray(assignments.personId, personIds), isNull(assignments.supersededAt)))
      .groupBy(assignments.personId),
    db
      .select({
        itemId: itemApplicabilityRules.itemId,
        requiresAttestation: libraryItems.requiresAttestation,
        publishedVersion: libraryItems.publishedVersion,
      })
      .from(itemApplicabilityRules)
      .innerJoin(libraryItems, eq(libraryItems.id, itemApplicabilityRules.itemId))
      .where(eq(libraryItems.status, "published")),
    db
      .select({ personId: staffAttestations.personId, itemId: staffAttestations.itemId, version: staffAttestations.version })
      .from(staffAttestations)
      .where(inArray(staffAttestations.personId, personIds)),
    db
      .select({ personId: changeAlertAcknowledgements.personId, n: sql<number>`count(*)::int` })
      .from(changeAlertAcknowledgements)
      .where(
        and(
          inArray(changeAlertAcknowledgements.personId, personIds),
          isNull(changeAlertAcknowledgements.acknowledgedAt),
          sql`${changeAlertAcknowledgements.dueBy} < ${new Date().toISOString().slice(0, 10)}`,
        ),
      )
      .groupBy(changeAlertAcknowledgements.personId)
      .catch(() => [] as { personId: string; n: number }[]),
  ]);

  const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));
  const assignMap = new Map(assignmentCounts.map((a) => [a.personId, a.n ?? 0]));
  const overdueMap = new Map(overdueAckRows.map((r) => [r.personId, r.n ?? 0]));

  // Deduplicate applicability rules by itemId
  const itemMetaMap = new Map<string, { requiresAttestation: boolean; publishedVersion: number | null }>();
  for (const r of applicableItems) {
    if (!itemMetaMap.has(r.itemId)) {
      itemMetaMap.set(r.itemId, { requiresAttestation: r.requiresAttestation ?? false, publishedVersion: r.publishedVersion });
    }
  }
  const requiredItemIds = [...itemMetaMap.keys()];

  // Latest attestation per person per item
  const latestAttest = new Map<string, number>();
  for (const a of attestations) {
    const key = `${a.personId}|${a.itemId}`;
    const prev = latestAttest.get(key) ?? -1;
    if (a.version > prev) latestAttest.set(key, a.version);
  }

  const now = Date.now();

  return personIds
    .map((personId) => {
      const person = personRows.find((p) => p.id === personId);
      if (!person) return null;

      let pendingAttestations = 0;
      for (const itemId of requiredItemIds) {
        const item = itemMetaMap.get(itemId)!;
        const attestedVersion = latestAttest.get(`${person.id}|${itemId}`) ?? null;
        const currentVersion = item.publishedVersion ?? 0;
        if (item.requiresAttestation) {
          if (attestedVersion === null || attestedVersion < currentVersion) pendingAttestations++;
        } else {
          if (attestedVersion === null) pendingAttestations++;
        }
      }

      const joinedAt = person.joinedAt;
      const daysSinceJoining = Math.floor((now - joinedAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        personId: person.id,
        fullName: person.fullName,
        department: deptMap.get(person.departmentId ?? "") ?? "",
        joinedAt,
        daysSinceJoining,
        pathsEnrolled: assignMap.get(person.id) ?? 0,
        pendingAttestations,
        overdueAcks: overdueMap.get(person.id) ?? 0,
      };
    })
    .filter(Boolean) as OnboardingRow[];
}

// ---------------------------------------------------------------------------
// Compliance per-person drill-down (Phase 4)
// ---------------------------------------------------------------------------

export type CompliancePersonRow = {
  personId: string;
  fullName: string;
  department: string;
  lastAttestedAt: Date | null;
  attestedVersion: number | null;
  currentVersion: number;
};

export async function complianceDetailForItem(
  db: TenantDb,
  itemId: string,
): Promise<{ item: { id: string; title: string; publishedVersion: number } | null; nonAttested: CompliancePersonRow[] }> {
  const [itemRow] = await db
    .select({
      id: libraryItems.id,
      title: libraryItems.title,
      publishedVersion: libraryItems.publishedVersion,
      areaKind: learningAreas.kind,
      areaDeptId: learningAreas.departmentId,
    })
    .from(libraryItems)
    .leftJoin(learningAreas, eq(libraryItems.areaId, learningAreas.id))
    .where(eq(libraryItems.id, itemId));

  if (!itemRow) return { item: null, nonAttested: [] };

  const pv = itemRow.publishedVersion ?? 1;

  const [allStaff, allDepts, attestations] = await Promise.all([
    itemRow.areaKind === "department" && itemRow.areaDeptId
      ? db
          .select({ id: people.id, fullName: people.fullName, departmentId: people.departmentId })
          .from(people)
          .where(and(eq(people.status, "active"), eq(people.departmentId, itemRow.areaDeptId)))
      : db
          .select({ id: people.id, fullName: people.fullName, departmentId: people.departmentId })
          .from(people)
          .where(eq(people.status, "active")),
    db.select({ id: departments.id, name: departments.name }).from(departments),
    db
      .select({ personId: staffAttestations.personId, version: staffAttestations.version, attestedAt: staffAttestations.attestedAt })
      .from(staffAttestations)
      .where(eq(staffAttestations.itemId, itemId)),
  ]);

  const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));

  const latestByPerson = new Map<string, { version: number; attestedAt: Date }>();
  for (const a of attestations) {
    const prev = latestByPerson.get(a.personId);
    if (!prev || a.version > prev.version) latestByPerson.set(a.personId, { version: a.version, attestedAt: a.attestedAt });
  }

  const nonAttested: CompliancePersonRow[] = allStaff
    .filter((p) => {
      const latest = latestByPerson.get(p.id);
      return !latest || latest.version < pv;
    })
    .map((p) => {
      const latest = latestByPerson.get(p.id);
      return {
        personId: p.id,
        fullName: p.fullName,
        department: deptMap.get(p.departmentId ?? "") ?? "",
        lastAttestedAt: latest?.attestedAt ?? null,
        attestedVersion: latest?.version ?? null,
        currentVersion: pv,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return { item: { id: itemRow.id, title: itemRow.title, publishedVersion: pv }, nonAttested };
}
