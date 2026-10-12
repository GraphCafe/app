"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { ConnectionPourForm } from "@/components/cafe/connection-pour-form";
import { SignInRequired } from "@/components/cafe/sign-in-required";

export default function NewConnectionPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "guest" | "user">("loading");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => setAuthState(res.ok ? "user" : "guest"))
      .catch(() => setAuthState("guest"));
  }, []);

  return (
    <CafeShell title="New pour">
      {authState === "loading" ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking account…
        </div>
      ) : authState === "guest" ? (
        <SignInRequired nextPath="/connections/new" />
      ) : (
        <ConnectionPourForm
          onSaved={(id) => {
            router.push(`/connections?saved=${id}`);
          }}
        />
      )}
    </CafeShell>
  );
}
