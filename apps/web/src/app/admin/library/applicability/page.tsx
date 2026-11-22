import { listItemApplicabilityRules, listLibraryItems, listStructure } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { requirePermission } from "../../../../server/session.ts";
import { AppShell, PageHead } from "../../../_components/AppShell.tsx";
import { addRuleAction, removeRuleAction } from "./actions.ts";

export default async function ApplicabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const ctx = await requirePermission("library.edit");
  const { db } = ctx;
  const { item: selectedItemId } = await searchParams;

  const [items, departments, roleLevels, units] = await Promise.all([
    listLibraryItems(db, { publishedOnly: true, areas: "all" }),
    listStructure(db, "department"),
    listStructure(db, "role_level"),
    listStructure(db, "unit"),
  ]);

  const selectedItem = selectedItemId
    ? items.find((i) => i.id === selectedItemId) ?? null
    : null;

  const rules = selectedItem
    ? await listItemApplicabilityRules(db, selectedItem.id)
    : [];

  const nameOf = (list: readonly { id: string; name: string }[], id: string | null) =>
    id ? (list.find((x) => x.id === id)?.name ?? id) : "Any";

  return (
    <AppShell ctx={ctx} active="applicability">
      <PageHead
        title="Knowledge requirements"
        sub="Set which library items are required reading for staff based on their department, role level or unit."
      />

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left: list of published library items */}
        <div style={{ flex: "0 0 300px" }}>
          <Card>
            <h2 style={{ marginBottom: 12 }}>Published items</h2>
            {items.length === 0 ? (
              <p className="sub">No published library items found.</p>
            ) : (
              <ul className="list" style={{ gap: 2 }}>
                {items.map((item) => (
                  <li key={item.id} style={{ display: "block" }}>
                    <Link
                      href={`/admin/library/applicability?item=${item.id}`}
                      className={`lib-item-related-row${selectedItemId === item.id ? " active" : ""}`}
                      style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px" }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right: applicability rules for selected item */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedItem ? (
            <Card>
              <p className="sub">Select an item on the left to manage its applicability rules.</p>
            </Card>
          ) : (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>{selectedItem.title}</h2>
                  <p className="sub" style={{ fontSize: 13 }}>
                    {rules.length === 0
                      ? "No applicability rules — not required for anyone yet."
                      : `Required for ${rules.length} rule${rules.length === 1 ? "" : "s"}.`}
                  </p>
                </div>
                <Link href={`/library/${selectedItem.id}`} className="btn-link" style={{ fontSize: 13 }}>
                  View item
                </Link>
              </div>

              {/* Existing rules */}
              {rules.length > 0 && (
                <ul className="pb-rules-list" style={{ marginBottom: 20 }}>
                  {rules.map((r) => (
                    <li key={r.id} className="pb-rule-row">
                      <div className="pb-rule-icon" aria-hidden>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span className="pb-rule-text">
                        {nameOf(departments, r.departmentId)} / {nameOf(roleLevels, r.roleLevelId)} / {nameOf(units, r.unitId)}
                      </span>
                      <form action={removeRuleAction}>
                        <input type="hidden" name="itemId" value={selectedItem.id} />
                        <input type="hidden" name="ruleId" value={r.id} />
                        <button
                          type="submit"
                          className="pb-icon-btn pb-icon-btn--danger"
                          title="Remove rule"
                          aria-label="Remove rule"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                            <path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add rule form */}
              <div className="pb-add-rule">
                <form action={addRuleAction} className="pb-rule-form">
                  <input type="hidden" name="itemId" value={selectedItem.id} />
                  <select className="input pb-rule-select" name="departmentId" defaultValue="" aria-label="Department">
                    <option value="">Any department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select className="input pb-rule-select" name="roleLevelId" defaultValue="" aria-label="Role level">
                    <option value="">Any role level</option>
                    {roleLevels.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <select className="input pb-rule-select" name="unitId" defaultValue="" aria-label="Unit">
                    <option value="">Any unit</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <Button type="submit" variant="secondary" size="sm">Add rule</Button>
                </form>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
