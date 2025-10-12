// URSA IPA — Firestore + i18n + темы
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ⚡️ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
  storageBucket: "ipa-panel.firebasestorage.app",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== ICONS =====
const ICONS = {
  games: "https://store-eu-par-3.gofile.io/download/direct/22931df3-7659-4095-8dd0-a7eadb14e1e6/IMG_9678.PNG",
  apps:  "https://store5.gofile.io/download/direct/9a5cf9e9-9b82-4ce4-9cc9-ce63b857dcaf/%D0%BA%D0%BE%D0%BF%D0%B8.png",
  help:  "https://store-eu-par-3.gofile.io/download/direct/084828b1-4e8e-47d3-bcd0-48c12b99a49c/%D0%B2%D0%BE%D0%BF%D1%80%D0%BE%D1%81.png",
  lang: {
    ru: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
    en: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG"
  }
};

// ===== i18n =====
const I18N = {
  ru: {
    search_ph: "Поиск по названию, bundleId, тегам…",
    nav_games: "Игры",
    nav_apps: "Приложения",
    help_title: "Помощь",
    help_p1: "Это каталог IPA. Нажимай на карточку — внутри описание и кнопка загрузки.",
    download: "Загрузить IPA",
    hack_features: "Функции мода",
    not_found: "Ничего не найдено",
    empty: "Пока нет приложений"
  },
  en: {
    search_ph: "Search by name, bundleId, tags…",
    nav_games: "Games",
    nav_apps: "Apps",
    help_title: "Help",
    help_p1: "This is an IPA catalog. Tap a card to see description and download button.",
    download: "Download IPA",
    hack_features: "Hack Features",
    not_found: "Nothing found",
    empty: "No apps yet"
  }
};

let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
window.__t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// ===== HELPERS =====
function prettyBytes(num) {
  if (!num) return "";
  const mb = num / 1000000;
  return `${mb.toFixed(0)} MB`;
}
function escapeHTML(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[m]));
}

// === НОРМАЛИЗАЦИЯ Firestore-документа ===
function normalize(doc) {
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
    tags: Array.isArray(doc.tags)
      ? doc.tags
      : doc.tags
      ? String(doc.tags).split(",").map((s) => s.trim())
      : []
  };
}

// ===== RENDER =====
function renderCatalog(apps) {
  const catalog = document.getElementById("catalog");
  catalog.innerHTML = "";
  if (!apps.length) {
    catalog.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px 16px;">${__t("empty")}</div>`;
    return;
  }

  apps.forEach((app) => {
    const el = document.createElement("article");
    el.className = "card";
    el.setAttribute("role", "listitem");
    el.tabIndex = 0;

    el.innerHTML = `
      <div class="row">
        <img class="icon" src="${app.iconUrl}" alt="">
        <div>
          <h3>${app.name}</h3>
          <div class="meta">${app.bundleId || ""}</div>
          <div class="meta">
            v${app.version}
            ${app.minIOS ? ` · iOS ≥ ${app.minIOS}` : ""}
            ${app.sizeBytes ? ` · ${prettyBytes(app.sizeBytes)}` : ""}
          </div>
        </div>
      </div>
    `;

    const open = () => openModal(app);
    el.addEventListener("click", open);
    el.addEventListener("keypress", (e) => {
      if (e.key === "Enter") open();
    });
    catalog.appendChild(el);
  });
}

// ===== MODAL =====
const modal = document.getElementById("modal");

function openModal(app) {
  document.getElementById("app-icon").src = app.iconUrl;
  document.getElementById("app-title").textContent = app.name || "";
  document.getElementById("app-bundle").textContent = app.bundleId || "";
  document.getElementById("app-info").textContent =
    `v${app.version || ""}` +
    (app.minIOS ? ` · iOS ≥ ${app.minIOS}` : "") +
    (app.sizeBytes ? ` · ${prettyBytes(app.sizeBytes)}` : "");

  // 🔹 локализация описания
  let feats = "";
  if (lang === "ru" && app.features_ru) feats = app.features_ru;
  else if (lang === "en" && app.features_en) feats = app.features_en;
  else feats = app.features;

  const featList = feats ? feats.split(",").map((f) => f.trim()) : [];

  document.getElementById("app-desc").innerHTML = featList.length
    ? `<div class="meta" style="margin-bottom:6px">${__t("hack_features")}</div>
       <ul class="bullets">${featList.map((f) => `<li>${escapeHTML(f)}`).join("")}</ul>`
    : "";

  // 🔹 кнопка загрузки
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = "";
  if (app.downloadUrl) {
    const a = document.createElement("a");
    a.className = "btn";
    a.href = app.downloadUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = __t("download");
    dl.appendChild(a);
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

modal.addEventListener("click", (e) => {
  if (e.target.hasAttribute("data-close") || e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ===== MAIN =====
document.addEventListener("DOMContentLoaded", async () => {
  // иконки
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navHelpIcon").src = ICONS.help;
  document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;

  const search = document.getElementById("search");
  search.placeholder = __t("search_ph");
  document.getElementById("lang-code").textContent = lang.toUpperCase();

  // 🔹 по умолчанию — вкладка "apps"
  let state = { all: [], q: "", tab: "apps" };
  try {
    const snap = await getDocs(collection(db, "ursa_ipas"));
    state.all = snap.docs.map((d) => normalize(d.data()));
  } catch (err) {
    console.error("Ошибка загрузки Firestore:", err);
  }

  function apply() {
    const q = state.q.trim().toLowerCase();

    const list = state.all.filter((app) => {
      if (q) {
        // 🔍 поиск по всем приложениям
        return (
          (app.name || "").toLowerCase().includes(q) ||
          (app.bundleId || "").toLowerCase().includes(q) ||
          (app.features || "").toLowerCase().includes(q) ||
          app.tags.some((t) => (t || "").toLowerCase().includes(q))
        );
      } else {
        // 📂 фильтрация по вкладке
        return state.tab === "games" ? app.tags.includes("games") : app.tags.includes("apps");
      }
    });

    if (!list.length) {
      document.getElementById("catalog").innerHTML =
        `<div style="opacity:.7;text-align:center;padding:40px 16px;">${__t("not_found")}</div>`;
    } else renderCatalog(list);
  }

  search.addEventListener("input", () => {
    state.q = search.value;
    apply();
  });

  const bar = document.getElementById("tabbar");
  bar.addEventListener("click", (e) => {
    const pill = e.target.closest(".nav-btn[data-tab]");
    if (pill) {
      state.tab = pill.dataset.tab;
      bar.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      pill.classList.add("active");
      apply();
    }
  });

  document.getElementById("lang-btn").addEventListener("click", () => {
    lang = lang === "ru" ? "en" : "ru";
    localStorage.setItem("ursa_lang", lang);
    location.reload();
  });

  const help = document.getElementById("help-modal");
  document.getElementById("help-btn").addEventListener("click", () => {
    help.classList.add("open");
    help.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
  help.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close") || e.target === help) {
      help.classList.remove("open");
      help.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

  apply();
});
