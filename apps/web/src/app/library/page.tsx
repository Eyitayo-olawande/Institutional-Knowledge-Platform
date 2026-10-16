import { itemsDueForReview, searchLibrary } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { Badge, type BadgeTone, Button, buttonStyle, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { requireFeature, requirePermission, viewerAreas } from "../../server/session.ts";
import { AppShell, PageHead } from "../_components/AppShell.tsx";
import { Icon } from "../_components/Icon.tsx";
import { areaChoices, areaName } from "./areas.ts";

const STATUS_TONE: Record<string, BadgeTone> = { draft: "neutral", published: "success", retired: "neutral" };

export default async function Library({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; type?: string }> }) {
  const ctx = await requirePermission("library.view");
  const { tenant, db, roles } = ctx;
  await requireFeature(tenant, "knowledge_library");
  const editor = can(roles, "library.edit");
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 200);
  const visible = await viewerAreas(ctx);
  const { areas, types } = await areaChoices(db, visible);
  // Unknown or hidden areas and types are ignored rather than trusted.
  const area = areas.find((a) => a.id === params.area);
  const areaTypes = area ? types.filter((ty) => ty.areaKind === area.kind) : [];
  const type = areaTypes.find((ty) => ty.id === params.type);
  const items = await searchLibrary(db, q, { publishedOnly: !editor, areas: visible, ...(area ? { areaId: area.id } : {}), ...(type ? { contentTypeId: type.id } : {}) });
  // Review dates follow the chosen area, like the list below them.
  const due = editor ? (await itemsDueForReview(db, new Date().toISOString().slice(0, 10), visible)).filter((i) => !area || i.areaId === area.id) : [];
  const link = (next: { area?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (next.area) query.set("area", next.area);
    if (next.type) query.set("type", next.type);
    const text = query.toString();
    return text ? `/library?${text}` : "/library";
  };

  return (
    <AppShell ctx={ctx} active="library">
      <PageHead
        title={t("library.title")}
        sub={t("library.heading", { name: tenant.name })}
        action={editor ? <Link href="/library/new" style={buttonStyle()}><Icon name="plus" size={18} />{t("library.new")}</Link> : undefined}
      />
      <form method="get" role="search" className="row" style={{ marginBottom: 20 }}>
        <label style={{ flex: 1, minWidth: 220 }}>
          <span className="skip">{t("library.search_label")}</span>
          <input className="input" name="q" type="search" defaultValue={q} placeholder={t("library.search_placeholder")} />
        </label>
        {area ? <input type="hidden" name="area" value={area.id} /> : null}
        {type ? <input type="hidden" name="type" value={type.id} /> : null}
        <Button type="submit" variant="secondary">{t("library.search")}</Button>
      </form>

      <nav className="chips" aria-label={t("library.areas.filter_label")}>
        <Link href={link({})} aria-current={area ? undefined : "true"}>{t("library.areas.all")}</Link>
        {areas.map((a) => (
          <Link key={a.id} href={link({ area: a.id })} aria-current={a.id === area?.id ? "true" : undefined}>{areaName(a)}</Link>
        ))}
      </nav>
      {area ? (
        <nav className="chips" aria-label={t("library.areas.type_filter_label")} style={{ marginBottom: 20 }}>
          <Link href={link({ area: area.id })} aria-current={type ? undefined : "true"}>{t("library.areas.all_types")}</Link>
          {areaTypes.map((ty) => (
            <Link key={ty.id} href={link({ area: area.id, type: ty.id })} aria-current={ty.id === type?.id ? "true" : undefined}>{ty.label}</Link>
          ))}
        </nav>
      ) : (
        <div style={{ marginBottom: 12 }} />
      )}

      {due.length > 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <h2>{t("library.due_heading")}</h2>
          <ul className="list">
            {due.map((item) => (
              <li key={item.id}>
                <span className="icon"><Icon name="doc" /></span>
                <div className="grow">
                  <Link className="title" href={`/library/${item.id}`}>{item.title}</Link>
                </div>
                <Badge tone={item.overdue ? "danger" : "warning"}>
                  {t(item.overdue ? "library.overdue" : "library.due", { date: item.reviewDate ?? "" })}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        {items.length === 0 ? (
          <p className="sub">{t(q ? "library.no_results" : "library.empty")}</p>
        ) : (
          <ul className="list">
            {items.map((item) => (
              <li key={item.id}>
                <span className="icon"><Icon name="doc" /></span>
                <div className="grow">
                  <Link className="title" href={`/library/${item.id}`}>{item.title}</Link>
                  <div className="muted" style={{ fontSize: 13 }}>{item.typeLabel}</div>
                </div>
                {editor && item.needsAreaReview ? <Badge tone="warning">{t("library.areas.needs_review")}</Badge> : null}
                {editor ? <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{t(`library.statuses.${item.status}`)}</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
