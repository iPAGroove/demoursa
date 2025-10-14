// URSA IPA — v7.5.1 Single Cert Status Fix + Full i18n + Profile + VIP Modal + AutoCert + Progress + Firestore Integration
import { db } from "./firebase.js";
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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
    profile_title: "Профиль URSA",
    search_ph: "Поиск по названию, bundleId…",
    install: "Установить",
    hack_features: "Функции мода",
    not_found: "Ничего не найдено",
    empty: "Пока нет приложений",
    load_error: "Ошибка Firestore",
    vip_only: "🔒 Только для VIP",
    login_btn: "Войти через Google",
    logout_btn: "Выйти",
    guest: "Гость",
    dash: "—",
    badge_free: "Free",
    badge_vip: "⭐ VIP",
    acc_status: "Статус аккаунта:",
    acc_free: "Free",
    acc_vip: "VIP",
    cert_section: "🔏 Сертификат",
    cert_state: "Состояние:",
    cert_state_ok: "✅ Загружен",
    cert_state_none: "❌ Не загружен",
    cert_upload_btn: "📤 Добавить / Обновить сертификат",
    upgrade_btn: "🚀 Поднять статус",
    vip_title: "VIP Статус URSA",
    vip_desc: "🌟 Получите VIP статус и откройте доступ ко всем модам, скрытым функциям и приоритетной подписи IPA.",
    vip_benefit1: "⭐ Доступ к эксклюзивным модам",
    vip_benefit2: "⚡ Приоритетная установка без ожидания",
    vip_benefit3: "💬 Поддержка напрямую из Telegram",
    vip_price: "Цена: 4.99 USD / месяц",
    vip_buy: "💳 Купить",
    signing_start: "🔄 Подписываем IPA…",
    signing_ready: "✅ Готово! Установка начнётся…",
    signing_need_cert: "❌ Загрузите свой сертификат в профиле"
  },
  en: {
    profile_title: "URSA Profile",
    search_ph: "Search by name or bundleId…",
    install: "Install",
    hack_features: "Hack Features",
    not_found: "Nothing found",
    empty: "No apps yet",
    load_error: "Firestore error",
    vip_only: "🔒 VIP Only",
    login_btn: "Sign in with Google",
    logout_btn: "Sign out",
    guest: "Guest",
    dash: "—",
    badge_free: "Free",
    badge_vip: "⭐ VIP",
    acc_status: "Account Status:",
    acc_free: "Free",
    acc_vip: "VIP",
    cert_section: "🔏 Certificate",
    cert_state: "Status:",
    cert_state_ok: "✅ Uploaded",
    cert_state_none: "❌ Not uploaded",
    cert_upload_btn: "📤 Add / Update Certificate",
    upgrade_btn: "🚀 Upgrade Status",
    vip_title: "URSA VIP Status",
    vip_desc: "🌟 Get VIP to unlock all mods, hidden features, and priority signing.",
    vip_benefit1: "⭐ Access to exclusive mods",
    vip_benefit2: "⚡ Priority installation without wait",
    vip_benefit3: "💬 Direct Telegram support",
    vip_price: "Price: $4.99 / month",
    vip_buy: "💳 Buy",
    signing_start: "🔄 Signing IPA…",
    signing_ready: "✅ Done! Installation will start…",
    signing_need_cert: "❌ Upload your certificate in profile"
  }
};

let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
window.__t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Helpers ===
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
const prettyBytes = (n) => (!n ? "" : `${(n / 1e6).toFixed(0)} MB`);
const escapeHTML = (s) => (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

// === Normalize Firestore doc ===
function normalize(doc) {
  const tags = Array.isArray(doc.tags) ? doc.tags : doc.tags ? String(doc.tags).split(",").map((s) => s.trim()) : [];
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

// === Render Catalog ===
function renderCatalog(apps) {
  const c = qs("#catalog");
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
    el.onclick = () => openModal(app);
    c.appendChild(el);
  });
}

// === Install IPA ===
async function installIPA(app) {
  const dl = qs("#dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">${__t("signing_start")}</div><progress id="sign-progress" max="100" value="30" style="width:100%;height:8px;margin-top:6px;border-radius:8px;"></progress>`;
  try {
    const signer_id = localStorage.getItem("ursa_signer_id");
    if (!signer_id) throw new Error(__t("signing_need_cert"));
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("signer_id", signer_id);
    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || json.error || "Signer error");
    qs("#sign-progress").value = 100;
    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">${__t("signing_ready")}</div>`;
    setTimeout(() => (location.href = json.install_link), 900);
  } catch (err) {
    console.error(err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message || err}</div>`;
  }
}
window.installIPA = installIPA;

// === Modal ===
const modal = qs("#modal");
function openModal(app) {
  qs("#app-icon").src = app.iconUrl;
  qs("#app-title").textContent = app.name;
  qs("#app-bundle").textContent = app.bundleId;
  qs("#app-info").textContent = `v${app.version}${app.minIOS ? " · iOS ≥ " + app.minIOS : ""}${app.sizeBytes ? " · " + prettyBytes(app.sizeBytes) : ""}`;
  const feats = (lang === "ru" ? app.features_ru : lang === "en" ? app.features_en : app.features) || "";
  const featList = feats.split(",").map((f) => f.trim()).filter(Boolean);
  qs("#app-desc").innerHTML = featList.length
    ? `<div class="meta" style="margin-bottom:6px">${__t("hack_features")}</div><ul class="bullets">${featList.map((f) => `<li>${escapeHTML(f)}`).join("")}</ul>`
    : "";
  const dl = qs("#dl-buttons");
  dl.innerHTML = "";
  const status = localStorage.getItem("ursa_status") || "free";
  if (app.vipOnly && status !== "vip") dl.innerHTML = `<div style="color:#ff6;">${__t("vip_only")}</div>`;
  else if (app.downloadUrl) {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = __t("install");
    b.onclick = () => installIPA(app);
    dl.appendChild(b);
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
modal.onclick = (e) => (e.target === modal || e.target.hasAttribute("data-close")) && closeModal();
document.onkeydown = (e) => e.key === "Escape" && closeModal();

// === Profile Modal Fix ===
function applyProfileI18n(dlg) {
  const head = dlg.querySelector(".dialog-head strong");
  if (head) head.textContent = __t("profile_title");
  const certSection = dlg.querySelector(".profile-section h4");
  if (certSection) certSection.textContent = __t("cert_section");
  const certStateP = dlg.querySelector(".profile-section #cert-state");
  if (certStateP) {
    const hasSigner = !!localStorage.getItem("ursa_signer_id");
    certStateP.textContent = hasSigner ? __t("cert_state_ok") : __t("cert_state_none");
  }
  dlg.querySelectorAll("#cert-account,#cert-exp").forEach((e) => e.closest("p").style.display = "none");
  const upload = dlg.querySelector("#cert-upload");
  if (upload) upload.textContent = __t("cert_upload_btn");
  const auth = dlg.querySelector("#auth-action");
  if (auth) auth.textContent = localStorage.getItem("ursa_email") ? __t("logout_btn") : __t("login_btn");
  const status = localStorage.getItem("ursa_status") || "free";
  const statusBadge = dlg.querySelector("#user-status");
  if (statusBadge) statusBadge.textContent = status === "vip" ? __t("badge_vip") : __t("badge_free");
  const accLabel = dlg.querySelector(".profile-footer");
  if (accLabel) accLabel.innerHTML = `${__t("acc_status")} <b>${status === "vip" ? __t("acc_vip") : __t("acc_free")}</b>`;
  const upg = dlg.querySelector("#vip-upgrade");
  if (upg) upg.textContent = __t("upgrade_btn");
}

window.openSettings = async function openSettings() {
  const dlg = qs("#settings-modal");
  const info = dlg.querySelector("#user-info");
  info.querySelector("#user-photo").src = localStorage.getItem("ursa_photo") || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = localStorage.getItem("ursa_name") || __t("guest");
  info.querySelector("#user-email").textContent = localStorage.getItem("ursa_email") || __t("dash");
  const status = localStorage.getItem("ursa_status") || "free";
  info.querySelector("#user-status").textContent = status === "vip" ? __t("badge_vip") : __t("badge_free");
  // ✅ FIX: clear old cert text then reassign only once
  const certState = info.querySelector("#cert-state");
  certState.textContent = "";
  const hasSigner = !!localStorage.getItem("ursa_signer_id");
  certState.textContent = hasSigner ? __t("cert_state_ok") : __t("cert_state_none");
  const authBtn = info.querySelector("#auth-action");
  authBtn.textContent = localStorage.getItem("ursa_email") ? __t("logout_btn") : __t("login_btn");
  const certBtn = info.querySelector("#cert-upload");
  certBtn.textContent = __t("cert_upload_btn");
  certBtn.onclick = () => { const m = qs("#signer-modal"); m.classList.add("open"); m.setAttribute("aria-hidden", "false"); };
  const upgBtn = info.querySelector("#vip-upgrade");
  if (upgBtn) { upgBtn.textContent = __t("upgrade_btn"); upgBtn.onclick = () => window.open("https://t.me/Ursa_ipa", "_blank"); }
  applyProfileI18n(dlg);
  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
};

// === VIP Modal i18n ===
function applyVipI18n(vip) {
  const head = vip.querySelector(".dialog-head strong");
  if (head) head.textContent = __t("vip_title");
  const desc = vip.querySelector(".vip-desc");
  if (desc) desc.textContent = __t("vip_desc");
  ["1", "2", "3"].forEach((i) => {
    const el = vip.querySelector(`.vip-benefit-${i}`);
    if (el) el.textContent = __t(`vip_benefit${i}`);
  });
  const price = vip.querySelector(".vip-price");
  if (price) price.textContent = __t("vip_price");
  const buy = vip.querySelector("#buy-vip");
  if (buy) buy.textContent = __t("vip_buy");
}

document.addEventListener("DOMContentLoaded", async () => {
  qs("#navAppsIcon").src = ICONS.apps;
  qs("#navGamesIcon").src = ICONS.games;
  qs("#navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  qs("#navSettingsIcon").src = ICONS.settings;
  qs("#search").placeholder = __t("search_ph");

  const state = { all: [], q: "", tab: "apps" };
  try {
    const snap = await getDocs(collection(db, "ursa_ipas"));
    state.all = snap.docs.map((d) => normalize(d.data()));
  } catch {
    qs("#catalog").innerHTML = `<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
  }

  const apply = () => {
    const q = state.q.trim().toLowerCase();
    const list = state.all.filter((app) =>
      q
        ? (app.name || "").toLowerCase().includes(q) ||
          (app.bundleId || "").toLowerCase().includes(q) ||
          (app.features || "").toLowerCase().includes(q) ||
          app.tags.some((t) => (t || "").toLowerCase().includes(q))
        : state.tab === "games" ? app.tags.includes("games") : app.tags.includes("apps")
    );
    if (!list.length)
      qs("#catalog").innerHTML = `<div style="opacity:.7;text-align:center;padding:40px 16px;">${__t(state.q ? "not_found" : "empty")}</div>`;
    else renderCatalog(list);
  };

  qs("#search").oninput = (e) => (state.q = e.target.value, apply());
  const bar = qs("#tabbar");
  bar.onclick = (e) => {
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
      document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
      apply();
    } else if (btn.id === "settings-btn") openSettings();
  };
  document.getElementById("theme-toggle").onclick = toggleTheme;
  apply();
});
