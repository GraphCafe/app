/** Number of categorical slots in the fixed chart order (spec §3.3). */
export const CHART_SLOT_COUNT = 8;

/**
 * Color for the series at `index`. Slots are assigned in a fixed order and never cycled:
 * a 9th series and beyond fold into the neutral "other" color.
 */
export function seriesColor(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`Series index must be a non-negative integer, got ${index}`);
  }
  return index < CHART_SLOT_COUNT ? `var(--chart-${index + 1})` : "var(--chart-other)";
}

/** Chart chrome uses UI tokens so axes, gridlines, and labels stay neutral. */
export const CHART_CHROME = {
  grid: "var(--gridline)",
  axis: "var(--border)",
  tick: "var(--muted-foreground)",
  label: "var(--foreground)",
} as const;
