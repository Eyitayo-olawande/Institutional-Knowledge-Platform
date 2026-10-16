import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cssVariables } from "@mantle/ui";
// Inter is served from this app, not from an outside font service (ADR 0020).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@mantle/ui/styles.css";
import { t } from "../i18n.ts";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: t("app.title"),
};

// The design tokens, written out once as --mantle-* CSS variables.
const TOKENS = `:root {\n${cssVariables()}\n}`;

const header = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  height: 60,
  padding: "0 24px",
  background: "var(--mantle-color-stage_department)",
  color: "#FFFFFF",
  fontWeight: 700,
} as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: TOKENS }} />
      </head>
      {/* Browser extensions (for example Grammarly) add attributes to body before
          React loads; ignore those differences on this element only. */}
      <body suppressHydrationWarning>
        <header style={header}>{t("app.title")}</header>
        {children}
      </body>
    </html>
  );
}
