import type { Edge, Node } from "@xyflow/react";

export type GraphTemplate = {
  id: string;
  name: string;
  description: string;
  mood: string;
  nodes: Node[];
  edges: Edge[];
};

const baseNode = (
  id: string,
  label: string,
  x: number,
  y: number,
  flavor?: string,
): Node => ({
  id,
  type: "cafe",
  position: { x, y },
  data: { label, flavor },
});

export const graphTemplates: GraphTemplate[] = [
  {
    id: "blank",
    name: "Blank Slate",
    description: "An empty cup — sketch your own idea from scratch.",
    mood: "Quiet corner",
    nodes: [],
    edges: [],
  },
  {
    id: "morning-routine",
    name: "Morning Routine",
    description: "How a slow start becomes a productive day.",
    mood: "First light roast",
    nodes: [
      baseNode("wake", "Wake up", 0, 80, "oat latte"),
      baseNode("stretch", "Stretch", 200, 0, "cinnamon"),
      baseNode("brew", "Brew coffee", 200, 160, "espresso"),
      baseNode("plan", "Plan the day", 420, 80, "pour-over"),
    ],
    edges: [
      { id: "e1", source: "wake", target: "stretch" },
      { id: "e2", source: "wake", target: "brew" },
      { id: "e3", source: "stretch", target: "plan" },
      { id: "e4", source: "brew", target: "plan" },
    ],
  },
  {
    id: "espresso-pipeline",
    name: "Espresso Pipeline",
    description: "A tiny workflow from bean to cup.",
    mood: "Barista flow",
    nodes: [
      baseNode("grind", "Grind", 0, 100, "dark roast"),
      baseNode("tamp", "Tamp", 180, 40, "pressure"),
      baseNode("pull", "Pull shot", 360, 100, "crema"),
      baseNode("steam", "Steam milk", 360, 220, "microfoam"),
      baseNode("serve", "Serve", 560, 140, "ceramic"),
    ],
    edges: [
      { id: "ep1", source: "grind", target: "tamp" },
      { id: "ep2", source: "tamp", target: "pull" },
      { id: "ep3", source: "pull", target: "serve" },
      { id: "ep4", source: "steam", target: "serve" },
      { id: "ep5", source: "tamp", target: "steam" },
    ],
  },
  {
    id: "friend-circle",
    name: "Friend Circle",
    description: "Who knows whom at the neighborhood café.",
    mood: "Communal table",
    nodes: [
      baseNode("you", "You", 280, 200, "regular"),
      baseNode("maya", "Maya", 80, 80, "pastry fan"),
      baseNode("leo", "Leo", 500, 80, "tea person"),
      baseNode("sam", "Sam", 80, 320, "remote worker"),
      baseNode("june", "June", 500, 320, "book club"),
    ],
    edges: [
      { id: "fc1", source: "you", target: "maya" },
      { id: "fc2", source: "you", target: "leo" },
      { id: "fc3", source: "you", target: "sam" },
      { id: "fc4", source: "you", target: "june" },
      { id: "fc5", source: "maya", target: "sam" },
      { id: "fc6", source: "leo", target: "june" },
    ],
  },
  {
    id: "study-group",
    name: "Study Group",
    description: "Topics and how they connect before the exam.",
    mood: "Late study session",
    nodes: [
      baseNode("topic", "Main topic", 300, 0, "chapter 4"),
      baseNode("a", "Concept A", 100, 140, "definitions"),
      baseNode("b", "Concept B", 300, 140, "examples"),
      baseNode("c", "Concept C", 500, 140, "edge cases"),
      baseNode("quiz", "Practice quiz", 300, 280, "flash cards"),
    ],
    edges: [
      { id: "sg1", source: "topic", target: "a" },
      { id: "sg2", source: "topic", target: "b" },
      { id: "sg3", source: "topic", target: "c" },
      { id: "sg4", source: "a", target: "quiz" },
      { id: "sg5", source: "b", target: "quiz" },
      { id: "sg6", source: "c", target: "quiz" },
    ],
  },
];

export function getTemplate(id: string): GraphTemplate | undefined {
  return graphTemplates.find((t) => t.id === id);
}
