// Customer roles and what each may do (Product Architecture v1, section 7).
// Roles combine: one person can hold several. Checked on the server for
// every request. Scoping to a department or location arrives with the
// organisation structure work.

export const ROLES = [
  "learner",
  "line_manager",
  "content_owner",
  "compliance_reviewer",
  "learning_administrator",
  "group_viewer",
  "external_learner",
] as const;

export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "people.view",
  "people.import",
  "roles.manage",
  "wording.edit",
  "structure.manage",
  "activity.view",
  "library.view",
  "library.edit",
  "library.all_areas",
  "areas.manage",
  "paths.edit",
] as const;

export type Action = (typeof ACTIONS)[number];

// Only what is built so far; later work packages add their actions here.
const GRANTS: Record<Action, readonly Role[]> = {
  "people.view": ["learning_administrator"],
  "people.import": ["learning_administrator"],
  "roles.manage": ["learning_administrator"],
  "wording.edit": ["learning_administrator"],
  "structure.manage": ["learning_administrator"],
  "activity.view": ["learning_administrator"],
  // External learners only see what is assigned to them (later work).
  "library.view": ["learner", "line_manager", "content_owner", "compliance_reviewer", "learning_administrator"],
  "library.edit": ["content_owner", "learning_administrator"],
  // Everyone else sees Common Staff Learning, their own department's area
  // and areas granted to them (checked on every library read).
  "library.all_areas": ["learning_administrator"],
  "areas.manage": ["learning_administrator"],
  "paths.edit": ["content_owner", "learning_administrator"],
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function parseRoles(value: string | null | undefined): Role[] {
  return (value ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(isRole);
}

export function formatRoles(roles: Iterable<Role>): string {
  const set = new Set(roles);
  return ROLES.filter((r) => set.has(r)).join(",");
}

export function can(roles: string | null | undefined, action: Action): boolean {
  const held = parseRoles(roles);
  return GRANTS[action].some((role) => held.includes(role));
}
