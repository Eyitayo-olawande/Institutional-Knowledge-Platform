export const RESULT_COOKIE = "mantle_import_result";

// Result shown once on the next page view. Counts and line numbers only,
// no names or addresses.
export interface ImportResult {
  joined?: number;
  moved?: number;
  updated?: number;
  unchanged?: number;
  left?: number;
  problems: { line: number; key: string; columns?: string }[];
}
