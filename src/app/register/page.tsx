import { Suspense } from "react";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { AuthForm } from "@/components/cafe/auth-form";

export default function RegisterPage() {
  return (
    <CafeShell
      title="Create account"
      subtitle="One account per email on this server. Use a strong password you do not reuse elsewhere."
    >
      <Suspense fallback={null}>
        <AuthForm mode="register" />
      </Suspense>
    </CafeShell>
  );
}
