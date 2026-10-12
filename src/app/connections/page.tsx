"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { GraphCafeMark } from "@/components/brand/graph-cafe-mark";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { DatasetRoastForm } from "@/components/cafe/dataset-roast-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OAuthConnectPanel } from "@/components/cafe/oauth-connect-panel";
import { describeAuth } from "@/lib/connections/auth-config";
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
        {connections.length > 0 ? (
          <Link href="/connections/new" className={cn(buttonVariants())}>
            New pour
          </Link>
        ) : null}
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading pours…
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <GraphCafeMark size={64} />
          <h2 className="mt-3 text-xl text-foreground">Pour your first connection</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect any HTTP API to start exploring.
          </p>
          <Link href="/connections/new" className={cn(buttonVariants(), "mt-4")}>
            Add connection
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {connections.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl text-foreground">
                    {c.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{c.baseUrl}</p>
                  <p className="text-xs text-muted-foreground">{describeAuth(c)}</p>
                </div>
              </div>
              {c.auth === "oauth2" ? (
                <OAuthConnectPanel connectionId={c.id} compact />
              ) : null}
              <DatasetRoastForm connection={c} />
            </li>
          ))}
        </ul>
      )}
    </CafeShell>
  );
}
