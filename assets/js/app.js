// URSA IPA — v7.2 Profile + VIP + Direct Install + Signer Upload + i18n + Theme Integration
import { db } from "./firebase.js";
import { collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { toggleTheme } from "./themes.js";

const VIP_LINK = "https://t.me/Ursa_ipa";

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
    vip_only: "🔒 Только для VIP",
    profile_title: "Профиль URSA",
    sign_in: "Войти через Google",
    sign_out: "Выйти",
    upgrade: "⭐ Поднять статус",
    acc_status: "Статус аккаунта: ",
    vip_title: "URSA VIP",
    vip_desc: "VIP открывает доступ к приватным IPA, установке без ограничений и ранним обновлениям.",
    vip_price: "Цена: 4.99 $ / месяц",
    vip_buy: "💎 Купить VIP",
    cert_state: "Сертификат:",
    cert_upload: "📤 Загрузить / обновить сертификат",
    guest: "Гость",
    download_start: "Загрузка началась…",
    downloading: "Загрузка IPA…"
  },
  en: {
    search_ph: "Search by name or bundleId…",
    install: "Install",
    hack_features: "Hack Features",
    not_found: "Nothing found",
    empty: "No apps yet",
    load_error: "Firestore error",
    vip_only: "🔒 VIP Only",
    profile_title: "URSA Profile",
    sign_in: "Sign in with Google",
    sign_out: "Sign out",
    upgrade: "⭐ Upgrade to VIP",
    acc_status: "Account status: ",
    vip_title: "URSA VIP",
    vip_desc: "VIP gives access to private IPAs, unlimited installs, and early updates.",
    vip_price: "Price: $4.99 / month",
    vip_buy: "💎 Get VIP",
    cert_state: "Certificate:",
    cert_upload: "📤 Upload / Update Certificate",
    guest: "Guest",
    download_start: "Download started…",
    downloading: "Downloading IPA…"
  }
};

let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
window.__t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Helpers ===
const prettyBytes = (n) => (!n ? "" : `${(n / 1e6).toFixed(0)} MB`);
const escapeHTML = (s) => (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

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

// === Direct Install (no signer) ===
async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">⬇️ ${__t("downloading")}</div>
  <progress max="100" value="60" style="width:100%;height:8px;margin-top:6px;border-radius:8px;"></progress>`;
  setTimeout(() => {
    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ ${__t("download_start")}</div>`;
    window.open(app.downloadUrl, "_blank");
  }, 800);
}
window.installIPA = installIPA;

// === App modal ===
const modal = document.getElementById("modal");
function openModal(app) {
  document.getElementById("app-icon").src = app.iconUrl;
  document.getElementById("app-title").textContent = app.name || "";
  document.getElementById("app-bundle").textContent = app.bundleId || "";
  document.getElementById("app-info").textContent = `v${app.version || ""}${app.minIOS ? " · iOS ≥ " + app.minIOS : ""}${app.sizeBytes ? " · " + prettyBytes(app.sizeBytes) : ""}`;

  let feats = "";
  if (lang === "ru" && app.features_ru) feats = app.features_ru;
  else if (lang === "en" && app.features_en) feats = app.features_en;
  else feats = app.features;

  const featList = feats ? feats.split(",").map((f) => f.trim()).filter(Boolean) : [];
  document.getElementById("app-desc").innerHTML = featList.length
    ? `<div class="meta" style="margin-bottom:6px">${__t("hack_features")}</div>
       <ul class="bullets">${featList.map((f) => `<li>${escapeHTML(f)}`).join("")}</ul>`
    : "";

  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = "";
  const status = localStorage.getItem("ursa_status") || "free";
  if (app.vipOnly && status !== "vip") {
    dl.innerHTML = `<div style="color:#ff6;">${__t("vip_only")}</div>`;
  } else if (app.downloadUrl) {
    const a = document.createElement("button");
    a.className = "btn";
    a.textContent = __t("install");
    a.onclick = () => installIPA(app);
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

// === Settings Modal ===
window.openSettings = async function openSettings() {
  const dlg = document.getElementById("settings-modal");
  const email = localStorage.getItem("ursa_email");
  const name = localStorage.getItem("ursa_name") || __t("guest");
  const status = localStorage.getItem("ursa_status") || "free";
  const photo = localStorage.getItem("ursa_photo");

  const info = document.getElementById("user-info");
  info.querySelector("#user-photo").src = photo || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = name;
  info.querySelector("#user-email").textContent = email || "—";
  info.querySelector("#user-status").textContent = status === "vip" ? "⭐ VIP" : "Free";
  info.querySelector("#acc-status").textContent = status === "vip" ? "VIP" : "Free";

  document.getElementById("profile-title").textContent = __t("profile_title");
  document.getElementById("profile-footer-text").innerHTML = `${__t("acc_status")} <b id="acc-status">${status === "vip" ? "VIP" : "Free"}</b>`;

  const authBtn = info.querySelector("#auth-action");
  authBtn.textContent = email ? __t("sign_out") : __t("sign_in");
  authBtn.onclick = () => window.ursaAuthAction && window.ursaAuthAction();

  const vipBtn = info.querySelector("#vip-upgrade");
  vipBtn.textContent = __t("upgrade");
  vipBtn.onclick = () => openVIP();

  // Cert Upload Button
  let certBtn = document.getElementById("cert-upload");
  if (!certBtn) {
    certBtn = document.createElement("button");
    certBtn.id = "cert-upload";
    certBtn.className = "btn outline small";
    certBtn.textContent = __t("cert_upload");
    info.querySelector(".profile-center").appendChild(certBtn);
  }
  certBtn.onclick = () => {
    const modal = document.getElementById("signer-modal");
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    } else {
      alert("Signer modal not found!");
    }
  };

  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
};

// === VIP Modal ===
function openVIP() {
  const vip = document.getElementById("vip-modal");
  document.getElementById("vip-title").textContent = __t("vip_title");
  document.getElementById("vip-desc").textContent = __t("vip_desc");
  document.getElementById("vip-price").textContent = __t("vip_price");
  document.getElementById("vip-buy").textContent = __t("vip_buy");
  document.getElementById("vip-buy").onclick = () => window.open(VIP_LINK, "_blank");
  vip.classList.add("open");
  vip.setAttribute("aria-hidden", "false");
}

// === Main ===
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  document.getElementById("navSettingsIcon").src = ICONS.settings;

  const search = document.getElementById("search");
  search.placeholder = __t("search_ph");

  let state = { all: [], q: "", tab: "apps" };

  try {
    const snap = await getDocs(collection(db, "ursa_ipas"));
    state.all = snap.docs.map((d) => normalize(d.data()));
  } catch (err) {
    console.error("Firestore:", err);
    document.getElementById("catalog").innerHTML = `<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
  }

  function apply() {
    const q = state.q.trim().toLowerCase();

    const list = state.all.filter((app) => {
      if (q) {
        return (
          (app.name || "").toLowerCase().includes(q) ||
          (app.bundleId || "").toLowerCase().includes(q) ||
          (app.features || "").toLowerCase().includes(q) ||
          (app.tags || []).some((t) => (t || "").toLowerCase().includes(q))
        );
      }

      // фильтрация по вкладке
      if (state.tab === "games") {
        return (app.tags || []).includes("games") || (app.tags || []).includes("игры");
      }
      if (state.tab === "apps") {
        return (app.tags || []).includes("apps") || (app.tags || []).includes("приложения");
      }

      // если тегов нет — всё равно показываем
      return true;
    });

    if (!list.length) {
      document.getElementById("catalog").innerHTML = `
        <div style="opacity:.7;text-align:center;padding:40px 16px;">
          ${__t(q ? "not_found" : "empty")}
        </div>`;
    } else {
      renderCatalog(list);
    }
  }

  search.addEventListener("input", () => {
    state.q = search.value;
    apply();
  });

  const bar = document.getElementById("tabbar");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;
    if (btn.dataset.tab) {
      state.tab = btn.dataset.tab;
      bar.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      apply();
    } else if (btn.id === "lang-btn") {
      lang = lang === "ru" ? "en" : "ru";
      localStorage.setItem("ursa_lang", lang);
      location.reload();
    } else if (btn.id === "settings-btn") {
      openSettings();
    }
  });

  document.body.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) {
      const d = e.target.closest(".dialog");
      if (d) {
        d.classList.remove("open");
        d.setAttribute("aria-hidden", "true");
      }
    }
  });

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  apply();
});
