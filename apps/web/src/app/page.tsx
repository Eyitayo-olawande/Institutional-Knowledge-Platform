import { Button, buttonStyle, Card, StatTile } from "@mantle/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { t } from "../i18n.ts";
import { authFor, requestHost } from "../server/auth.ts";
import { buildNav } from "../server/nav.ts";
import { featureOn, tenantDb } from "../server/session.ts";
import { listActiveStaff, listLibraryItems, listModuleItems, listStructure, myLearning, personByUserId, recentActivity, unreadCount } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { resolveRequestTenant } from "../server/tenant.ts";
import { tenantView } from "../server/tenant_view.ts";
import { signOut } from "./actions.ts";
import { AppShell, PageHead } from "./_components/AppShell.tsx";
import { Icon } from "./_components/Icon.tsx";
import { MyLearningSection, type PathCardData } from "./_components/MyLearning.tsx";

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
    return (
      <div className="centered">
        <Card className="panel">
          <h1>{resolution.tenant.name}</h1>
          <p className="sub" style={{ marginBottom: 20 }}>{t(view.key, view.params)}</p>
          <Link href="/sign-in" style={{ ...buttonStyle(), width: "100%" }}>{t("auth.sign_in")}</Link>
        </Card>
      </div>
    );
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
  let overview: { staff: number; departments: number; published: number; signIns: number; timeline: Awaited<ReturnType<typeof recentActivity>> } | null = null;
  if (isAdmin) {
    const [staff, departments, items, activity] = await Promise.all([
      listActiveStaff(db),
      listStructure(db, "department"),
      libraryOn ? listLibraryItems(db, { publishedOnly: true, areas: "all" }) : Promise.resolve([]),
      recentActivity(db, 200),
    ]);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const signIns = activity.filter((a) => a.action === "auth.signed_in" && a.at.getTime() >= weekAgo).length;
    overview = { staff: staff.length, departments: departments.length, published: items.length, signIns, timeline: activity.slice(0, 6) };
  }

  return (
    <AppShell ctx={{ tenant: resolution.tenant, db, roles, user: session.user }} active="home">
      {isAdmin ? (
        <PageHead title={t("home.greeting", { name: firstName })} sub={t("home.sub", { name: resolution.tenant.name })} />
      ) : (
        <div className="hero">
          <div className="hero-text">
            <h1>{t("home.greeting", { name: firstName })}</h1>
            <p className="sub">{t("home.sub", { name: resolution.tenant.name })}</p>
          </div>
          <div className="hero-photo">
            <img src="/images/people/dashboard-hero.webp" alt="" />
          </div>
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
          <h2>{t("home.admin.overview_heading")}</h2>
          <div className="grid grid-4">
            <StatTile label={t("home.admin.stats.staff")} value={overview.staff} />
            <StatTile label={t("home.admin.stats.departments")} value={overview.departments} />
            {libraryOn ? <StatTile label={t("home.admin.stats.published")} value={overview.published} /> : null}
            <StatTile label={t("home.admin.stats.sign_ins")} value={overview.signIns} />
          </div>

          <div className="grid grid-2" style={{ alignItems: "start", marginTop: 16 }}>
            {adminDestinations.length > 0 ? (
              <Card>
                <h3>{t("home.admin.quick_actions_heading")}</h3>
                <ul className="list">
                  {adminDestinations.map((d) => (
                    <li key={d.key}>
                      <Link className="grow" href={d.href}>
                        <Icon name={d.icon} size={18} />
                        <span style={{ marginLeft: 8 }}>{t(`nav.${d.key}`)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{t("home.admin.timeline_heading")}</h3>
                <Link href="/admin/activity" className="muted">{t("home.admin.timeline_view_all")}</Link>
              </div>
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
            </Card>
          </div>
        </>
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

      {mainDestinations.length > 0 ? (
        <>
          <h2 style={{ marginTop: learningCards ? 24 : 0 }}>{t("home.quick_access_heading")}</h2>
          <div className="grid grid-3">
            {mainDestinations.map((d) => (
              <Card key={d.key}>
                <Link className="dest" href={d.href}>
                  <span className="icon"><Icon name={d.icon} size={22} /></span>
                  <div>
                    <h3>{t(`nav.${d.key}`)}</h3>
                    <span className="muted">{t(`home.cards.${d.key}`)}</span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </>
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
