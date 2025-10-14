// URSA IPA — v7.5.2 GoogleAuth + CloseFix + i18n + Profile + VIP Modal + AutoCert + Progress
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
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

// === Firebase Auth ===
const auth = getAuth();
const provider = new GoogleAuthProvider();

window.ursaAuthAction = async function () {
  const email = localStorage.getItem("ursa_email");
  try {
    if (email) {
      await signOut(auth);
      localStorage.removeItem("ursa_email");
      localStorage.removeItem("ursa_name");
      localStorage.removeItem("ursa_photo");
    } else {
      const res = await signInWithPopup(auth, provider);
      const user = res.user;
      localStorage.setItem("ursa_email", user.email || "");
      localStorage.setItem("ursa_name", user.displayName || "User");
      localStorage.setItem("ursa_photo", user.photoURL || "assets/icons/avatar.png");
    }
    // обновляем UI
    const dlg = document.getElementById("settings-modal");
    if (dlg?.classList.contains("open")) openSettings();
  } catch (err) {
    console.error("Auth error:", err);
    alert("Ошибка авторизации Google");
  }
};

// === Языки ===
const I18N = {
  ru: {
    profile_title: "Профиль URSA",
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
    search_ph: "Поиск по названию, bundleId…",
    install: "Установить",
    hack_features: "Функции мода",
    vip_only: "🔒 Только для VIP",
    empty: "Пока нет приложений",
    not_found: "Ничего не найдено",
    load_error: "Ошибка Firestore",
    signing_start: "🔄 Подписываем IPA…",
    signing_ready: "✅ Готово! Установка начнётся…",
    signing_need_cert: "❌ Загрузите свой сертификат в профиле"
  },
  en: {
    profile_title: "URSA Profile",
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
    search_ph: "Search by name or bundleId…",
    install: "Install",
    hack_features: "Hack Features",
    vip_only: "🔒 VIP Only",
    empty: "No apps yet",
    not_found: "Nothing found",
    load_error: "Firestore error",
    signing_start: "🔄 Signing IPA…",
    signing_ready: "✅ Done! Installation will start…",
    signing_need_cert: "❌ Upload your certificate in profile"
  }
};
let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
const __t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Short helpers ===
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

// === Close modal fix ===
function attachCloseHandlers() {
  qsa(".dialog").forEach((dlg) => {
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.hasAttribute("data-close")) {
        dlg.classList.remove("open");
        dlg.setAttribute("aria-hidden", "true");
      }
    });
    // кнопка X внутри
    const xBtn = dlg.querySelector(".dialog-close, [data-close]");
    if (xBtn) xBtn.onclick = () => {
      dlg.classList.remove("open");
      dlg.setAttribute("aria-hidden", "true");
    };
  });
}

// === Open Profile ===
window.openSettings = function () {
  const dlg = qs("#settings-modal");
  const info = dlg.querySelector("#user-info");

  info.querySelector("#user-photo").src = localStorage.getItem("ursa_photo") || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = localStorage.getItem("ursa_name") || __t("guest");
  info.querySelector("#user-email").textContent = localStorage.getItem("ursa_email") || __t("dash");

  const hasSigner = !!localStorage.getItem("ursa_signer_id");
  info.querySelector("#cert-state").textContent = hasSigner ? __t("cert_state_ok") : __t("cert_state_none");

  const authBtn = info.querySelector("#auth-action");
  authBtn.textContent = localStorage.getItem("ursa_email") ? __t("logout_btn") : __t("login_btn");
  authBtn.onclick = () => window.ursaAuthAction();

  const certBtn = info.querySelector("#cert-upload");
  certBtn.textContent = __t("cert_upload_btn");
  certBtn.onclick = () => {
    const m = qs("#signer-modal");
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
  };

  const upgradeBtn = info.querySelector("#vip-upgrade");
  if (upgradeBtn) {
    upgradeBtn.textContent = __t("upgrade_btn");
    upgradeBtn.onclick = () => window.open("https://t.me/Ursa_ipa", "_blank");
  }

  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
};

// === UI Init ===
document.addEventListener("DOMContentLoaded", async () => {
  qs("#navAppsIcon").src = ICONS.apps;
  qs("#navGamesIcon").src = ICONS.games;
  qs("#navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  qs("#navSettingsIcon").src = ICONS.settings;

  // close buttons everywhere
  attachCloseHandlers();

  // theme toggle
  qs("#theme-toggle").onclick = toggleTheme;

  // simple search placeholder
  const search = qs("#search");
  if (search) search.placeholder = __t("search_ph");
});
