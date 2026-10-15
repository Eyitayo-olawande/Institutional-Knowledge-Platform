import "server-only";
import { databaseUrl, loadConfig } from "@mantle/db";
import { connectControl, controlTenantDirectory } from "@mantle/db/control";
import { resolveTenant, type Resolution } from "@mantle/platform/tenancy";
import { headers } from "next/headers";

// One control database pool per server process, kept across hot reloads
// in development.
const globalForControl = globalThis as unknown as {
  mantleControl?: ReturnType<typeof connectControl>;
};

function control() {
  if (!globalForControl.mantleControl) {
    const config = loadConfig();
    globalForControl.mantleControl = connectControl(databaseUrl(config.serverUrl, config.controlDatabase));
  }
  return globalForControl.mantleControl;
}

// Maps this request to exactly one tenant from its domain before any
// tenant data is read (Product Architecture v1, section 4).
export async function resolveRequestTenant(): Promise<Resolution> {
  const host = (await headers()).get("host");
  return resolveTenant(host, controlTenantDirectory(control().db));
}
