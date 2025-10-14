// URSA Themes — v9 (Auto Load + Toggle + Smooth Apply)
console.log("🎨 URSA Themes v9 initialized");

// === Тема по умолчанию ===
const DEFAULT_THEME = "dark";
const THEMES = {
  dark: "assets/css/themes/neon.css",
  light: "assets/css/themes/light.css"
};

// === Применить тему ===
export function applyTheme(theme) {
  const css = document.getElementById("theme-css");
  if (!css) return;

  // если нет такой темы — используем дефолт
  const url = THEMES[theme] || THEMES[DEFAULT_THEME];

  // плавная замена без мерцания
  const clone = css.cloneNode();
  clone.href = url + "?v=" + Date.now(); // cache bust
  clone.onload = () => {
    css.remove();
    clone.id = "theme-css";
    document.head.appendChild(clone);
  };
  css.parentNode.insertBefore(clone, css.nextSibling);
  localStorage.setItem("ursa_theme", theme);
  console.log(`🌗 Theme applied: ${theme}`);
}

// === Переключатель темы ===
export function toggleTheme() {
  const current = localStorage.getItem("ursa_theme") || DEFAULT_THEME;
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
}

// === Автоподгрузка при запуске ===
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("ursa_theme") || DEFAULT_THEME;
  applyTheme(saved);
});
