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

export function controlDb() {
  if (!globalForControl.mantleControl) {
    const config = loadConfig();
    globalForControl.mantleControl = connectControl(databaseUrl(config.serverUrl, config.controlDatabase));
  }
  return globalForControl.mantleControl.db;
}

// The address the person actually opened. Next.js keeps it in
// x-forwarded-host when it renders a page straight after a form action, where
// host is rewritten to the server's own address. Both headers come from the
// client or our own proxy, so they only choose which tenant's public pages
// to show; who someone is always comes from that tenant's own sessions.
export function requestHostFrom(h: Headers): string | null {
  return h.get("x-forwarded-host") ?? h.get("host");
}

// Maps this request to exactly one tenant from its domain before any
// tenant data is read (Product Architecture v1, section 4).
export async function resolveRequestTenant(): Promise<Resolution> {
  return resolveTenant(requestHostFrom(await headers()), controlTenantDirectory(controlDb()));
}
