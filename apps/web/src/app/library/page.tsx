import { itemsDueForReview, searchLibrary } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { Badge, type BadgeTone, Button, buttonStyle, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { requireFeature, requirePermission, viewerAreas } from "../../server/session.ts";
import { AppShell } from "../_components/AppShell.tsx";
import { Icon } from "../_components/Icon.tsx";
import { areaChoices, areaName } from "./areas.ts";

const STATUS_TONE: Record<string, BadgeTone> = { draft: "neutral", published: "success", retired: "neutral" };

const RES_IMAGES: Array<[string[], string]> = [
  [["aml", "anti-money", "cft", "laundering"],                       "res-aml.jpg"],
  [["intake", "checklist"],                                           "res-intake.jpg"],
  [["motor", "vehicle", "automobile"],                               "res-motor.jpg"],
  [["claim", "claims", "claimant"],                                   "res-claims.jpg"],
  [["conduct", "ethics", "code of conduct"],                         "res-conduct.jpg"],
  [["data protection", "privacy", "gdpr", "personal data"],          "res-data.jpg"],
  [["safety", "fire", "marine", "hazard", "health and safety"],      "res-safety.jpg"],
  [["customer service", "service standards"],                        "res-service.jpg"],
  [["security", "cyber", "information security"],                    "res-data.jpg"],
];
const FALLBACK_CYCLE = [
  "res-aml.jpg", "res-claims.jpg", "res-conduct.jpg", "res-data.jpg",
  "res-intake.jpg", "res-motor.jpg", "res-safety.jpg", "res-service.jpg",
] as const;

function cardCover(title: string, area?: string): string {
  const lower = `${title} ${area ?? ""}`.toLowerCase();
  for (const [keys, img] of RES_IMAGES) {
    if (keys.some((k) => lower.includes(k))) return img;
  }
  const idx = [...title].reduce((s, c) => s + c.charCodeAt(0), 0) % FALLBACK_CYCLE.length;
  return FALLBACK_CYCLE[idx]!;
}

export default async function Library({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; type?: string }> }) {
  const ctx = await requirePermission("library.view");
  const { tenant, db, roles } = ctx;
  await requireFeature(tenant, "knowledge_library");
  const editor = can(roles, "library.edit");
  const isAdmin = can(roles, "activity.view");
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 200);
  const visible = await viewerAreas(ctx);
  const { areas, types } = await areaChoices(db, visible);
  const area = areas.find((a) => a.id === params.area);
  const areaTypes = area ? types.filter((ty) => ty.areaKind === area.kind) : [];
  const type = areaTypes.find((ty) => ty.id === params.type);
  const displayTypes = area ? areaTypes : types;

  // Fully-filtered items for the resource grid
  const items = await searchLibrary(db, q, { publishedOnly: !editor, areas: visible, ...(area ? { areaId: area.id } : {}), ...(type ? { contentTypeId: type.id } : {}) });

  // Unfiltered items for topic tile counts
  const allForCounts = await searchLibrary(db, "", { publishedOnly: !editor, areas: visible });
  const tileCountByArea: Record<string, number> = {};
  for (const item of allForCounts) {
    tileCountByArea[item.areaId] = (tileCountByArea[item.areaId] ?? 0) + 1;
  }

  // q+area filtered (not type) for type-tab counts
  const areaItems = type
    ? await searchLibrary(db, q, { publishedOnly: !editor, areas: visible, ...(area ? { areaId: area.id } : {}) })
    : items;
  const countByType: Record<string, number> = {};
  for (const item of areaItems) {
    countByType[item.contentTypeId] = (countByType[item.contentTypeId] ?? 0) + 1;
  }

  const due = editor ? (await itemsDueForReview(db, new Date().toISOString().slice(0, 10), visible)).filter((i) => !area || i.areaId === area.id) : [];
  const areaMap = new Map(areas.map((a) => [a.id, a]));

  const link = (next: { area?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (next.area) query.set("area", next.area);
    if (next.type) query.set("type", next.type);
    const text = query.toString();
    return text ? `/library?${text}` : "/library";
  };

  const clearHref = q ? `/library?q=${encodeURIComponent(q)}` : "/library";

  return (
    <AppShell ctx={ctx} active="library">
      {/* Hero banner */}
      <div className="lib-hero-wrap">
        <div className="lib-hero">
          <div className="lib-hero-bg" />
          <div className="lib-hero-shade" />
          <div className="lib-hero-copy">
            <h1>{t("library.banner_heading")}</h1>
            <p>{t("library.banner_sub")}</p>
            <div className="lib-hero-rule" />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/library_person.webp" alt="" aria-hidden="true" className="lib-hero-person" />
      </div>

      {/* Search + Add */}
      <form method="get" role="search" className="row" style={{ marginBottom: 20 }}>
        <label style={{ flex: 1, minWidth: 220 }}>
          <span className="skip">{t("library.search_label")}</span>
          <input className="input" name="q" type="search" defaultValue={q} placeholder={t("library.search_placeholder")} />
        </label>
        {area ? <input type="hidden" name="area" value={area.id} /> : null}
        {type ? <input type="hidden" name="type" value={type.id} /> : null}
        <Button type="submit" variant="secondary">{t("library.search")}</Button>
        {editor ? <Link href="/library/new" style={buttonStyle()}><Icon name="plus" size={18} />{t("library.new")}</Link> : null}
      </form>

      {/* Two-column layout: main + filter sidebar */}
      <div className="lib-layout">
        <div>
          {/* Browse by topic */}
          <section aria-label={t("library.browse_heading")}>
            <h2 className="lib-browse-heading">{t("library.browse_heading")}</h2>
            <nav className="lib-topic-grid" aria-label={t("library.areas.filter_label")}>
              {areas.map((a) => (
                <Link
                  key={a.id}
                  href={link({ area: a.id })}
                  aria-current={a.id === area?.id ? "true" : undefined}
                  className="lib-topic-tile"
                >
                  <span className="lib-topic-icon">
                    <Icon name={a.kind === "common" ? "library" : "people"} size={20} />
                  </span>
                  <span className="lib-topic-name">{areaName(a)}</span>
                  <span className="lib-topic-count">{tileCountByArea[a.id] ?? 0}</span>
                </Link>
              ))}
            </nav>
          </section>

          {/* Resource-type tabs */}
          {displayTypes.length > 0 ? (
            <nav className="lib-tabs-row" aria-label={t("library.areas.type_filter_label")}>
              <Link href={link(area ? { area: area.id } : {})} aria-current={!type ? "true" : undefined} className="lib-tab">
                {t("library.areas.all_types")} ({areaItems.length})
              </Link>
              {displayTypes.map((ty) => (
                <Link
                  key={ty.id}
                  href={link({ ...(area ? { area: area.id } : {}), type: ty.id })}
                  aria-current={ty.id === type?.id ? "true" : undefined}
                  className="lib-tab"
                >
                  {ty.label} ({countByType[ty.id] ?? 0})
                </Link>
              ))}
            </nav>
          ) : (
            <div style={{ marginBottom: 12 }} />
          )}

          {/* Due for review */}
          {due.length > 0 ? (
            <Card style={{ marginBottom: 20 }}>
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

          {/* Resource cards */}
          {items.length === 0 ? (
            <p className="sub">{t(q ? "library.no_results" : "library.empty")}</p>
          ) : (
            <div className="lib-grid">
              {items.map((item) => {
                const itemArea = areaMap.get(item.areaId);
                return (
                  <Link key={item.id} className="lib-card" href={`/library/${item.id}`}>
                    <div
                      className="lib-card-thumb"
                      style={{ background: `linear-gradient(rgba(0,0,0,0.42),rgba(0,0,0,0.42)),url('/images/${cardCover(item.title, itemArea ? areaName(itemArea) : undefined)}') center/cover no-repeat` }}
                    >
                      <span className="lib-card-thumb-icon"><Icon name="doc" size={28} /></span>
                      {item.typeLabel ? <span className="lib-card-badge">{item.typeLabel}</span> : null}
                      <span className="lib-card-bookmark"><Icon name="list" size={14} /></span>
                    </div>
                    <div className="lib-card-body">
                      <div className="lib-card-title">{item.title}</div>
                      {itemArea ? <div className="lib-card-meta">{areaName(itemArea)}</div> : null}
                      {(editor && (item.needsAreaReview || item.status !== "published")) ? (
                        <div className="lib-card-badges">
                          {item.needsAreaReview ? <Badge tone="warning">{t("library.areas.needs_review")}</Badge> : null}
                          {item.status !== "published" ? <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{t(`library.statuses.${item.status}`)}</Badge> : null}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter sidebar — only visible at ≥1200px */}
        <aside className="lib-sidebar">
          <div className="lib-filter-panel">
            <div className="lib-filter-head">
              <h2>{t("library.filter_heading")}</h2>
              {(area ?? type) ? (
                <Link href={clearHref} className="lib-filter-clear">{t("library.filter_clear")}</Link>
              ) : null}
            </div>

            <div className="lib-filter-section">
              <h3>{t("library.browse_heading")}</h3>
              <Link href={clearHref} className="lib-filter-link" aria-current={!area ? "true" : undefined}>
                {t("library.areas.all")}
                <span className="lib-filter-count">{allForCounts.length}</span>
              </Link>
              {areas.map((a) => (
                <Link key={a.id} href={link({ area: a.id })} className="lib-filter-link" aria-current={a.id === area?.id ? "true" : undefined}>
                  {areaName(a)}
                  <span className="lib-filter-count">{tileCountByArea[a.id] ?? 0}</span>
                </Link>
              ))}
            </div>

            {displayTypes.length > 0 ? (
              <div className="lib-filter-section">
                <h3>{t("library.areas.type_filter_label")}</h3>
                <Link href={link(area ? { area: area.id } : {})} className="lib-filter-link" aria-current={!type ? "true" : undefined}>
                  {t("library.areas.all_types")}
                  <span className="lib-filter-count">{areaItems.length}</span>
                </Link>
                {displayTypes.map((ty) => (
                  <Link key={ty.id} href={link({ ...(area ? { area: area.id } : {}), type: ty.id })} className="lib-filter-link" aria-current={ty.id === type?.id ? "true" : undefined}>
                    {ty.label}
                    <span className="lib-filter-count">{countByType[ty.id] ?? 0}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
