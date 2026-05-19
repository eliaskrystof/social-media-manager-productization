import type { Metadata } from "next";
import Link from "next/link";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Orchard",
  description: "Local social media orchestration skeleton"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link className="brand-mark" href="/">
            Orchard
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/">Dashboard</Link>
            <Link href="/brands">Brands</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
