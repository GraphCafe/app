import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { ReportStudioClient } from "@/components/reports/report-studio-client";

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  return (
    <CafeShell title="Report Studio" subtitle="Saved widgets on your data plate.">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        }
      >
        <ReportStudioClient reportId={id} />
      </Suspense>
    </CafeShell>
  );
}
