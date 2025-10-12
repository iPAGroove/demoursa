(function () {
  const linkEl = () => document.getElementById("theme-css");
  const THEMES = {
    neon: "assets/css/themes/neon.css",
    mono: "assets/css/themes/mono.css"
  };

  function setTheme(name) {
    localStorage.setItem("ursa_theme", name);
    linkEl().setAttribute("href", THEMES[name] || THEMES.neon);
  }

  window.toggleTheme = function () {
    const cur = localStorage.getItem("ursa_theme") || "neon";
    setTheme(cur === "neon" ? "mono" : "neon");
  };

  // init
  document.addEventListener("DOMContentLoaded", () => {
    const cur = localStorage.getItem("ursa_theme") || "neon";
    setTheme(cur);
  });
})();
