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
import { AlertCircle, Loader2, Menu, Plus, Trash2 } from "lucide-react";
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
            style: { stroke: "var(--cafe-mocha)", strokeWidth: 2 },
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
      style: { stroke: "var(--cafe-mocha)", strokeWidth: 2 },
      animated: false,
    }),
    [],
  );

  const isEmpty = nodes.length === 0 && status !== "loading";

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="hidden w-[min(100%,320px)] shrink-0 border-r border-[var(--cafe-latte)] p-4 lg:block">
        <TemplateMenu activeId={activeTemplateId} onSelect={loadTemplate} />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cafe-latte)] bg-[var(--cafe-menu)]/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--cafe-latte)] bg-transparent text-[var(--cafe-espresso)] lg:hidden hover:bg-white/60"
                aria-label="Open graph menu"
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(100vw,360px)] border-[var(--cafe-latte)] bg-[var(--cafe-walnut)] p-0"
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
            <div>
              <h1 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--cafe-espresso)]">
                Graph.Cafe
              </h1>
              <p className="text-xs text-[var(--cafe-mocha)]">
                Small graphs, served warm.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={addNode}
              className="bg-[var(--cafe-espresso)] text-[var(--cafe-foam)] hover:bg-[var(--cafe-mocha)]"
            >
              <Plus className="h-4 w-4" />
              Add node
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearGraph}
              className="border-[var(--cafe-latte)] text-[var(--cafe-espresso)]"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </header>

        <div className="relative min-h-[min(70vh,640px)] flex-1 bg-[var(--cafe-canvas)]">
          {status === "loading" && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--cafe-canvas)]/90"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-[var(--cafe-caramel)]" />
              <p className="text-sm text-[var(--cafe-mocha)]">
                Brewing your graph…
              </p>
            </div>
          )}

          {status === "error" && errorMessage && (
            <div
              className="absolute inset-x-4 top-4 z-20 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-md"
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
              <p className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--cafe-espresso)]/90">
                Your canvas is empty
              </p>
              <p className="mt-2 max-w-sm text-sm text-[var(--cafe-mocha)]">
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
              color="var(--cafe-latte)"
            />
            <Controls
              className="!rounded-xl !border-[var(--cafe-latte)] !bg-[var(--cafe-cream)] !shadow-md [&>button]:!border-[var(--cafe-latte)] [&>button]:!bg-white"
            />
            <MiniMap
              className="!rounded-xl !border-[var(--cafe-latte)] !bg-[var(--cafe-cream)]/90"
              nodeColor="var(--cafe-caramel)"
              maskColor="rgba(62, 39, 35, 0.08)"
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
