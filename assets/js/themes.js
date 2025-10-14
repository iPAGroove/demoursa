// URSA Themes — v2.0 Light/Dark Toggle + Persistent Mode
console.log("🎨 URSA Themes v2.0 loaded");

// === Apply theme ===
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("ursa_theme", theme);

  // Анимация смены фона
  document.body.style.transition = "background 0.4s ease, color 0.4s ease";
  document.documentElement.style.transition = "background 0.4s ease, color 0.4s ease";

  console.log(`🌗 Тема активирована: ${theme}`);
}

// === Toggle ===
function toggleTheme() {
  const current = localStorage.getItem("ursa_theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);

  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = next === "dark" ? "🌞" : "🌙";
}

// === Init ===
document.addEventListener("DOMContentLoaded", () => {
  let saved = localStorage.getItem("ursa_theme");

  // Если пользователь впервые — проверяем системную тему
  if (!saved) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    saved = prefersDark ? "dark" : "light";
    localStorage.setItem("ursa_theme", saved);
  }

  setTheme(saved);

  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = saved === "dark" ? "🌞" : "🌙";
});

window.toggleTheme = toggleTheme;
