"use server";

import { createStructureEntry, isStructureKind, listStructure } from "@mantle/db/tenant";
import { parseCsv } from "@mantle/platform/people";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../../server/session.ts";
import { IMPORT_RESULT_COOKIE, type StructureImportResult } from "./import_result.ts";

const MAX_BYTES = 1 * 1024 * 1024;

export async function importStructure(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("structure.manage");
  const kind = String(form.get("kind") ?? "");
  if (!isStructureKind(kind)) redirect("/admin/structure");

  const file = form.get("file");
  const actor = `user:${user.id}`;
  let result: StructureImportResult;

  if (!(file instanceof File) || file.size === 0) {
    result = { kind, created: 0, skipped: 0, errors: [{ line: 0, message: "no_file" }] };
  } else if (file.size > MAX_BYTES) {
    result = { kind, created: 0, skipped: 0, errors: [{ line: 0, message: "too_large" }] };
  } else {
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      result = { kind, created: 0, skipped: 0, errors: [{ line: 0, message: "empty_file" }] };
    } else {
      const header = rows[0]!.map((h) => h.trim().toLowerCase());
      const nameIdx = header.indexOf("name");
      const deptIdx = header.indexOf("department");

      if (nameIdx === -1) {
        result = { kind, created: 0, skipped: 0, errors: [{ line: 1, message: "missing_name_column" }] };
      } else {
        const deptMap = new Map<string, string>();
        if (kind === "unit") {
          const depts = await listStructure(db, "department", false);
          for (const d of depts) deptMap.set(d.name.toLowerCase(), d.id);
        }

        let created = 0;
        let skipped = 0;
        const errors: StructureImportResult["errors"] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]!;
          const line = i + 1;
          const name = row[nameIdx]?.trim() ?? "";
          if (!name) {
            errors.push({ line, message: "empty_name" });
            continue;
          }

          let departmentId: string | null = null;
          if (kind === "unit") {
            if (deptIdx === -1 || !row[deptIdx]?.trim()) {
              errors.push({ line, message: "missing_department" });
              continue;
            }
            const deptName = row[deptIdx]!.trim();
            const id = deptMap.get(deptName.toLowerCase());
            if (!id) {
              errors.push({ line, message: `unknown_department:${deptName}` });
              continue;
            }
            departmentId = id;
          }

          const { result: res } = await createStructureEntry(db, kind, name, departmentId, actor);
          if (res === "created") {
            created++;
          } else if (res === "name_taken") {
            skipped++;
          } else {
            errors.push({ line, message: res });
          }
        }

        result = { kind, created, skipped, errors };
      }
    }
  }

  (await cookies()).set(IMPORT_RESULT_COOKIE, JSON.stringify(result), {
    httpOnly: true,
    sameSite: "lax",
    path: "/admin/structure/import",
    maxAge: 60,
  });
  redirect(`/admin/structure/import?kind=${kind}`);
}
