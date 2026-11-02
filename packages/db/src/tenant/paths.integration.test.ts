import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, dropDatabase } from "../setup.ts";
import { commonArea, contentTypeByKey } from "./areas.ts";
import { connectTenant, type TenantDb } from "./client.ts";
import { createLibraryItem, saveDraft } from "./library.ts";
import { migrateTenant } from "./migrate.ts";
import { applyStaffImport, listActiveStaff, type StaffRow } from "./people.ts";
import {
  addDays,
  addItemToModule,
  addModuleToStage,
  completeModule,
  createModule,
  createPath,
  getPathBuilder,
  listModuleItems,
  personAssignments,
  setAssignmentRule,
  STAGE_ORDER,
} from "./paths.ts";
import { ensureDepartment } from "./structure.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_paths_${process.pid}_${Date.now()}`;
const importOpts = { markMissingAsLeavers: false, changedBy: "test" };
const row = (employeeId: string, fullName: string, department: string): StaffRow => ({
  employeeId,
  fullName,
  workEmail: `${employeeId.toLowerCase()}@a.test`,
  department,
  managerEmployeeId: null,
});

describe.skipIf(!serverUrl)("learning paths", { timeout: 60_000 }, () => {
  let db: TenantDb;
  let close: () => Promise<void>;

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    ({ db, close } = connectTenant(serverUrl ?? "", name));
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("gives a new path four stages with the default names and due days", async () => {
    const pathId = await createPath(db, { name: "Induction", departmentId: null }, "test");
    const builder = await getPathBuilder(db, pathId);
    expect(builder?.stages.map((s) => s.kind)).toEqual([...STAGE_ORDER]);
    expect(builder?.stages.map((s) => s.dueDays)).toEqual([14, 42, 70, 90]);
  });

  it("shows a module's library items through every path that uses it, with no copy", async () => {
    const place = { areaId: await commonArea(db), contentTypeId: (await contentTypeByKey(db, "common", "other")) ?? "" };
    const itemId = await createLibraryItem(db, { title: "Code of conduct", body: "Be fair.", ownerUserId: null, reviewDate: null, ...place }, "test");
    const moduleId = await createModule(db, "Code of conduct module", "test");

    const pathAId = await createPath(db, { name: "Path A", departmentId: null }, "test");
    const pathBId = await createPath(db, { name: "Path B", departmentId: null }, "test");
    const stageA = (await getPathBuilder(db, pathAId))?.stages.find((s) => s.kind === "common");
    const stageB = (await getPathBuilder(db, pathBId))?.stages.find((s) => s.kind === "common");
    if (!stageA || !stageB) throw new Error("missing common stage");
    await addModuleToStage(db, stageA.stageId, moduleId, "test");
    await addModuleToStage(db, stageB.stageId, moduleId, "test");
    await addItemToModule(db, moduleId, itemId, "test");

    expect((await getPathBuilder(db, pathAId))?.stages.find((s) => s.kind === "common")?.modules.map((m) => m.id)).toEqual([moduleId]);
    expect((await getPathBuilder(db, pathBId))?.stages.find((s) => s.kind === "common")?.modules.map((m) => m.id)).toEqual([moduleId]);

    await saveDraft(db, itemId, { title: "Code of conduct (updated)", body: "Be fair, always.", changeNote: null, ownerUserId: null, reviewDate: null }, "test");
    expect((await listModuleItems(db, moduleId)).map((i) => i.title)).toEqual(["Code of conduct (updated)"]);
  });

  it("assigns a joining Claims officer the Claims path with due dates from their start date", async () => {
    const claimsDeptId = await ensureDepartment(db, "Claims", "test");
    const claimsPathId = await createPath(db, { name: "Claims path", departmentId: claimsDeptId }, "test");
    await setAssignmentRule(db, { pathId: claimsPathId, departmentId: claimsDeptId, roleLevelId: null, unitId: null }, "test");

    await applyStaffImport(db, [row("P1", "Ada", "Claims")], importOpts);
    const [person] = (await listActiveStaff(db)).filter((p) => p.fullName === "Ada");
    if (!person) throw new Error("Ada was not imported.");

    const views = await personAssignments(db, person.id);
    expect(views.map((v) => v.pathId)).toContain(claimsPathId);
    const claimsView = views.find((v) => v.pathId === claimsPathId);
    const commonStage = claimsView?.stages.find((s) => s.kind === "common");
    expect(claimsView && commonStage?.dueDate.getTime()).toBe(claimsView && addDays(claimsView.startDate, 14).getTime());
  });

  it("keeps a mover's completed Common modules when they pick up their new department's path", async () => {
    const underwritingDeptId = await ensureDepartment(db, "Underwriting", "test");
    const underwritingPathId = await createPath(db, { name: "Underwriting path", departmentId: underwritingDeptId }, "test");
    await setAssignmentRule(db, { pathId: underwritingPathId, departmentId: underwritingDeptId, roleLevelId: null, unitId: null }, "test");

    const sharedModuleId = await createModule(db, "Shared induction module", "test");
    const claimsPathId = (await personAssignments(db, (await listActiveStaff(db)).find((p) => p.fullName === "Ada")!.id))[0]?.pathId;
    if (!claimsPathId) throw new Error("Ada's Claims path was not found.");
    const claimsCommonStageId = (await getPathBuilder(db, claimsPathId))?.stages.find((s) => s.kind === "common")?.stageId;
    const underwritingCommonStageId = (await getPathBuilder(db, underwritingPathId))?.stages.find((s) => s.kind === "common")?.stageId;
    if (!claimsCommonStageId || !underwritingCommonStageId) throw new Error("missing common stage");
    await addModuleToStage(db, claimsCommonStageId, sharedModuleId, "test");
    await addModuleToStage(db, underwritingCommonStageId, sharedModuleId, "test");

    const ada = (await listActiveStaff(db)).find((p) => p.fullName === "Ada");
    if (!ada) throw new Error("Ada was not found.");
    expect(await completeModule(db, ada.id, sharedModuleId, "test")).toBe(true);

    await applyStaffImport(db, [row("P1", "Ada", "Underwriting")], importOpts);
    const views = await personAssignments(db, ada.id);
    const underwritingView = views.find((v) => v.pathId === underwritingPathId);
    expect(underwritingView).toBeDefined();
    const commonStage = underwritingView?.stages.find((s) => s.kind === "common");
    expect(commonStage?.modules.find((m) => m.id === sharedModuleId)?.completed).toBe(true);
  });

  it("keeps stage two locked until stage one is complete", async () => {
    const pathId = await createPath(db, { name: "Locking path", departmentId: null }, "test");
    await setAssignmentRule(db, { pathId, departmentId: null, roleLevelId: null, unitId: null }, "test");
    const builder = await getPathBuilder(db, pathId);
    const commonStageId = builder?.stages.find((s) => s.kind === "common")?.stageId;
    if (!commonStageId) throw new Error("missing common stage");
    const commonModuleId = await createModule(db, "Stage one module", "test");
    await addModuleToStage(db, commonStageId, commonModuleId, "test");

    await applyStaffImport(db, [row("P2", "Bola", "Sales")], importOpts);
    const bola = (await listActiveStaff(db)).find((p) => p.fullName === "Bola");
    if (!bola) throw new Error("Bola was not imported.");

    const before = (await personAssignments(db, bola.id)).find((v) => v.pathId === pathId);
    expect(before?.stages.find((s) => s.kind === "common")?.unlocked).toBe(true);
    expect(before?.stages.find((s) => s.kind === "department")?.unlocked).toBe(false);

    await completeModule(db, bola.id, commonModuleId, "test");
    const after = (await personAssignments(db, bola.id)).find((v) => v.pathId === pathId);
    expect(after?.stages.find((s) => s.kind === "department")?.unlocked).toBe(true);
  });
});
