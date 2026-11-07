import { noticesFor } from "@mantle/db/tenant";
import { Badge, Button, Card } from "@mantle/ui";
import { t } from "../../i18n.ts";
import { requireSignedIn } from "../../server/session.ts";
import { AppShell } from "../_components/AppShell.tsx";
import { Icon } from "../_components/Icon.tsx";
import { markNoticesRead } from "./actions.ts";

export default async function Notices() {
  const ctx = await requireSignedIn();
  const notices = await noticesFor(ctx.db, ctx.user.id);
  const unread = notices.some((n) => !n.readAt);

  return (
    <AppShell ctx={ctx} active="notices">
      <Card style={{ maxWidth: 820 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t("notices.heading")}</h2>
          {unread ? (
            <form action={markNoticesRead}>
              <Button type="submit" variant="secondary">{t("notices.mark_read")}</Button>
            </form>
          ) : null}
        </div>
        {notices.length === 0 ? (
          <p className="sub">{t("notices.empty")}</p>
        ) : (
          <ul className="notices-list">
            {notices.map((n) => (
              <li key={n.id} className="notices-item">
                <span className="notices-icon" aria-hidden="true"><Icon name="bell" size={18} /></span>
                <div className="grow">
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <strong style={{ flex: 1 }}>{n.subject}</strong>
                    {!n.readAt ? <Badge tone="brand">{t("notices.new")}</Badge> : null}
                    <span className="notices-date">{n.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--mantle-color-text_muted)", fontSize: 14 }}>{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
