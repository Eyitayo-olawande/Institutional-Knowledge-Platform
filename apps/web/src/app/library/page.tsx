import { itemsDueForReview, searchLibrary } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { Badge, type BadgeTone, Button, buttonStyle, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { requireFeature, requirePermission } from "../../server/session.ts";
import { AppShell, PageHead } from "../_components/AppShell.tsx";
import { Icon } from "../_components/Icon.tsx";

const STATUS_TONE: Record<string, BadgeTone> = { draft: "neutral", published: "success", retired: "neutral" };

export default async function Library({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requirePermission("library.view");
  const { tenant, db, roles } = ctx;
  await requireFeature(tenant, "knowledge_library");
  const editor = can(roles, "library.edit");
  const q = ((await searchParams).q ?? "").slice(0, 200);
  const items = await searchLibrary(db, q, { publishedOnly: !editor });
  const due = editor ? await itemsDueForReview(db, new Date().toISOString().slice(0, 10)) : [];

  return (
    <AppShell ctx={ctx} active="library">
      <PageHead
        title={t("library.title")}
        sub={t("library.heading", { name: tenant.name })}
        action={editor ? <Link href="/library/new" style={buttonStyle()}><Icon name="plus" size={18} />{t("library.new")}</Link> : undefined}
      />
      <form method="get" role="search" className="row" style={{ marginBottom: 20 }}>
        <label style={{ flex: 1, minWidth: 220 }}>
          <span className="skip">{t("library.search_label")}</span>
          <input className="input" name="q" type="search" defaultValue={q} placeholder={t("library.search_placeholder")} />
        </label>
        <Button type="submit" variant="secondary">{t("library.search")}</Button>
      </form>

      {due.length > 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <h2>{t("library.due_heading")}</h2>
          <ul className="list">
            {due.map((item) => (
              <li key={item.id}>
                <span className="icon"><Icon name="doc" /></span>
                <div className="grow">
                  <Link className="title" href={`/library/${item.id}`}>{item.title}</Link>
                </div>
                <Badge tone={item.overdue ? "danger" : "warning"}>
                  {t(item.overdue ? "library.overdue" : "library.due", { date: item.reviewDate ?? "" })}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        {items.length === 0 ? (
          <p className="sub">{t(q ? "library.no_results" : "library.empty")}</p>
        ) : (
          <ul className="list">
            {items.map((item) => (
              <li key={item.id}>
                <span className="icon"><Icon name="doc" /></span>
                <div className="grow">
                  <Link className="title" href={`/library/${item.id}`}>{item.title}</Link>
                </div>
                {editor ? <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{t(`library.statuses.${item.status}`)}</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
