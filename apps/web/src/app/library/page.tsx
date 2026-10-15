import { listLibraryItems } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { space } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../i18n.ts";
import { requireFeature, requirePermission } from "../../server/session.ts";

export default async function Library() {
  const { tenant, db, roles } = await requirePermission("library.view");
  await requireFeature(tenant, "knowledge_library");
  const editor = can(roles, "library.edit");
  const items = await listLibraryItems(db, { publishedOnly: !editor });

  return (
    <main style={{ padding: space.md, maxWidth: 900 }}>
      <p>
        <Link href="/">{t("people.back")}</Link>
      </p>
      <h1>{t("library.heading", { name: tenant.name })}</h1>
      {editor && (
        <p>
          <Link href="/library/new">{t("library.new")}</Link>
        </p>
      )}
      {items.length === 0 ? (
        <p>{t("library.empty")}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/library/${item.id}`}>{item.title}</Link>
              {editor && <> {t(`library.statuses.${item.status}`)}</>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
