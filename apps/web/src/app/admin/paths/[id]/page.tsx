import { getPathBuilder, listAssignmentRules, listLibraryItems, listModuleItems, listModules, listStructure, type BuilderStage } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";
import {
  addExistingModuleAction,
  addItemAction,
  addRuleAction,
  createAndAddModuleAction,
  moveModuleAction,
  removeItemAction,
  removeModuleAction,
  removeRuleAction,
  setDueDaysAction,
} from "../actions.ts";

const ID = /^[0-9a-f-]{36}$/;

export default async function PathBuilder({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission("paths.edit");
  await requireFeature(ctx.tenant, "learning_paths");
  const { id } = await params;
  const builder = ID.test(id) ? await getPathBuilder(ctx.db, id) : null;
  if (!builder) notFound();

  const [rules, allModules, items, departments, roleLevels, units] = await Promise.all([
    listAssignmentRules(ctx.db, id),
    listModules(ctx.db),
    listLibraryItems(ctx.db, { publishedOnly: true, areas: "all" }),
    listStructure(ctx.db, "department"),
    listStructure(ctx.db, "role_level"),
    listStructure(ctx.db, "unit"),
  ]);
  const moduleItems = Object.fromEntries(
    await Promise.all(builder.stages.flatMap((s) => s.modules).map(async (m) => [m.id, await listModuleItems(ctx.db, m.id)] as const)),
  );
  const nameOf = (list: readonly { id: string; name: string }[], id: string | null) => (id ? list.find((x) => x.id === id)?.name ?? "" : t("paths.builder.any"));

  return (
    <AppShell ctx={ctx} active="paths">
      <p className="crumb"><Link href="/admin/paths">{t("paths.builder.back")}</Link></p>
      <PageHead title={builder.path.name} sub={nameOf(departments, builder.path.departmentId)} />

      <Card>
        <h2 style={{ marginTop: 0 }}>{t("paths.builder.rules_heading")}</h2>
        <p className="sub" style={{ marginTop: 0 }}>{t("paths.builder.rules_explain")}</p>
        {rules.length === 0 ? <p className="sub">{t("paths.builder.no_rules")}</p> : (
          <ul className="list">
            {rules.map((r) => (
              <li key={r.id}>
                <span className="grow">
                  {t("paths.builder.rule_summary", { department: nameOf(departments, r.departmentId), role: nameOf(roleLevels, r.roleLevelId), unit: nameOf(units, r.unitId) })}
                </span>
                <form action={removeRuleAction}>
                  <input type="hidden" name="pathId" value={id} />
                  <input type="hidden" name="ruleId" value={r.id} />
                  <Button type="submit" variant="ghost" size="sm">{t("paths.builder.remove_rule")}</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addRuleAction} className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <input type="hidden" name="pathId" value={id} />
          <select className="input" name="departmentId" defaultValue="" aria-label={t("paths.builder.rule_department")}>
            <option value="">{t("paths.builder.any_department")}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className="input" name="roleLevelId" defaultValue="" aria-label={t("paths.builder.rule_role_level")}>
            <option value="">{t("paths.builder.any_role_level")}</option>
            {roleLevels.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select className="input" name="unitId" defaultValue="" aria-label={t("paths.builder.rule_unit")}>
            <option value="">{t("paths.builder.any_unit")}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">{t("paths.builder.add_rule")}</Button>
        </form>
      </Card>

      <div className="grid grid-4" style={{ marginTop: 16, alignItems: "start" }}>
        {builder.stages.map((stage) => (
          <StageColumn key={stage.stageId} pathId={id} stage={stage} allModules={allModules} items={items} moduleItems={moduleItems} />
        ))}
      </div>
    </AppShell>
  );
}

function StageColumn({
  pathId,
  stage,
  allModules,
  items,
  moduleItems,
}: {
  pathId: string;
  stage: BuilderStage;
  allModules: readonly { id: string; title: string }[];
  items: readonly { id: string; title: string }[];
  moduleItems: Record<string, readonly { id: string; title: string; rank: number }[]>;
}) {
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>{t(`paths.stages.${stage.kind}`)}</h3>
      <form action={setDueDaysAction}>
        <input type="hidden" name="pathId" value={pathId} />
        <input type="hidden" name="stageId" value={stage.stageId} />
        <label className="field">
          {t("paths.builder.due_days_heading")}
          <input className="input" name="dueDays" type="number" min={1} defaultValue={stage.dueDays} />
        </label>
        <Button type="submit" variant="secondary" size="sm" style={{ width: "100%" }}>{t("paths.builder.save")}</Button>
      </form>

      <ul className="list" style={{ marginTop: 12 }}>
        {stage.modules.map((m, i) => (
          <li key={m.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>{m.title}</span>
            <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
              {i === 0 ? null : (
                <form action={moveModuleAction}>
                  <input type="hidden" name="pathId" value={pathId} />
                  <input type="hidden" name="stageId" value={stage.stageId} />
                  <input type="hidden" name="moduleId" value={m.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="ghost" size="sm">{t("paths.builder.move_up")}</Button>
                </form>
              )}
              {i === stage.modules.length - 1 ? null : (
                <form action={moveModuleAction}>
                  <input type="hidden" name="pathId" value={pathId} />
                  <input type="hidden" name="stageId" value={stage.stageId} />
                  <input type="hidden" name="moduleId" value={m.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="ghost" size="sm">{t("paths.builder.move_down")}</Button>
                </form>
              )}
              <form action={removeModuleAction}>
                <input type="hidden" name="pathId" value={pathId} />
                <input type="hidden" name="stageId" value={stage.stageId} />
                <input type="hidden" name="moduleId" value={m.id} />
                <Button type="submit" variant="ghost" size="sm">{t("paths.builder.remove_module")}</Button>
              </form>
            </div>

            <div style={{ paddingLeft: 12 }}>
              {(moduleItems[m.id] ?? []).length === 0 ? <p className="sub" style={{ margin: "4px 0" }}>{t("paths.builder.no_items")}</p> : (
                <ul className="list">
                  {(moduleItems[m.id] ?? []).map((it) => (
                    <li key={it.id} style={{ flexWrap: "wrap" }}>
                      <span className="grow">{it.title}</span>
                      <form action={removeItemAction}>
                        <input type="hidden" name="pathId" value={pathId} />
                        <input type="hidden" name="moduleId" value={m.id} />
                        <input type="hidden" name="itemId" value={it.id} />
                        <Button type="submit" variant="ghost" size="sm">{t("paths.builder.remove_item")}</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addItemAction}>
                <input type="hidden" name="pathId" value={pathId} />
                <input type="hidden" name="moduleId" value={m.id} />
                <select className="input" name="itemId" defaultValue="" required aria-label={t("paths.builder.items_heading")} style={{ marginBottom: 6 }}>
                  <option value="" disabled>{t("paths.builder.choose_item")}</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.title}</option>
                  ))}
                </select>
                <Button type="submit" variant="ghost" size="sm" style={{ width: "100%" }}>{t("paths.builder.add_item")}</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <h4>{t("paths.builder.add_module_heading")}</h4>
      <form action={createAndAddModuleAction}>
        <input type="hidden" name="pathId" value={pathId} />
        <input type="hidden" name="stageId" value={stage.stageId} />
        <input className="input" name="title" required aria-label={t("paths.builder.new_module_name")} placeholder={t("paths.builder.new_module_name")} style={{ marginBottom: 6 }} />
        <Button type="submit" variant="secondary" size="sm" style={{ width: "100%" }}>{t("paths.builder.add_new")}</Button>
      </form>
      <form action={addExistingModuleAction} style={{ marginTop: 8 }}>
        <input type="hidden" name="pathId" value={pathId} />
        <input type="hidden" name="stageId" value={stage.stageId} />
        <select className="input" name="moduleId" defaultValue="" required aria-label={t("paths.builder.existing_module")} style={{ marginBottom: 6 }}>
          <option value="" disabled>{t("paths.builder.choose_module")}</option>
          {allModules.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
        <Button type="submit" variant="ghost" size="sm" style={{ width: "100%" }}>{t("paths.builder.add_existing")}</Button>
      </form>
    </Card>
  );
}
