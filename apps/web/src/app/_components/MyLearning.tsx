import { STAGE_ORDER, type AssignmentStageView, type AssignmentView, type PathStatus } from "@mantle/db/tenant";
import { Badge, Button, Card, StatTile, type BadgeTone } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { completeModuleAction } from "../actions.ts";

const STATUS_TONE: Record<PathStatus, BadgeTone> = {
  not_started: "neutral",
  in_progress: "info",
  due_soon: "warning",
  overdue: "danger",
  completed: "success",
};

export interface PathCardModule {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly items: readonly { readonly id: string; readonly title: string }[];
}

export interface PathCardData {
  readonly view: AssignmentView;
  readonly modules: readonly PathCardModule[];
}

export function MyLearningSection({ pathsEnrolled, modulesCompleted, modulesTotal, completionRate, nextUp, cards }: {
  pathsEnrolled: number;
  modulesCompleted: number;
  modulesTotal: number;
  completionRate: number;
  nextUp: { moduleId: string; title: string; pathName: string } | null;
  cards: readonly PathCardData[];
}) {
  return (
    <>
      <h2>{t("home.my_learning.heading")}</h2>
      <div className="grid grid-3">
        <StatTile label={t("home.my_learning.tiles.paths")} value={pathsEnrolled} />
        <StatTile label={t("home.my_learning.tiles.modules")} value={t("home.my_learning.tiles.modules_value", { done: modulesCompleted, total: modulesTotal })} />
        <StatTile label={t("home.my_learning.tiles.completion")} value={`${completionRate}%`} />
      </div>

      {nextUp ? (
        <Card style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>{t("home.my_learning.next_up_heading")}</h3>
          <p className="sub" style={{ margin: 0 }}>{t("home.my_learning.next_up", { module: nextUp.title, path: nextUp.pathName })}</p>
        </Card>
      ) : null}

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {cards.map(({ view, modules }) => (
          <PathCard key={view.assignmentId} view={view} modules={modules} />
        ))}
      </div>
    </>
  );
}

function PathCard({ view, modules }: { view: AssignmentView; modules: readonly PathCardModule[] }) {
  const current = view.stages.find((s) => !s.complete);
  return (
    <Card>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{view.pathName}</h3>
        <Badge tone={STATUS_TONE[view.status]}>{t(`home.my_learning.status.${view.status}`)}</Badge>
      </div>
      {current ? <p className="muted" style={{ marginTop: 4 }}>{t("home.my_learning.due", { date: current.dueDate.toISOString().slice(0, 10) })}</p> : null}

      <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {STAGE_ORDER.map((kind) => <StageDot key={kind} stage={view.stages.find((s) => s.kind === kind)} />)}
      </div>

      {modules.length > 0 ? (
        <ul className="list" style={{ marginTop: 8 }}>
          {modules.map((m) => (
            <li key={m.id}>
              <span className="grow">{m.title}</span>
              {m.completed ? (
                <Link href={m.items[0] ? `/library/${m.items[0].id}` : "/library"} className="muted">{t("home.my_learning.review")}</Link>
              ) : (
                <form action={completeModuleAction}>
                  <input type="hidden" name="moduleId" value={m.id} />
                  <Button type="submit" size="sm">{t("home.my_learning.start")}</Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function StageDot({ stage }: { stage: AssignmentStageView | undefined }) {
  if (!stage) return null;
  // A stage with no modules yet is vacuously "complete" so it never blocks
  // the stage after it, but it should still show as locked until reached.
  const tone: BadgeTone = !stage.unlocked ? "neutral" : stage.complete ? "success" : "info";
  return <Badge tone={tone}>{t(`paths.stages.${stage.kind}`)}</Badge>;
}
