"use client";

import { memo, useCallback, useState } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export type CafeNodeData = {
  label: string;
  flavor?: string;
};

function CafeNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as CafeNodeData;
  const { setNodes } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nodeData.label);

  const commitLabel = useCallback(() => {
    const next = draft.trim() || "Untitled";
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label: next } } : n,
      ),
    );
    setEditing(false);
  }, [draft, id, setNodes]);

  return (
    <div
      className={cn(
        "min-w-[120px] max-w-[200px] rounded-lg border-2 bg-muted px-3 py-2 transition-shadow",
        selected
          ? "border-foreground shadow-[0_8px_24px_-8px_rgba(62,39,35,0.35)]"
          : "border-border",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-foreground !bg-background"
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitLabel();
            if (e.key === "Escape") {
              setDraft(nodeData.label);
              setEditing(false);
            }
          }}
          className="w-full rounded-md border border-border bg-card/80 px-1.5 py-0.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-muted-foreground"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => {
            setDraft(nodeData.label);
            setEditing(true);
          }}
          className="w-full text-left"
        >
          <p className="font-medium text-sm text-foreground leading-tight">
            {nodeData.label}
          </p>
          {nodeData.flavor ? (
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/80">
              {nodeData.flavor}
            </p>
          ) : null}
        </button>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-foreground !bg-background"
      />
    </div>
  );
}

export const CafeNode = memo(CafeNodeComponent);
