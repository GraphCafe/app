import Link from "next/link";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <CafeShell>
      <section className="max-w-xl space-y-4 py-16">
        <h1 className="text-4xl leading-tight text-foreground md:text-[40px]">
          Brew a report from any API
        </h1>
        <p className="text-muted-foreground">
          Connect an endpoint, explore the JSON as a table, and save a chart your team can read.
          Sign in so your API keys and pours stay on this server between visits.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/connections/new" className={cn(buttonVariants({ size: "lg" }))}>
            Add connection
          </Link>
          <Link
            href="/connections"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            View connections
          </Link>
        </div>
      </section>
    </CafeShell>
  );
}
