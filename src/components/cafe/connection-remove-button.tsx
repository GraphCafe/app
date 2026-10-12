"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorAlert } from "@/components/cafe/api-error-alert";

export function ConnectionRemoveButton({
  connectionId,
  connectionName,
  onRemoved,
}: {
  connectionId: string;
  connectionName: string;
  onRemoved: (connectionId: string) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const ok = window.confirm(
      `Remove "${connectionName}"? Saved roasts for this connection will be deleted. This cannot be undone.`,
    );
    if (!ok) return;

    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not remove connection.");
        return;
      }
      onRemoved(connectionId);
    } catch {
      setError("Network error.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={removing}
        onClick={() => void remove()}
      >
        {removing ? (
          <>
            <Loader2 className="animate-spin" data-icon="inline-start" />
            Removing…
          </>
        ) : (
          "Remove connection"
        )}
      </Button>
      {error ? <ApiErrorAlert message={error} /> : null}
    </div>
  );
}
