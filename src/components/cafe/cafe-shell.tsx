import Link from "next/link";
import { GraphCafeMark } from "@/components/brand/graph-cafe-mark";
import { ShellNav } from "@/components/cafe/shell-nav";
import { AuthUserMenu } from "@/components/cafe/auth-user-menu";
import { ThemeToggle } from "@/components/cafe/theme-toggle";

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
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <GraphCafeMark size={32} />
            <span className="font-heading text-[21px] font-medium leading-none">Graph.Cafe</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
            <ShellNav links={links} />
            <AuthUserMenu />
            <ThemeToggle />
          </div>
        </div>
        {title ? (
          <div className="mx-auto max-w-6xl px-4 pb-4">
            <h1 className="text-3xl text-foreground">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
