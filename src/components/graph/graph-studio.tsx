"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertCircle, Loader2, Menu } from "lucide-react";
import { CafeNode } from "@/components/graph/cafe-node";
import { TemplateMenu } from "@/components/graph/template-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { graphTemplates, type GraphTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";

const nodeTypes = { cafe: CafeNode };

let nodeCounter = 0;

function cloneTemplate(template: GraphTemplate): {
  nodes: Node[];
  edges: Edge[];
} {
  return {
    nodes: template.nodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: template.edges.map((e) => ({ ...e })),
  };
}

function GraphStudioInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadTemplate = useCallback(
    (template: GraphTemplate) => {
      setStatus("loading");
      setErrorMessage(null);
      window.setTimeout(() => {
        try {
          const { nodes: nextNodes, edges: nextEdges } = cloneTemplate(template);
          setNodes(nextNodes);
          setEdges(nextEdges);
          setActiveTemplateId(template.id);
          setStatus("idle");
        } catch {
          setStatus("error");
          setErrorMessage(
            "We couldn't load that graph. Try another item from the menu.",
          );
        }
      }, 320);
    },
    [setEdges, setNodes],
  );

  useEffect(() => {
    loadTemplate(graphTemplates[1]);
  }, [loadTemplate]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            style: { stroke: "var(--muted-foreground)", strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const addNode = useCallback(() => {
    nodeCounter += 1;
    const id = `node-${nodeCounter}`;
    const newNode: Node = {
      id,
      type: "cafe",
      position: {
        x: 120 + (nodeCounter % 5) * 40,
        y: 120 + (nodeCounter % 3) * 50,
      },
      data: { label: `Idea ${nodeCounter}`, flavor: "fresh ground" },
    };
    setNodes((nds) => [...nds, newNode]);
    setActiveTemplateId(null);
  }, [setNodes]);

  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setActiveTemplateId("blank");
    setStatus("idle");
    setErrorMessage(null);
  }, [setEdges, setNodes]);

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: "var(--muted-foreground)", strokeWidth: 2 },
      animated: false,
    }),
    [],
  );

  const isEmpty = nodes.length === 0 && status !== "loading";

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="hidden w-[min(100%,320px)] shrink-0 border-r border-border p-4 lg:block">
        <TemplateMenu activeId={activeTemplateId} onSelect={loadTemplate} />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-transparent text-foreground lg:hidden hover:bg-card/60"
                aria-label="Open graph menu"
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(100vw,360px)] border-border bg-background p-0"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Graph menu</SheetTitle>
                </SheetHeader>
                <div className="h-full p-4">
                  <TemplateMenu
                    activeId={activeTemplateId}
                    onSelect={(t) => {
                      loadTemplate(t);
                      setMenuOpen(false);
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-heading text-xl text-foreground">Graph.Cafe</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={addNode}
            >
              Add node
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearGraph}
              className="border-border text-foreground"
            >
              Clear
            </Button>
          </div>
        </header>

        <div className="relative min-h-[min(70vh,640px)] flex-1 bg-muted">
          {status === "loading" && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-muted/90"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Brewing your graph…
              </p>
            </div>
          )}

          {status === "error" && errorMessage && (
            <div
              className="absolute inset-x-4 top-4 z-20 flex items-start gap-2 rounded-lg border border-status-error/30 bg-status-error-tint px-4 py-3 text-sm text-status-error shadow-[var(--shadow-popover)]"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Something spilled</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {isEmpty && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
              aria-hidden={nodes.length > 0}
            >
              <p className="font-heading text-2xl text-foreground/90">
                Your canvas is empty
              </p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Choose a template from the menu or tap{" "}
                <span className="font-medium">Add node</span> to place your
                first idea.
              </p>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            className={cn(
              "h-full w-full",
              status === "loading" && "opacity-40",
            )}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--border)"
            />
            <Controls
              className="!rounded-xl !border-border !bg-muted !shadow-[var(--shadow-popover)] [&>button]:!border-border [&>button]:!bg-card"
            />
            <MiniMap
              className="!rounded-xl !border-border !bg-muted/90"
              nodeColor="var(--muted-foreground)"
              maskColor="color-mix(in srgb, var(--foreground) 8%, transparent)"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export function GraphStudio() {
  return (
    <ReactFlowProvider>
      <GraphStudioInner />
    </ReactFlowProvider>
  );
}
