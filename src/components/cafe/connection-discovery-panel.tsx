"use client";

/**
 * "Point us at an endpoint and we'll work out the rest."
 *
 * Paste a URL, optionally with a candidate key, and this runs the discovery probe and turns
 * the answer into plain guidance: which credential scheme the API wants, where the key goes,
 * and which JSON path holds the rows.
 */

import { useState } from "react";
import {
  AlertTriangle,
  Compass,
  KeyRound,
  Lightbulb,
  Loader2,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorAlert } from "@/components/cafe/api-error-alert";
import type {
  AuthKind,
  DiscoveryResult,
  RowPathSuggestion,
} from "@/lib/connections/types";
import { AUTH_LABELS } from "@/lib/connections/auth-labels";

/** A known endpoint worth offering as a one-click starting point. */
export const DISCOVERY_PRESETS: Array<{
  label: string;
  url: string;
  note: string;
}> = [
  {
    label: "U.S. EIA retail electricity sales",
    url: "https://api.eia.gov/v2/electricity/retail-sales/data/?length=5",
    note: "Needs a free key sent as ?api_key=",
  },
  {
    label: "JSONPlaceholder posts",
    url: "https://jsonplaceholder.typicode.com/posts",
    note: "Open demo API, no key",
  },
];

export function ConnectionDiscoveryPanel({
  onApply,
  showCredentialProbe = true,
  authContext,
}: {
  onApply: (values: {
    name?: string;
    baseUrl: string;
    auth: AuthKind;
    apiKeyHeader?: string;
    apiKeyQueryParam?: string;
    path: string;
    rowsPath?: string;
    secret?: string;
  }) => void;
  /** Hide the key field when the auth scheme is already settled elsewhere. */
  showCredentialProbe?: boolean;
  /** Scheme to probe with, when the connection already stores one. */
  authContext?: AuthKind;
}) {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  async function discover(probeSecret = secret) {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste the API endpoint you want to connect.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setError("Include the scheme, for example https://api.eia.gov/v2/…");
      return;
    }

    setDiscovering(true);
    setError(null);
    setApplied(false);
    try {
      const res = await fetch("/api/connections/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          // Probe with the discovered scheme on a second pass so the key lands in the right
          // place; the first pass is scheme-agnostic to learn what is being asked for.
          auth: authContext ?? result?.suggested.auth ?? "none",
          secret: probeSecret || undefined,
          apiKeyQueryParam: result?.suggested.apiKeyQueryParam,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not analyse that endpoint.",
        );
        setResult(null);
        return;
      }
      setResult(data as DiscoveryResult);
    } catch {
      setError("Network error while analysing the endpoint.");
    } finally {
      setDiscovering(false);
    }
  }

  function apply() {
    if (!result) return;
    onApply({
      name: result.suggested.name,
      baseUrl: result.suggested.baseUrl,
      auth: result.suggested.auth,
      apiKeyHeader: result.suggested.apiKeyHeader,
      apiKeyQueryParam: result.suggested.apiKeyQueryParam,
      path: result.suggested.path,
      rowsPath: result.suggested.rowsPath,
      // Carry the key the user already typed into the form they are about to fill.
      secret: secret || undefined,
    });
    setApplied(true);
  }

  const topHint = result?.authHints?.[0];
  const suggestedAuthHint = topHint
    ? AUTH_LABELS[topHint.auth]
    : undefined;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-2">
        <Compass className="mt-0.5 size-5 text-muted-foreground" />
        <div>
          <h2 className="font-heading text-lg text-foreground">
            Start from an endpoint
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste the full URL. We&apos;ll probe it and suggest the auth scheme, base URL,
            path, and row path.
          </p>
        </div>
      </div>

      {showCredentialProbe ? null : (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <KeyRound className="mt-0.5 size-3 shrink-0" />
          This connection&apos;s stored credential is used, so its key never leaves the
          server.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="discover-url">API endpoint</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="discover-url"
            className="min-w-[240px] flex-1"
            placeholder="https://api.eia.gov/v2/electricity/retail-sales/data"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setResult(null);
              setApplied(false);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => discover()}
            disabled={discovering}
          >
            {discovering ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            Analyse endpoint
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {DISCOVERY_PRESETS.map((preset) => (
            <Button
              key={preset.url}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setUrl(preset.url);
                setResult(null);
                setApplied(false);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {showCredentialProbe ? (
        <div className="space-y-2">
          <Label htmlFor="discover-secret">
            API key <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="discover-secret"
              className="min-w-[240px] flex-1"
              type="password"
              autoComplete="off"
              placeholder="Paste the key to check the authenticated response too"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => discover(secret)}
              disabled={discovering || !secret}
            >
              Re-analyse with key
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Used for this probe only. It is stored encrypted, on the server, once you save the
            connection.
          </p>
        </div>
      ) : null}

      {error ? <ApiErrorAlert title="Analysing failed" message={error} /> : null}

      {result ? (
        <div className="space-y-4 rounded-lg border border-border bg-muted p-4">
          <ProbeSummary result={result} />

          {topHint ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-card p-3">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Suggested auth: {suggestedAuthHint}
                  </span>
                  <Badge variant={topHint.confidence === "high" ? "secondary" : "outline"}>
                    {topHint.confidence} confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{topHint.message}</p>
              </div>
            </div>
          ) : null}

          {result.authHints.length > 1 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {result.authHints.slice(1).map((hint, i) => (
                <li key={`${hint.auth}-${i}`}>
                  Also possible — {AUTH_LABELS[hint.auth]}: {hint.message}
                </li>
              ))}
            </ul>
          ) : null}

          {result.rowPaths.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Rows live at <code className="font-mono">{result.suggested.rowsPath}</code>
                {result.rowCount > 0 ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    — {result.rowCount} row{result.rowCount === 1 ? "" : "s"} in this
                    response
                  </span>
                ) : null}
              </p>
              {result.columns.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Columns: {result.columns.join(", ")}
                </p>
              ) : null}
              {result.rowPaths.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  Other candidates:{" "}
                  {result.rowPaths
                    .slice(1)
                    .map((r: RowPathSuggestion) => r.path)
                    .join(", ")}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No nested row collection detected.
            </p>
          )}

          {result.warnings.length > 0 ? (
            <ul className="space-y-1">
              {result.warnings.map((warning, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}

          {result.sample !== undefined ? (
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Response preview
              </summary>
              <Textarea
                readOnly
                className="mt-2 min-h-[200px] font-mono text-xs"
                value={JSON.stringify(result.sample, null, 2)}
              />
            </details>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Will save base URL{" "}
              <code className="font-mono">{result.suggested.baseUrl}</code> with path{" "}
              <code className="font-mono">{result.suggested.path}</code>
              {result.suggested.rowsPath ? (
                <>
                  {" "}
                  and rowsPath{" "}
                  <code className="font-mono">{result.suggested.rowsPath}</code>
                </>
              ) : null}
              .
            </p>
            <Button type="button" onClick={apply}>
              <Wand2 className="size-4" />
              {applied ? "Applied to the form below" : "Use these settings"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProbeSummary({ result }: { result: DiscoveryResult }) {
  const { probe } = result;
  const label = probe.ok
    ? `HTTP ${probe.status} — reachable`
    : probe.status
      ? `HTTP ${probe.status} — the API refused this request`
      : "No response";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={probe.ok ? "secondary" : "outline"}>{label}</Badge>
        <span className="text-xs text-muted-foreground">
          {probe.durationMs} ms
          {probe.contentType ? ` · ${probe.contentType.split(";")[0]}` : ""}
        </span>
      </div>
      {probe.errorCode || probe.errorMessage ? (
        <p className="text-sm text-muted-foreground">
          {probe.errorCode ? (
            <code className="font-mono">{probe.errorCode}</code>
          ) : null}
          {probe.errorCode && probe.errorMessage ? " — " : null}
          {probe.errorMessage}
        </p>
      ) : null}
      {probe.error ? (
        <p className="text-sm text-muted-foreground">{probe.error}</p>
      ) : null}
    </div>
  );
}
