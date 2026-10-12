"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiErrorAlert } from "@/components/cafe/api-error-alert";
import { ConnectionCredentialsPanel } from "@/components/cafe/connection-credentials-panel";
import { ConnectionDiscoveryPanel } from "@/components/cafe/connection-discovery-panel";
import type { ApiConnection } from "@/lib/connections/types";

export function DatasetRoastForm({
  connection,
}: {
  connection: ApiConnection;
}) {
  const router = useRouter();
  const connectionId = connection.id;
  const [name, setName] = useState("New roast");
  const [path, setPath] = useState("/posts");
  const [rowsPath, setRowsPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          name,
          request: {
            method: "GET",
            path,
            rowsPath: rowsPath || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ? JSON.stringify(data.error) : "Could not save dataset.");
        return;
      }
      router.push(`/explore/${data.dataset.id}`);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <ConnectionCredentialsPanel connection={connection} />
      <ConnectionDiscoveryPanel
        connectionId={connection.id}
        showCredentialProbe={false}
        authContext={connection.auth}
        initialUrl={`${connection.baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`}
        onApply={(values) => {
          if (values.path) setPath(values.path);
          setRowsPath(values.rowsPath ?? "");
          if (values.name) setName(values.name);
        }}
      />
      <div className="space-y-3 rounded-xl border border-border bg-muted p-4">
        <h3 className="text-sm font-semibold text-foreground">New dataset roast</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`name-${connectionId}`}>Name</Label>
            <Input
              id={`name-${connectionId}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`path-${connectionId}`}>GET path</Label>
            <Input
              id={`path-${connectionId}`}
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`rows-${connectionId}`}>rowsPath (optional)</Label>
            <Input
              id={`rows-${connectionId}`}
              placeholder="response.data"
              value={rowsPath}
              onChange={(e) => setRowsPath(e.target.value)}
            />
          </div>
        </div>
        {error ? <ApiErrorAlert message={error} /> : null}
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save &amp; explore
        </Button>
      </div>
    </div>
  );
}
