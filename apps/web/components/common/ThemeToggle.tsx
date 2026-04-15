"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const next = () => {
    const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  return (
    <button
      type="button"
      onClick={next}
      className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title={`Theme: ${theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}`}
    >
      {theme === "light" && <Sun className="w-4 h-4" />}
      {theme === "dark" && <Moon className="w-4 h-4" />}
      {theme === "system" && <Monitor className="w-4 h-4" />}
    </button>
  );
}
