"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorAlert } from "@/components/cafe/api-error-alert";
import { ConnectionDiscoveryPanel } from "@/components/cafe/connection-discovery-panel";
import { AUTH_HELP, AUTH_LABELS } from "@/lib/connections/auth-labels";
import {
  DEFAULT_API_KEY_HEADER,
  DEFAULT_API_KEY_QUERY_PARAM,
} from "@/lib/connections/auth-config";
import { AUTH_KINDS, type AuthKind } from "@/lib/connections/types";

type TestResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status?: number; error: string };

type ApplyValues = {
  name?: string;
  baseUrl: string;
  auth: AuthKind;
  apiKeyHeader?: string;
  apiKeyQueryParam?: string;
  path: string;
  rowsPath?: string;
  secret?: string;
};

/**
 * Split a test path such as `/posts?_limit=3` into the path and query the proxy expects.
 *
 * Query parameters used to be discarded here, which silently broke any API whose key belongs
 * in the query string.
 */
export function splitTestPath(raw: string): {
  path: string;
  query?: Record<string, string>;
} {
  const trimmed = raw.trim() || "/";
  const withoutScheme = trimmed;
  const relative = withoutScheme.startsWith("/") ? withoutScheme : `/${withoutScheme}`;
  const [path, search] = relative.split("?");
  if (!search) return { path: path || "/" };
  const query = Object.fromEntries(new URLSearchParams(search));
  return {
    path: path || "/",
    query: Object.keys(query).length > 0 ? query : undefined,
  };
}

export function ConnectionPourForm({
  onSaved,
}: {
  onSaved?: (connectionId: string) => void;
}) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://jsonplaceholder.typicode.com");
  const [auth, setAuth] = useState<AuthKind>("none");
  const [apiKeyHeader, setApiKeyHeader] = useState(DEFAULT_API_KEY_HEADER);
  const [apiKeyQueryParam, setApiKeyQueryParam] = useState(
    DEFAULT_API_KEY_QUERY_PARAM,
  );
  const [secret, setSecret] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [testPath, setTestPath] = useState("/posts?_limit=3");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function applyDiscovery(values: ApplyValues) {
    setBaseUrl(values.baseUrl);
    setAuth(values.auth);
    setTestPath(values.path);
    if (values.name) setName(values.name);
    if (values.apiKeyHeader) setApiKeyHeader(values.apiKeyHeader);
    if (values.apiKeyQueryParam) setApiKeyQueryParam(values.apiKeyQueryParam);
    if (values.secret) setSecret(values.secret);
    setTestResult(null);
    setSaveError(null);
    setStatus(
      "Settings applied. Add the API key if you have not already, then test the pour.",
    );
  }

  /** Credential-carrying fields, shared by the test and save calls. */
  function credentialPayload() {
    // Only the fields belonging to the selected scheme are sent; the rest are omitted rather
    // than blanked, so a stale value can never be replayed under a different auth type.
    switch (auth) {
      case "apiKeyHeader":
        return { apiKeyHeader, secret: secret || undefined };
      case "apiKeyQuery":
        return { apiKeyQueryParam, secret: secret || undefined };
      case "bearer":
        return { secret: secret || undefined };
      case "basic":
        return { basicUsername, basicPassword };
      default:
        return {};
    }
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    setStatus(null);
    try {
      const { path, query } = splitTestPath(testPath);
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          auth,
          ...credentialPayload(),
          path,
          query,
        }),
      });
      const data = (await res.json()) as TestResult;
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, error: "Network error while testing." });
    } finally {
      setTesting(false);
    }
  }

  async function saveConnection() {
    if (!name.trim()) {
      setSaveError("Give this pour a name.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          baseUrl,
          auth,
          ...credentialPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ? JSON.stringify(data.error) : "Could not save.");
        return;
      }
      onSaved?.(data.connection.id);
    } catch {
      setSaveError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConnectionDiscoveryPanel onApply={applyDiscovery} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="name">Pour name</Label>
            <Input
              id="name"
              placeholder="EIA retail sales"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The part shared by every request, for example{" "}
              <code className="font-mono">https://api.eia.gov/v2</code>.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Auth</Label>
            <Select value={auth} onValueChange={(v) => setAuth(v as AuthKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTH_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {AUTH_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{AUTH_HELP[auth]}</p>
          </div>
          {auth === "apiKeyHeader" ? (
            <div className="space-y-2">
              <Label htmlFor="header">Header name</Label>
              <Input
                id="header"
                value={apiKeyHeader}
                onChange={(e) => setApiKeyHeader(e.target.value)}
              />
              <Label htmlFor="secret">API key</Label>
              <Input
                id="secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
              />
            </div>
          ) : null}
          {auth === "apiKeyQuery" ? (
            <div className="space-y-2">
              <Label htmlFor="queryParam">Query parameter name</Label>
              <Input
                id="queryParam"
                value={apiKeyQueryParam}
                onChange={(e) => setApiKeyQueryParam(e.target.value)}
                placeholder="api_key"
              />
              <Label htmlFor="secretQuery">API key</Label>
              <Input
                id="secretQuery"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Requests will be sent as{" "}
                <code className="font-mono">
                  ?{apiKeyQueryParam || DEFAULT_API_KEY_QUERY_PARAM}=…
                </code>
              </p>
            </div>
          ) : null}
          {auth === "bearer" ? (
            <div className="space-y-2">
              <Label htmlFor="bearer">Bearer token</Label>
              <Input
                id="bearer"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="off"
              />
            </div>
          ) : null}
          {auth === "basic" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user">Username</Label>
                <Input
                  id="user"
                  value={basicUsername}
                  onChange={(e) => setBasicUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass">Password</Label>
                <Input
                  id="pass"
                  type="password"
                  value={basicPassword}
                  onChange={(e) => setBasicPassword(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="testPath">Test GET path</Label>
            <Input
              id="testPath"
              value={testPath}
              onChange={(e) => setTestPath(e.target.value)}
              placeholder="/electricity/retail-sales/data/?length=5"
            />
            <p className="text-xs text-muted-foreground">
              Query parameters are kept and sent with the request. The rows path is chosen
              when you create a dataset, where the response shape is previewed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={runTest} disabled={testing}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : null}
              Test pour
            </Button>
            <Button type="button" onClick={saveConnection} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save connection
            </Button>
          </div>
          {status ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{status}</p>
          ) : null}
          {saveError ? <ApiErrorAlert message={saveError} /> : null}
          <p className="text-xs text-muted-foreground">
            Tokens stay on the server — they are never bundled into the browser app.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-5">
          <h2 className="font-heading text-lg text-foreground">Tasting notes</h2>
          {!testResult ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Run a test GET to preview status and JSON from your API.
            </p>
          ) : testResult.ok ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                HTTP {testResult.status} — looks good
              </p>
              <Textarea
                readOnly
                className="min-h-[280px] font-mono text-xs"
                value={JSON.stringify(testResult.data, null, 2)}
              />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <ApiErrorAlert
                title={testResult.status ? `HTTP ${testResult.status}` : "Blocked"}
                message={testResult.error}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
