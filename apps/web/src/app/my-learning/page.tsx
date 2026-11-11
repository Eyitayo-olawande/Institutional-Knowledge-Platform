import { certificatesForPerson, listModuleItems, myLearning, personByUserId, type AssignmentStageView, STAGE_ORDER } from "@mantle/db/tenant";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { requireFeature, requirePermission } from "../../server/session.ts";
import { AppShell } from "../_components/AppShell.tsx";
import { ModulesPanel, type FlatModule } from "./ModulesPanel.tsx";

type StageState = "completed" | "current" | "upcoming";

function stageState(stage: AssignmentStageView | undefined, unlocked: boolean): StageState {
  if (!stage) return "upcoming";
  if (stage.complete) return "completed";
  if (unlocked) return "current";
  return "upcoming";
}

function stageDesc(kind: string, pathName: string): string {
  if (kind === "common") return t("home.admin.journey_common");
  if (kind === "department") return pathName ? `${pathName} learning` : t("home.admin.journey_dept");
  if (kind === "role") return t("home.admin.journey_role");
  return t("home.admin.journey_cert");
}

export default async function MyLearning({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; completed?: string }>;
}) {
  const ctx = await requirePermission("library.view");
  const { tenant, db, user } = ctx;
  await requireFeature(tenant, "learning_paths");
  const { completed, tab: tabParam } = await searchParams;
  const tab = tabParam ?? "all";

  const person = await personByUserId(db, user.id);
  if (!person) {
    return (
      <AppShell ctx={ctx} active="my_learning">
        <div className="my-banner">
          <div className="my-banner-bg" />
          <div className="my-banner-shade" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/learning-professional.png" alt="" className="my-learning-person" aria-hidden="true" />
          <div className="my-banner-copy">
            <p className="eyebrow">{t("learning.title").toUpperCase()}</p>
            <h1>
              {t("learning.title").split(" ")[0]}{" "}
              <span>{t("learning.title").split(" ").slice(1).join(" ")}</span>
            </h1>
            <p className="my-banner-sub">{t("learning.banner_sub")}</p>
            <div className="my-banner-rule" />
          </div>
        </div>
        <p className="sub">{t("learning.empty_body")}</p>
      </AppShell>
    );
  }

  const data = await myLearning(db, person.id);
  const certs = await certificatesForPerson(db, person.id);

  if (data.pathsEnrolled === 0) {
    return (
      <AppShell ctx={ctx} active="my_learning">
        <div className="my-banner">
          <div className="my-banner-bg" />
          <div className="my-banner-shade" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/learning-professional.png" alt="" className="my-learning-person" aria-hidden="true" />
          <div className="my-banner-copy">
            <p className="eyebrow">{t("learning.title").toUpperCase()}</p>
            <h1>
              My <span>Learning</span>
            </h1>
            <p className="my-banner-sub">{t("learning.banner_sub")}</p>
            <div className="my-banner-rule" />
          </div>
        </div>
        <p className="sub">{t("learning.empty_body")}</p>
      </AppShell>
    );
  }

  // Gather all modules from all assignments and fetch their library items
  const allModuleIds = new Set<string>();
  for (const assignment of data.assignments) {
    for (const stage of assignment.stages) {
      for (const mod of stage.modules) {
        allModuleIds.add(mod.id);
      }
    }
  }
  const moduleItemMap = new Map<string, string>();
  await Promise.all(
    [...allModuleIds].map(async (id) => {
      const items = await listModuleItems(db, id);
      if (items[0]) moduleItemMap.set(id, items[0].id);
    }),
  );

  // Build flat module list with enriched data
  const flatModules: FlatModule[] = [];
  let globalN = 0;
  const globalTotal = data.assignments.reduce(
    (acc, a) => acc + a.stages.reduce((s, st) => s + st.modules.length, 0),
    0,
  );
  for (const assignment of data.assignments) {
    for (const stage of assignment.stages) {
      for (const mod of stage.modules) {
        globalN += 1;
        flatModules.push({
          id: mod.id,
          title: mod.title,
          completed: mod.completed,
          unlocked: stage.unlocked,
          stageName: t(`paths.stages.${stage.kind}`),
          n: globalN,
          total: globalTotal,
          itemId: moduleItemMap.get(mod.id) ?? null,
        });
      }
    }
  }

  // First assignment for the journey view
  const firstAssignment = data.assignments[0]!;

  const { completionRate, modulesCompleted, modulesTotal } = data;
  const inProgressCount = flatModules.filter((m) => m.unlocked && !m.completed).length;
  const notStartedCount = flatModules.filter((m) => !m.unlocked && !m.completed).length;

  const nextDue = firstAssignment.stages.find((s) => s.unlocked && !s.complete)?.dueDate;

  return (
    <AppShell ctx={ctx} active="my_learning">
      {/* Hero banner */}
      <div className="my-banner">
        <div className="my-banner-bg" />
        <div className="my-banner-shade" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/learning-professional.png" alt="" className="my-learning-person" aria-hidden="true" />
        <div className="my-banner-copy">
          <p className="eyebrow">{t("learning.title").toUpperCase()}</p>
          <h1>
            My <span>Learning Journey</span>
          </h1>
          <p className="my-banner-sub">{t("learning.banner_sub")}</p>
          <div className="my-banner-rule" />
        </div>
      </div>

      {completed ? (
        <div className="alert alert-success" role="status" style={{ marginBottom: 0 }}>
          <p>{t("learning.module_completed_banner")}</p>
        </div>
      ) : null}

      <div className="my-layout">
        {/* Main column */}
        <div>
          {/* Journey panel */}
          <div className="my-journey-panel">
            <h2>{t("learning.journey_heading")}</h2>
            <p className="sub">{t("learning.journey_sub")}</p>
            <ol className="my-journey-ol">
              {STAGE_ORDER.map((kind) => {
                const stage = firstAssignment.stages.find((s) => s.kind === kind);
                const unlocked = stage?.unlocked ?? false;
                const state = stageState(stage, unlocked);
                const isCert = kind === "certificate";
                return (
                  <li key={kind} className={`my-journey-stage ${state}`}>
                    <div className="my-journey-node">
                      {state === "completed" ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : isCert || state === "upcoming" ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      ) : null}
                    </div>
                    <div className="my-journey-label">
                      <p className="stage-name">{isCert ? t("learning.stage_cert") : t(`paths.stages.${kind}`)}</p>
                      <p className="stage-desc">{isCert ? t("learning.stage_cert_soon") : stageDesc(kind, firstAssignment.pathName)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Module list / grid panel */}
          <ModulesPanel
            flatModules={flatModules}
            tab={tab}
            modulesCompleted={modulesCompleted}
            inProgressCount={inProgressCount}
          />
        </div>

        {/* Aside */}
        <aside className="my-aside">
          {/* Progress donut */}
          <div className="my-panel">
            <h2>{t("learning.progress_heading")}</h2>
            <p className="sub">{t("learning.progress_sub")}</p>
            <div className="my-progress-ring">
              <div className="my-progress-ring-wrap">
                <svg viewBox="0 0 120 120" aria-label={`${completionRate}% complete`} style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                  <circle cx="60" cy="60" r="48" fill="none" stroke="var(--mantle-color-border)" strokeWidth="14" />
                  <circle
                    cx="60" cy="60" r="48" fill="none"
                    stroke="var(--mantle-color-primary)" strokeWidth="14"
                    pathLength="100"
                    strokeDasharray={`${completionRate} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span>{completionRate}%</span>
              </div>
              <dl className="my-progress-dl">
                <div>
                  <dt>{t("learning.progress_completed")}</dt>
                  <dd>{modulesCompleted}</dd>
                </div>
                <div>
                  <dt>{t("learning.progress_in_progress")}</dt>
                  <dd>{inProgressCount}</dd>
                </div>
                <div>
                  <dt>{t("learning.progress_not_started")}</dt>
                  <dd>{notStartedCount}</dd>
                </div>
              </dl>
            </div>
            <Link href="/admin/paths" className="my-module-action-btn" style={{ display: "block", textAlign: "center", marginTop: 4 }}>
              {t("paths.admin.title")}
            </Link>
          </div>

          {/* Certificates */}
          <div className="my-panel">
            <h2>{t("learning.certs_heading")}</h2>
            {certs.length === 0 ? (
              <div className="my-certs-row">
                <div className="my-certs-icon" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="5" y="9" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6 9V7a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, color: "var(--mantle-color-text_muted)", margin: 0 }}>
                    {t("learning.certs_none")}
                  </p>
                </div>
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {certs.map((cert) => (
                  <li key={cert.id} style={{ borderRadius: 8, border: "1px solid var(--mantle-color-border)", padding: "10px 12px" }}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                      {t(`paths.stages.${cert.stageKind}`)} {t("learning.certs_stage_label")}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", margin: "2px 0 4px" }}>
                      {cert.pathName}
                    </p>
                    <p style={{ fontSize: 12, margin: 0 }}>
                      <Link href={`/certificate/${cert.reference}`} style={{ color: "var(--mantle-color-primary)" }}>
                        {cert.reference}
                      </Link>
                      {" "}&middot;{" "}
                      <span style={{ color: "var(--mantle-color-text_muted)" }}>
                        {t("learning.certs_issued", { date: cert.issuedAt.toISOString().slice(0, 10) })}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Keep going nudge */}
          {nextDue ? (
            <div className="my-keep-going">
              <div style={{ color: "var(--mantle-color-primary)", flexShrink: 0 }} aria-hidden>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="20" fill="var(--mantle-color-primary_tint)" />
                  <circle cx="20" cy="20" r="8" stroke="var(--mantle-color-primary)" strokeWidth="2" fill="none" />
                  <circle cx="20" cy="20" r="3" fill="var(--mantle-color-primary)" />
                  <line x1="20" y1="4" x2="20" y2="10" stroke="var(--mantle-color-primary)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="20" y1="30" x2="20" y2="36" stroke="var(--mantle-color-primary)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="4" y1="20" x2="10" y2="20" stroke="var(--mantle-color-primary)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="30" y1="20" x2="36" y2="20" stroke="var(--mantle-color-primary)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 style={{ color: "var(--mantle-color-primary)" }}>{t("learning.keep_going_heading")}</h2>
                <p>{t("learning.keep_going_body")}</p>
                <p style={{ fontSize: 12, color: "var(--mantle-color-text_muted)", marginTop: 8 }}>
                  {t("home.my_learning.due", { date: nextDue.toISOString().slice(0, 10) })}
                </p>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
