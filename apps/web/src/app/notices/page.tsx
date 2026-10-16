import { noticesFor } from "@mantle/db/tenant";
import { Badge, Button, Card } from "@mantle/ui";
import { t } from "../../i18n.ts";
import { requireSignedIn } from "../../server/session.ts";
import { AppShell, PageHead } from "../_components/AppShell.tsx";
import { Icon } from "../_components/Icon.tsx";
import { markNoticesRead } from "./actions.ts";

export default async function Notices() {
  const ctx = await requireSignedIn();
  const notices = await noticesFor(ctx.db, ctx.user.id);
  const unread = notices.some((n) => !n.readAt);

  return (
    <AppShell ctx={ctx} active="notices">
      <PageHead
        title={t("notices.heading")}
        action={unread ? (
          <form action={markNoticesRead}>
            <Button type="submit" variant="secondary">{t("notices.mark_read")}</Button>
          </form>
        ) : undefined}
      />
      <Card style={{ maxWidth: 820 }}>
        {notices.length === 0 ? (
          <p className="sub">{t("notices.empty")}</p>
        ) : (
          <ul className="list">
            {notices.map((n) => (
              <li key={n.id} style={{ alignItems: "flex-start" }}>
                <span className="icon"><Icon name="bell" /></span>
                <div className="grow">
                  <div className="row" style={{ gap: 8 }}>
                    <strong>{n.subject}</strong>
                    {!n.readAt ? <Badge tone="brand">{t("notices.new")}</Badge> : null}
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--mantle-color-neutral)" }}>{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
