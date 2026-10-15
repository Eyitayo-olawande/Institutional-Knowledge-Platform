import { itemsDueForReview, searchLibrary } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { Button, color, space } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { requireFeature, requirePermission } from "../../server/session.ts";

export default async function Library({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { tenant, db, roles } = await requirePermission("library.view");
  await requireFeature(tenant, "knowledge_library");
  const editor = can(roles, "library.edit");
  const q = ((await searchParams).q ?? "").slice(0, 200);
  const items = await searchLibrary(db, q, { publishedOnly: !editor });
  const due = editor ? await itemsDueForReview(db, new Date().toISOString().slice(0, 10)) : [];

  return (
    <main style={{ padding: space.md, maxWidth: 900 }}>
      <p>
        <Link href="/">{t("people.back")}</Link>
      </p>
      <h1>{t("library.heading", { name: tenant.name })}</h1>
      {editor && (
        <p>
          <Link href="/library/new">{t("library.new")}</Link>
        </p>
      )}
      <form method="get" role="search" style={{ display: "flex", gap: space.sm, marginBottom: space.md }}>
        <label style={{ flex: 1 }}>
          <span style={{ position: "absolute", left: -9999 }}>{t("library.search_label")}</span>
          <input name="q" type="search" defaultValue={q} placeholder={t("library.search_placeholder")} style={{ width: "100%", minHeight: 44, padding: space.sm, fontSize: 16 }} />
        </label>
        <Button type="submit" variant="secondary">{t("library.search")}</Button>
      </form>
      {due.length > 0 && (
        <section style={{ marginBottom: space.lg }}>
          <h2>{t("library.due_heading")}</h2>
          <ul>
            {due.map((item) => (
              <li key={item.id}>
                <Link href={`/library/${item.id}`}>{item.title}</Link>{" "}
                <span style={{ color: item.overdue ? color.danger : color.textMuted }}>
                  {t(item.overdue ? "library.overdue" : "library.due", { date: item.reviewDate ?? "" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {items.length === 0 ? (
        <p>{t(q ? "library.no_results" : "library.empty")}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/library/${item.id}`}>{item.title}</Link>
              {editor && <> {t(`library.statuses.${item.status}`)}</>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
