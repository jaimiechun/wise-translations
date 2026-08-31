import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wise Translations",
  description: "Search and submit translations across languages.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Wise Translations
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
              <Link href="/" className="hover:text-neutral-900">
                Browse
              </Link>
              <Link href="/submit" className="hover:text-neutral-900">
                Submit a translation
              </Link>
              <Link href="/admin" className="hover:text-neutral-900">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
