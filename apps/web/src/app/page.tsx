import { Button, space } from "@mantle/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { t } from "../i18n.ts";
import { authFor, requestHost } from "../server/auth.ts";
import { featureOn, hasRole } from "../server/session.ts";
import { resolveRequestTenant } from "../server/tenant.ts";
import { tenantView } from "../server/tenant_view.ts";
import { signOut } from "./actions.ts";

export default async function Home() {
  const resolution = await resolveRequestTenant();
  const view = tenantView(resolution);
  let signedInAs: string | undefined;
  let isAdministrator = false;
  if (resolution.ok) {
    const { host, protocol } = await requestHost();
    const session = await authFor(resolution.tenant, host, protocol).api.getSession({ headers: await headers() });
    signedInAs = session?.user.name;
    isAdministrator =
      hasRole((session?.user as { roles?: string } | undefined)?.roles, "learning_administrator") &&
      (await featureOn(resolution.tenant, "people_import"));
  }
  return (
    <main style={{ padding: space.md }}>
      <h1>{t("app.title")}</h1>
      <p>{t(view.key, view.params)}</p>
      {resolution.ok && signedInAs && (
        <form action={signOut}>
          <p>{t("auth.signed_in_as", { name: signedInAs })}</p>
          {isAdministrator && (
            <p>
              <Link href="/admin/people">{t("people.manage")}</Link>
            </p>
          )}
          <Button type="submit" variant="secondary">{t("auth.sign_out")}</Button>
        </form>
      )}
      {resolution.ok && !signedInAs && <Link href="/sign-in">{t("auth.sign_in")}</Link>}
    </main>
  );
}
