import { Button, space } from "@mantle/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { t } from "../i18n.ts";
import { authFor, requestHost } from "../server/auth.ts";
import { can } from "@mantle/platform/identity";
import { featureOn, tenantDb } from "../server/session.ts";
import { unreadCount } from "@mantle/db/tenant";
import { resolveRequestTenant } from "../server/tenant.ts";
import { tenantView } from "../server/tenant_view.ts";
import { signOut } from "./actions.ts";

export default async function Home() {
  const resolution = await resolveRequestTenant();
  const view = tenantView(resolution);
  let signedInAs: string | undefined;
  let isAdministrator = false;
  let isWordingAdmin = false;
  let canManageRoles = false;
  let canViewActivity = false;
  let canViewLibrary = false;
  let unread = 0;
  if (resolution.ok) {
    const { host, protocol } = await requestHost();
    const session = await authFor(resolution.tenant, host, protocol).api.getSession({ headers: await headers() });
    signedInAs = session?.user.name;
    if (session) unread = await unreadCount(tenantDb(resolution.tenant), session.user.id);
    const roles = (session?.user as { roles?: string } | undefined)?.roles;
    isWordingAdmin = can(roles, "wording.edit");
    canManageRoles = can(roles, "roles.manage");
    canViewActivity = can(roles, "activity.view");
    canViewLibrary = can(roles, "library.view") && (await featureOn(resolution.tenant, "knowledge_library"));
    isAdministrator = can(roles, "people.view") && (await featureOn(resolution.tenant, "people_import"));
  }
  return (
    <main style={{ padding: space.md }}>
      <h1>{t("app.title")}</h1>
      <p>{t(view.key, view.params)}</p>
      {resolution.ok && signedInAs && (
        <form action={signOut}>
          <p>{t("auth.signed_in_as", { name: signedInAs })}</p>
          <p>
            <Link href="/notices">{unread > 0 ? t("notices.link", { count: unread }) : t("notices.link_none")}</Link>
          </p>
          {canViewLibrary && (
            <p>
              <Link href="/library">{t("library.manage")}</Link>
            </p>
          )}
          {isAdministrator && (
            <p>
              <Link href="/admin/people">{t("people.manage")}</Link>
            </p>
          )}
          {isWordingAdmin && (
            <p>
              <Link href="/admin/wording">{t("wording.manage")}</Link>
            </p>
          )}
          {canManageRoles && (
            <p>
              <Link href="/admin/roles">{t("roles.manage")}</Link>
            </p>
          )}
          {canViewActivity && (
            <p>
              <Link href="/admin/activity">{t("activity.manage")}</Link>
            </p>
          )}
          <Button type="submit" variant="secondary">{t("auth.sign_out")}</Button>
        </form>
      )}
      {resolution.ok && !signedInAs && <Link href="/sign-in">{t("auth.sign_in")}</Link>}
    </main>
  );
}
