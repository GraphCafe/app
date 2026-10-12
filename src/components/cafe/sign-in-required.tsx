"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignInRequired({
  title = "Sign in to continue",
  description = "Connections, API keys, and reports are saved to your account on this server.",
  nextPath,
}: {
  title?: string;
  description?: string;
  /** Path to return to after login (defaults to current pathname). */
  nextPath?: string;
}) {
  const next =
    nextPath ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/connections");

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <KeyRound className="size-12 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 text-xl text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className={cn(buttonVariants())}
        >
          Sign in
        </Link>
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
