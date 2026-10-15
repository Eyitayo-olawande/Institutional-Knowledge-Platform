import { listPeople } from "@mantle/db/tenant";
import { Button, color, space } from "@mantle/ui";
import { cookies } from "next/headers";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requireRole } from "../../../server/session.ts";
import { importStaff } from "./actions.ts";
import { RESULT_COOKIE, type ImportResult } from "./import_result.ts";

const COUNTS = ["joined", "moved", "updated", "unchanged", "left"] as const;

export default async function People() {
  const { tenant, db } = await requireRole("learning_administrator");
  const people = await listPeople(db);
  const raw = (await cookies()).get(RESULT_COOKIE)?.value;
  const result = raw ? (JSON.parse(raw) as ImportResult) : undefined;

  return (
    <main style={{ padding: space.md, maxWidth: 900 }}>
      <p>
        <Link href="/">{t("people.back")}</Link>
      </p>
      <h1>{t("people.heading", { name: tenant.name })}</h1>

      {result && (
        <section role="status" style={{ marginBottom: space.lg }}>
          {result.joined !== undefined && (
            <ul>
              {COUNTS.map((k) => (
                <li key={k}>{t(`people.import.counts.${k}`, { count: result[k] ?? 0 })}</li>
              ))}
            </ul>
          )}
          {result.problems.length > 0 && (
            <ul style={{ color: color.danger }}>
              {result.problems.map((p) => (
                <li key={`${p.line}-${p.key}`}>
                  {p.line > 0 ? t("people.import.line", { line: p.line }) : null}
                  {t(p.key, { columns: p.columns ?? "" })}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <h2>{t("people.import.heading")}</h2>
      <p>{t("people.import.format")}</p>
      <form action={importStaff}>
        <p>
          <input type="file" name="file" accept=".csv,text/csv" required />
        </p>
        <p>
          <label>
            <input type="checkbox" name="mark_leavers" /> {t("people.import.mark_leavers")}
          </label>
        </p>
        <Button type="submit">{t("people.import.submit")}</Button>
      </form>

      <h2>{t("people.list_heading", { count: people.length })}</h2>
      {people.length === 0 ? (
        <p>{t("people.empty")}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">{t("people.columns.employee_id")}</th>
              <th align="left">{t("people.columns.name")}</th>
              <th align="left">{t("people.columns.email")}</th>
              <th align="left">{t("people.columns.department")}</th>
              <th align="left">{t("people.columns.status")}</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td>{p.employeeId}</td>
                <td>{p.fullName}</td>
                <td>{p.workEmail}</td>
                <td>{p.department}</td>
                <td>{t(`people.statuses.${p.status}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
