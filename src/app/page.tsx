import Link from "next/link";
import { Coffee, LineChart, Plug, Table2 } from "lucide-react";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <CafeShell>
      <section className="rounded-3xl border border-[var(--cafe-latte)] bg-[var(--cafe-menu)] p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--cafe-mocha)]">
              <Coffee className="size-4" aria-hidden />
              Phase A — BYO APIs
            </p>
            <h1 className="font-[family-name:var(--font-fraunces)] text-4xl text-[var(--cafe-walnut)]">
              Understand any HTTP API, served warm.
            </h1>
            <p className="text-[var(--cafe-espresso)]">
              Connect your base URL and credentials on the server, explore JSON as tables,
              and save a small report with charts — café metaphors optional, security not.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/connections/new"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Start a new pour
              </Link>
              <Link
                href="/connections"
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
              >
                View connections
              </Link>
            </div>
          </div>
        </div>
      </section>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="size-4" />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Bearer, API key header, or basic auth — tested through a server proxy with SSRF guards.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="size-4" />
              Explore
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Named request templates with <code className="text-xs">rowsPath</code> to flatten JSON into rows.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="size-4" />
              Report Studio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            One saved plate with a table and Recharts bar/line widget using{" "}
            <code className="text-xs">graphCafe.report.v1</code>.
          </CardContent>
        </Card>
      </div>
    </CafeShell>
  );
}
