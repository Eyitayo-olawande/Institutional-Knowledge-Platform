import { FEATURES, featureStates, listTenants, type Feature } from "@mantle/db/control";
import { Button, color, space } from "@mantle/ui";
import { t } from "../i18n.ts";
import { consoleOpen, control } from "../server/control.ts";
import { addTenantAdministrator, createTenant, toggleFeature } from "./actions.ts";

const ERRORS = new Set([
  "name_required",
  "domain_invalid",
  "tier_invalid",
  "location_required",
  "domain_taken",
  "database_taken",
  "admin_name_required",
  "admin_email_invalid",
  "tenant_unknown",
]);

const field = { display: "grid", gap: space.xs, marginBottom: space.md } as const;
const input = { minHeight: 44, padding: space.sm, fontSize: 16 } as const;

export default async function Home({ searchParams }: { searchParams: Promise<{ created?: string; admin_added?: string; error?: string }> }) {
  if (!consoleOpen()) {
    return (
      <main style={{ padding: space.md }}>
        <h1>{t("app.title")}</h1>
        <p>{t("console.locked")}</p>
      </main>
    );
  }
  const { created, admin_added: adminAdded, error } = await searchParams;
  const tenants = await listTenants(control());
  const features = Object.keys(FEATURES) as Feature[];
  const states = await Promise.all(tenants.map((tenant) => featureStates(control(), tenant.id)));

  return (
    <main style={{ padding: space.md, maxWidth: 720 }}>
      <h1>{t("app.title")}</h1>

      {created && <p role="status" style={{ color: color.success }}>{t("tenants.created", { domain: created })}</p>}
      {adminAdded && <p role="status" style={{ color: color.success }}>{t("tenants.admin_added", { domain: adminAdded })}</p>}
      {error && ERRORS.has(error) && <p role="alert" style={{ color: color.danger }}>{t(`tenants.errors.${error}`)}</p>}

      <h2>{t("tenants.heading")}</h2>
      {tenants.length === 0 ? (
        <p>{t("tenants.empty")}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">{t("tenants.columns.name")}</th>
              <th align="left">{t("tenants.columns.domain")}</th>
              <th align="left">{t("tenants.columns.tier")}</th>
              <th align="left">{t("tenants.columns.status")}</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>{tenant.name}</td>
                <td>{tenant.domain}</td>
                <td>{t(`tenants.tiers.${tenant.tier}`)}</td>
                <td>{t(`tenants.statuses.${tenant.status}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{t("tenants.create.heading")}</h2>
      <form action={createTenant}>
        <label style={field}>
          {t("tenants.create.name")}
          <input name="name" required style={input} />
        </label>
        <label style={field}>
          {t("tenants.create.domain")}
          <input name="domain" required placeholder="gamma.localhost" style={input} />
        </label>
        <label style={field}>
          {t("tenants.create.tier")}
          <select name="tier" defaultValue="shared" style={input}>
            <option value="shared">{t("tenants.tiers.shared")}</option>
            <option value="dedicated">{t("tenants.tiers.dedicated")}</option>
          </select>
        </label>
        <label style={field}>
          {t("tenants.create.hosting_location")}
          <input name="hostingLocation" required defaultValue="local" style={input} />
        </label>
        <label style={field}>
          {t("tenants.admin.name")}
          <input name="adminName" required style={input} />
        </label>
        <label style={field}>
          {t("tenants.admin.email")}
          <input name="adminEmail" type="email" required style={input} />
        </label>
        <Button type="submit">{t("tenants.create.submit")}</Button>
      </form>

      {tenants.length > 0 && (
        <>
          <h2>{t("tenants.admin.heading")}</h2>
          <p>{t("tenants.admin.explain")}</p>
          <form action={addTenantAdministrator}>
            <label style={field}>
              {t("tenants.admin.organisation")}
              <select name="tenantId" style={input}>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={field}>
              {t("tenants.admin.name")}
              <input name="adminName" required style={input} />
            </label>
            <label style={field}>
              {t("tenants.admin.email")}
              <input name="adminEmail" type="email" required style={input} />
            </label>
            <Button type="submit" variant="secondary">{t("tenants.admin.submit")}</Button>
          </form>
        </>
      )}
      {tenants.length > 0 && (
        <section id="features">
          <h2>{t("features.heading")}</h2>
          <p>{t("features.explain")}</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">{t("tenants.columns.name")}</th>
                {features.map((feature) => (
                  <th key={feature} align="left">{t(`features.names.${feature}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, i) => (
                <tr key={tenant.id}>
                  <td>{tenant.name}</td>
                  {features.map((feature) => {
                    const on = states[i]?.[feature] ?? false;
                    return (
                      <td key={feature}>
                        <form action={toggleFeature}>
                          <input type="hidden" name="tenantId" value={tenant.id} />
                          <input type="hidden" name="feature" value={feature} />
                          <input type="hidden" name="enabled" value={on ? "false" : "true"} />
                          <Button type="submit" variant={on ? "primary" : "secondary"}>
                            {t(on ? "features.on" : "features.off")}
                          </Button>
                        </form>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
