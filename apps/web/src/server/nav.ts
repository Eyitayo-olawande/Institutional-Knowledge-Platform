import { can } from "@mantle/platform/identity";

// The menu each person sees, built from their roles and the tenant's feature
// switches (Blueprint v3.1, section 11: each role sees only its menu).
// The server still checks every permission on each page; this only decides
// which links to show.

export type NavKey = "home" | "library" | "notices" | "people" | "roles" | "wording" | "structure" | "areas" | "activity" | "paths";
export type NavIcon = "home" | "library" | "bell" | "people" | "key" | "text" | "tree" | "list";

export interface NavItem {
  key: NavKey;
  href: string;
  icon: NavIcon;
  section: "main" | "admin";
}

export interface NavInput {
  roles: string | undefined;
  libraryOn: boolean;
  peopleImportOn: boolean;
  pathsOn: boolean;
}

export function buildNav({ roles, libraryOn, peopleImportOn, pathsOn }: NavInput): NavItem[] {
  const items: NavItem[] = [{ key: "home", href: "/", icon: "home", section: "main" }];
  if (libraryOn && can(roles, "library.view")) items.push({ key: "library", href: "/library", icon: "library", section: "main" });
  items.push({ key: "notices", href: "/notices", icon: "bell", section: "main" });
  if (peopleImportOn && can(roles, "people.view")) items.push({ key: "people", href: "/admin/people", icon: "people", section: "admin" });
  if (can(roles, "roles.manage")) items.push({ key: "roles", href: "/admin/roles", icon: "key", section: "admin" });
  if (can(roles, "wording.edit")) items.push({ key: "wording", href: "/admin/wording", icon: "text", section: "admin" });
  if (can(roles, "structure.manage")) items.push({ key: "structure", href: "/admin/structure", icon: "tree", section: "admin" });
  if (libraryOn && can(roles, "areas.manage")) items.push({ key: "areas", href: "/admin/areas", icon: "library", section: "admin" });
  if (pathsOn && can(roles, "paths.edit")) items.push({ key: "paths", href: "/admin/paths", icon: "tree", section: "admin" });
  if (can(roles, "activity.view")) items.push({ key: "activity", href: "/admin/activity", icon: "list", section: "admin" });
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
