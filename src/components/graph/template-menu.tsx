"use client";

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
        "flex h-full flex-col border-border bg-muted/95 shadow-[var(--shadow-popover)] backdrop-blur-sm",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg text-foreground">
          Today&apos;s menu
        </CardTitle>
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
                        ? "border-foreground bg-muted"
                        : "border-transparent bg-card/50 hover:border-border hover:bg-card/80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {template.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-border/60 text-[10px] text-muted-foreground"
                      >
                        {template.mood}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
        <Separator className="bg-border" />
        <p className="text-xs text-muted-foreground">
          Double-click a node to rename it. Drag from the bottom handle to
          another node to link them.
        </p>
        <Button
          type="button"
          variant="outline"
          className="border-border text-foreground"
          onClick={() => onSelect(graphTemplates[0])}
        >
          Clear to blank slate
        </Button>
      </CardContent>
    </Card>
  );
}
