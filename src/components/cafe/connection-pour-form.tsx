"use client";

import { useState } from "react";
import { Loader2, FlaskConical } from "lucide-react";
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
import type { AuthKind } from "@/lib/connections/types";

type TestResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status?: number; error: string };

export function ConnectionPourForm({
  onSaved,
}: {
  onSaved?: (connectionId: string) => void;
}) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://jsonplaceholder.typicode.com");
  const [auth, setAuth] = useState<AuthKind>("none");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [secret, setSecret] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [testPath, setTestPath] = useState("/posts?_limit=3");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          auth,
          apiKeyHeader: auth === "apiKeyHeader" ? apiKeyHeader : undefined,
          secret: secret || undefined,
          basicUsername: auth === "basic" ? basicUsername : undefined,
          basicPassword: auth === "basic" ? basicPassword : undefined,
          path: testPath.startsWith("/") ? testPath.split("?")[0] : `/${testPath}`,
          query: testPath.includes("?")
            ? Object.fromEntries(new URLSearchParams(testPath.split("?")[1]))
            : undefined,
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
          apiKeyHeader: auth === "apiKeyHeader" ? apiKeyHeader : undefined,
          secret: secret || undefined,
          basicUsername: auth === "basic" ? basicUsername : undefined,
          basicPassword: auth === "basic" ? basicPassword : undefined,
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-[var(--cafe-latte)] bg-white p-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name">Pour name</Label>
          <Input
            id="name"
            placeholder="Platts sandbox"
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
        </div>
        <div className="space-y-2">
          <Label>Auth</Label>
          <Select value={auth} onValueChange={(v) => setAuth(v as AuthKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer token</SelectItem>
              <SelectItem value="apiKeyHeader">API key header</SelectItem>
              <SelectItem value="basic">Basic auth</SelectItem>
            </SelectContent>
          </Select>
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
            placeholder="/posts?_limit=2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={runTest} disabled={testing}>
            {testing ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
            Test pour
          </Button>
          <Button type="button" onClick={saveConnection} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save connection
          </Button>
        </div>
        {saveError ? <ApiErrorAlert message={saveError} /> : null}
        <p className="text-xs text-[var(--cafe-mocha)]">
          Tokens stay on the server — they are never bundled into the browser app.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--cafe-latte)] bg-[var(--cafe-cream)] p-5">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--cafe-walnut)]">
          Tasting notes
        </h2>
        {!testResult ? (
          <p className="mt-2 text-sm text-[var(--cafe-mocha)]">
            Run a test GET to preview status and JSON from your API.
          </p>
        ) : testResult.ok ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-emerald-800">
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
  );
}
