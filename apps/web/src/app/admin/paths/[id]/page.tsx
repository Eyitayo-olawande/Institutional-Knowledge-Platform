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

const STAGE_ICONS: Record<string, string> = {
  common: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 9h8M9 5v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  department: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="6" width="6" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="2" width="6" height="14" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
  role: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  certificate: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="2" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6 16l3-2 3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 6h6M6 9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

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
    await Promise.all(
      builder.stages.flatMap((s) => s.modules).map(async (m) => [m.id, await listModuleItems(ctx.db, m.id)] as const),
    ),
  );
  const nameOf = (list: readonly { id: string; name: string }[], itemId: string | null) =>
    itemId ? list.find((x) => x.id === itemId)?.name ?? "" : t("paths.builder.any");

  return (
    <AppShell ctx={ctx} active="paths">
      <p className="crumb"><Link href="/admin/paths">{t("paths.builder.back")}</Link></p>
      <PageHead title={builder.path.name} sub={nameOf(departments, builder.path.departmentId)} />

      {/* Assignment rules */}
      <Card>
        <div className="pb-section-head">
          <div className="pb-section-icon pb-section-icon--rule" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9h12M3 5h12M3 13h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h2 className="pb-section-title">{t("paths.builder.rules_heading")}</h2>
            <p className="pb-section-sub">{t("paths.builder.rules_explain")}</p>
          </div>
        </div>

        {rules.length === 0 ? (
          <p className="sub pb-empty">{t("paths.builder.no_rules")}</p>
        ) : (
          <ul className="pb-rules-list">
            {rules.map((r) => (
              <li key={r.id} className="pb-rule-row">
                <div className="pb-rule-icon" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="pb-rule-text">
                  {t("paths.builder.rule_summary", {
                    department: nameOf(departments, r.departmentId),
                    role: nameOf(roleLevels, r.roleLevelId),
                    unit: nameOf(units, r.unitId),
                  })}
                </span>
                <form action={removeRuleAction}>
                  <input type="hidden" name="pathId" value={id} />
                  <input type="hidden" name="ruleId" value={r.id} />
                  <button type="submit" className="pb-icon-btn pb-icon-btn--danger" title={t("paths.builder.remove_rule")} aria-label={t("paths.builder.remove_rule")}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="pb-add-rule">
          <form action={addRuleAction} className="pb-rule-form">
            <input type="hidden" name="pathId" value={id} />
            <select className="input pb-rule-select" name="departmentId" defaultValue="" aria-label={t("paths.builder.rule_department")}>
              <option value="">{t("paths.builder.any_department")}</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="input pb-rule-select" name="roleLevelId" defaultValue="" aria-label={t("paths.builder.rule_role_level")}>
              <option value="">{t("paths.builder.any_role_level")}</option>
              {roleLevels.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className="input pb-rule-select" name="unitId" defaultValue="" aria-label={t("paths.builder.rule_unit")}>
              <option value="">{t("paths.builder.any_unit")}</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <Button type="submit" variant="secondary" size="sm">{t("paths.builder.add_rule")}</Button>
          </form>
        </div>
      </Card>

      {/* Stage builder — 2×2 grid */}
      <div className="pb-stages-grid">
        {builder.stages.map((stage) => (
          <StageCard
            key={stage.stageId}
            pathId={id}
            stage={stage}
            allModules={allModules}
            items={items}
            moduleItems={moduleItems}
          />
        ))}
      </div>
    </AppShell>
  );
}

function StageCard({
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
  const icon = STAGE_ICONS[stage.kind] ?? STAGE_ICONS["common"]!;
  return (
    <div className={`pb-stage pb-stage--${stage.kind}`}>
      {/* Stage header */}
      <div className="pb-stage-header">
        <div className="pb-stage-header-left">
          <div className="pb-stage-icon" dangerouslySetInnerHTML={{ __html: icon }} />
          <h3 className="pb-stage-name">{t(`paths.stages.${stage.kind}`)}</h3>
        </div>
        <form action={setDueDaysAction} className="pb-due-form">
          <input type="hidden" name="pathId" value={pathId} />
          <input type="hidden" name="stageId" value={stage.stageId} />
          <label className="pb-due-label">{t("paths.builder.due_days_heading")}</label>
          <div className="pb-due-row">
            <input className="input pb-due-input" name="dueDays" type="number" min={1} defaultValue={stage.dueDays} />
            <button type="submit" className="pb-save-btn">{t("paths.builder.save")}</button>
          </div>
        </form>
      </div>

      {/* Module list */}
      <div className="pb-modules">
        {stage.modules.length === 0 ? (
          <p className="sub pb-empty">{t("paths.builder.no_items")}</p>
        ) : (
          stage.modules.map((m, i) => (
            <div key={m.id} className="pb-module">
              <div className="pb-module-header">
                <div className="pb-module-num">{i + 1}</div>
                <span className="pb-module-title">{m.title}</span>
                <div className="pb-module-actions">
                  {i > 0 && (
                    <form action={moveModuleAction}>
                      <input type="hidden" name="pathId" value={pathId} />
                      <input type="hidden" name="stageId" value={stage.stageId} />
                      <input type="hidden" name="moduleId" value={m.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" className="pb-icon-btn" title={t("paths.builder.move_up")} aria-label={t("paths.builder.move_up")}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </form>
                  )}
                  {i < stage.modules.length - 1 && (
                    <form action={moveModuleAction}>
                      <input type="hidden" name="pathId" value={pathId} />
                      <input type="hidden" name="stageId" value={stage.stageId} />
                      <input type="hidden" name="moduleId" value={m.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" className="pb-icon-btn" title={t("paths.builder.move_down")} aria-label={t("paths.builder.move_down")}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <path d="M7 3v8M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </form>
                  )}
                  <form action={removeModuleAction}>
                    <input type="hidden" name="pathId" value={pathId} />
                    <input type="hidden" name="stageId" value={stage.stageId} />
                    <input type="hidden" name="moduleId" value={m.id} />
                    <button type="submit" className="pb-icon-btn pb-icon-btn--danger" title={t("paths.builder.remove_module")} aria-label={t("paths.builder.remove_module")}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </form>
                </div>
              </div>

              {/* Items inside module */}
              <div className="pb-items">
                {(moduleItems[m.id] ?? []).length === 0 ? (
                  <p className="pb-items-empty">{t("paths.builder.no_items")}</p>
                ) : (
                  (moduleItems[m.id] ?? []).map((it) => (
                    <div key={it.id} className="pb-item-row">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="pb-item-dot">
                        <circle cx="6" cy="6" r="2.5" fill="currentColor"/>
                      </svg>
                      <span className="pb-item-title">{it.title}</span>
                      <form action={removeItemAction}>
                        <input type="hidden" name="pathId" value={pathId} />
                        <input type="hidden" name="moduleId" value={m.id} />
                        <input type="hidden" name="itemId" value={it.id} />
                        <button type="submit" className="pb-icon-btn pb-icon-btn--muted" title={t("paths.builder.remove_item")} aria-label={t("paths.builder.remove_item")}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </form>
                    </div>
                  ))
                )}

                {/* Add item to this module */}
                <form action={addItemAction} className="pb-add-item-form">
                  <input type="hidden" name="pathId" value={pathId} />
                  <input type="hidden" name="moduleId" value={m.id} />
                  <select className="input pb-item-select" name="itemId" defaultValue="" required aria-label={t("paths.builder.choose_item")}>
                    <option value="" disabled>{t("paths.builder.choose_item")}</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.title}</option>)}
                  </select>
                  <button type="submit" className="pb-add-item-btn">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                      <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {t("paths.builder.add_item")}
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add module footer */}
      <div className="pb-add-module">
        <p className="pb-add-module-label">{t("paths.builder.add_module_heading")}</p>
        <form action={createAndAddModuleAction} className="pb-add-module-form">
          <input type="hidden" name="pathId" value={pathId} />
          <input type="hidden" name="stageId" value={stage.stageId} />
          <input
            className="input pb-add-module-input"
            name="title"
            required
            placeholder={t("paths.builder.new_module_name")}
            aria-label={t("paths.builder.new_module_name")}
          />
          <button type="submit" className="pb-add-module-btn pb-add-module-btn--primary">
            {t("paths.builder.add_new")}
          </button>
        </form>
        <form action={addExistingModuleAction} className="pb-add-module-form">
          <input type="hidden" name="pathId" value={pathId} />
          <input type="hidden" name="stageId" value={stage.stageId} />
          <select className="input pb-add-module-input" name="moduleId" defaultValue="" required aria-label={t("paths.builder.existing_module")}>
            <option value="" disabled>{t("paths.builder.choose_module")}</option>
            {allModules.map((mod) => <option key={mod.id} value={mod.id}>{mod.title}</option>)}
          </select>
          <button type="submit" className="pb-add-module-btn">
            {t("paths.builder.add_existing")}
          </button>
        </form>
      </div>
    </div>
  );
}
