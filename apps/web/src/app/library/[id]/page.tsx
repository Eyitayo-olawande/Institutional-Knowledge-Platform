import { getLibraryItem, itemFiles } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { Badge, Button, Card } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { AppShell } from "../../_components/AppShell.tsx";
import { publishItem, saveItemDraft, uploadItemFile } from "../actions.ts";

const FILE_ERRORS = new Set(["empty", "too_many", "too_large", "type_not_allowed", "content_mismatch", "infected"]);

export default async function Item({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; published?: string; error?: string; file_added?: string; file_error?: string }>;
}) {
  const ctx = await requirePermission("library.view");
  const { tenant, db, roles } = ctx;
  await requireFeature(tenant, "knowledge_library");
  const { id } = await params;
  const { saved, published, error, file_added: fileAdded, file_error: fileError } = await searchParams;
  const found = /^[0-9a-f-]{36}$/.test(id) ? await getLibraryItem(db, id) : null;
  const editor = can(roles, "library.edit");
  if (!found || (!editor && !found.published)) notFound();
  const { item, draft, versions } = found;
  const current = draft ?? found.published;
  const attachments = await itemFiles(db, item.id);

  return (
    <AppShell ctx={ctx} active="library">
      <p className="crumb"><Link href="/library">{t("library.back")}</Link></p>
      <div className="page-head">
        <div>
          <h1>{item.title}</h1>
          <div className="row">
            {found.published ? (
              <Badge tone="success">{t("library.published_version", { version: found.published.version })}</Badge>
            ) : (
              <Badge tone="neutral">{t("library.statuses.draft")}</Badge>
            )}
            {item.reviewDate ? <span className="muted">{t("library.review_by", { date: item.reviewDate })}</span> : null}
          </div>
        </div>
      </div>

      {saved ? <div className="alert alert-success" role="status"><p>{t("library.saved")}</p></div> : null}
      {published ? <div className="alert alert-success" role="status"><p>{t("library.published_now")}</p></div> : null}
      {error ? (
        <div className="alert alert-danger" role="alert"><p>{t(`library.errors.${error === "no_draft" ? "no_draft" : "missing"}`)}</p></div>
      ) : null}
      {fileAdded ? <div className="alert alert-success" role="status"><p>{t("library.files.added", { count: Number(fileAdded) || 1 })}</p></div> : null}
      {fileError && FILE_ERRORS.has(fileError) ? (
        <div className="alert alert-danger" role="alert"><p>{t(`library.files.errors.${fileError}`)}</p></div>
      ) : null}

      <div className={editor && current ? "grid grid-2" : "stack"} style={{ alignItems: "start" }}>
        <Card>
          {found.published ? (
            <div className="prose">{found.published.body}</div>
          ) : (
            <p className="sub">{t("library.not_published")}</p>
          )}
          {attachments.length > 0 ? (
            <>
              <h2 style={{ marginTop: 24 }}>{t("library.files.heading")}</h2>
              <ul className="list">
                {attachments.map((f) => (
                  <li key={f.id}>
                    <a className="grow" href={`/files/${f.id}`}>{f.name}</a>
                    <span className="muted">{t("library.files.size", { kb: Math.max(1, Math.round(f.size / 1024)) })}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Card>

        {editor && current ? (
          <div className="stack">
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
              <h2>{t("library.files.heading")}</h2>
              <form action={uploadItemFile}>
                <input type="hidden" name="id" value={item.id} />
                <label className="field">
                  {t("library.files.add")}
                  <input className="input" type="file" name="file" multiple required accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.mp4" />
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
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
