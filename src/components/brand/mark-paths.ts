/**
 * Geometry of the Graph.Cafe master mark (spec §2.1), copied from
 * docs/superpowers/specs/assets/graphcafe-mark-light.svg. Keep src/app/icon.svg in sync.
 */
export type MarkStroke = { d: string; width: number; opacity?: number };

export const VIEWBOX = "11 18 104 104";

/** Steam lines are drawn 3 units left of where they were sketched. */
export const STEAM_OFFSET_X = -3;

/** Bowl first; then foot, handle, rim, and the faint sketch details. */
export const CUP_STROKES: MarkStroke[] = [
  { d: "M18.6 63.5 C18 82 31 102 55 103.5 C77 104.8 92 86 94.6 61.5", width: 3 },
  { d: "M45 104.4 C51 106.4 61 106.4 67 104", width: 2 },
  { d: "M95.1 69.6 C104.5 62.6 113 65.8 110.5 76 C108.5 84 100 87.2 87.1 84.1", width: 2.7 },
  {
    d: "M24 55 C34 49.5 48 48.6 60 48.8 C76 49.2 90 52 93.6 58.5 C96.5 64 86 72.5 66 74.6 C48 76.4 28 74.5 20.5 68.6 C14.5 63.8 18 58 27.5 53.8 C30 52.8 32.5 52 35 51.4",
    width: 2.7,
  },
  { d: "M28 66 C40 70.5 70 71.5 86 64", width: 1.1, opacity: 0.4 },
  { d: "M95 74.5 C91.6 88.5 81.5 99.8 66 103.4", width: 0.9, opacity: 0.5 },
  { d: "M17 70 C18.5 80 23 89 30 95", width: 0.9, opacity: 0.4 },
  { d: "M71 99 L78 92.5 M77.5 97 L84.5 90 M83.5 93.5 L89 87.5", width: 1, opacity: 0.45 },
];

export const SHADOWS = [
  { cx: 60, cy: 106.5, rx: 38, ry: 5, fill: "var(--logo-shadow-1)" },
  { cx: 57, cy: 105, rx: 20, ry: 2.6, fill: "var(--logo-shadow-2)" },
] as const;

/** The fainter steam line behind and to the right; drawn as a group at this opacity. */
export const BACK_OPACITY = 0.48;
export const BACK_LINE: MarkStroke = {
  d: "M73 58 C76.2 53.2 79.6 48 83.1 42.9 M82.8 43.3 C83.9 43.8 84.9 44.3 86.1 44.9 M85.8 45 C87.6 42.5 89.5 39.6 91.35 36.75",
  width: 1.1,
};
export const BACK_ARROW: MarkStroke = { d: "M89 38 Q90.2 37.4 91.35 36.75 Q91.3 38.1 91.15 39.4", width: 1.1 };

export const MAIN_LINE: MarkStroke = {
  d: "M54 68 C58.6 58.4 63.8 49.1 69.8 40.3 M69.3 40.8 C71.2 41.6 73 42.8 75 44.2 M74.6 44.4 C76.6 40.9 78.7 37.1 80.9 33.4",
  width: 1.9,
};
export const MAIN_PRESSURE: MarkStroke = {
  d: "M61.6 54.6 C64.2 50 66.9 45.3 69.6 40.6 M76.6 41.2 C77.9 38.9 79 36.8 80.2 34.6",
  width: 2.6,
};
export const MAIN_SEARCH: MarkStroke = {
  d: "M56.5 62.8 C59.5 57.6 62.4 52.3 65.4 47.2 M75.3 40.6 C76.6 38.3 77.8 36.3 78.9 34.4",
  width: 0.8,
  opacity: 0.35,
};
export const MAIN_RING: MarkStroke = {
  d: "M83.3 32.1 C83.3 33.1 82.5 33.7 81.6 33.6 C80.7 33.5 80.1 32.8 80.15 31.9 C80.2 31 81 30.4 81.8 30.45 C82.6 30.5 83.25 31.1 83.3 31.8",
  width: 1.1,
  opacity: 0.85,
};

/** Width of the rim cut-out around each steam line. */
export const KNOCKOUT = { back: 4, main: 6 } as const;
