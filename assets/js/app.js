// URSA IPA — v6.6 UltraStable (No Auto Profile + Safe Settings Init)
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";

// === ICONS ===
const ICONS = {
  apps: "https://store5.gofile.io/download/direct/9a5cf9e9-9b82-4ce4-9cc9-ce63b857dcaf/%D0%BA%D0%BE%D0%BF%D0%B8.png",
  games: "https://store-eu-par-3.gofile.io/download/direct/22931df3-7659-4095-8dd0-a7eadb14e1e6/IMG_9678.PNG",
  lang: {
    ru: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
    en: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG"
  },
  settings: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png"
};

// === i18n ===
const I18N = {
  ru: {
    search_ph: "Поиск по названию, bundleId…",
    install: "Установить",
    hack_features: "Функции мода",
    not_found: "Ничего не найдено",
    empty: "Пока нет приложений",
    load_error: "Ошибка Firestore",
    signing: "Подписываем IPA…",
    ready: "✅ Готово! Установка начнётся…"
  },
  en: {
    search_ph: "Search by name or bundleId…",
    install: "Install",
    hack_features: "Hack Features",
    not_found: "Nothing found",
    empty: "No apps yet",
    load_error: "Firestore error",
    signing: "Signing IPA…",
    ready: "✅ Ready! Installing…"
  }
};
let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
window.__t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Helpers ===
const prettyBytes = (n) => (!n ? "" : `${(n / 1e6).toFixed(0)} MB`);
const escapeHTML = (s) =>
  (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

// === Normalize Firestore doc ===
function normalize(doc) {
  const tags = Array.isArray(doc.tags)
    ? doc.tags
    : doc.tags
    ? String(doc.tags).split(",").map((s) => s.trim())
    : [];
  return {
    id: doc.ID || doc.id || "",
    name: doc.NAME || doc.name || "",
    bundleId: doc["Bundle ID"] || doc.bundleId || "",
    version: doc.Version || doc.version || "",
    minIOS: doc["minimal iOS"] || doc.minIOS || "",
    sizeBytes: doc.sizeBytes || 0,
    iconUrl: doc.iconUrl || "",
    downloadUrl: doc.DownloadUrl || doc.downloadUrl || "",
    features: doc.features || "",
    features_ru: doc.features_ru || "",
    features_en: doc.features_en || "",
    vipOnly: !!doc.vipOnly,
    tags: tags.map((t) => t.toLowerCase())
  };
}

// === Silent Profile Update ===
window.updateProfileUI = function () {
  const info = document.getElementById("user-info");
  if (!info) return;
  info.querySelector("#user-photo").src = localStorage.getItem("ursa_photo") || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = localStorage.getItem("ursa_name") || "Гость";
  info.querySelector("#user-email").textContent = localStorage.getItem("ursa_email") || "—";
  const status = localStorage.getItem("ursa_status") || "free";
  info.querySelector("#user-status").textContent = status === "vip" ? "⭐ VIP" : "Free";
  info.querySelector("#cert-state").textContent = localStorage.getItem("ursa_signer_id") ? "✅ Загружен" : "❌ Не загружен";
  info.querySelector("#cert-account").textContent = localStorage.getItem("ursa_cert_account") || "—";
  info.querySelector("#cert-exp").textContent = localStorage.getItem("ursa_cert_exp")
    ? new Date(localStorage.getItem("ursa_cert_exp")).toLocaleDateString("ru-RU")
    : "—";
  info.querySelector("#acc-status").textContent = status === "vip" ? "VIP" : "Free";
  const authBtn = info.querySelector("#auth-action");
  authBtn.textContent = localStorage.getItem("ursa_email") ? "Выйти" : "Войти через Google";
  authBtn.onclick = () => window.ursaAuthAction && window.ursaAuthAction();
};

// === Settings Modal ===
window.openSettings = function () {
  const dlg = document.getElementById("settings-modal");
  if (!dlg) return;
  window.updateProfileUI();
  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
};

function closeSettings() {
  const dlg = document.getElementById("settings-modal");
  if (!dlg) return;
  dlg.classList.remove("open");
  dlg.setAttribute("aria-hidden", "true");
}

// === Safe DOM Init ===
document.addEventListener("readystatechange", () => {
  if (document.readyState === "complete") initApp();
});

async function initApp() {
  console.log("⚡ URSA App Initialized");

  // === ICONS ===
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  document.getElementById("navSettingsIcon").src = ICONS.settings;

  const search = document.getElementById("search");
  search.placeholder = __t("search_ph");

  const state = { all: [], q: "", tab: "apps" };

  try {
    const snap = await getDocs(collection(db, "ursa_ipas"));
    state.all = snap.docs.map((d) => normalize(d.data()));
  } catch {
    document.getElementById("catalog").innerHTML =
      `<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
  }

  const apply = () => {
    const q = state.q.trim().toLowerCase();
    const list = state.all.filter((app) => {
      if (q)
        return (
          app.name.toLowerCase().includes(q) ||
          app.bundleId.toLowerCase().includes(q) ||
          app.features.toLowerCase().includes(q)
        );
      return state.tab === "games" ? app.tags.includes("games") : app.tags.includes("apps");
    });
    const c = document.getElementById("catalog");
    c.innerHTML = "";
    if (!list.length) {
      c.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t(q ? "not_found" : "empty")}</div>`;
    } else {
      list.forEach((app) => {
        const el = document.createElement("article");
        el.className = "card";
        el.innerHTML = `
          <div class="row">
            <img class="icon" src="${app.iconUrl}" alt="">
            <div>
              <h3>${escapeHTML(app.name)}</h3>
              <div class="meta">${escapeHTML(app.bundleId)}</div>
              <div class="meta">v${app.version} · iOS ≥ ${app.minIOS} · ${prettyBytes(app.sizeBytes)}</div>
            </div>
          </div>`;
        el.onclick = () => openModal(app);
        c.appendChild(el);
      });
    }
  };

  search.addEventListener("input", () => {
    state.q = search.value;
    apply();
  });

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

  // === Nav Bar ===
  const bar = document.getElementById("tabbar");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;
    if (btn.dataset.tab) {
      state.tab = btn.dataset.tab;
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      apply();
    } else if (btn.id === "lang-btn") {
      lang = lang === "ru" ? "en" : "ru";
      localStorage.setItem("ursa_lang", lang);
      location.reload();
    } else if (btn.id === "settings-btn") {
      console.log("⚙️ Open settings clicked");
      window.openSettings();
    }
  });

  // === Close Settings ===
  const settingsModal = document.getElementById("settings-modal");
  settingsModal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("backdrop") || e.target.dataset.close !== undefined) closeSettings();
  });

  apply();
  window.updateProfileUI();
}
