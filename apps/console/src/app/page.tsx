import { listTenants } from "@mantle/db/control";
import { Button, color, space } from "@mantle/ui";
import { t } from "../i18n.ts";
import { consoleOpen, control } from "../server/control.ts";
import { createTenant } from "./actions.ts";

const ERRORS = new Set(["name_required", "domain_invalid", "tier_invalid", "location_required", "domain_taken", "database_taken"]);

const field = { display: "grid", gap: space.xs, marginBottom: space.md } as const;
const input = { minHeight: 44, padding: space.sm, fontSize: 16 } as const;

export default async function Home({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  if (!consoleOpen()) {
    return (
      <main style={{ padding: space.md }}>
        <h1>{t("app.title")}</h1>
        <p>{t("console.locked")}</p>
      </main>
    );
  }
  const { created, error } = await searchParams;
  const tenants = await listTenants(control());

  return (
    <main style={{ padding: space.md, maxWidth: 720 }}>
      <h1>{t("app.title")}</h1>

      {created && <p role="status" style={{ color: color.success }}>{t("tenants.created", { domain: created })}</p>}
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
        <Button type="submit">{t("tenants.create.submit")}</Button>
      </form>
    </main>
  );
}
