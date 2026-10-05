"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
const ORDER: Mode[] = ["system", "light", "dark"];
const ICON: Record<Mode, string> = { system: "🖥️", light: "☀️", dark: "🌙" };
const LABEL: Record<Mode, string> = { system: "System", light: "Light", dark: "Dark" };

function apply(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    let saved: Mode = "system";
    try {
      const v = localStorage.getItem("theme");
      if (v === "light" || v === "dark") saved = v;
    } catch {
      /* storage blocked */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the persisted choice after hydration
    setMode(saved);
  }, []);

  // follow OS changes while in "system" mode
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    setMode(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    apply(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${LABEL[mode]} (click to change)`}
      aria-label={`Theme: ${LABEL[mode]}. Click to change.`}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md hover:bg-slate-100 print:hidden"
    >
      <span aria-hidden>{ICON[mode]}</span>
      {LABEL[mode]}
    </button>
  );
}
