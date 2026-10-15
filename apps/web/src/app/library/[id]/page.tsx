import { getLibraryItem } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { Button, color, space } from "@mantle/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { publishItem, saveItemDraft } from "../actions.ts";
import { field, input } from "../form_styles.ts";

export default async function Item({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; published?: string; error?: string }>;
}) {
  const { tenant, db, roles } = await requirePermission("library.view");
  await requireFeature(tenant, "knowledge_library");
  const { id } = await params;
  const { saved, published, error } = await searchParams;
  const found = /^[0-9a-f-]{36}$/.test(id) ? await getLibraryItem(db, id) : null;
  const editor = can(roles, "library.edit");
  if (!found || (!editor && !found.published)) notFound();
  const { item, draft, versions } = found;
  const current = draft ?? found.published;

  return (
    <main style={{ padding: space.md, maxWidth: 800 }}>
      <p>
        <Link href="/library">{t("library.back")}</Link>
      </p>
      <h1>{item.title}</h1>
      {saved && <p role="status" style={{ color: color.success }}>{t("library.saved")}</p>}
      {published && <p role="status" style={{ color: color.success }}>{t("library.published_now")}</p>}
      {error && <p role="alert" style={{ color: color.danger }}>{t(`library.errors.${error === "no_draft" ? "no_draft" : "missing"}`)}</p>}

      {found.published ? (
        <section>
          <p>{t("library.published_version", { version: found.published.version })}</p>
          <div style={{ whiteSpace: "pre-wrap" }}>{found.published.body}</div>
        </section>
      ) : (
        <p>{t("library.not_published")}</p>
      )}
      {item.reviewDate && <p>{t("library.review_by", { date: item.reviewDate })}</p>}

      {editor && current && (
        <section style={{ marginTop: space.lg }}>
          <h2>{draft ? t("library.draft_heading", { version: draft.version }) : t("library.edit_heading")}</h2>
          <form action={saveItemDraft}>
            <input type="hidden" name="id" value={item.id} />
            <label style={field}>
              {t("library.fields.title")}
              <input name="title" defaultValue={item.title} required style={input} />
            </label>
            <label style={field}>
              {t("library.fields.body")}
              <textarea name="body" defaultValue={current.body} required rows={12} style={{ ...input, minHeight: 200 }} />
            </label>
            <label style={field}>
              {t("library.fields.change_note")}
              <input name="changeNote" defaultValue={draft?.changeNote ?? ""} style={input} />
            </label>
            <label style={field}>
              {t("library.fields.review_date")}
              <input name="reviewDate" type="date" defaultValue={item.reviewDate ?? ""} style={input} />
            </label>
            <Button type="submit" variant="secondary">{t("library.save_draft")}</Button>
          </form>
          {draft && (
            <form action={publishItem} style={{ marginTop: space.md }}>
              <input type="hidden" name="id" value={item.id} />
              <Button type="submit">{t("library.publish", { version: draft.version })}</Button>
            </form>
          )}
          <h2>{t("library.history")}</h2>
          <ul>
            {versions.map((v) => (
              <li key={v.id}>
                {t(v.publishedAt ? "library.history_published" : "library.history_draft", { version: v.version, note: v.changeNote ?? "" })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
