"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorAlert } from "@/components/cafe/api-error-alert";
import type { OAuth2ConnectionStatus } from "@/lib/connections/types";

type StatusResponse = {
  status: OAuth2ConnectionStatus;
  redirectUri: string;
};

export function OAuthConnectPanel({
  connectionId,
  compact = false,
}: {
  connectionId: string;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/oauth/status/${connectionId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(
            typeof data.error === "string" ? data.error : "Could not load OAuth status.",
          );
          setStatus(null);
          return;
        }
        setStatus(data as StatusResponse);
      } catch {
        if (!cancelled) setError("Network error while loading OAuth status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connectionId]);

  async function startOAuth() {
    setStarting(true);
    setError(null);
    try {
      const returnTo =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/connections";
      const res = await fetch("/api/oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, returnTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not start OAuth.");
        return;
      }
      if (typeof data.authorizeUrl === "string") {
        window.location.assign(data.authorizeUrl);
      }
    } catch {
      setError("Network error while starting OAuth.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Checking OAuth status…
      </p>
    );
  }

  const oauthStatus = status?.status;
  const connected = oauthStatus?.connected;
  const configured = oauthStatus?.configured ?? false;

  return (
    <div
      className={
        compact
          ? "space-y-2"
          : "space-y-3 rounded-lg border border-border bg-muted/60 p-4"
      }
    >
      {!compact ? (
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">OAuth 2.0 connection</h3>
            <p className="text-xs text-muted-foreground">
              Register this redirect URI with your API provider, then authorize once in the
              browser.
            </p>
          </div>
        </div>
      ) : null}

      {status?.redirectUri ? (
        <p className="text-xs text-muted-foreground">
          Redirect URI:{" "}
          <code className="break-all font-mono">{status.redirectUri}</code>
        </p>
      ) : null}

      {connected ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Connected
          {oauthStatus?.expiresAt ? (
            <>
              {" "}
              — access token expires{" "}
              <time dateTime={oauthStatus.expiresAt}>
                {new Date(oauthStatus.expiresAt).toLocaleString()}
              </time>
              {oauthStatus.expiresSoon ? " (refreshing soon on next request)" : null}
            </>
          ) : (
            " — access token stored on the server"
          )}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {configured
            ? "Not connected yet. Save the client secret, then authorize."
            : "Finish the OAuth URLs and client ID on this connection before connecting."}
        </p>
      )}

      {error ? <ApiErrorAlert message={error} /> : null}

      <Button
        type="button"
        size={compact ? "sm" : "default"}
        variant={connected ? "secondary" : "default"}
        disabled={starting || !configured}
        onClick={startOAuth}
      >
        {starting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ExternalLink className="size-4" />
        )}
        {connected ? "Re-authorize with OAuth" : "Connect with OAuth"}
      </Button>
    </div>
  );
}
