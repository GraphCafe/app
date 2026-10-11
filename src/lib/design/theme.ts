export type ThemePref = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "graphcafe-theme";

const PREFS: readonly ThemePref[] = ["system", "light", "dark"];

/** Stored value → preference; anything missing or unknown means "follow the system". */
export function parseThemePref(raw: string | null): ThemePref {
  return PREFS.includes(raw as ThemePref) ? (raw as ThemePref) : "system";
}

export function nextThemePref(pref: ThemePref): ThemePref {
  return PREFS[(PREFS.indexOf(pref) + 1) % PREFS.length];
}

/** Puts the light/dark override class on <html>; "system" leaves it to prefers-color-scheme. */
export function applyThemePref(pref: ThemePref, root: HTMLElement = document.documentElement) {
  root.classList.remove("light", "dark");
  if (pref !== "system") root.classList.add(pref);
}

/** Inline <head> script: applies a stored override before first paint so there is no flash. */
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.classList.add(t)}catch(e){}`;
