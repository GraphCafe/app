import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CafeShell } from "@/components/cafe/cafe-shell";
import { ExplorePanel } from "@/components/explore/explore-panel";

export const instant = false;

type Props = { params: Promise<{ datasetId: string }> };

export default async function ExplorePage({ params }: Props) {
  const { datasetId } = await params;
  return (
    <CafeShell title="Explore" subtitle="Execute the roast and preview JSON + table.">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        }
      >
        <ExplorePanel datasetId={datasetId} />
      </Suspense>
    </CafeShell>
  );
}
