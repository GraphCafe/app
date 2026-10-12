import { Suspense } from "react";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { AuthForm } from "@/components/cafe/auth-form";

export default function LoginPage() {
  return (
    <CafeShell
      title="Sign in"
      subtitle="Your connections and credentials stay on this Graph.Cafe instance."
    >
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </CafeShell>
  );
}
