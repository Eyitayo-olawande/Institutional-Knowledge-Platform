export const IMPORT_RESULT_COOKIE = "structure_import_result";

export interface StructureImportRow {
  readonly line: number;
  readonly name: string;
  readonly department?: string;
}

export interface StructureImportResult {
  readonly kind?: string;
  readonly created: number;
  readonly skipped: number;
  readonly errors: Array<{ line: number; message: string }>;
}
