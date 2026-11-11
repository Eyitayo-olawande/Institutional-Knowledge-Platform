import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission, viewerAreas } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";
import { createItem } from "../actions.ts";
import { areaChoices } from "../areas.ts";
import { PlacementFields } from "../PlacementFields.tsx";

export default async function NewItem({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ctx = await requirePermission("library.edit");
  await requireFeature(ctx.tenant, "knowledge_library");
  const { error } = await searchParams;
  const { areas, types } = await areaChoices(ctx.db, await viewerAreas(ctx));
  return (
    <AppShell ctx={ctx} active="library">
      <p className="crumb"><Link href="/library">{t("library.back")}</Link></p>
      <PageHead title={t("library.new")} sub={t("library.new_sub")} />
      {error ? <div className="alert alert-danger" role="alert"><p>{t(`library.errors.${error === "placement" ? "placement" : "missing"}`)}</p></div> : null}
      <Card style={{ maxWidth: 760 }}>
        <form action={createItem}>
          <label className="field">
            {t("library.fields.title")}
            <input className="input" name="title" required />
          </label>
          <label className="field">
            {t("library.fields.body")}
            <textarea className="input" name="body" required rows={12} />
          </label>
          <label className="field">
            {t("library.fields.video_url")}
            <input className="input" name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." />
          </label>
          <PlacementFields areas={areas} types={types} />
          <label className="field">
            {t("library.fields.review_date")}
            <input className="input" name="reviewDate" type="date" />
          </label>
          <Button type="submit">{t("library.create")}</Button>
        </form>
      </Card>
    </AppShell>
  );
}
