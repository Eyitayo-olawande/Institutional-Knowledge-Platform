import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { color, font } from "@mantle/ui";
import messages from "../../messages/en.json";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: messages.app.title,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: font.family, color: color.text, background: color.background }}>
        {children}
      </body>
    </html>
  );
}
