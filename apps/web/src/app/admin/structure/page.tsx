import { listStructure, STRUCTURE_KINDS, wording, type StructureEntry, type StructureKind } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";
import { archiveEntry, createEntry, mergeEntry, moveLevel, renameEntry, unarchiveEntry } from "./actions.ts";

const DONE = new Set(["renamed", "merged", "reordered", "created", "archived", "unarchived"]);
const ERRORS = new Set(["name_taken", "missing", "same", "different_department", "empty", "has_people", "missing_department"]);

export default async function Structure({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; done?: string; error?: string; archived?: string }>;
}) {
  const ctx = await requirePermission("structure.manage");
  const { tab, done, error, archived } = await searchParams;
  const kind: StructureKind = STRUCTURE_KINDS.find((k) => k === tab) ?? "department";
  const showArchived = archived === "1";
  const [labels, entries, allDepts] = await Promise.all([
    wording(ctx.db),
    listStructure(ctx.db, kind, showArchived),
    kind === "unit" ? listStructure(ctx.db, "department", false) : Promise.resolve([] as StructureEntry[]),
  ]);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{label.plural}</h2>
          <div className="row" style={{ gap: 8 }}>
            <Link
              href={`/admin/structure?tab=${kind}&archived=${showArchived ? "0" : "1"}`}
              className="btn btn-ghost btn-sm"
            >
              {showArchived ? t("structure.hide_archived") : t("structure.show_archived")}
            </Link>
            <Link
              href={`/admin/structure/import?kind=${kind}`}
              className="btn btn-secondary btn-sm"
            >
              {t("structure.import_btn")}
            </Link>
          </div>
        </div>

        {kind === "role_level" && entries.some((e) => !e.archived) ? (
          <p className="muted" style={{ marginTop: 0 }}>{t("structure.order_note")}</p>
        ) : null}

        <CreateForm kind={kind} label={label} allDepts={allDepts} />

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
                  <Row
                    key={entry.id}
                    kind={kind}
                    entry={entry}
                    others={mergeTargets(kind, entries, entry)}
                    first={i === 0}
                    last={i === entries.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}

function mergeTargets(kind: StructureKind, entries: StructureEntry[], entry: StructureEntry): StructureEntry[] {
  return entries.filter(
    (e) => e.id !== entry.id && !e.archived && !entry.archived && (kind !== "unit" || e.departmentId === entry.departmentId),
  );
}

function CreateForm({
  kind,
  label,
  allDepts,
}: {
  kind: StructureKind;
  label: { singular: string };
  allDepts: StructureEntry[];
}) {
  return (
    <form action={createEntry} className="row" style={{ gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
      <input type="hidden" name="kind" value={kind} />
      <input
        className="input"
        name="name"
        placeholder={t("structure.new_name_placeholder", { kind: label.singular })}
        required
        style={{ minWidth: 180 }}
        aria-label={t("structure.new_name_placeholder", { kind: label.singular })}
      />
      {kind === "unit" && allDepts.length > 0 ? (
        <select className="input" name="departmentId" required style={{ minWidth: 160 }}>
          <option value="">{t("structure.choose_department")}</option>
          {allDepts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      ) : null}
      <Button type="submit" variant="primary" size="sm">{t("structure.create_btn")}</Button>
    </form>
  );
}

function Row({
  kind,
  entry,
  others,
  first,
  last,
}: {
  kind: StructureKind;
  entry: StructureEntry;
  others: StructureEntry[];
  first: boolean;
  last: boolean;
}) {
  const isArchived = entry.archived;
  return (
    <tr style={isArchived ? { opacity: 0.5 } : undefined}>
      {kind === "role_level" ? (
        <td>
          {!isArchived ? (
            <div className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
              <span style={{ minWidth: 20 }}>{entry.rank}</span>
              {first ? null : <MoveButton id={entry.id} name={entry.name} direction="up" />}
              {last ? null : <MoveButton id={entry.id} name={entry.name} direction="down" />}
            </div>
          ) : (
            <span>{entry.rank}</span>
          )}
        </td>
      ) : null}
      <td>
        {!isArchived ? (
          <form action={renameEntry} className="row" style={{ flexWrap: "nowrap" }}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={entry.id} />
            <input
              className="input"
              name="name"
              defaultValue={entry.name}
              required
              aria-label={t("structure.rename_label", { name: entry.name })}
              style={{ minWidth: 160 }}
            />
            <Button type="submit" variant="secondary" size="sm">{t("structure.rename")}</Button>
          </form>
        ) : (
          <span>{entry.name}</span>
        )}
      </td>
      {kind === "unit" ? <td>{entry.departmentName}</td> : null}
      <td>{entry.people}</td>
      <td>
        <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
          {!isArchived && others.length > 0 ? (
            <form action={mergeEntry} className="row" style={{ flexWrap: "nowrap" }}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={entry.id} />
              <select
                className="input"
                name="into"
                required
                defaultValue=""
                aria-label={t("structure.merge_label", { name: entry.name })}
                style={{ minWidth: 140 }}
              >
                <option value="" disabled>{t("structure.merge_choose")}</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <Button type="submit" variant="ghost" size="sm">{t("structure.merge")}</Button>
            </form>
          ) : null}
          {!isArchived ? (
            <form action={archiveEntry}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={entry.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={entry.people > 0}
                aria-label={t("structure.archive_label", { name: entry.name })}
              >
                {t("structure.archive")}
              </Button>
            </form>
          ) : (
            <form action={unarchiveEntry}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={entry.id} />
              <Button type="submit" variant="ghost" size="sm" aria-label={t("structure.unarchive_label", { name: entry.name })}>
                {t("structure.unarchive")}
              </Button>
            </form>
          )}
        </div>
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
      <Button type="submit" variant="ghost" size="sm" aria-label={t(`structure.move_${direction}_label`, { name })}>
        {t(`structure.move_${direction}`)}
      </Button>
    </form>
  );
}
