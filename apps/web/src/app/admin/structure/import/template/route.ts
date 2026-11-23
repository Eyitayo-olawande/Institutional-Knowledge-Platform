import { isStructureKind, type StructureKind } from "@mantle/db/tenant";
import { requirePermission } from "../../../../../server/session.ts";

const TEMPLATES: Record<StructureKind, { headers: string[]; example: string[] }> = {
  department: {
    headers: ["name"],
    example: ["Finance"],
  },
  unit: {
    headers: ["name", "department"],
    example: ["Corporate Finance", "Finance"],
  },
  role_level: {
    headers: ["name"],
    example: ["Analyst"],
  },
  location: {
    headers: ["name"],
    example: ["Head Office"],
  },
};

export async function GET(req: Request): Promise<Response> {
  await requirePermission("structure.manage");
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "department";
  if (!isStructureKind(kind)) return new Response("Invalid kind", { status: 400 });
  const tpl = TEMPLATES[kind];
  const csv = [tpl.headers.join(","), tpl.example.join(",")].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-template.csv"`,
    },
  });
}
