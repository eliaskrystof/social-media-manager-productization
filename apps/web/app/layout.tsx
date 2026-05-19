import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Orchard",
  description: "Local social media orchestration skeleton"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
