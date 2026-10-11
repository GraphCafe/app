"use client";

import { useRouter } from "next/navigation";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { ConnectionPourForm } from "@/components/cafe/connection-pour-form";

export default function NewConnectionPage() {
  const router = useRouter();
  return (
    <CafeShell
      title="New pour"
      subtitle="Name your connection, paste credentials once, and test a GET."
    >
      <ConnectionPourForm
        onSaved={(id) => {
          router.push(`/connections?saved=${id}`);
        }}
      />
    </CafeShell>
  );
}
