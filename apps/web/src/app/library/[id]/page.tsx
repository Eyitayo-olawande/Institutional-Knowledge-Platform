import { canSeeArea, getAssessmentForItem, getAttemptResults, getLibraryItem, hasViewedAllModuleItems, itemFiles, listLibraryItems, listModuleItems, personByUserId, recordItemView } from "@mantle/db/tenant";
import { needsConversion } from "@mantle/documents/convert";
import { ACCEPT_ATTR } from "@mantle/platform/files";
import { can } from "@mantle/platform/identity";
import { Badge, Button, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission, viewerAreas } from "../../../server/session.ts";
import { AppShell } from "../../_components/AppShell.tsx";
import { completeModuleAction, submitAssessmentAction } from "../../actions.ts";
import { placeLibraryItem, publishItem, saveItemDraft, uploadItemFile } from "../actions.ts";
import { areaChoices, areaName } from "../areas.ts";
import { PlacementFields } from "../PlacementFields.tsx";
import { ViewerActionsClient } from "../ViewerActionsClient.tsx";
import { ViewerStageClient } from "../ViewerStageClient.tsx";

const FILE_ERRORS = new Set(["empty", "too_many", "too_large", "type_not_allowed", "content_mismatch", "infected"]);

function youtubeEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

function fileTypeAbbr(contentType: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType.includes("wordprocessingml") || contentType.includes("msword")) return "DOC";
  if (contentType.includes("spreadsheetml") || contentType.includes("excel")) return "XLS";
  if (contentType.includes("presentationml") || contentType === "application/vnd.ms-powerpoint") return "PPT";
  if (contentType.startsWith("image/")) return "IMG";
  if (contentType === "video/mp4") return "MP4";
  return "FILE";
}

export default async function Item({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; published?: string; error?: string; placed?: string; file_added?: string; file_error?: string; file?: string; moduleId?: string; attempt?: string }>;
}) {
  const ctx = await requirePermission("library.view");
  const { tenant, db, roles } = ctx;
  await requireFeature(tenant, "knowledge_library");
  const { id } = await params;
  const { saved, published, error, placed, file_added: fileAdded, file_error: fileError, file: fileParam, moduleId, attempt: attemptId } = await searchParams;
  const found = /^[0-9a-f-]{36}$/.test(id) ? await getLibraryItem(db, id) : null;
  const editor = can(roles, "library.edit");
  const visible = await viewerAreas(ctx);
  // An item in an area the viewer cannot see does not exist for them.
  if (!found || !canSeeArea(visible, found.item.areaId) || (!editor && !found.published)) notFound();
  const { item, draft, versions } = found;
  const { areas, types } = await areaChoices(db, visible);
  const area = areas.find((a) => a.id === item.areaId);
  const type = types.find((ty) => ty.id === item.contentTypeId);
  const current = draft ?? found.published;
  const attachments = await itemFiles(db, item.id);

  const relatedItems = item.areaId
    ? (await listLibraryItems(db, { publishedOnly: true, areas: visible, areaId: item.areaId }))
        .filter((r) => r.id !== item.id)
        .slice(0, 4)
    : [];

  const selectedFile = attachments.find((f) => f.id === fileParam) ?? attachments[0] ?? null;
  const lastUpdated = found.published?.publishedAt
    ? new Date(found.published.publishedAt).toISOString().slice(0, 10)
    : null;

  // Module navigation — only when arriving from My Learning with a moduleId
  const moduleItems = moduleId && /^[0-9a-f-]{36}$/.test(moduleId)
    ? await listModuleItems(db, moduleId)
    : [];
  const moduleIdx = moduleItems.findIndex((mi) => mi.id === id);
  const prevModuleItem = moduleIdx > 0 ? moduleItems[moduleIdx - 1] ?? null : null;
  const nextModuleItem = moduleIdx >= 0 && moduleIdx < moduleItems.length - 1
    ? moduleItems[moduleIdx + 1] ?? null
    : null;
  const isLastModuleItem = moduleIdx >= 0 && moduleIdx === moduleItems.length - 1;

  // Assessment (Gate 2) — check if this item has a knowledge check attached.
  // Always fetched: editors see the admin panel; learners get the quiz when moduleId is set.
  const assessment = await getAssessmentForItem(db, item.id);
  const isAssessmentItem = !!assessment && !!moduleId;

  // Compute viewer's person record once; used for view recording and gate checks.
  const { user: viewer } = ctx;
  const viewerPerson = moduleId ? await personByUserId(db, viewer.id) : null;

  // For content items (not assessments): record a view so Gate 1 can be evaluated.
  // Assessment items record their own view in submitAssessmentAction on submission.
  if (moduleId && !isAssessmentItem && viewerPerson) {
    await recordItemView(db, viewerPerson.id, moduleId, item.id, `user:${viewer.id}`);
  }

  // Gate 1 pre-check: has this person viewed all content items in the module?
  // Used to show a warning on the quiz page when earlier items are unread.
  const gate1Met = isAssessmentItem && viewerPerson
    ? await hasViewedAllModuleItems(db, viewerPerson.id, moduleId!)
    : true;

  // If ?attempt= is present, load prior results to show the feedback panel.
  const attemptResults =
    attemptId && /^[0-9a-f-]{36}$/.test(attemptId)
      ? await getAttemptResults(db, attemptId)
      : null;

  return (
    <AppShell ctx={ctx} active="library">
      <p className="crumb"><Link href="/library">{t("library.back")}</Link></p>
      <div className="page-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{item.title}</h1>
          <div className="row">
            {found.published ? (
              <Badge tone="success">{t("library.published_version", { version: found.published.version })}</Badge>
            ) : (
              <Badge tone="neutral">{t("library.statuses.draft")}</Badge>
            )}
            {area ? <Badge tone="brand">{areaName(area)}</Badge> : null}
            {type ? <Badge tone="info">{type.label}</Badge> : null}
            {item.reviewDate ? <span className="muted">{t("library.review_by", { date: item.reviewDate })}</span> : null}
          </div>
        </div>
        <ViewerActionsClient hasFile={!!selectedFile} />
      </div>

      {saved ? <div className="alert alert-success" role="status"><p>{t("library.saved")}</p></div> : null}
      {published ? <div className="alert alert-success" role="status"><p>{t("library.published_now")}</p></div> : null}
      {placed ? <div className="alert alert-success" role="status"><p>{t("library.areas.placed")}</p></div> : null}
      {error ? (
        <div className="alert alert-danger" role="alert"><p>{t(`library.errors.${error === "no_draft" || error === "placement" ? error : "missing"}`)}</p></div>
      ) : null}
      {editor && item.needsAreaReview ? <div className="alert alert-info" role="status"><p>{t("library.areas.review_prompt")}</p></div> : null}
      {fileAdded ? <div className="alert alert-success" role="status"><p>{t("library.files.added", { count: Number(fileAdded) || 1 })}</p></div> : null}
      {fileError && FILE_ERRORS.has(fileError) ? (
        <div className="alert alert-danger" role="alert"><p>{t(`library.files.errors.${fileError}`)}</p></div>
      ) : null}

      <div className="lib-item-viewer">
        {/* Main: document viewer (PDF gets its own thumbs + toolbar; others get the stage wrapper) */}
        <ViewerStageClient
          fileUrl={selectedFile ? `/files/${selectedFile.id}` : null}
          contentType={selectedFile?.contentType ?? null}
          fileName={selectedFile?.name ?? ""}
          conversionFailed={!!(selectedFile && needsConversion(selectedFile.contentType) && selectedFile.conversionStatus !== "ready")}
          itemTitle={item.title}
        >
          {/* Prose body or assessment quiz */}
          <div className="lib-item-stage-prose">
            {isAssessmentItem && assessment && moduleId ? (
              attemptResults ? (
                // Results panel — shown after submission
                <div className="quiz-results">
                  <div className={`quiz-results-banner ${attemptResults.passed ? "quiz-results-banner--pass" : "quiz-results-banner--fail"}`}>
                    <div className="quiz-results-score">{attemptResults.score}%</div>
                    <div className="quiz-results-verdict">
                      {attemptResults.passed ? t("learning.quiz_passed") : t("learning.quiz_failed")}
                    </div>
                    <div className="quiz-results-tally">
                      {t("learning.quiz_tally", { correct: String(attemptResults.correct), total: String(attemptResults.total) })}
                    </div>
                  </div>
                  {!attemptResults.passed ? (
                    <p className="quiz-results-retry-hint">{t("learning.quiz_retry_hint", { score: String(assessment.passingScore) })}</p>
                  ) : !attemptResults.gate1Satisfied ? (
                    <p className="quiz-results-retry-hint">{t("learning.quiz_gate1_pending")}</p>
                  ) : null}
                  <div className="quiz-review">
                    {attemptResults.responses.map((r, i) => (
                      <div key={r.questionId} className={`quiz-review-item ${r.isCorrect ? "quiz-review-item--correct" : "quiz-review-item--wrong"}`}>
                        <div className="quiz-review-q">{i + 1}. {r.questionText}</div>
                        <div className="quiz-review-your">
                          {t("learning.quiz_your_answer")}: <strong>{r.chosenOptionText}</strong>
                          {r.isCorrect ? " ✓" : " ✗"}
                        </div>
                        {!r.isCorrect ? (
                          <div className="quiz-review-correct">
                            {t("learning.quiz_correct_answer")}: <strong>{r.correctOptionText}</strong>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {!attemptResults.passed ? (
                    <form action={submitAssessmentAction} className="quiz-retry-form">
                      <input type="hidden" name="assessmentId" value={assessment.id} />
                      <input type="hidden" name="moduleId" value={moduleId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      {assessment.questions.map((q) => (
                        <div key={q.id} className="quiz-question">
                          <div className="quiz-question-text">{q.questionText}</div>
                          <div className="quiz-options">
                            {q.options.map((o) => (
                              <label key={o.id} className="quiz-option">
                                <input type="radio" name={`response_${q.id}`} value={o.id} required />
                                <span>{o.optionText}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button type="submit" className="quiz-submit-btn">
                        {t("learning.quiz_submit")}
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : (
                // Fresh quiz form
                <form action={submitAssessmentAction} className="quiz-form">
                  {!gate1Met ? (
                    <div className="quiz-gate1-warning">{t("learning.quiz_gate1_warning")}</div>
                  ) : null}
                  <p className="quiz-intro">{t("learning.quiz_intro", { passing: String(assessment.passingScore) })}</p>
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <input type="hidden" name="moduleId" value={moduleId} />
                  <input type="hidden" name="itemId" value={item.id} />
                  {assessment.questions.map((q, i) => (
                    <div key={q.id} className="quiz-question">
                      <div className="quiz-question-text">{i + 1}. {q.questionText}</div>
                      <div className="quiz-options">
                        {q.options.map((o) => (
                          <label key={o.id} className="quiz-option">
                            <input type="radio" name={`response_${q.id}`} value={o.id} required />
                            <span>{o.optionText}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button type="submit" className="quiz-submit-btn">
                    {t("learning.quiz_submit")}
                  </button>
                </form>
              )
            ) : (
              <>
                {item.videoUrl ? (
                  <div className="lib-item-video-wrap">
                    <iframe
                      src={youtubeEmbedUrl(item.videoUrl)}
                      title={item.title}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                ) : null}
                {found.published ? (
                  <div className="prose">{found.published.body}</div>
                ) : (
                  <p className="sub">{t("library.not_published")}</p>
                )}
              </>
            )}
          </div>
        </ViewerStageClient>

        {/* Right: document details + files + related resources */}
        <div className="lib-item-info">
          <div className="lib-item-info-panel">
            <h2>{t("library.viewer.details_heading")}</h2>
            {type ? (
              <div className="lib-item-meta-row">
                <span className="lib-item-meta-label">{t("library.viewer.content_type_label")}</span>
                <span className="lib-item-meta-value">{type.label}</span>
              </div>
            ) : null}
            {area ? (
              <div className="lib-item-meta-row">
                <span className="lib-item-meta-label">{t("library.viewer.department_label")}</span>
                <span className="lib-item-meta-value">{areaName(area)}</span>
              </div>
            ) : null}
            {found.published ? (
              <div className="lib-item-meta-row">
                <span className="lib-item-meta-label">{t("library.viewer.version_label")}</span>
                <span className="lib-item-meta-value">{found.published.version}</span>
              </div>
            ) : null}
            {lastUpdated ? (
              <div className="lib-item-meta-row">
                <span className="lib-item-meta-label">{t("library.viewer.last_updated_label")}</span>
                <span className="lib-item-meta-value">{lastUpdated}</span>
              </div>
            ) : null}
            <div className="lib-item-meta-row">
              <span className="lib-item-meta-label">{t("library.viewer.status_label")}</span>
              <span className="lib-item-meta-value">
                {found.published ? (
                  <Badge tone="success">{t("library.statuses.published")}</Badge>
                ) : (
                  <Badge tone="neutral">{t("library.statuses.draft")}</Badge>
                )}
              </span>
            </div>
            {attachments.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--mantle-color-text_muted)", marginBottom: 6 }}>{t("library.viewer.files_heading", { count: attachments.length })}</div>
                {attachments.map((f) => (
                  <Link key={f.id} href={`?file=${f.id}`} className={`lib-item-file-row${selectedFile?.id === f.id ? " active" : ""}`}>
                    <div className="lib-item-file-icon">{fileTypeAbbr(f.contentType)}</div>
                    <div className="lib-item-file-info">
                      <div className="lib-item-file-name">{f.name}</div>
                      <div className="lib-item-file-size">{t("library.files.size", { kb: Math.max(1, Math.round(f.size / 1024)) })}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {relatedItems.length > 0 ? (
            <div className="lib-item-info-panel">
              <h2>{t("library.viewer.related_heading")}</h2>
              {relatedItems.map((r) => (
                <Link key={r.id} href={`/library/${r.id}`} className="lib-item-related-row">
                  <div className={`lib-item-related-icon lib-item-related-icon--${r.typeLabel.toLowerCase().replace(/[^a-z]/g, "")}`}>{r.typeLabel.slice(0, 3).toUpperCase()}</div>
                  <div>
                    <div className="lib-item-related-title">{r.title}</div>
                    {area ? <div className="lib-item-related-meta">{areaName(area)} · {r.typeLabel}</div> : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Module navigation — shown when arriving from My Learning */}
      {moduleId && moduleItems.length > 0 ? (
        <div className="lib-module-nav">
          <div className="lib-module-nav-inner">
            <div className="lib-module-nav-left">
              <Link href="/my-learning" className="lib-module-nav-back">
                ← {t("learning.back_to_learning")}
              </Link>
              {moduleIdx >= 0 ? (
                <span className="lib-module-nav-counter">
                  {t("learning.item_of_total", { n: String(moduleIdx + 1), total: String(moduleItems.length) })}
                </span>
              ) : null}
            </div>
            <div className="lib-module-nav-actions">
              {prevModuleItem ? (
                <Link
                  href={`/library/${prevModuleItem.id}?moduleId=${moduleId}`}
                  className="my-module-action-btn"
                >
                  ← {t("learning.action_prev")}
                </Link>
              ) : null}
              {nextModuleItem ? (
                <Link
                  href={`/library/${nextModuleItem.id}?moduleId=${moduleId}`}
                  className="my-module-action-btn primary"
                >
                  {t("learning.action_next")}: {nextModuleItem.title} →
                </Link>
              ) : isLastModuleItem && !isAssessmentItem ? (
                <form action={completeModuleAction}>
                  <input type="hidden" name="moduleId" value={moduleId} />
                  <button type="submit" className="my-module-action-btn primary">
                    {t("learning.action_mark_done")}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Admin editor forms — below viewer */}
      {editor && current ? (
        <div className="stack" style={{ marginTop: 20 }}>
          <Card>
            <h2>{draft ? t("library.draft_heading", { version: draft.version }) : t("library.edit_heading")}</h2>
            <form action={saveItemDraft}>
              <input type="hidden" name="id" value={item.id} />
              <label className="field">
                {t("library.fields.title")}
                <input className="input" name="title" defaultValue={item.title} required />
              </label>
              <label className="field">
                {t("library.fields.body")}
                <textarea className="input" name="body" defaultValue={current.body} required rows={12} />
              </label>
              <label className="field">
                {t("library.fields.change_note")}
                <input className="input" name="changeNote" defaultValue={draft?.changeNote ?? ""} />
              </label>
              <label className="field">
                {t("library.fields.review_date")}
                <input className="input" name="reviewDate" type="date" defaultValue={item.reviewDate ?? ""} />
              </label>
              <Button type="submit" variant="secondary">{t("library.save_draft")}</Button>
            </form>
            {draft ? (
              <form action={publishItem} style={{ marginTop: 12 }}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit">{t("library.publish", { version: draft.version })}</Button>
              </form>
            ) : null}
          </Card>
          <Card>
            <h2>{t("library.areas.place_heading")}</h2>
            <form action={placeLibraryItem}>
              <input type="hidden" name="id" value={item.id} />
              <PlacementFields areas={areas} types={types} areaId={item.areaId} contentTypeId={item.contentTypeId} />
              <Button type="submit" variant="secondary">{t(item.needsAreaReview ? "library.areas.confirm" : "library.areas.move")}</Button>
            </form>
          </Card>
          <Card>
            <h2>{t("library.files.heading")}</h2>
            <form action={uploadItemFile}>
              <input type="hidden" name="id" value={item.id} />
              <label className="field">
                {t("library.files.add")}
                <input className="input" type="file" name="file" multiple required accept={ACCEPT_ATTR} />
              </label>
              <Button type="submit" variant="secondary">{t("library.files.upload")}</Button>
            </form>
          </Card>
          <Card>
            <h2>{t("library.history")}</h2>
            <ul className="list">
              {versions.map((v) => (
                <li key={v.id}>
                  <div className="grow">
                    {t(v.publishedAt ? "library.history_published" : "library.history_draft", { version: v.version, note: v.changeNote ?? "" })}
                  </div>
                  <Badge tone={v.publishedAt ? "success" : "neutral"}>{t(v.publishedAt ? "library.statuses.published" : "library.statuses.draft")}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2>{t("library.assessment.heading")}</h2>
            {assessment ? (
              <div>
                <div className="lib-item-meta-row">
                  <span className="lib-item-meta-label">{t("library.assessment.questions_label")}</span>
                  <span className="lib-item-meta-value">{assessment.questions.length}</span>
                </div>
                <div className="lib-item-meta-row">
                  <span className="lib-item-meta-label">{t("library.assessment.passing_label")}</span>
                  <span className="lib-item-meta-value">{assessment.passingScore}%</span>
                </div>
                <p className="sub" style={{ marginTop: 10, fontSize: 12 }}>{t("library.assessment.seeded_note")}</p>
              </div>
            ) : (
              <p className="sub">{t("library.assessment.none")}</p>
            )}
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}
