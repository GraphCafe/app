"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiErrorAlert } from "@/components/cafe/api-error-alert";
import { CHART_CHROME, seriesColor } from "@/lib/design/chart-palette";
import type {
  ChartWidget,
  DatasetResult,
  ReportDefinition,
  TableWidget,
} from "@/lib/connections/types";

type ExecuteResponse =
  | { ok: true; dataset?: DatasetResult }
  | { ok: false; error: string; status?: number };

type ReportBundle = {
  report: ReportDefinition | null;
  datasets: Record<string, DatasetResult>;
  errors: Record<string, string>;
};

async function fetchReportBundle(reportId: string): Promise<ReportBundle> {
  const res = await fetch(`/api/reports/${reportId}`);
  const data = await res.json();
  if (!res.ok) {
    return {
      report: null,
      datasets: {},
      errors: { report: data.error ?? "Report not found." },
    };
  }
  const r = data.report as ReportDefinition;
  const next: Record<string, DatasetResult> = {};
  const nextErrors: Record<string, string> = {};
  for (const ds of r.datasets) {
    const exec = await fetch(`/api/datasets/${ds.id}/execute`, {
      method: "POST",
    });
    const payload = (await exec.json()) as ExecuteResponse;
    if (payload.ok && payload.dataset) {
      next[ds.id] = payload.dataset;
    } else if (!payload.ok) {
      nextErrors[ds.id] = payload.error;
    }
  }
  return { report: r, datasets: next, errors: nextErrors };
}

export function ReportStudioClient({ reportId }: { reportId: string }) {
  return <ReportStudioBody key={reportId} reportId={reportId} />;
}

function ReportStudioBody({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ReportDefinition | null>(null);
  const [datasets, setDatasets] = useState<Record<string, DatasetResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchReportBundle(reportId).then((bundle) => {
      if (cancelled) return;
      setReport(bundle.report);
      setDatasets(bundle.datasets);
      setErrors(bundle.errors);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  async function refreshData() {
    setRefreshing(true);
    try {
      const bundle = await fetchReportBundle(reportId);
      setReport(bundle.report);
      setDatasets(bundle.datasets);
      setErrors(bundle.errors);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Warming the plate…
      </div>
    );
  }

  if (!report) {
    return <ApiErrorAlert message={errors.report ?? "Report missing."} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Schema <code className="text-xs">{report.version}</code>
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => refreshData()}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : null}
          Refresh data
        </Button>
      </div>
      {Object.entries(errors).map(([id, msg]) => (
        <ApiErrorAlert key={id} message={msg} />
      ))}
      <div className="grid gap-4 md:grid-cols-2">
        {report.widgets.map((widget) => {
          const data = datasets[widget.datasetId];
          if (!data) {
            return (
              <div
                key={widget.id}
                className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground"
              >
                {widget.title ?? widget.type} — no data yet
              </div>
            );
          }
          if (widget.type === "table") {
            return (
              <WidgetCard key={widget.id} title={widget.title ?? "Table"}>
                <TableWidgetView widget={widget} data={data} />
              </WidgetCard>
            );
          }
          if (widget.type === "chart") {
            return (
              <WidgetCard key={widget.id} title={widget.title ?? "Chart"}>
                <ChartWidgetView widget={widget} data={data} />
              </WidgetCard>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function WidgetCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 font-heading text-lg text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TableWidgetView({
  widget,
  data,
}: {
  widget: TableWidget;
  data: DatasetResult;
}) {
  const cols = widget.table.columnIds?.length
    ? data.columns.filter((c) => widget.table.columnIds?.includes(c.id))
    : data.columns;
  const pageSize = widget.table.pageSize ?? 10;
  return (
    <div className="max-h-80 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead key={c.id}>{c.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.slice(0, pageSize).map((row, i) => (
            <TableRow key={i}>
              {cols.map((c) => (
                <TableCell key={c.id} className="font-mono text-xs">
                  {String(row[c.id] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ChartWidgetView({
  widget,
  data,
}: {
  widget: ChartWidget;
  data: DatasetResult;
}) {
  const { xColumnId, yColumnId, kind } = widget.chart;
  const chartData = data.rows.map((row) => ({
    x: row[xColumnId],
    y: Number(row[yColumnId]),
  }));

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground">No chartable rows.</p>;
  }

  const axisTick = { fill: CHART_CHROME.tick, fontSize: 12, fontVariantNumeric: "tabular-nums" };
  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: CHART_CHROME.label,
  };

  const ChartInner =
    kind === "line" ? (
      <LineChart data={chartData}>
        <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
        <XAxis dataKey="x" stroke={CHART_CHROME.axis} tick={axisTick} />
        <YAxis stroke={CHART_CHROME.axis} tick={axisTick} />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={{ color: CHART_CHROME.label }}
          cursor={{ stroke: CHART_CHROME.axis }}
        />
        <Line type="monotone" dataKey="y" stroke={seriesColor(0)} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    ) : (
      <BarChart data={chartData}>
        <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
        <XAxis dataKey="x" stroke={CHART_CHROME.axis} tick={axisTick} />
        <YAxis stroke={CHART_CHROME.axis} tick={axisTick} />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={{ color: CHART_CHROME.label }}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="y" fill={seriesColor(0)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {ChartInner}
      </ResponsiveContainer>
    </div>
  );
}
