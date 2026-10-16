import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { color, cssVariables } from "@mantle/ui";
// Inter is served from this app, not from an outside font service, so a
// private hosting setup keeps working (ADR 0020).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import { t } from "../i18n.ts";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: color.primary };

export const metadata: Metadata = {
  title: t("app.title"),
};

// The design tokens, written out once as --mantle-* CSS variables for globals.css.
const TOKENS = `:root {\n${cssVariables()}\n}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: TOKENS }} />
      </head>
      {/* Browser extensions (for example Grammarly) add attributes to body before
          React loads; ignore those differences on this element only. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
