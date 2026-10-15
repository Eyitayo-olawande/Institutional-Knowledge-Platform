"use server";

import { applyStaffImport } from "@mantle/db/tenant";
import { readStaffFile } from "@mantle/platform/people";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "../../../server/session.ts";
import { RESULT_COOKIE, type ImportResult } from "./import_result.ts";

const MAX_BYTES = 2 * 1024 * 1024;
export async function importStaff(form: FormData): Promise<void> {
  const { db, user } = await requireRole("learning_administrator");
  const file = form.get("file");
  const result: ImportResult = { problems: [] };
  if (!(file instanceof File) || file.size === 0) {
    result.problems.push({ line: 0, key: "people.import.problems.no_file" });
  } else if (file.size > MAX_BYTES) {
    result.problems.push({ line: 0, key: "people.import.problems.too_large" });
  } else {
    const { rows, problems } = readStaffFile(await file.text());
    result.problems = problems.map((p) => ({ line: p.line, key: p.key, ...(p.params?.columns ? { columns: p.params.columns } : {}) }));
    if (rows.length > 0) {
      Object.assign(
        result,
        await applyStaffImport(db, rows, { markMissingAsLeavers: form.get("mark_leavers") === "on", changedBy: `user:${user.id}` }),
      );
    }
  }
  (await cookies()).set(RESULT_COOKIE, JSON.stringify(result), { httpOnly: true, sameSite: "lax", path: "/admin/people", maxAge: 60 });
  redirect("/admin/people");
}
