import { Button, buttonStyle, Card } from "@mantle/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { t } from "../i18n.ts";
import { authFor, requestHost } from "../server/auth.ts";
import { buildNav } from "../server/nav.ts";
import { featureOn, tenantDb } from "../server/session.ts";
import { unreadCount } from "@mantle/db/tenant";
import { resolveRequestTenant } from "../server/tenant.ts";
import { tenantView } from "../server/tenant_view.ts";
import { signOut } from "./actions.ts";
import { AppShell, PageHead } from "./_components/AppShell.tsx";
import { Icon } from "./_components/Icon.tsx";

export default async function Home() {
  const resolution = await resolveRequestTenant();
  const view = tenantView(resolution);
  if (!resolution.ok) {
    return (
      <div className="centered">
        <Card className="panel">
          <h1>{t("app.title")}</h1>
          <p className="sub">{t(view.key, view.params)}</p>
        </Card>
      </div>
    );
  }

  const { host, protocol } = await requestHost();
  const session = await authFor(resolution.tenant, host, protocol).api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <div className="centered">
        <Card className="panel">
          <h1>{resolution.tenant.name}</h1>
          <p className="sub" style={{ marginBottom: 20 }}>{t(view.key, view.params)}</p>
          <Link href="/sign-in" style={{ ...buttonStyle(), width: "100%" }}>{t("auth.sign_in")}</Link>
        </Card>
      </div>
    );
  }

  const db = tenantDb(resolution.tenant);
  const roles = (session.user as { roles?: string }).roles ?? "";
  const [unread, libraryOn, peopleImportOn] = await Promise.all([
    unreadCount(db, session.user.id),
    featureOn(resolution.tenant, "knowledge_library"),
    featureOn(resolution.tenant, "people_import"),
  ]);
  const destinations = buildNav({ roles, libraryOn, peopleImportOn }).filter((i) => i.key !== "home");
  const firstName = session.user.name.split(" ")[0] ?? session.user.name;

  return (
    <AppShell ctx={{ tenant: resolution.tenant, db, roles, user: session.user }} active="home">
      <PageHead title={t("home.greeting", { name: firstName })} sub={t("home.sub", { name: resolution.tenant.name })} />
      {unread > 0 ? (
        <div className="alert alert-brand" role="status">
          <Icon name="bell" />
          <p style={{ flex: 1 }}>{t("home.unread", { count: unread })}</p>
          <Link href="/notices" style={buttonStyle("primary", "sm")}>{t("home.read_notices")}</Link>
        </div>
      ) : null}
      <div className="grid grid-3">
        {destinations.map((d) => (
          <Card key={d.key}>
            <Link className="dest" href={d.href}>
              <span className="icon"><Icon name={d.icon} size={22} /></span>
              <div>
                <h3>{t(`nav.${d.key}`)}</h3>
                <span className="muted">{t(`home.cards.${d.key}`)}</span>
              </div>
            </Link>
          </Card>
        ))}
      </div>
      <Card flat style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <p className="muted" style={{ margin: 0 }}>{t("auth.signed_in_as", { name: session.user.name })}</p>
          <form action={signOut}>
            <Button type="submit" variant="secondary" size="sm">{t("auth.sign_out")}</Button>
          </form>
        </div>
      </Card>
    </AppShell>
  );
}
