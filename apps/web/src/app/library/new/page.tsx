import { Button, color, space } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { createItem } from "../actions.ts";
import { field, input } from "../form_styles.ts";


export default async function NewItem({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { tenant } = await requirePermission("library.edit");
  await requireFeature(tenant, "knowledge_library");
  const { error } = await searchParams;
  return (
    <main style={{ padding: space.md, maxWidth: 720 }}>
      <p>
        <Link href="/library">{t("library.back")}</Link>
      </p>
      <h1>{t("library.new")}</h1>
      {error && <p role="alert" style={{ color: color.danger }}>{t("library.errors.missing")}</p>}
      <form action={createItem}>
        <label style={field}>
          {t("library.fields.title")}
          <input name="title" required style={input} />
        </label>
        <label style={field}>
          {t("library.fields.body")}
          <textarea name="body" required rows={12} style={{ ...input, minHeight: 200 }} />
        </label>
        <label style={field}>
          {t("library.fields.review_date")}
          <input name="reviewDate" type="date" style={input} />
        </label>
        <Button type="submit">{t("library.create")}</Button>
      </form>
    </main>
  );
}
