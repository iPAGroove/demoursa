// URSA IPA — v7.3 Profile + VIP Modal + i18n + AutoCert + Progress + Theme Integration
import { db } from "./firebase.js";
import { collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { toggleTheme } from "./themes.js";

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
    vip_only: "🔒 Только для VIP",
    login_btn: "Войти через Google",
    upgrade_btn: "🚀 Поднять статус",
    cert_section: "🔏 Сертификат",
    cert_state: "Состояние:",
    cert_upload_btn: "📤 Добавить / Обновить сертификат",
    acc_status: "Статус аккаунта:",
    vip_title: "VIP Статус URSA",
    vip_desc: "🌟 Получите VIP статус и откройте доступ ко всем модам, скрытым функциям и приоритетной подписи IPA.",
    vip_benefit1: "⭐ Доступ к эксклюзивным модам",
    vip_benefit2: "⚡ Приоритетная установка без ожидания",
    vip_benefit3: "💬 Поддержка напрямую из Telegram",
    vip_price: "Цена: 4.99 USD / месяц",
    vip_buy: "💳 Купить"
  },
  en: {
    search_ph: "Search by name or bundleId…",
    install: "Install",
    hack_features: "Hack Features",
    not_found: "Nothing found",
    empty: "No apps yet",
    load_error: "Firestore error",
    vip_only: "🔒 VIP Only",
    login_btn: "Sign in with Google",
    upgrade_btn: "🚀 Upgrade Status",
    cert_section: "🔏 Certificate",
    cert_state: "Status:",
    cert_upload_btn: "📤 Add / Update Certificate",
    acc_status: "Account Status:",
    vip_title: "URSA VIP Status",
    vip_desc: "🌟 Get VIP to unlock all mods, hidden features, and priority signing.",
    vip_benefit1: "⭐ Access to exclusive mods",
    vip_benefit2: "⚡ Priority installation without wait",
    vip_benefit3: "💬 Direct Telegram support",
    vip_price: "Price: $4.99 / month",
    vip_buy: "💳 Buy"
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

// === Render catalog ===
function renderCatalog(apps) {
  const c = document.getElementById("catalog");
  c.innerHTML = "";
  if (!apps.length) {
    c.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px 16px;">${__t("empty")}</div>`;
    return;
  }

  apps.forEach((app) => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <div class="row">
        <img class="icon" src="${app.iconUrl}" alt="">
        <div>
          <h3>${escapeHTML(app.name)}${app.vipOnly ? ' <span style="color:#00b3ff">⭐</span>' : ""}</h3>
          <div class="meta">${escapeHTML(app.bundleId || "")}</div>
          <div class="meta">v${escapeHTML(app.version || "")}${app.minIOS ? " · iOS ≥ " + escapeHTML(app.minIOS) : ""}${app.sizeBytes ? " · " + prettyBytes(app.sizeBytes) : ""}</div>
        </div>
      </div>`;
    el.addEventListener("click", () => openModal(app));
    c.appendChild(el);
  });
}

// === Install IPA ===
async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA…</div><progress id="sign-progress" max="100" value="30" style="width:100%;height:8px;margin-top:6px;border-radius:8px;"></progress>`;

  try {
    const signer_id = localStorage.getItem("ursa_signer_id");
    if (!signer_id) throw new Error("❌ Загрузите свой сертификат в профиле");

    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("signer_id", signer_id);

    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || json.error || "Ошибка при подписи IPA");

    document.getElementById("sign-progress").value = 100;
    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ Готово! Установка начнётся…</div>`;
    setTimeout(() => (location.href = json.install_link), 900);
  } catch (err) {
    console.error("Install error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message || err}</div>`;
  }
}
window.installIPA = installIPA;

// === App Modal ===
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

// === Profile Modal ===
window.openSettings = async function openSettings() {
  const dlg = document.getElementById("settings-modal");
  const info = dlg.querySelector("#user-info");

  info.querySelector("#user-photo").src = localStorage.getItem("ursa_photo") || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = localStorage.getItem("ursa_name") || "Гость";
  info.querySelector("#user-email").textContent = localStorage.getItem("ursa_email") || "—";
  const status = localStorage.getItem("ursa_status") || "free";
  info.querySelector("#user-status").textContent = status === "vip" ? "⭐ VIP" : "Free";
  info.querySelector("#cert-state").textContent = localStorage.getItem("ursa_signer_id") ? "✅ Загружен" : "❌ Не загружен";
  info.querySelector("#acc-status").textContent = status === "vip" ? "VIP" : "Free";

  info.querySelector("#auth-action").textContent = localStorage.getItem("ursa_email") ? "Выйти" : __t("login_btn");
  info.querySelector("#auth-action").onclick = () => window.ursaAuthAction && window.ursaAuthAction();

  info.querySelector("#cert-upload").onclick = () => {
    const modal = document.getElementById("signer-modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  };

  info.querySelector("#vip-upgrade").onclick = () => {
    const vip = document.getElementById("vip-modal");
    vip.classList.add("open");
    vip.setAttribute("aria-hidden", "false");
  };

  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
};

// === VIP Modal Actions ===
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".dialog").forEach((dlg) => {
    dlg.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close") || e.target === dlg) {
        dlg.classList.remove("open");
        dlg.setAttribute("aria-hidden", "true");
      }
    });
  });
  const buyBtn = document.getElementById("buy-vip");
  if (buyBtn) buyBtn.onclick = () => window.open("https://t.me/Ursa_ipa", "_blank");
});

// === Main ===
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  document.getElementById("navSettingsIcon").src = ICONS.settings;
  document.getElementById("search").placeholder = __t("search_ph");

  const state = { all: [], q: "", tab: "apps" };

  try {
    const snap = await getDocs(collection(db, "ursa_ipas"));
    state.all = snap.docs.map((d) => normalize(d.data()));
  } catch {
    document.getElementById("catalog").innerHTML = `<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
  }

  const apply = () => {
    const q = state.q.trim().toLowerCase();
    const list = state.all.filter((app) =>
      q
        ? (app.name || "").toLowerCase().includes(q) ||
          (app.bundleId || "").toLowerCase().includes(q) ||
          (app.features || "").toLowerCase().includes(q) ||
          app.tags.some((t) => (t || "").toLowerCase().includes(q))
        : state.tab === "games"
        ? app.tags.includes("games")
        : app.tags.includes("apps")
    );
    list.length ? renderCatalog(list) : (document.getElementById("catalog").innerHTML = `<div style="opacity:.7;text-align:center;padding:40px 16px;">${__t(q ? "not_found" : "empty")}</div>`);
  };

  document.getElementById("search").addEventListener("input", (e) => (state.q = e.target.value, apply()));

  document.getElementById("tabbar").addEventListener("click", (e) => {
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
      openSettings();
    }
  });

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  apply();
});
