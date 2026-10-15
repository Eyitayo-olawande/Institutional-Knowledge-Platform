import { controlTenantDirectory } from "@mantle/db/control";
import { resolveTenant } from "@mantle/platform/tenancy";
import { authFor } from "../../../../server/auth.ts";
import { controlDb, requestHostFrom } from "../../../../server/tenant.ts";

// Sign in endpoints, served per tenant: the tenant is resolved from the
// request address before the sign in instance is chosen.
async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const host = requestHostFrom(request.headers) ?? url.host;
  const resolution = await resolveTenant(host, controlTenantDirectory(controlDb()));
  if (!resolution.ok) return new Response(null, { status: 404 });
  return authFor(resolution.tenant, host, url.protocol.replace(":", "")).handler(request);
}

export const GET = handle;
export const POST = handle;
