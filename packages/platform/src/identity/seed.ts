import { setUserRoles, tenantSchema, type TenantDb } from "@mantle/db/tenant";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

// Adds a fictional person who can sign in, for development and tests only.
// Real people arrive through the staff import (E4).
export async function seedTestPerson(
  db: TenantDb,
  person: { name: string; email: string; password: string; roles?: string },
): Promise<string> {
  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, person.email) });
  if (existing) {
    if (person.roles && existing.roles !== person.roles) {
      await setUserRoles(db, existing.id, person.roles);
    }
    return existing.id;
  }
  const id = randomUUID();
  await db.insert(tenantSchema.users).values({ id, name: person.name, email: person.email, emailVerified: true, roles: person.roles ?? "learner" });
  await db.insert(tenantSchema.accounts).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(person.password),
  });
  return id;
}
