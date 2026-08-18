import { useEffect, useState } from "react";

export type ThemePreference = "auto" | "light" | "dark";

const KEY = "medguard_theme";

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function storedPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "auto" ? v : "auto";
  } catch {
    return "auto";
  }
}

/**
 * Theme with "auto" (follow OS) default. Once the user toggles, their choice is
 * persisted and overrides the system setting until they set it back to auto.
 */
export function useTheme() {
  const [pref, setPref] = useState<ThemePreference>(storedPreference);
  const [sysDark, setSysDark] = useState<boolean>(systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme: "light" | "dark" = pref === "auto" ? (sysDark ? "dark" : "light") : pref;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setPreference = (p: ThemePreference) => {
    setPref(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
  };

  const toggle = () => setPreference(theme === "dark" ? "light" : "dark");

  return { theme, pref, isAuto: pref === "auto", setPreference, toggle };
}
