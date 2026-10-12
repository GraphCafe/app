"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiErrorAlert } from "@/components/cafe/api-error-alert";
import {
  DEFAULT_API_KEY_HEADER,
  DEFAULT_API_KEY_QUERY_PARAM,
} from "@/lib/connections/auth-config";
import { AUTH_HELP } from "@/lib/connections/auth-labels";
import type { ApiConnection } from "@/lib/connections/types";

type CredentialStatus = {
  hasCredential: boolean;
};

export function ConnectionCredentialsPanel({
  connection,
  onSaved,
}: {
  connection: ApiConnection;
  onSaved?: () => void;
}) {
  const [hasCredential, setHasCredential] = useState<boolean | null>(null);
  const [secret, setSecret] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [oauth2ClientSecret, setOauth2ClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/connections/${connection.id}`);
        const data = await res.json();
        if (cancelled || !res.ok) return;
        const hint = data.credentialStatus as CredentialStatus | undefined;
        setHasCredential(hint?.hasCredential ?? false);
      } catch {
        if (!cancelled) setHasCredential(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection.id]);

  if (connection.auth === "none") return null;

  async function save() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const body: Record<string, string | undefined> = {};
      switch (connection.auth) {
        case "apiKeyHeader":
        case "apiKeyQuery":
        case "bearer":
          if (!secret.trim()) {
            setError("Enter an API key or token before saving.");
            setSaving(false);
            return;
          }
          body.secret = secret;
          break;
        case "basic":
          if (!basicUsername.trim() || !basicPassword) {
            setError("Enter a username and password before saving.");
            setSaving(false);
            return;
          }
          body.basicUsername = basicUsername;
          body.basicPassword = basicPassword;
          break;
        case "oauth2":
          if (oauth2ClientSecret.trim()) {
            body.oauth2ClientSecret = oauth2ClientSecret;
          } else {
            setError("Enter the OAuth client secret, or use Connect with OAuth below.");
            setSaving(false);
            return;
          }
          break;
        default:
          break;
      }

      const res = await fetch(`/api/connections/${connection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not save the credential.",
        );
        return;
      }
      setHasCredential(true);
      setSecret("");
      setBasicPassword("");
      setOauth2ClientSecret("");
      setStatus("Credential saved on the server.");
      onSaved?.();
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  const queryParam =
    connection.apiKeyQueryParam?.trim() || DEFAULT_API_KEY_QUERY_PARAM;
  const headerName =
    connection.apiKeyHeader?.trim() || DEFAULT_API_KEY_HEADER;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
      <div className="flex items-start gap-2">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Connection credential</h3>
          <p className="text-xs text-muted-foreground">{AUTH_HELP[connection.auth]}</p>
          {hasCredential === true ? (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              A credential is stored for this pour. Enter a new value below to replace it.
            </p>
          ) : hasCredential === false ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">No credential saved yet.</span>{" "}
              API calls and endpoint analysis will fail until you save one below.
            </p>
          ) : null}
        </div>
      </div>

      {connection.auth === "apiKeyHeader" ? (
        <div className="space-y-2">
          <Label htmlFor={`cred-secret-${connection.id}`}>
            API key ({headerName} header)
          </Label>
          <Input
            id={`cred-secret-${connection.id}`}
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>
      ) : null}

      {connection.auth === "apiKeyQuery" ? (
        <div className="space-y-2">
          <Label htmlFor={`cred-secret-${connection.id}`}>
            API key (?{queryParam}=…)
          </Label>
          <Input
            id={`cred-secret-${connection.id}`}
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>
      ) : null}

      {connection.auth === "bearer" ? (
        <div className="space-y-2">
          <Label htmlFor={`cred-secret-${connection.id}`}>Bearer token</Label>
          <Input
            id={`cred-secret-${connection.id}`}
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>
      ) : null}

      {connection.auth === "basic" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`cred-user-${connection.id}`}>Username</Label>
            <Input
              id={`cred-user-${connection.id}`}
              value={basicUsername}
              onChange={(e) => setBasicUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`cred-pass-${connection.id}`}>Password</Label>
            <Input
              id={`cred-pass-${connection.id}`}
              type="password"
              autoComplete="off"
              value={basicPassword}
              onChange={(e) => setBasicPassword(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {connection.auth === "oauth2" ? (
        <div className="space-y-2">
          <Label htmlFor={`cred-oauth-secret-${connection.id}`}>Client secret</Label>
          <Input
            id={`cred-oauth-secret-${connection.id}`}
            type="password"
            autoComplete="off"
            value={oauth2ClientSecret}
            onChange={(e) => setOauth2ClientSecret(e.target.value)}
          />
        </div>
      ) : null}

      {error ? <ApiErrorAlert message={error} /> : null}
      {status ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">{status}</p>
      ) : null}

      <Button type="button" size="sm" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save credential
      </Button>
    </div>
  );
}
