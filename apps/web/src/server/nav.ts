import { can, type Grants } from "@mantle/platform/identity";

// The menu each person sees, built from their roles and the tenant's feature
// switches (Blueprint v3.1, section 11: each role sees only its menu).
// The server still checks every permission on each page; this only decides
// which links to show.

export type NavKey = "home" | "library" | "my_learning" | "notices" | "people" | "roles" | "wording" | "structure" | "areas" | "activity" | "paths" | "nominations" | "candidates" | "aptitude_tests" | "reports" | "applicability" | "team";
export type NavIcon = "home" | "library" | "bell" | "people" | "key" | "text" | "tree" | "list" | "doc" | "clipboard" | "check" | "chart";

export interface NavItem {
  key: NavKey;
  href: string;
  icon: NavIcon;
  section: "main" | "admin";
}

export interface NavInput {
  roles: string | undefined;
  grants?: Grants;
  libraryOn: boolean;
  peopleImportOn: boolean;
  pathsOn: boolean;
  aptitudeOn: boolean;
}

export function buildNav({ roles, grants, libraryOn, peopleImportOn, pathsOn, aptitudeOn }: NavInput): NavItem[] {
  const items: NavItem[] = [{ key: "home", href: "/", icon: "home", section: "main" }];
  if (libraryOn && can(roles, "library.view", grants)) items.push({ key: "library", href: "/library", icon: "library", section: "main" });
  if (pathsOn && can(roles, "library.view", grants) && !can(roles, "activity.view", grants)) items.push({ key: "my_learning", href: "/my-learning", icon: "doc", section: "main" });
  items.push({ key: "notices", href: "/notices", icon: "bell", section: "main" });
  if (peopleImportOn && can(roles, "people.view", grants)) items.push({ key: "people", href: "/admin/people", icon: "people", section: "admin" });
  if (can(roles, "roles.manage", grants)) items.push({ key: "roles", href: "/admin/roles", icon: "key", section: "admin" });
  if (can(roles, "wording.edit", grants)) items.push({ key: "wording", href: "/admin/wording", icon: "text", section: "admin" });
  if (can(roles, "structure.manage", grants)) items.push({ key: "structure", href: "/admin/structure", icon: "tree", section: "admin" });
  if (libraryOn && can(roles, "areas.manage", grants)) items.push({ key: "areas", href: "/admin/areas", icon: "library", section: "admin" });
  if (libraryOn && can(roles, "library.edit", grants)) items.push({ key: "applicability", href: "/admin/library/applicability", icon: "list", section: "admin" });
  if (pathsOn && can(roles, "paths.edit", grants)) items.push({ key: "paths", href: "/admin/paths", icon: "tree", section: "admin" });
  if (pathsOn && can(roles, "nominations.manage", grants)) items.push({ key: "nominations", href: "/admin/nominations", icon: "clipboard", section: "admin" });
  if (aptitudeOn && can(roles, "candidates.manage", grants)) items.push({ key: "candidates", href: "/admin/candidates", icon: "people", section: "admin" });
  if (aptitudeOn && can(roles, "candidates.manage", grants)) items.push({ key: "aptitude_tests", href: "/admin/aptitude-tests", icon: "check", section: "admin" });
  if (can(roles, "activity.view", grants)) items.push({ key: "activity", href: "/admin/activity", icon: "list", section: "admin" });
  if (can(roles, "reports.view", grants)) items.push({ key: "reports", href: "/admin/reports", icon: "chart", section: "admin" });
  if (pathsOn && can(roles, "team.view", grants)) items.push({ key: "team", href: "/team", icon: "people", section: "main" });
  return items;
}

// Phones show at most four destinations in the bottom menu; the rest are
// reached from the home page.
export function bottomNav(items: NavItem[]): NavItem[] {
  return items.filter((i) => i.section === "main").slice(0, 4);
}

// Initials for the avatar, from the person's name.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => /^\p{L}/u.test(part));
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
