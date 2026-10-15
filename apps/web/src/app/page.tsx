import { t } from "../i18n.ts";
import { resolveRequestTenant } from "../server/tenant.ts";
import { tenantView } from "../server/tenant_view.ts";

export default async function Home() {
  const view = tenantView(await resolveRequestTenant());
  return (
    <main style={{ padding: 16 }}>
      <h1>{t("app.title")}</h1>
      <p>{t(view.key, view.params)}</p>
    </main>
  );
}
