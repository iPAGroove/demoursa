// URSA IPA — Firestore + i18n + VIP + Navigation fix
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === ICONS ===
const ICONS = {
  games: "https://store-eu-par-3.gofile.io/download/direct/22931df3-7659-4095-8dd0-a7eadb14e1e6/IMG_9678.PNG",
  apps: "https://store5.gofile.io/download/direct/9a5cf9e9-9b82-4ce4-9cc9-ce63b857dcaf/%D0%BA%D0%BE%D0%BF%D0%B8.png",
  lang: {
    ru: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
    en: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
  },
  settings: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png",
};

// === i18n ===
const I18N = {
  ru: { search_ph: "Поиск по названию, bundleId…", download: "Установить", hack_features: "Функции мода", empty: "Пока нет приложений" },
  en: { search_ph: "Search by name or bundleId…", download: "Install", hack_features: "Hack Features", empty: "No apps yet" },
};
let lang = (localStorage.getItem("ursa_lang") || navigator.language.slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
window.__t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Helpers ===
const prettyBytes = (n) => (!n ? "" : `${(n / 1e6).toFixed(0)} MB`);
const escapeHTML = (s) => (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m]));

// === Firestore Load ===
async function loadCatalog() {
  const c = document.getElementById("catalog");
  try {
    const snap = await getDocs(collection(db, "ursa_ipas"));
    const docs = snap.docs.map((d) => d.data());
    renderCatalog(docs);
  } catch (e) {
    console.error(e);
    c.innerHTML = "<div style='text-align:center;opacity:.6;padding:40px;'>Ошибка Firestore</div>";
  }
}

// === Render ===
function renderCatalog(apps) {
  const c = document.getElementById("catalog");
  if (!apps.length) {
    c.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
    return;
  }
  c.innerHTML = "";
  for (const app of apps) {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <div class="row">
        <img class="icon" src="${app.iconUrl}" alt="">
        <div><h3>${escapeHTML(app.name)}</h3>
          <div class="meta">${escapeHTML(app.bundleId)}</div>
          <div class="meta">v${escapeHTML(app.version)} · ${prettyBytes(app.sizeBytes)}</div>
        </div>
      </div>`;
    el.onclick = () => openModal(app);
    c.appendChild(el);
  }
}

// === Modal ===
const modal = document.getElementById("modal");
function openModal(app) {
  document.getElementById("app-icon").src = app.iconUrl;
  document.getElementById("app-title").textContent = app.name;
  document.getElementById("app-bundle").textContent = app.bundleId;
  document.getElementById("app-info").textContent = `v${app.version}`;
  document.getElementById("app-desc").innerHTML = app.features_ru
    ? `<div class="meta">${__t("hack_features")}</div><ul class="bullets"><li>${escapeHTML(app.features_ru)}</li></ul>`
    : "";
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<a class="btn" href="${app.downloadUrl}" target="_blank">${__t("download")}</a>`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
modal.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) { modal.classList.remove("open"); document.body.style.overflow = ""; } });

// === MAIN ===
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navLangIcon").src = ICONS.lang[lang];
  document.getElementById("navSettingsIcon").src = ICONS.settings;
  document.getElementById("search").placeholder = __t("search_ph");
  loadCatalog();
  document.querySelectorAll(".newdock .nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".newdock .nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
});
