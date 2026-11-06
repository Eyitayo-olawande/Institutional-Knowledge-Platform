import { Badge, Button, buttonStyle, Card, type BadgeTone } from "@mantle/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { t } from "../i18n.ts";
import { authFor, requestHost } from "../server/auth.ts";
import { buildNav } from "../server/nav.ts";
import { featureOn, tenantDb } from "../server/session.ts";
import { listActiveStaff, listLibraryItems, listModuleItems, listStructure, myLearning, noticesFor, personByUserId, recentActivity, unreadCount } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { resolveRequestTenant } from "../server/tenant.ts";
import { tenantView } from "../server/tenant_view.ts";
import { signOut } from "./actions.ts";
import { AppShell } from "./_components/AppShell.tsx";
import { Icon } from "./_components/Icon.tsx";
import { MyLearningSection, type PathCardData } from "./_components/MyLearning.tsx";

function typeTone(label: string): BadgeTone {
  if (label === "Policy") return "brand";
  if (label === "Guideline") return "info";
  if (label === "Training") return "warning";
  if (label === "Template") return "strong";
  return "neutral";
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

  // My Learning replaces the staff home cards once a person has at least
  // one path assigned; with no path they still see the library and glossary
  // cards (E8 My Learning, acceptance criterion 4).
  let learningCards: PathCardData[] | null = null;
  let learningSummary: Awaited<ReturnType<typeof myLearning>> | null = null;
  if (pathsOn) {
    const person = await personByUserId(db, session.user.id);
    if (person) {
      learningSummary = await myLearning(db, person.id);
      if (learningSummary.pathsEnrolled > 0) {
        learningCards = await Promise.all(
          learningSummary.assignments.map(async (view) => {
            const currentModules = view.stages.find((s) => !s.complete)?.modules.slice(0, 3) ?? [];
            const modules = await Promise.all(
              currentModules.map(async (m) => ({ ...m, items: m.completed ? await listModuleItems(db, m.id) : [] })),
            );
            return { view, modules };
          }),
        );
      }
    }
  }

  // An administrator's portal overview: real counts and the most recent
  // changes, not placeholders for features that don't exist yet (no
  // courses, groups or custom reports until E8/E4/E12 are built).
  let overview: { staff: number; departments: number; departmentNames: string[]; published: number; signIns: number; timeline: Awaited<ReturnType<typeof recentActivity>>; notices: Awaited<ReturnType<typeof noticesFor>> } | null = null;
  if (isAdmin) {
    const [staff, departments, items, activity, adminNotices] = await Promise.all([
      listActiveStaff(db),
      listStructure(db, "department"),
      libraryOn ? listLibraryItems(db, { publishedOnly: true, areas: "all" }) : Promise.resolve([]),
      recentActivity(db, 200),
      noticesFor(db, session.user.id, 6),
    ]);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const signIns = activity.filter((a) => a.action === "auth.signed_in" && a.at.getTime() >= weekAgo).length;
    overview = { staff: staff.length, departments: departments.length, departmentNames: departments.slice(0, 6).map((d) => d.name), published: items.length, signIns, timeline: activity.slice(0, 6), notices: adminNotices };
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
            <div className="lib-hero-bg" />
            <div className="lib-hero-shade" />
            <div className="lib-hero-copy">
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600 }}>{t("home.greeting_prefix")}</p>
              <h1>{firstName}</h1>
              <p>{t("home.sub", { name: resolution.tenant.name })}</p>
              <div className="lib-hero-rule" />
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/library_person.webp" alt="" aria-hidden="true" className="lib-hero-person" />
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
          {/* KPI tiles */}
          <div className="admin-kpis">
            <article className="admin-kpi">
              <span className="admin-kpi-icon"><Icon name="people" size={28} /></span>
              <div>
                <p className="admin-kpi-value">{overview.staff}</p>
                <h2 className="admin-kpi-label">{t("home.admin.stats.staff")}</h2>
              </div>
            </article>
            {libraryOn ? (
              <article className="admin-kpi">
                <span className="admin-kpi-icon"><Icon name="library" size={28} /></span>
                <div>
                  <p className="admin-kpi-value">{overview.published}</p>
                  <h2 className="admin-kpi-label">{t("home.admin.stats.published")}</h2>
                </div>
              </article>
            ) : null}
            <article className="admin-kpi">
              <span className="admin-kpi-icon"><Icon name="tree" size={28} /></span>
              <div>
                <p className="admin-kpi-value">{overview.departments}</p>
                <h2 className="admin-kpi-label">{t("home.admin.stats.departments")}</h2>
              </div>
            </article>
            <article className="admin-kpi">
              <span className="admin-kpi-icon"><Icon name="list" size={28} /></span>
              <div>
                <p className="admin-kpi-value">{overview.signIns}</p>
                <h2 className="admin-kpi-label">{t("home.admin.stats.sign_ins")}</h2>
              </div>
            </article>
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
      ) : null}

      {learningCards && learningSummary ? (
        <MyLearningSection
          pathsEnrolled={learningSummary.pathsEnrolled}
          modulesCompleted={learningSummary.modulesCompleted}
          modulesTotal={learningSummary.modulesTotal}
          completionRate={learningSummary.completionRate}
          nextUp={learningSummary.nextUp}
          cards={learningCards}
        />
      ) : null}

      {mainDestinations.length > 0 && !isAdmin ? (
        <>
          <h2 style={{ marginTop: learningCards ? 24 : 0 }}>{t("home.quick_access_heading")}</h2>
          <div className="grid grid-3">
            {mainDestinations.map((d) => (
              <Card key={d.key}>
                <Link className="quick-tile" href={d.href}>
                  <span className="icon"><Icon name={d.icon} size={22} /></span>
                  <h3>{t(`nav.${d.key}`)}</h3>
                  <span className="muted">{t(`home.cards.${d.key}`)}</span>
                </Link>
              </Card>
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
              <div className="grid grid-2" style={{ marginTop: 12 }}>
                {featuredResources.map((item) => (
                  <Card key={item.id} flat>
                    <Badge tone={typeTone(item.typeLabel)}>{item.typeLabel}</Badge>
                    <h3 style={{ marginTop: 8 }}><Link href={`/library/${item.id}`}>{item.title}</Link></h3>
                  </Card>
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
      <Card flat style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <p className="muted" style={{ margin: 0 }}>{t("auth.signed_in_as", { name: session.user.name })}</p>
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="sm">{t("auth.sign_out")}</Button>
          </form>
        </div>
      </Card>
    </AppShell>
  );
}
