// Lint rules for every workspace. Architecture rules from CLAUDE.md are
// enforced here so they hold across every Claude Code session.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Database drivers and query layers may only be imported inside packages/db.
// Everything else reaches data through the tenant context (CLAUDE.md,
// engineering rules; ADR 0005).
export const DATABASE_MODULES = [
  "pg",
  "pg-*",
  "postgres",
  "drizzle-orm",
  "drizzle-orm/*",
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts,js,mjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: DATABASE_MODULES,
              message:
                "Direct database access is only allowed in packages/db. Use the tenant context instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/db/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
