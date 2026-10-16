import { listStructure, STRUCTURE_KINDS, wording, type StructureEntry, type StructureKind } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";
import { mergeEntry, moveLevel, renameEntry } from "./actions.ts";

const DONE = new Set(["renamed", "merged", "reordered"]);
const ERRORS = new Set(["name_taken", "missing", "same", "different_department", "empty"]);

export default async function Structure({ searchParams }: { searchParams: Promise<{ tab?: string; done?: string; error?: string }> }) {
  const ctx = await requirePermission("structure.manage");
  const { tab, done, error } = await searchParams;
  const kind: StructureKind = STRUCTURE_KINDS.find((k) => k === tab) ?? "department";
  const [labels, entries] = await Promise.all([wording(ctx.db), listStructure(ctx.db, kind)]);
  const label = labels[kind];

  return (
    <AppShell ctx={ctx} active="structure">
      <PageHead title={t("structure.title")} sub={t("structure.explain")} />

      <nav className="tabs" aria-label={t("structure.tabs_label")}>
        {STRUCTURE_KINDS.map((k) => (
          <Link key={k} href={`/admin/structure?tab=${k}`} aria-current={k === kind ? "page" : undefined}>
            {labels[k].plural}
          </Link>
        ))}
      </nav>

      {done && DONE.has(done) ? <div className="alert alert-success" role="status"><p>{t(`structure.${done}`)}</p></div> : null}
      {error && ERRORS.has(error) ? (
        <div className="alert alert-danger" role="alert">
          <p>{t(`structure.errors.${error}`, { department: labels.department.singular.toLowerCase() })}</p>
        </div>
      ) : null}

      <Card>
        <h2>{label.plural}</h2>
        {kind === "role_level" && entries.length > 0 ? <p className="muted" style={{ marginTop: 0 }}>{t("structure.order_note")}</p> : null}
        {entries.length === 0 ? (
          <p className="sub">{t("structure.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {kind === "role_level" ? <th>{t("structure.columns.order")}</th> : null}
                  <th>{t("structure.columns.name")}</th>
                  {kind === "unit" ? <th>{labels.department.singular}</th> : null}
                  <th>{t("structure.columns.people")}</th>
                  <th>{t("structure.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <Row key={entry.id} kind={kind} entry={entry} others={mergeTargets(kind, entries, entry)} first={i === 0} last={i === entries.length - 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}

// Units merge only within their own department.
function mergeTargets(kind: StructureKind, entries: StructureEntry[], entry: StructureEntry): StructureEntry[] {
  return entries.filter((e) => e.id !== entry.id && (kind !== "unit" || e.departmentId === entry.departmentId));
}

function Row({ kind, entry, others, first, last }: { kind: StructureKind; entry: StructureEntry; others: StructureEntry[]; first: boolean; last: boolean }) {
  return (
    <tr>
      {kind === "role_level" ? (
        <td>
          <div className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
            <span style={{ minWidth: 20 }}>{entry.rank}</span>
            {first ? null : <MoveButton id={entry.id} name={entry.name} direction="up" />}
            {last ? null : <MoveButton id={entry.id} name={entry.name} direction="down" />}
          </div>
        </td>
      ) : null}
      <td>
        <form action={renameEntry} className="row" style={{ flexWrap: "nowrap" }}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={entry.id} />
          <input className="input" name="name" defaultValue={entry.name} required aria-label={t("structure.rename_label", { name: entry.name })} style={{ minWidth: 160 }} />
          <Button type="submit" variant="secondary" size="sm">{t("structure.rename")}</Button>
        </form>
      </td>
      {kind === "unit" ? <td>{entry.departmentName}</td> : null}
      <td>{entry.people}</td>
      <td>
        {others.length > 0 ? (
          <form action={mergeEntry} className="row" style={{ flexWrap: "nowrap" }}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={entry.id} />
            <select className="input" name="into" required defaultValue="" aria-label={t("structure.merge_label", { name: entry.name })} style={{ minWidth: 140 }}>
              <option value="" disabled>{t("structure.merge_choose")}</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <Button type="submit" variant="ghost" size="sm">{t("structure.merge")}</Button>
          </form>
        ) : null}
      </td>
    </tr>
  );
}

function MoveButton({ id, name, direction }: { id: string; name: string; direction: "up" | "down" }) {
  return (
    <form action={moveLevel}>
      <input type="hidden" name="kind" value="role_level" />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <Button type="submit" variant="ghost" size="sm" aria-label={t(`structure.move_${direction}_label`, { name })}>{t(`structure.move_${direction}`)}</Button>
    </form>
  );
}
