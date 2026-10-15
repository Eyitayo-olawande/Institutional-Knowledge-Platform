import "server-only";
import { loadConfig } from "@mantle/db";
import { authSecret, developmentOutbox, tenantAuth, type TenantAuth } from "@mantle/platform/identity";
import type { TenantRecord } from "@mantle/platform/tenancy";
import { headers } from "next/headers";
import { requestHostFrom } from "./tenant.ts";

const mailer = developmentOutbox();

// The sign in instance for the tenant this request was resolved to.
export function authFor(tenant: TenantRecord, host: string, protocol = "http"): TenantAuth {
  return tenantAuth({
    tenantId: tenant.id,
    databaseName: tenant.databaseName,
    serverUrl: loadConfig().serverUrl,
    baseUrl: `${protocol}://${host}`,
    secret: authSecret(),
    mailer,
  });
}

export async function requestHost(): Promise<{ host: string; protocol: string }> {
  const h = await headers();
  return { host: requestHostFrom(h) ?? "", protocol: h.get("x-forwarded-proto") ?? "http" };
}
