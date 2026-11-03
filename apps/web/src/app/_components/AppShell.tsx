import { personDepartmentByUserId, unreadCount, type TenantDb } from "@mantle/db/tenant";
import type { TenantRecord } from "@mantle/platform/tenancy";
import { Button } from "@mantle/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "../../i18n.ts";
import { bottomNav, buildNav, initials, type NavItem, type NavKey } from "../../server/nav.ts";
import { featureOn } from "../../server/session.ts";
import { signOut } from "../actions.ts";
import { Icon } from "./Icon.tsx";

export interface ShellContext {
  tenant: TenantRecord;
  db: TenantDb;
  roles: string;
  user: { id: string; name: string };
}

// The frame around every signed in page: side menu on laptops, bottom menu
// on phones, a top bar with library search and notices (ADR 0020).
export async function AppShell({ ctx, active, children }: { ctx: ShellContext; active: NavKey; children: ReactNode }) {
  const [libraryOn, peopleImportOn, pathsOn, unread, department] = await Promise.all([
    featureOn(ctx.tenant, "knowledge_library"),
    featureOn(ctx.tenant, "people_import"),
    featureOn(ctx.tenant, "learning_paths"),
    unreadCount(ctx.db, ctx.user.id),
    personDepartmentByUserId(ctx.db, ctx.user.id),
  ]);
  const items = buildNav({ roles: ctx.roles, libraryOn, peopleImportOn, pathsOn });
  const main = items.filter((i) => i.section === "main");
  const admin = items.filter((i) => i.section === "admin");

  const link = (item: NavItem) => (
    <Link key={item.key} href={item.href} aria-current={item.key === active ? "page" : undefined}>
      <Icon name={item.icon} />
      {t(`nav.${item.key}`)}
      {item.key === "notices" && unread > 0 ? <span className="count">{unread}</span> : null}
    </Link>
  );

  return (
    <div className="shell">
      <a className="skip" href="#content">{t("nav.skip")}</a>
      <aside className="side">
        <Link className="brand" href="/">
          <Icon name="library" />
          <span className="brand-name">{ctx.tenant.name}</span>
        </Link>
        <Link className="brand product" href="/">
          <Icon name="library" />
          <span>
            <span className="brand-name">{t("nav.product_name")}</span>
            <span className="brand-tagline">{t("nav.product_tagline")}</span>
          </span>
        </Link>
        <nav className="nav" aria-label={t("nav.menu")}>
          {main.map(link)}
          {admin.length > 0 ? <div className="nav-section">{t("nav.admin_section")}</div> : null}
          {admin.map(link)}
        </nav>
        <details className="me">
          <summary>
            <div className="avatar" aria-hidden="true">{initials(ctx.user.name)}</div>
            <div className="me-info">
              <div className="me-name">{ctx.user.name}</div>
              {department ? <div className="me-dept">{department}</div> : null}
            </div>
            <Icon name="chevron_down" size={16} />
          </summary>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" style={{ color: "#fff" }}>{t("auth.sign_out")}</Button>
          </form>
        </details>
      </aside>
      <div>
        <header className="topbar">
          <Link className="brand-sm" href="/">{ctx.tenant.name}</Link>
          {libraryOn && items.some((i) => i.key === "library") ? (
            <form className="search" role="search" action="/library" method="get">
              <Icon name="search" size={18} />
              <label className="skip" htmlFor="top-search">{t("nav.search_label")}</label>
              <input id="top-search" name="q" type="search" placeholder={t("nav.search_placeholder")} />
            </form>
          ) : null}
          <Link className="bell" href="/notices" aria-label={unread > 0 ? t("nav.notices_unread", { count: unread }) : t("nav.notices")}>
            <Icon name="bell" />
            {unread > 0 ? <span className="dot" /> : null}
          </Link>
        </header>
        <main className="main" id="content">{children}</main>
      </div>
      <nav className="bottom-nav" aria-label={t("nav.menu")}>
        {bottomNav(items).map((item) => (
          <Link key={item.key} href={item.href} aria-current={item.key === active ? "page" : undefined}>
            <Icon name={item.icon} />
            {t(`nav.${item.key}`)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub === undefined ? null : <p className="sub">{sub}</p>}
      </div>
      {action ?? null}
    </div>
  );
}
