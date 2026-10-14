import type { Metadata } from "next";
import type { ReactNode } from "react";
import messages from "../../messages/en.json";

export const metadata: Metadata = {
  title: messages.app.title,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
