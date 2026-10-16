import { parseCsv } from "./csv.ts";

// Staff import file (Development Roadmap v1, E4). Provisional columns until
// the SUNU staff CSV format is agreed in weeks 1 and 2; extra columns are
// ignored so a richer file still imports.
export const REQUIRED_COLUMNS = ["employee_id", "full_name", "work_email"] as const;
export const OPTIONAL_COLUMNS = ["department", "unit", "location", "role_level", "manager_employee_id"] as const;

export interface StaffRow {
  readonly line: number;
  readonly employeeId: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly department: string | null;
  readonly unit: string | null;
  readonly location: string | null;
  readonly roleLevel: string | null;
  readonly managerEmployeeId: string | null;
}

// Problems are message keys with the line number, never text.
export interface StaffProblem {
  readonly line: number;
  readonly key: string;
  readonly params?: Readonly<Record<string, string>>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readStaffFile(text: string): { rows: StaffRow[]; problems: StaffProblem[] } {
  const [header, ...body] = parseCsv(text);
  if (!header) return { rows: [], problems: [{ line: 1, key: "people.import.problems.empty_file" }] };
  const columns = header.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length) {
    return { rows: [], problems: [{ line: 1, key: "people.import.problems.missing_columns", params: { columns: missing.join(", ") } }] };
  }
  const at = (fields: string[], name: string) => {
    const i = columns.indexOf(name);
    return i === -1 ? "" : (fields[i] ?? "").trim();
  };

  const rows: StaffRow[] = [];
  const problems: StaffProblem[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  body.forEach((fields, index) => {
    const line = index + 2;
    const employeeId = at(fields, "employee_id");
    const fullName = at(fields, "full_name");
    const workEmail = at(fields, "work_email").toLowerCase();
    if (!employeeId) return void problems.push({ line, key: "people.import.problems.no_employee_id" });
    if (!fullName) return void problems.push({ line, key: "people.import.problems.no_name" });
    if (!EMAIL.test(workEmail)) return void problems.push({ line, key: "people.import.problems.bad_email" });
    if (seenIds.has(employeeId)) return void problems.push({ line, key: "people.import.problems.duplicate_id", params: { id: employeeId } });
    if (seenEmails.has(workEmail)) return void problems.push({ line, key: "people.import.problems.duplicate_email" });
    seenIds.add(employeeId);
    seenEmails.add(workEmail);
    rows.push({
      line,
      employeeId,
      fullName,
      workEmail,
      department: at(fields, "department") || null,
      unit: at(fields, "unit") || null,
      location: at(fields, "location") || null,
      roleLevel: at(fields, "role_level") || null,
      managerEmployeeId: at(fields, "manager_employee_id") || null,
    });
  });
  return { rows, problems };
}
