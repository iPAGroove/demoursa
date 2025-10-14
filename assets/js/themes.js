// URSA Themes (v1.2) — neon (тёмная) / light (светлая)
const THEME_KEY = "ursa_theme";
const THEME_LINK_ID = "theme-css";

export function applyTheme(theme) {
  const link = document.getElementById(THEME_LINK_ID);
  if (!link) return;
  if (theme === "light") {
    link.href = "assets/css/themes/light.css";
  } else {
    link.href = "assets/css/themes/neon.css";
    theme = "neon";
  }
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.setAttribute("aria-label", theme === "light" ? "Тёмная тема" : "Светлая тема");
}

export function toggleTheme() {
  const curr = localStorage.getItem(THEME_KEY) || "neon";
  applyTheme(curr === "neon" ? "light" : "neon");
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(localStorage.getItem(THEME_KEY) || "neon");
  const btn = document.getElementById("theme-toggle");
  if (btn && !btn._bound) {
    btn._bound = true;
    btn.addEventListener("click", toggleTheme);
  }
});
