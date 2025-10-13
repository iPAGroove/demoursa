// простое переключение темы: neon <-> dark
function toggleTheme(){
  const link = document.getElementById("theme-css");
  const cur  = link.getAttribute("href");
  if(cur.includes("neon")) link.setAttribute("href","assets/css/themes/dark.css");
  else link.setAttribute("href","assets/css/themes/neon.css");
  localStorage.setItem("ursa_theme", link.getAttribute("href"));
}
window.toggleTheme = toggleTheme;

document.addEventListener("DOMContentLoaded", ()=>{
  const saved = localStorage.getItem("ursa_theme");
  if(saved) document.getElementById("theme-css").setAttribute("href", saved);
});
