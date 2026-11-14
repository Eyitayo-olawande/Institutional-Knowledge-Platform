import {
  getAptitudeTest,
  getAssignedCandidates,
  getTestQuestions,
  getTestSections,
  listCandidates,
} from "@mantle/db/tenant";
import { Badge, Button, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../../server/session.ts";
import { AppShell } from "../../../_components/AppShell.tsx";
import {
  assignCandidateAction,
  deleteQuestionAction,
  editTestAction,
  generatePinAction,
  unassignCandidateAction,
  upsertQuestionAction,
} from "../actions.ts";

export default async function AptitudeTestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; assigned?: string; qsaved?: string; error?: string; aerror?: string; qerror?: string; pin?: string; pinFor?: string }>;
}) {
  const ctx = await requirePermission("candidates.manage");
  await requireFeature(ctx.tenant, "aptitude_testing");
  const { id } = await params;
  const qp = await searchParams;

  const [test, sections, questions, assigned, allCandidates] = await Promise.all([
    getAptitudeTest(ctx.db, id),
    getTestSections(ctx.db, id),
    getTestQuestions(ctx.db, id),
    getAssignedCandidates(ctx.db, id),
    listCandidates(ctx.db),
  ]);
  if (!test) notFound();

  const assignedCandidateIds = new Set(assigned.map((a) => a.candidateId));
  const unassigned = allCandidates.filter((c) => !assignedCandidateIds.has(c.id));

  const questionsBySection = new Map<string, typeof questions>();
  for (const q of questions) {
    const list = questionsBySection.get(q.sectionId) ?? [];
    list.push(q);
    questionsBySection.set(q.sectionId, list);
  }

  return (
    <AppShell ctx={ctx} active="aptitude_tests">
      <Link href="/admin/aptitude-tests" className="muted" style={{ fontSize: 13, display: "inline-block", marginBottom: 20 }}>
        {"←"} {t("aptitude_tests.back")}
      </Link>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{test.name}</h1>
        <Link href={`/admin/aptitude-tests/${id}/results`} className="btn btn-sm btn-secondary">
          {t("aptitude_tests.results_btn")}
        </Link>
      </div>

      {qp.saved ? <div className="alert alert-success" role="status"><p>Test details saved.</p></div> : null}
      {qp.assigned ? <div className="alert alert-success" role="status"><p>Candidate assigned.</p></div> : null}
      {qp.qsaved ? <div className="alert alert-success" role="status"><p>Question saved.</p></div> : null}
      {(qp.error || qp.qerror) ? <div className="alert alert-danger" role="alert"><p>Please check all required fields.</p></div> : null}
      {qp.aerror === "duplicate" ? <div className="alert alert-danger" role="alert"><p>This candidate is already assigned to this test.</p></div> : null}
      {qp.pin ? (
        <div className="alert alert-success" role="status">
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{t("aptitude_tests.pin_generated")}</p>
          <code style={{ fontSize: 24, letterSpacing: 6, display: "block" }}>{qp.pin}</code>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--mantle-color-text_muted)" }}>Write this down and hand it to the candidate. It will not be shown again.</p>
        </div>
      ) : null}

      {/* Test config */}
      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>{t("aptitude_tests.edit_heading")}</h2>
        <form action={editTestAction}>
          <input type="hidden" name="testId" value={test.id} />
          <label className="field">
            {t("aptitude_tests.fields.name")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
            <input className="input" name="name" defaultValue={test.name} required />
          </label>
          <label className="field">
            {t("aptitude_tests.fields.instructions")}
            <textarea className="input" name="instructions" rows={3} defaultValue={test.instructions} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <label className="field">
              {t("aptitude_tests.fields.duration")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" type="number" name="durationMinutes" defaultValue={test.durationMinutes} min={1} required />
            </label>
            <label className="field">
              {t("aptitude_tests.fields.num_questions")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" type="number" name="numQuestions" defaultValue={test.numQuestions} min={1} required />
            </label>
            <label className="field">
              {t("aptitude_tests.fields.total_marks")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" type="number" name="totalMarks" defaultValue={test.totalMarks} min={1} required />
            </label>
            <label className="field">
              {t("aptitude_tests.fields.pass_mark")} <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
              <input className="input" type="number" name="passMark" defaultValue={test.passMark} min={1} required />
            </label>
          </div>
          <Button type="submit">{t("aptitude_tests.save_btn")}</Button>
        </form>
      </Card>

      {/* Questions by section */}
      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>{t("aptitude_tests.questions_heading")}</h2>
        {sections.map((section) => {
          const sqs = questionsBySection.get(section.id) ?? [];
          return (
            <div key={section.id} style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 10 }}>
                {section.sectionKey === "general_aptitude"
                  ? t("aptitude_tests.sections.general_aptitude")
                  : t("aptitude_tests.sections.company_knowledge")}
              </h3>
              {sqs.length === 0 ? (
                <p className="sub" style={{ fontSize: 13 }}>No questions yet in this section.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                  {sqs.map((q, qi) => (
                    <div key={q.id} style={{ border: "1px solid var(--mantle-color-border)", borderRadius: 6, padding: "10px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 14 }}>{qi + 1}. {q.questionText} <span style={{ fontWeight: 400, color: "var(--mantle-color-text_muted)", fontSize: 12 }}>({q.marks} mark{q.marks !== 1 ? "s" : ""})</span></p>
                        <form action={deleteQuestionAction} style={{ flexShrink: 0 }}>
                          <input type="hidden" name="testId" value={id} />
                          <input type="hidden" name="questionId" value={q.id} />
                          <button type="submit" className="btn btn-sm btn-danger-ghost" style={{ fontSize: 12 }}>Delete</button>
                        </form>
                      </div>
                      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                        {q.options.map((opt) => (
                          <li key={opt.id} style={{ color: opt.isCorrect ? "var(--mantle-color-success)" : undefined, fontWeight: opt.isCorrect ? 600 : 400 }}>
                            {opt.optionText}{opt.isCorrect ? " (correct)" : ""}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
              {/* Add question form */}
              <details style={{ marginTop: 8 }}>
                <summary className="btn btn-sm btn-secondary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {t("aptitude_tests.add_question_btn")}
                </summary>
                <div style={{ marginTop: 12, padding: "14px 16px", border: "1px solid var(--mantle-color-border)", borderRadius: 6 }}>
                  <form action={upsertQuestionAction}>
                    <input type="hidden" name="testId" value={id} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input type="hidden" name="sortOrder" value={sqs.length + 1} />
                    <label className="field">
                      Question text <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
                      <textarea className="input" name="questionText" rows={2} required />
                    </label>
                    <label className="field" style={{ maxWidth: 160 }}>
                      Marks <span style={{ color: "var(--mantle-color-brand)" }}>*</span>
                      <input className="input" type="number" name="marks" min={1} defaultValue={1} required />
                    </label>
                    <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Answer options (tick the correct one)</p>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", alignItems: "center", marginBottom: 6 }}>
                        <input type="radio" name="correctOption" value={i} defaultChecked={i === 0} required />
                        <input className="input" name="optionText" placeholder={`Option ${i + 1}`} required style={{ marginBottom: 0 }} />
                      </div>
                    ))}
                    <Button type="submit" style={{ marginTop: 10 }}>Save question</Button>
                  </form>
                </div>
              </details>
            </div>
          );
        })}
      </Card>

      {/* Candidate assignment */}
      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>{t("aptitude_tests.assign_heading")}</h2>
        {assigned.length === 0 ? (
          <p className="sub" style={{ fontSize: 13 }}>No candidates assigned yet.</p>
        ) : (
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>PIN</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assigned.map((a) => (
                  <tr key={a.id}>
                    <td><code style={{ fontSize: 12 }}>{a.candidateRef}</code></td>
                    <td>{a.firstName} {a.surname}</td>
                    <td style={{ fontSize: 13, color: "var(--mantle-color-text_muted)" }}>{a.email}</td>
                    <td>
                      {a.hasPinSet ? (
                        <Badge tone="success">PIN set</Badge>
                      ) : (
                        <form action={generatePinAction}>
                          <input type="hidden" name="testId" value={id} />
                          <input type="hidden" name="candidateId" value={a.candidateId} />
                          <button type="submit" className="btn btn-sm btn-secondary">{t("aptitude_tests.generate_pin")}</button>
                        </form>
                      )}
                    </td>
                    <td>
                      <form action={unassignCandidateAction}>
                        <input type="hidden" name="testId" value={id} />
                        <input type="hidden" name="candidateId" value={a.candidateId} />
                        <button type="submit" className="btn btn-sm btn-danger-ghost" style={{ fontSize: 12 }}>Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {unassigned.length > 0 ? (
          <form action={assignCandidateAction} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <input type="hidden" name="testId" value={id} />
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              {t("aptitude_tests.assign_btn")}
              <select className="input" name="candidateId" required>
                <option value="">Select a candidate...</option>
                {unassigned.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.surname} ({c.candidateRef})</option>
                ))}
              </select>
            </label>
            <Button type="submit" style={{ flexShrink: 0 }}>Assign</Button>
          </form>
        ) : (
          <p className="sub" style={{ fontSize: 13, margin: 0 }}>All registered candidates have been assigned.</p>
        )}
      </Card>
    </AppShell>
  );
}
