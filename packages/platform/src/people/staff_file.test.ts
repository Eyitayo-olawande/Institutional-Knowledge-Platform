import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv.ts";
import { readStaffFile } from "./staff_file.ts";

describe("parseCsv", () => {
  it("handles quotes, commas, doubled quotes, CRLF and a byte order mark", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });
});

const HEADER = "employee_id,full_name,work_email,department,manager_employee_id";

describe("readStaffFile", () => {
  it("reads valid rows, lower casing emails and ignoring extra columns", () => {
    const { rows, problems } = readStaffFile(`${HEADER},grade\nE1,Ada Obi,ADA@Alpha.test,Claims,,G7\n`);
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      { line: 2, employeeId: "E1", fullName: "Ada Obi", workEmail: "ada@alpha.test", department: "Claims", managerEmployeeId: null },
    ]);
  });

  it("reports missing required columns", () => {
    expect(readStaffFile("full_name,work_email\nA,a@b.test").problems).toEqual([
      { line: 1, key: "people.import.problems.missing_columns", params: { columns: "employee_id" } },
    ]);
  });

  it("reports bad rows by line and keeps the good ones", () => {
    const file = [HEADER, "E1,Ada,ada@a.test,,", ",No Id,x@a.test,,", "E2,,y@a.test,,", "E3,Bad Email,nope,,", "E1,Dup,z@a.test,,", "E4,Dup Email,ADA@a.test,,"].join("\n");
    const { rows, problems } = readStaffFile(file);
    expect(rows.map((r) => r.employeeId)).toEqual(["E1"]);
    expect(problems.map((p) => [p.line, p.key.split(".").pop()])).toEqual([
      [3, "no_employee_id"],
      [4, "no_name"],
      [5, "bad_email"],
      [6, "duplicate_id"],
      [7, "duplicate_email"],
    ]);
  });

  it("reports an empty file", () => {
    expect(readStaffFile("").problems[0]?.key).toBe("people.import.problems.empty_file");
  });
});
