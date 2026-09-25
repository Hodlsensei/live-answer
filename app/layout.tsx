import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Answer",
  description: "Ask out loud, read the answer on screen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
