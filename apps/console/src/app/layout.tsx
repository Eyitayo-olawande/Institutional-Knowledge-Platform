import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { color, font } from "@mantle/ui";
import { t } from "../i18n.ts";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: t("app.title"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        // Browser extensions (for example Grammarly) add attributes to body before
        // React loads; ignore those differences on this element only.
        suppressHydrationWarning
        style={{ margin: 0, fontFamily: font.family, color: color.text, background: color.background }}>
        {children}
      </body>
    </html>
  );
}
