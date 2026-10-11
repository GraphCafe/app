"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  applyThemePref,
  nextThemePref,
  parseThemePref,
  THEME_STORAGE_KEY,
  type ThemePref,
} from "@/lib/design/theme";

const CHANGE_EVENT = "graphcafe-theme-change";
const LABELS: Record<ThemePref, string> = { system: "System", light: "Light", dark: "Dark" };

function readPref(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Text-only theme switch: System → Light → Dark. */
export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as const);

  function cycle() {
    const next = nextThemePref(pref);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the override still applies for this page view.
    }
    applyThemePref(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[pref]}`}
      className="text-muted-foreground"
    >
      {LABELS[pref]}
    </Button>
  );
}
