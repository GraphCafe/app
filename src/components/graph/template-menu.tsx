"use client";

import { Coffee, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { graphTemplates, type GraphTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";

type TemplateMenuProps = {
  activeId: string | null;
  onSelect: (template: GraphTemplate) => void;
  className?: string;
};

export function TemplateMenu({
  activeId,
  onSelect,
  className,
}: TemplateMenuProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col border-[var(--cafe-latte)] bg-[var(--cafe-menu)]/95 shadow-lg backdrop-blur-sm",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-[var(--cafe-espresso)]" aria-hidden />
          <CardTitle className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--cafe-espresso)]">
            Today&apos;s menu
          </CardTitle>
        </div>
        <p className="text-sm text-[var(--cafe-mocha)]">
          Pick a starter graph, then add nodes and draw connections on the
          canvas.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-0">
        <ScrollArea className="min-h-0 flex-1 pr-3">
          <ul className="flex flex-col gap-2">
            {graphTemplates.map((template) => {
              const isActive = activeId === template.id;
              return (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(template)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      isActive
                        ? "border-[var(--cafe-espresso)] bg-[var(--cafe-cream)]"
                        : "border-transparent bg-white/50 hover:border-[var(--cafe-latte)] hover:bg-white/80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-[var(--cafe-espresso)]">
                        {template.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-[var(--cafe-latte)]/60 text-[10px] text-[var(--cafe-mocha)]"
                      >
                        {template.mood}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--cafe-mocha)]">
                      {template.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
        <Separator className="bg-[var(--cafe-latte)]" />
        <div className="flex items-start gap-2 rounded-lg bg-[var(--cafe-cream)]/80 p-3 text-xs text-[var(--cafe-mocha)]">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cafe-caramel)]" />
          <p>
            Double-click a node to rename it. Drag from the bottom handle to
            another node to link them.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-[var(--cafe-latte)] text-[var(--cafe-espresso)]"
          onClick={() => onSelect(graphTemplates[0])}
        >
          Clear to blank slate
        </Button>
      </CardContent>
    </Card>
  );
}
