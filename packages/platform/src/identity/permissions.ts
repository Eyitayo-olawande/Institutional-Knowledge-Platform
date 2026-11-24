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
  "nominations.manage",
  "candidates.manage",
  "reports.view",
  "team.view",
] as const;

export type Action = (typeof ACTIONS)[number];

// Grants map type for DB-driven or static permission checks.
// Keys are role names (slugs); values are the actions each role may perform.
export type Grants = Record<string, readonly string[]>;

// Static fallback: exact match of the original hardcoded permissions.
// Used when no DB grants map is provided (e.g. in contexts without DB access).
const STATIC_GRANTS: Record<Action, readonly Role[]> = {
  "people.view": ["learning_administrator"],
  "people.import": ["learning_administrator"],
  "roles.manage": ["learning_administrator"],
  "wording.edit": ["learning_administrator"],
  "structure.manage": ["learning_administrator"],
  "activity.view": ["learning_administrator"],
  "library.view": ["learner", "line_manager", "content_owner", "compliance_reviewer", "learning_administrator"],
  "library.edit": ["content_owner", "learning_administrator"],
  "library.all_areas": ["learning_administrator"],
  "areas.manage": ["learning_administrator"],
  "paths.edit": ["content_owner", "learning_administrator"],
  "nominations.manage": ["content_owner", "line_manager", "learning_administrator"],
  "candidates.manage": ["learning_administrator"],
  "reports.view": ["learning_administrator"],
  // Team view: line managers see their direct reports' progress.
  "team.view": ["line_manager", "learning_administrator"],
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

// Check whether a person may perform an action.
// When a grants map is provided (loaded from DB via loadGrants), it is used
// for dynamic checks; otherwise falls back to the static STATIC_GRANTS map.
export function can(roles: string | null | undefined, action: Action, grants?: Grants): boolean {
  if (grants) {
    const roleList = (roles ?? "").split(",").map((r) => r.trim()).filter(Boolean);
    return roleList.some((role) => (grants[role] ?? []).includes(action));
  }
  const held = parseRoles(roles);
  return STATIC_GRANTS[action].some((role) => held.includes(role));
}
