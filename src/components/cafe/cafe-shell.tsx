import Link from "next/link";
import { Coffee } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/connections", label: "Connections" },
  { href: "/graph", label: "Idea graph" },
];

export function CafeShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-[100dvh] bg-[var(--cafe-foam)]">
      <header className="border-b border-[var(--cafe-latte)] bg-[var(--cafe-menu)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-[family-name:var(--font-fraunces)] text-lg text-[var(--cafe-walnut)]"
          >
            <Coffee className="size-5" aria-hidden />
            Graph.Cafe
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-3 py-1 text-[var(--cafe-mocha)] transition hover:bg-[var(--cafe-cream)] hover:text-[var(--cafe-espresso)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        {title ? (
          <div className="mx-auto max-w-6xl px-4 pb-4">
            <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--cafe-walnut)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--cafe-mocha)]">{subtitle}</p>
            ) : null}
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
