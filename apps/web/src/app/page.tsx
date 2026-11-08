import { buttonStyle, Card } from "@mantle/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "../i18n.ts";
import { authFor, requestHost } from "../server/auth.ts";
import { buildNav } from "../server/nav.ts";
import { featureOn, tenantDb } from "../server/session.ts";
import { listActiveStaff, listLibraryItems, listPaths, listStructure, myLearning, noticesFor, personByUserId, recentActivity, STAGE_ORDER, tenantSchema, unreadCount } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { resolveRequestTenant } from "../server/tenant.ts";
import { tenantView } from "../server/tenant_view.ts";
import { AppShell } from "./_components/AppShell.tsx";
import { Icon } from "./_components/Icon.tsx";

const THUMB_GRADIENT: Record<string, string> = {
  "Policy":    "linear-gradient(135deg, #ba0c2f 0%, #8a0920 100%)",
  "Procedure": "linear-gradient(135deg, #1a56db 0%, #0a3796 100%)",
  "Guideline": "linear-gradient(135deg, #057a55 0%, #015f43 100%)",
  "Training":  "linear-gradient(135deg, #c27803 0%, #9f6002 100%)",
  "Template":  "linear-gradient(135deg, #6c3791 0%, #4e2770 100%)",
};
const THUMB_DEFAULT = "linear-gradient(135deg, #374151 0%, #1f2937 100%)";

function KpiTile({ href, icon, value, label }: { href?: string; icon: Parameters<typeof Icon>[0]["name"]; value: number; label: string }) {
  const inner = (
    <>
      <span className="admin-kpi-icon"><Icon name={icon} size={28} /></span>
      <div>
        <p className="admin-kpi-value">{value}</p>
        <h2 className="admin-kpi-label">{label}</h2>
      </div>
    </>
  );
  if (href) return <Link href={href} className="admin-kpi">{inner}</Link>;
  return <article className="admin-kpi">{inner}</article>;
}

export default async function Home() {
  const resolution = await resolveRequestTenant();
  const view = tenantView(resolution);
  if (!resolution.ok) {
    return (
      <div className="centered">
        <Card className="panel">
          <h1>{t("app.title")}</h1>
          <p className="sub">{t(view.key, view.params)}</p>
        </Card>
      </div>
    );
  }

  const { host, protocol } = await requestHost();
  const session = await authFor(resolution.tenant, host, protocol).api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  const db = tenantDb(resolution.tenant);
  const roles = (session.user as { roles?: string }).roles ?? "";
  const isAdmin = can(roles, "activity.view");
  const [unread, libraryOn, peopleImportOn, pathsOn] = await Promise.all([
    unreadCount(db, session.user.id),
    featureOn(resolution.tenant, "knowledge_library"),
    featureOn(resolution.tenant, "people_import"),
    featureOn(resolution.tenant, "learning_paths"),
  ]);
  const destinations = buildNav({ roles, libraryOn, peopleImportOn, pathsOn }).filter((i) => i.key !== "home");
  const mainDestinations = destinations.filter((d) => d.section === "main");
  const adminDestinations = destinations.filter((d) => d.section === "admin");
  const firstName = session.user.name.split(" ")[0] ?? session.user.name;

  // My Learning: load summary for the journey widget and progress card.
  let learningSummary: Awaited<ReturnType<typeof myLearning>> | null = null;
  if (pathsOn) {
    const person = await personByUserId(db, session.user.id);
    if (person) {
      learningSummary = await myLearning(db, person.id);
    }
  }

  // An administrator's portal overview: real counts and the most recent
  // changes, not placeholders for features that don't exist yet (no
  // courses, groups or custom reports until E8/E4/E12 are built).
  let overview: { staff: number; paths: number; departmentNames: string[]; published: number; assignments: number; timeline: Awaited<ReturnType<typeof recentActivity>>; notices: Awaited<ReturnType<typeof noticesFor>> } | null = null;
  if (isAdmin) {
    const [staff, departments, items, activity, adminNotices, pathRows, assignmentRows] = await Promise.all([
      listActiveStaff(db),
      listStructure(db, "department"),
      libraryOn ? listLibraryItems(db, { publishedOnly: false, areas: "all" }) : Promise.resolve([]),
      recentActivity(db, 200),
      noticesFor(db, session.user.id, 6),
      listPaths(db),
      db.select({ id: tenantSchema.assignments.id }).from(tenantSchema.assignments),
    ]);
    overview = { staff: staff.length, paths: pathRows.length, departmentNames: departments.slice(0, 6).map((d) => d.name), published: items.length, assignments: assignmentRows.length, timeline: activity.slice(0, 6), notices: adminNotices };
  }

  // Featured resources and recent notices for the staff home page only; the
  // admin overview above already has its own activity feed (WP6).
  let featuredResources: Awaited<ReturnType<typeof listLibraryItems>> | null = null;
  let recentNotices: Awaited<ReturnType<typeof noticesFor>> | null = null;
  if (!isAdmin) {
    const [items, notices] = await Promise.all([
      libraryOn ? listLibraryItems(db, { publishedOnly: true, areas: "all" }) : Promise.resolve([]),
      noticesFor(db, session.user.id, 4),
    ]);
    featuredResources = items.slice(0, 4);
    recentNotices = notices;
  }

  return (
    <AppShell ctx={{ tenant: resolution.tenant, db, roles, user: session.user }} active="home">
      {isAdmin ? (
        <div className="admin-hero-wrap">
          <div className="admin-banner">
            <div className="admin-banner-bg" />
            <div className="admin-banner-shade" />
            <div className="admin-banner-copy">
              <h1>
                {t("home.admin.banner_heading")}{" "}
                <span>{t("home.admin.banner_product")}</span>
              </h1>
              <p>{t("home.admin.banner_sub")}</p>
              <div className="admin-banner-rule" />
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/administrator-colleagues.png"
            alt=""
            className="admin-banner-person"
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="lib-hero-wrap">
          <div className="lib-hero">
            <div className="lib-hero-bg" style={{ backgroundImage: "url('/images/administrator-office.png')" }} />
            <div className="lib-hero-shade" />
            <div className="lib-hero-copy">
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600 }}>{t("home.greeting_prefix")}</p>
              <h1>{firstName}</h1>
              <p>{t("home.sub", { name: resolution.tenant.name })}</p>
              <div className="lib-hero-rule" />
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/learning-professional.png" alt="" aria-hidden="true" className="lib-hero-person" />
        </div>
      )}
      {unread > 0 ? (
        <div className="alert alert-brand" role="status">
          <Icon name="bell" />
          <p style={{ flex: 1 }}>{t("home.unread", { count: unread })}</p>
          <Link href="/notices" style={buttonStyle("primary", "sm")}>{t("home.read_notices")}</Link>
        </div>
      ) : null}

      {overview ? (
        <>
          {/* KPI tiles — each links to the page where that data lives */}
          <div className="admin-kpis">
            <KpiTile icon="people" value={overview.staff} label={t("home.admin.stats.staff")} href={peopleImportOn ? "/admin/people" : undefined} />
            {libraryOn ? <KpiTile icon="library" value={overview.published} label={t("home.admin.stats.published")} href="/library" /> : null}
            <KpiTile icon="graduation_cap" value={overview.paths} label={t("home.admin.stats.departments")} href={pathsOn ? "/admin/paths" : undefined} />
            <KpiTile icon="clipboard" value={overview.assignments} label={t("home.admin.stats.sign_ins")} href={pathsOn ? "/admin/paths" : undefined} />
          </div>

          {/* Two-column panels */}
          <div className="admin-panels">
            {/* Left column: progress + department completion */}
            <div className="admin-panels-col">
              <section className="admin-panel">
                <h2 className="admin-panel-title">{t("home.admin.progress_heading")}</h2>
                <div className="admin-progress-content">
                  <div className="admin-progress-ring">
                    <div className="admin-progress-ring-inner">
                      <strong>—</strong>
                      <span style={{ fontSize: 11, color: "var(--mantle-color-text_muted)", marginTop: 4 }}>{t("home.admin.overview_heading")}</span>
                    </div>
                  </div>
                  <dl className="admin-progress-stats">
                    {(["Completed", "In Progress", "Not Started"] as const).map((label, i) => (
                      <div key={label} className="admin-progress-stat">
                        <span className={`admin-progress-dot admin-progress-dot-${i}`} />
                        <dt>{label}</dt>
                        <dd>—</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>

              <section className="admin-panel">
                <h2 className="admin-panel-title">{t("home.admin.dept_heading")}</h2>
                <div className="admin-dept-list">
                  {overview.departmentNames.map((name) => (
                    <div key={name} className="admin-department-row">
                      <span>{name}</span>
                      <div className="admin-empty-track" />
                      <span style={{ color: "var(--mantle-color-text_muted)", fontSize: 12 }}>—</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right column: journey + quick/activity + notices */}
            <div className="admin-panels-col">
              <section className="admin-panel">
                <h2 className="admin-panel-title">{t("home.admin.journey_heading")}</h2>
                <ol className="admin-journey">
                  {([
                    { icon: "library", label: t("paths.stages.common"), desc: t("home.admin.journey_common") },
                    { icon: "tree", label: t("paths.stages.department"), desc: t("home.admin.journey_dept") },
                    { icon: "people", label: t("paths.stages.role"), desc: t("home.admin.journey_role") },
                    { icon: "key", label: t("paths.stages.certificate"), desc: t("home.admin.journey_cert") },
                  ] as const).map(({ icon, label, desc }) => (
                    <li key={label} className="admin-journey-stage">
                      <span className="admin-journey-node"><Icon name={icon} size={18} /></span>
                      <div>
                        <h3>{label}</h3>
                        <p>{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="admin-subgrid">
                <section className="admin-panel">
                  <h2 className="admin-panel-title">{t("home.admin.quick_actions_heading")}</h2>
                  <div className="admin-quick-grid">
                    {libraryOn ? (
                      <Link href="/library" className="admin-quick-action">
                        <Icon name="library" size={28} />
                        <p>{t("nav.library")}</p>
                      </Link>
                    ) : null}
                    {pathsOn ? (
                      <Link href="/admin/paths" className="admin-quick-action">
                        <Icon name="tree" size={28} />
                        <p>{t("nav.paths")}</p>
                      </Link>
                    ) : null}
                    <div className="admin-quick-unavailable">
                      <Icon name="people" size={28} />
                      <p>{t("nav.people")}</p>
                      <span>{t("home.admin.quick_unavailable")}</span>
                    </div>
                    <div className="admin-quick-unavailable">
                      <Icon name="list" size={28} />
                      <p>{t("home.admin.quick_reports")}</p>
                      <span>{t("home.admin.quick_unavailable")}</span>
                    </div>
                  </div>
                </section>

                <section className="admin-panel">
                  <h2 className="admin-panel-title">{t("home.admin.timeline_heading")}</h2>
                  {overview.timeline.length === 0 ? (
                    <p className="sub">{t("home.admin.timeline_empty")}</p>
                  ) : (
                    <ul className="list">
                      {overview.timeline.map((e) => (
                        <li key={e.id}>
                          <span className="grow">{e.action}</span>
                          <span className="muted">{e.at.toISOString().replace("T", " ").slice(0, 16)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href="/admin/activity" className="muted" style={{ display: "block", marginTop: 12, fontSize: 13 }}>{t("home.admin.timeline_view_all")}</Link>
                </section>
              </div>

              {overview.notices.length > 0 ? (
                <section className="admin-notices">
                  <div className="admin-notices-header">
                    <Icon name="bell" size={28} />
                    <h2 className="admin-notices-title">{t("home.admin.notices_heading")}</h2>
                  </div>
                  <ul className="admin-notices-list">
                    {overview.notices.map((n) => (
                      <li key={n.id} className="admin-notices-item">
                        <p>{n.subject}</p>
                        <time dateTime={n.createdAt.toISOString()}>{n.createdAt.toISOString().slice(0, 10)}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {learningSummary && learningSummary.pathsEnrolled > 0 && !isAdmin ? (
        <>
          {/* Learning progress gradient card */}
          <div className="learning-progress-card">
            <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.68)", marginBottom: 4 }}>{t("home.my_learning.in_progress")}</div>
                <div className="learning-progress-pct">{learningSummary.completionRate}%</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                  {t("home.my_learning.modules_summary", { done: learningSummary.modulesCompleted, total: learningSummary.modulesTotal })}
                </div>
              </div>
              <div className="learning-status-pill">
                <span className="learning-status-dot" />
                {t("home.my_learning.tiles.paths")}: {learningSummary.pathsEnrolled}
              </div>
            </div>
            <div className="learning-progress-bar">
              <div className="learning-progress-fill" style={{ width: `${learningSummary.completionRate}%` }} />
            </div>
          </div>

          {/* Learning Journey — 4-stage horizontal panel */}
          {learningSummary.assignments[0] ? (
            <div className="my-journey-panel" style={{ marginBottom: 16 }}>
              <h2>{t("home.my_learning.journey_heading")}</h2>
              <p className="sub">{learningSummary.assignments[0].pathName}</p>
              <ol className="my-journey-ol">
                {STAGE_ORDER.map((kind) => {
                  const stage = learningSummary!.assignments[0]?.stages.find((s) => s.kind === kind);
                  const state = !stage ? "upcoming" : stage.complete ? "completed" : stage.unlocked ? "current" : "upcoming";
                  return (
                    <li key={kind} className={`my-journey-stage ${state}`}>
                      <div className="my-journey-node">
                        <Icon name={kind === "common" ? "library" : kind === "department" ? "tree" : kind === "role" ? "people" : "key"} size={16} />
                      </div>
                      <div className="my-journey-label">
                        <p className="stage-name">{t(`paths.stages.${kind}`)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}

          {/* Next Up card */}
          {learningSummary.nextUp ? (
            <div className="my-panel row" style={{ justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mantle-color-text_muted)", margin: "0 0 4px" }}>{t("home.my_learning.next_up_heading")}</p>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{learningSummary.nextUp.title}</h3>
                <p style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", margin: "2px 0 0" }}>{learningSummary.nextUp.pathName}</p>
              </div>
              <Link href="/my-learning" style={buttonStyle("primary", "sm")}>{t("home.my_learning.open_module")}</Link>
            </div>
          ) : null}
        </>
      ) : null}

      {mainDestinations.length > 0 && !isAdmin ? (
        <>
          <h2 style={{ marginTop: (learningSummary && learningSummary.pathsEnrolled > 0 && !isAdmin) ? 24 : 0 }}>{t("home.quick_access_heading")}</h2>
          <div className="qa-grid">
            {mainDestinations.map((d) => (
              <Link key={d.key} href={d.href} className="qa-tile">
                <div className="qa-tile-icon"><Icon name={d.icon} size={28} /></div>
                <div className="qa-tile-name">{t(`nav.${d.key}`)}</div>
                <div className="qa-tile-desc">{t(`home.cards.${d.key}`)}</div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {(featuredResources && featuredResources.length > 0) || (recentNotices && recentNotices.length > 0) ? (
        <div className="grid grid-2" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start", marginTop: 24 }}>
          {featuredResources && featuredResources.length > 0 ? (
            <div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2 style={{ margin: 0 }}>{t("home.featured_heading")}</h2>
                <Link href="/library" className="muted">{t("home.featured_view_all")}</Link>
              </div>
              <div className="lib-grid" style={{ marginTop: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                {featuredResources.map((item) => (
                  <Link key={item.id} className="lib-card" href={`/library/${item.id}`}>
                    <div className="lib-card-thumb" style={{ background: THUMB_GRADIENT[item.typeLabel ?? ""] ?? THUMB_DEFAULT }}>
                      <span className="lib-card-thumb-icon"><Icon name="doc" size={28} /></span>
                      {item.typeLabel ? <span className="lib-card-badge">{item.typeLabel}</span> : null}
                    </div>
                    <div className="lib-card-body">
                      <div className="lib-card-title">{item.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {recentNotices && recentNotices.length > 0 ? (
            <Card>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{t("home.notices_heading")}</h3>
                <Link href="/notices" className="muted">{t("home.featured_view_all")}</Link>
              </div>
              <ul className="list">
                {recentNotices.map((n) => (
                  <li key={n.id}>
                    <span className="grow">{n.subject}</span>
                    <span className="muted">{n.createdAt.toISOString().slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
