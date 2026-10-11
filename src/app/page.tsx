import { GraphStudio } from "@/components/graph/graph-studio";

export default function Home() {
  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--cafe-walnut)]">
      <GraphStudio />
    </div>
  );
}
