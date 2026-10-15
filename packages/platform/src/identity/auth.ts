import { connectTenant, tenantSchema, type TenantDb } from "@mantle/db/tenant";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import type { Mailer } from "./outbox.ts";

// Sign in for one tenant (ADR 0009, ADR 0019). Each tenant gets its own
// sign in instance over its own database, so people, sessions and codes
// never leave that tenant's database.

export interface TenantAuthOptions {
  readonly tenantId: string;
  readonly databaseName: string;
  readonly serverUrl: string;
  // Public address of the tenant, for example http://alpha.localhost:3000.
  readonly baseUrl: string;
  readonly secret: string;
  readonly mailer: Mailer;
}

export function createTenantAuth(db: TenantDb, options: TenantAuthOptions) {
  return betterAuth({
    appName: "Mantle",
    baseURL: options.baseUrl,
    basePath: "/api/auth",
    secret: options.secret,
    trustedOrigins: [options.baseUrl],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: tenantSchema.users,
        session: tenantSchema.sessions,
        account: tenantSchema.accounts,
        verification: tenantSchema.verifications,
      },
    }),
    // Roles until full roles and scopes arrive (E3); never set by the person.
    user: { additionalFields: { roles: { type: "string", input: false, defaultValue: "learner" } } },
    // People are added by the staff import (E4), never by signing up.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10 },
    rateLimit: { enabled: true, window: 60, max: 20 },
    plugins: [
      emailOTP({
        disableSignUp: true,
        otpLength: 6,
        expiresIn: 600,
        async sendVerificationOTP({ email, otp }) {
          // Message text for email arrives with the notification templates (E6).
          await options.mailer.send({ to: email, subject: "Mantle sign in code", text: `Your sign in code is ${otp}` });
        },
      }),
      nextCookies(),
    ],
  });
}

export type TenantAuth = ReturnType<typeof createTenantAuth>;

// One sign in instance per tenant, kept for the life of the server process.
const instances = new Map<string, { auth: TenantAuth; close: () => Promise<void> }>();

export function tenantAuth(options: TenantAuthOptions): TenantAuth {
  const key = `${options.tenantId}|${options.baseUrl}`;
  let entry = instances.get(key);
  if (!entry) {
    const { db, close } = connectTenant(options.serverUrl, options.databaseName);
    entry = { auth: createTenantAuth(db, options), close };
    instances.set(key, entry);
  }
  return entry.auth;
}

export function authSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.MANTLE_AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (env.NODE_ENV === "production") throw new Error("MANTLE_AUTH_SECRET must be set to at least 32 characters.");
  return "development-only-secret-do-not-use-in-production";
}
