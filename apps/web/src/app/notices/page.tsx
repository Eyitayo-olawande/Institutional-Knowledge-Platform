import { noticesFor } from "@mantle/db/tenant";
import { Button, color, space } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { requireSignedIn } from "../../server/session.ts";
import { markNoticesRead } from "./actions.ts";

export default async function Notices() {
  const { db, user } = await requireSignedIn();
  const notices = await noticesFor(db, user.id);
  const unread = notices.some((n) => !n.readAt);

  return (
    <main style={{ padding: space.md, maxWidth: 720 }}>
      <p>
        <Link href="/">{t("people.back")}</Link>
      </p>
      <h1>{t("notices.heading")}</h1>
      {notices.length === 0 && <p>{t("notices.empty")}</p>}
      {unread && (
        <form action={markNoticesRead}>
          <Button type="submit" variant="secondary">{t("notices.mark_read")}</Button>
        </form>
      )}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {notices.map((n) => (
          <li key={n.id} style={{ borderTop: `1px solid ${color.border}`, padding: `${space.sm} 0` }}>
            <strong>{n.subject}</strong> {!n.readAt && <span style={{ color: color.primary }}>{t("notices.new")}</span>}
            <p>{n.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
