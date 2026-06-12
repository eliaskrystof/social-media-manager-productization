import type { Metadata } from "next";
import Link from "next/link";
import "../styles/globals.css";
import { getCurrentUser } from "@/lib/current-user";
import { signOutAction } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Orchard",
  description: "Local social media orchestration skeleton"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

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
            <Link href="/scheduler">Scheduler</Link>
          </nav>
          <div className="topbar-account">
            {user ? (
              <form action={signOutAction}>
                <span>{user.displayName ?? user.email}</span>
                <button type="submit">Log out</button>
              </form>
            ) : (
              <Link href="/login">Log in</Link>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
