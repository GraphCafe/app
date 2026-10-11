"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { DatasetRoastForm } from "@/components/cafe/dataset-roast-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiConnection } from "@/lib/connections/types";

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [connRes, repRes] = await Promise.all([
        fetch("/api/connections"),
        fetch("/api/reports"),
      ]);
      const connData = await connRes.json();
      const repData = await repRes.json();
      setConnections(connData.connections ?? []);
      setReportId(repData.reports?.[0]?.id ?? null);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <CafeShell
      title="Connections"
      subtitle="Bring your own API — secrets stay on the server."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/connections/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          New pour
        </Link>
        {reportId ? (
          <Link
            href={`/reports/${reportId}`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Open sample report
          </Link>
        ) : null}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--cafe-mocha)]">
          <Loader2 className="size-4 animate-spin" />
          Loading pours…
        </div>
      ) : connections.length === 0 ? (
        <p className="text-sm text-[var(--cafe-mocha)]">
          No connections yet. Start with a new pour.
        </p>
      ) : (
        <ul className="space-y-4">
          {connections.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-[var(--cafe-latte)] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--cafe-walnut)]">
                    {c.name}
                  </h2>
                  <p className="text-sm text-[var(--cafe-mocha)]">{c.baseUrl}</p>
                  <p className="text-xs text-muted-foreground">Auth: {c.auth}</p>
                </div>
              </div>
              <DatasetRoastForm connectionId={c.id} />
            </li>
          ))}
        </ul>
      )}
    </CafeShell>
  );
}
