import { unreadCount, type TenantDb } from "@mantle/db/tenant";
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
  const [libraryOn, peopleImportOn, unread] = await Promise.all([
    featureOn(ctx.tenant, "knowledge_library"),
    featureOn(ctx.tenant, "people_import"),
    unreadCount(ctx.db, ctx.user.id),
  ]);
  const items = buildNav({ roles: ctx.roles, libraryOn, peopleImportOn });
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
        <Link className="brand" href="/">{ctx.tenant.name}</Link>
        <nav className="nav" aria-label={t("nav.menu")}>
          {main.map(link)}
          {admin.length > 0 ? <div className="nav-section">{t("nav.admin_section")}</div> : null}
          {admin.map(link)}
        </nav>
        <div className="me">
          <div className="avatar" aria-hidden="true">{initials(ctx.user.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="me-name">{ctx.user.name}</div>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" style={{ padding: 0 }}>{t("auth.sign_out")}</Button>
            </form>
          </div>
        </div>
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
