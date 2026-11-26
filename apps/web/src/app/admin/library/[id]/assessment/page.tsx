import { getAssessmentForAdmin, getLibraryItem } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFeature, requirePermission } from "../../../../../server/session.ts";
import { AppShell, PageHead } from "../../../../_components/AppShell.tsx";
import {
  addOptionAction,
  addQuestionAction,
  deleteAssessmentAction,
  deleteOptionAction,
  deleteQuestionAction,
  setCorrectOptionAction,
  setPassingScoreAction,
  updateQuestionAction,
} from "./actions.ts";

export default async function AssessmentBuilder({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { id: itemId } = await params;
  const { msg } = await searchParams;
  const ctx = await requirePermission("library.edit");
  await requireFeature(ctx.tenant, "knowledge_library");

  const found = /^[0-9a-f-]{36}$/.test(itemId) ? await getLibraryItem(ctx.db, itemId) : null;
  if (!found) notFound();

  const { item } = found;
  if (!item.assessmentOnly) notFound();

  const assessment = await getAssessmentForAdmin(ctx.db, itemId);

  return (
    <AppShell ctx={ctx} active="library">
      <p className="crumb"><Link href={`/library/${itemId}`}>{item.title}</Link></p>
      <PageHead title="Knowledge Check Builder" sub="Add questions and answer options. Learners must pass this check to complete the module." />

      {msg === "saved" ? (
        <div className="alert alert-success" role="status"><p>Saved.</p></div>
      ) : null}

      {/* Passing score */}
      <Card>
        <h2>Pass mark</h2>
        <form action={setPassingScoreAction} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="assessmentId" value={assessment?.id ?? ""} />
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Passing score</span>
            <input
              type="number"
              name="passingScore"
              defaultValue={assessment?.passingScore ?? 70}
              min={1}
              max={100}
              required
              className="builder-score-input"
            />
            <span>%</span>
          </label>
          <Button type="submit" variant="primary">Save pass mark</Button>
        </form>
        {!assessment ? (
          <p className="sub" style={{ marginTop: 8 }}>Saving a pass mark creates the knowledge check. You can then add questions.</p>
        ) : null}
      </Card>

      {assessment ? (
        <>
          {assessment.questions.length === 0 ? (
            <div className="alert alert-info" role="status"><p>No questions yet. Add your first question below.</p></div>
          ) : null}

          {assessment.questions.map((q, qi) => (
            <Card key={q.id} className="builder-question-card">
              <div className="builder-question-header">
                <span className="builder-question-num">Question {qi + 1}</span>
                <form action={deleteQuestionAction}>
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="questionId" value={q.id} />
                  <button type="submit" className="builder-delete-btn">Delete question</button>
                </form>
              </div>

              {/* Edit question text */}
              <form action={updateQuestionAction} style={{ marginBottom: 16 }}>
                <input type="hidden" name="itemId" value={itemId} />
                <input type="hidden" name="questionId" value={q.id} />
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <textarea
                    name="questionText"
                    defaultValue={q.questionText}
                    rows={2}
                    className="builder-textarea"
                    required
                  />
                  <Button type="submit" variant="secondary">Update</Button>
                </div>
              </form>

              {/* Options */}
              <div className="builder-options">
                {q.options.map((o) => (
                  <div key={o.id} className={`builder-option ${o.isCorrect ? "builder-option--correct" : ""}`}>
                    <span className="builder-option-mark">{o.isCorrect ? "✓" : "○"}</span>
                    <span className="builder-option-text">{o.optionText}</span>
                    <div className="builder-option-actions">
                      {!o.isCorrect ? (
                        <form action={setCorrectOptionAction}>
                          <input type="hidden" name="itemId" value={itemId} />
                          <input type="hidden" name="questionId" value={q.id} />
                          <input type="hidden" name="optionId" value={o.id} />
                          <button type="submit" className="builder-mark-btn">Mark correct</button>
                        </form>
                      ) : (
                        <span className="builder-correct-label">Correct answer</span>
                      )}
                      <form action={deleteOptionAction}>
                        <input type="hidden" name="itemId" value={itemId} />
                        <input type="hidden" name="optionId" value={o.id} />
                        <button type="submit" className="builder-delete-btn">Delete</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add option */}
              <form action={addOptionAction} className="builder-add-option-form">
                <input type="hidden" name="itemId" value={itemId} />
                <input type="hidden" name="questionId" value={q.id} />
                <input
                  type="text"
                  name="optionText"
                  placeholder="New answer option..."
                  className="builder-input"
                  required
                />
                <Button type="submit" variant="secondary">Add option</Button>
              </form>
            </Card>
          ))}

          {/* Add question */}
          <Card>
            <h2>Add question</h2>
            <form action={addQuestionAction} style={{ marginTop: 12 }}>
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <textarea
                name="questionText"
                placeholder="Enter question text..."
                rows={3}
                className="builder-textarea"
                required
                style={{ marginBottom: 12 }}
              />
              <Button type="submit" variant="primary">Add question</Button>
            </form>
          </Card>

          {/* Danger zone */}
          <Card>
            <h2>Remove knowledge check</h2>
            <p className="sub" style={{ marginBottom: 12 }}>This permanently deletes all questions, options, and attempt history for this item.</p>
            <form action={deleteAssessmentAction}>
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <Button type="submit" variant="danger">Delete knowledge check</Button>
            </form>
          </Card>
        </>
      ) : null}
    </AppShell>
  );
}
