"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorAlert } from "@/components/cafe/api-error-alert";
import type { DatasetDefinition, DatasetResult } from "@/lib/connections/types";

type ExecuteResponse =
  | { ok: true; status: number; data: unknown; dataset?: DatasetResult }
  | { ok: false; status?: number; error: string };

export function ExplorePanel({ datasetId }: { datasetId: string }) {
  const [dataset, setDataset] = useState<DatasetDefinition | null>(null);
  const [rowsPath, setRowsPath] = useState("");
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/datasets/${datasetId}`);
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error ?? "Could not load dataset.");
          return;
        }
        setDataset(data.dataset);
        setPath(data.dataset.request.path);
        setRowsPath(data.dataset.request.rowsPath ?? "");
      } catch {
        setLoadError("Network error loading dataset.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [datasetId]);

  const run = useCallback(async () => {
    if (!dataset) return;
    setRunning(true);
    setResult(null);
    try {
      await fetch(`/api/datasets/${datasetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: {
            path,
            rowsPath: rowsPath || undefined,
          },
        }),
      });
      const res = await fetch(`/api/datasets/${datasetId}/execute`, {
        method: "POST",
      });
      const data = (await res.json()) as ExecuteResponse;
      setResult(data);
    } catch {
      setResult({ ok: false, error: "Network error during execute." });
    } finally {
      setRunning(false);
    }
  }, [dataset, datasetId, path, rowsPath]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading roast…
      </div>
    );
  }

  if (loadError || !dataset) {
    return <ApiErrorAlert message={loadError ?? "Dataset missing."} />;
  }

  const table = result?.ok ? result.dataset : undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="path">Request path</Label>
          <Input id="path" value={path} onChange={(e) => setPath(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rowsPath">rowsPath</Label>
          <Input
            id="rowsPath"
            placeholder="data.items"
            value={rowsPath}
            onChange={(e) => setRowsPath(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <Button type="button" onClick={run} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : null}
            Execute roast
          </Button>
        </div>
      </div>

      {result && !result.ok ? (
        <ApiErrorAlert
          title={result.status ? `HTTP ${result.status}` : "Execute failed"}
          message={result.error}
        />
      ) : null}

      {result?.ok ? (
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="json">Raw JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="rounded-xl border bg-card p-2">
            {table && table.rows.length > 0 ? (
              <div className="max-h-[480px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {table.columns.map((c) => (
                        <TableHead key={c.id}>
                          {c.name}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {c.type}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.rows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {table.columns.map((c) => (
                          <TableCell key={c.id} className="max-w-[200px] truncate font-mono text-xs">
                            {String(row[c.id] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="p-2 text-xs text-muted-foreground">
                  Showing {Math.min(50, table.rowCount)} of {table.rowCount} rows
                </p>
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No rows at this path.</p>
            )}
          </TabsContent>
          <TabsContent value="json">
            <Textarea
              readOnly
              className="min-h-[320px] font-mono text-xs"
              value={JSON.stringify(result.data, null, 2)}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
