import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "psych_theme";

function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    const dark = theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#0b1120" : "#465fff");
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* 隐私模式下 localStorage 不可写时忽略，本次会话内仍然生效 */
    }
  }, [theme]);

  /* 切换的 ~260ms 内加过渡类：整页颜色渐变而不是硬切 */
  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 260);
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return { theme, toggleTheme };
}
