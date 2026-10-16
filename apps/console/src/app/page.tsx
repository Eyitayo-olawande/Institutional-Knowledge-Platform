import { FEATURES, featureStates, listTenants, type Feature } from "@mantle/db/control";
import { Badge, type BadgeTone, Button, Card } from "@mantle/ui";
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

const STATUS_TONE: Record<string, BadgeTone> = {
  onboarding: "info",
  active: "success",
  read_only: "warning",
  suspended: "danger",
  offboarded: "neutral",
};

const page = { padding: 24, maxWidth: 1180 } as const;

export default async function Home({ searchParams }: { searchParams: Promise<{ created?: string; admin_added?: string; error?: string }> }) {
  if (!consoleOpen()) {
    return (
      <main style={page}>
        <Card style={{ maxWidth: 520 }}>
          <p className="sub">{t("console.locked")}</p>
        </Card>
      </main>
    );
  }
  const { created, admin_added: adminAdded, error } = await searchParams;
  const tenants = await listTenants(control());
  const features = Object.keys(FEATURES) as Feature[];
  const states = await Promise.all(tenants.map((tenant) => featureStates(control(), tenant.id)));

  return (
    <main style={page}>
      {created ? <div className="alert alert-success" role="status"><p>{t("tenants.created", { domain: created })}</p></div> : null}
      {adminAdded ? <div className="alert alert-success" role="status"><p>{t("tenants.admin_added", { domain: adminAdded })}</p></div> : null}
      {error && ERRORS.has(error) ? <div className="alert alert-danger" role="alert"><p>{t(`tenants.errors.${error}`)}</p></div> : null}

      <div className="page-head">
        <div>
          <h1>{t("tenants.heading")}</h1>
          <p className="sub">{t("tenants.sub", { count: tenants.length })}</p>
        </div>
      </div>

      <div className="stack">
        <Card>
          {tenants.length === 0 ? (
            <p className="sub">{t("tenants.empty")}</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("tenants.columns.name")}</th>
                    <th>{t("tenants.columns.domain")}</th>
                    <th>{t("tenants.columns.tier")}</th>
                    <th>{t("tenants.columns.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td><strong>{tenant.name}</strong></td>
                      <td>{tenant.domain}</td>
                      <td>{t(`tenants.tiers.${tenant.tier}`)}</td>
                      <td><Badge tone={STATUS_TONE[tenant.status] ?? "neutral"}>{t(`tenants.statuses.${tenant.status}`)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {tenants.length > 0 ? (
          <Card>
            <section id="features">
              <h2>{t("features.heading")}</h2>
              <p className="muted" style={{ marginTop: 0 }}>{t("features.explain")}</p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("tenants.columns.name")}</th>
                      {features.map((feature) => (
                        <th key={feature}>{t(`features.names.${feature}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant, i) => (
                      <tr key={tenant.id}>
                        <td><strong>{tenant.name}</strong></td>
                        {features.map((feature) => {
                          const on = states[i]?.[feature] ?? false;
                          return (
                            <td key={feature}>
                              <form action={toggleFeature} className="row" style={{ gap: 8 }}>
                                <input type="hidden" name="tenantId" value={tenant.id} />
                                <input type="hidden" name="feature" value={feature} />
                                <input type="hidden" name="enabled" value={on ? "false" : "true"} />
                                <Badge tone={on ? "success" : "neutral"}>{t(on ? "features.on" : "features.off")}</Badge>
                                <Button type="submit" variant="secondary" size="sm">{t(on ? "features.turn_off" : "features.turn_on")}</Button>
                              </form>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </Card>
        ) : null}

        <div className={tenants.length > 0 ? "grid grid-2" : "stack"} style={{ alignItems: "start" }}>
          <Card>
            <h2>{t("tenants.create.heading")}</h2>
            <form action={createTenant}>
              <label className="field">
                {t("tenants.create.name")}
                <input className="input" name="name" required />
              </label>
              <label className="field">
                {t("tenants.create.domain")}
                <input className="input" name="domain" required placeholder="gamma.localhost" />
              </label>
              <label className="field">
                {t("tenants.create.tier")}
                <select className="input" name="tier" defaultValue="shared">
                  <option value="shared">{t("tenants.tiers.shared")}</option>
                  <option value="dedicated">{t("tenants.tiers.dedicated")}</option>
                </select>
              </label>
              <label className="field">
                {t("tenants.create.hosting_location")}
                <input className="input" name="hostingLocation" required defaultValue="local" />
              </label>
              <label className="field">
                {t("tenants.admin.name")}
                <input className="input" name="adminName" required />
              </label>
              <label className="field">
                {t("tenants.admin.email")}
                <input className="input" name="adminEmail" type="email" required />
              </label>
              <Button type="submit">{t("tenants.create.submit")}</Button>
            </form>
          </Card>

          {tenants.length > 0 ? (
            <Card>
              <h2>{t("tenants.admin.heading")}</h2>
              <p className="muted" style={{ marginTop: 0 }}>{t("tenants.admin.explain")}</p>
              <form action={addTenantAdministrator}>
                <label className="field">
                  {t("tenants.admin.organisation")}
                  <select className="input" name="tenantId">
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  {t("tenants.admin.name")}
                  <input className="input" name="adminName" required />
                </label>
                <label className="field">
                  {t("tenants.admin.email")}
                  <input className="input" name="adminEmail" type="email" required />
                </label>
                <Button type="submit" variant="secondary">{t("tenants.admin.submit")}</Button>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
