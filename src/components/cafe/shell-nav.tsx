"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PencilUnderline } from "@/components/brand/pencil-underline";
import { cn } from "@/lib/utils";

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function ShellNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-5 text-sm">
      {links.map((l) => {
        const current = isCurrent(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative pb-1.5 transition-colors",
              current ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
            {current ? (
              <PencilUnderline className="absolute -inset-x-0.5 -bottom-0.5 h-1.5 w-[calc(100%+4px)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
