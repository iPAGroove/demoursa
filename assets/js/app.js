// URSA IPA — v9.3: Быстрая "по-табовая" загрузка
import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter, 
  getDocs,
  doc,
  updateDoc,
  increment,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { toggleTheme } from "./themes.js";

const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";

// === ICONS (без изменений) ===
const ICONS = {
  apps: "https://store5.gofile.io/download/direct/9a5cf9e9-9b82-4ce4-9cc9-ce63b857dcaf/%D0%BA%D0%BE%D0%BF%D0%B8.png",
  games: "https://store-eu-par-3.gofile.io/download/direct/22931df3-7659-4095-8dd0-a7eadb14e1e6/IMG_9678.PNG",
  lang: {
    ru: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
    en: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG"
  },
  settings: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png"
};

// === i18n (без изменений) ===
const I18N = {
  ru: {
    profile_title: "Профиль URSA",
    search_ph: "Поиск по названию, bundleId…",
    install: "Установить",
    ipa: "Скачать IPA",
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
    signing_need_cert: "❌ Загрузите свой сертификат в профиле",
    modal_version: "Версия",
    modal_size: "Размер",
    modal_min_ios: "Мин. iOS",
    time_ago: "назад",
    time_just_now: "только что",
    time_minute: "минуту",
    time_minutes_1: "минуты",
    time_minutes_2: "минут",
    time_hour: "час",
    time_hours_1: "часа",
    time_hours_2: "часов",
    time_day: "день",
    time_days_1: "дня",
    time_days_2: "дней",
    time_week: "неделю",
    time_weeks_1: "недели",
    time_weeks_2: "недель",
    time_month: "месяц",
    time_months_1: "месяца",
    time_months_2: "месяцев",
    time_year: "год",
    time_years_1: "года",
    time_years_2: "лет"
  },
  en: {
    profile_title: "URSA Profile",
    search_ph: "Search by name or bundleId…",
    install: "Install",
    ipa: "Download IPA",
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
    signing_need_cert: "❌ Upload your certificate in profile",
    modal_version: "Version",
    modal_size: "Size",
    modal_min_ios: "Min. iOS",
    time_ago: "ago",
    time_just_now: "just now",
    time_minute: "minute",
    time_minutes_1: "minutes",
    time_minutes_2: "minutes",
    time_hour: "hour",
    time_hours_1: "hours",
    time_hours_2: "hours",
    time_day: "day",
    time_days_1: "days",
    time_days_2: "days",
    time_week: "week",
    time_weeks_1: "weeks",
    time_weeks_2: "weeks",
    time_month: "month",
    time_months_1: "months",
    time_months_2: "months",
    time_year: "year",
    time_years_1: "years",
    time_years_2: "years"
  }
};

let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
window.__t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Dynamic i18n Apply (без изменений) ===
function applyI18n() {
  qsa("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key && I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  qsa("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && I18N[lang][key]) el.placeholder = I18N[lang][key];
  });
}

// === Helpers (без изменений) ===
const prettyBytes = (n) => (!n ? "" : `${(n / 1e6).toFixed(0)} MB`);
const escapeHTML = (s) => (s || "").replace(/[&<>"']/g, (m) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[m]));
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// === Time Ago (без изменений) ===
function formatTimeAgo(timestamp) {
  if (!timestamp || !timestamp.seconds) return "";
  const now = Date.now();
  const secondsPast = Math.floor((now - timestamp.toMillis()) / 1000);
  if (secondsPast < 60) return __t("time_just_now");
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  const getPluralKey = (n) => {
    if (lang === 'en') {
      return n === 1 ? '1' : '2'; 
    }
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return '2';
    if (lastDigit === 1) return '';
    if (lastDigit >= 2 && lastDigit <= 4) return '1';
    return '2';
  };
  for (const [intervalName, intervalSeconds] of Object.entries(intervals)) {
    const count = Math.floor(secondsPast / intervalSeconds);
    if (count >= 1) {
      const pluralKey = getPluralKey(count);
      const key = `time_${intervalName}${pluralKey === '1' || pluralKey === '2' ? `s_${pluralKey}` : ''}`;
      return lang === 'ru' 
        ? `${count} ${__t(key)} ${__t("time_ago")}`
        : `${count} ${__t(key)} ${__t("time_ago")}`;
    }
  }
}

// === Install Count (без изменений) ===
async function incrementInstallCount(appId) {
  if (!appId) return;
  try {
    const appRef = doc(db, "ursa_ipas", appId);
    await updateDoc(appRef, {
      installCount: increment(1)
    });
  } catch (err) {
    console.error("Failed to increment install count:", err);
  }
}

// === Normalize (без изменений) ===
function normalize(doc) {
  const data = doc.data(); 
  const tags = Array.isArray(data.tags)
    ? data.tags
    : data.tags
    ? String(data.tags).split(",").map((s) => s.trim())
    : [];
  return {
    id: doc.id, 
    name: data.NAME || data.name || "",
    bundleId: data["Bundle ID"] || data.bundleId || "",
    version: data.Version || data.version || "",
    minIOS: data["minimal iOS"] || data.minIOS || "",
    sizeBytes: data.sizeBytes || 0,
    iconUrl: data.iconUrl || "",
    downloadUrl: data.DownloadUrl || data.downloadUrl || "",
    description_ru: data.description_ru || "",
    description_en: data.description_en || "",
    features: data.features || "",
    features_ru: data.features_ru || "",
    features_en: data.features_en || "",
    vipOnly: !!data.vipOnly,
    tags: tags.map((t) => t.toLowerCase()),
    createdAt: data.createdAt || null, 
    updatedAt: data.updatedAt || null,
    installCount: data.installCount || 0 
  };
}

// === Render Row (без изменений) ===
const catalogContainer = document.getElementById("catalog");
let allAppsCache = {}; 

function renderCollectionRow(containerEl, title, apps) {
  if (!apps.length) return; 
  const userStatus = localStorage.getItem("ursa_status") || "free";
  const now = Timestamp.now();
  const sevenDaysAgo = Timestamp.fromMillis(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
  let cardsHTML = "";
  apps.forEach((app) => {
    if (app.id) allAppsCache[app.id] = app;
    let badge = "";
    if (app.updatedAt && app.updatedAt.seconds > sevenDaysAgo.seconds) {
      if (app.createdAt && (app.updatedAt.seconds - app.createdAt.seconds > 60)) { 
         badge = '<span class="badge update">Update</span>';
      }
    }
    if (!badge && app.createdAt && app.createdAt.seconds > sevenDaysAgo.seconds) {
       badge = '<span class="badge new">New</span>';
    }
    const isLocked = app.vipOnly && userStatus !== "vip";
    const cardClass = isLocked ? "card vip-locked" : "card";
    cardsHTML += `
      <article class="${cardClass}" data-app-id="${app.id}"> 
        ${badge}
        <div class="row">
          <div class="thumb">
            <img class="icon" src="${app.iconUrl}" alt="">
            ${app.vipOnly ? '<div class="vip-lock">🔒</div>' : ""}
          </div>
          <div>
            <h3>${escapeHTML(app.name)}${app.vipOnly ? ' <span style="color:#00b3ff">⭐</span>' : ""}</h3>
            <div class="meta">${escapeHTML(app.bundleId || "")}</div>
            <div class="meta">v${escapeHTML(app.version || "")}${app.minIOS ? " · iOS ≥ " + escapeHTML(app.minIOS) : ""}${app.sizeBytes ? " · " + prettyBytes(app.sizeBytes) : ""}</div>
          </div>
        </div>
      </article>`;
  });
  const section = document.createElement("section");
  section.className = "collection-row";
  section.innerHTML = `
    <h2>${escapeHTML(title)}</h2>
    <div class="card-carousel">${cardsHTML}</div>
  `;
  containerEl.appendChild(section);
}

// === Install IPA (без изменений) ===
async function installIPA(app) {
  incrementInstallCount(app.id); 
  const dl = document.getElementById("dl-buttons-row");
  if (!dl) return;
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
    const progressBar = document.getElementById("sign-progress");
    if (progressBar) progressBar.value = 100;
    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">${__t("signing_ready")}</div>`;
    setTimeout(() => (location.href = json.install_link), 900);
  } catch (err) {
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message || err}</div>`;
  }
}
window.installIPA = installIPA;

// === App Modal (v9.2) (без изменений) ===
const appModal = document.getElementById("modal");
catalogContainer.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const appId = card.dataset.appId;
    if (appId && allAppsCache[appId]) {
      openModal(allAppsCache[appId]);
    } else {
      console.warn("No app data in cache for ID:", appId);
    }
});
function openModal(app) {
  const userStatus = localStorage.getItem("ursa_status") || "free";
  const isLocked = app.vipOnly && userStatus !== "vip";
  const modalHeader = qs(".sheet-header");
  modalHeader.innerHTML = `
    <div class="app-head">
      <img id="app-icon" class="icon lg" src="${app.iconUrl || ""}" alt="">
      <div class="head-content">
        <h2 id="app-title">${escapeHTML(app.name)}</h2>
        <div id="dl-buttons-row" class="btns-row"></div>
      </div>
    </div>`;
  const dlRow = document.getElementById("dl-buttons-row");
  if (isLocked) {
    dlRow.innerHTML = `<div class="vip-lock-message">${__t("vip_only")}</div>`;
  } else {
    let buttonsHTML = '';
    if (app.downloadUrl) {
      buttonsHTML += `<a href="${app.downloadUrl}" download="${app.name || 'ursa'}.ipa" class="btn outline small">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          ${__t("ipa")}
        </a>`;
    }
    buttonsHTML += `<button id="install-btn" class="btn small">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        ${__t("install")}
      </button>`;
    dlRow.innerHTML = buttonsHTML;
    const installBtn = document.getElementById("install-btn");
    if (installBtn) {
      installBtn.onclick = () => installIPA(app);
    }
  }
  const modalBody = qs(".sheet-body");
  const timeAgo = formatTimeAgo(app.updatedAt || app.createdAt);
  const infoLineHTML = `
    <div id="app-info-line">
      <div class="info-item">
        ${escapeHTML(app.version) || "1.0"}
        <span>${__t("modal_version")}</span>
      </div>
      <div class="info-item">
        ${prettyBytes(app.sizeBytes) || "N/A"}
        <span>${__t("modal_size")}</span>
      </div>
      <div class="info-item">
        ${app.minIOS ? "iOS " + escapeHTML(app.minIOS) : "N/A"}
        <span>${__t("modal_min_ios")}</span>
      </div>
    </div>`;
  const desc = (lang === "ru" ? app.description_ru : app.description_en) || "";
  const feats = (lang === "ru" ? app.features_ru : app.features_en) || app.features || "";
  const featList = feats ? feats.split(",").map((f) => f.trim()).filter(Boolean) : [];
  let descHTML = "";
  if (desc) {
    descHTML += `<p>${escapeHTML(desc)}</p>`;
  }
  if (featList.length > 0) {
    descHTML += `
      <div class="meta" style="margin-bottom:6px">${__t("hack_features")}</div>
      <ul class="bullets">${featList.map((f) => `<li>${escapeHTML(f)}`).join("")}</ul>`;
  }
  modalBody.innerHTML = `
    ${timeAgo ? `<div id="app-time-ago">${timeAgo}</div>` : ''}
    ${infoLineHTML}
    <div id="app-desc" class="section">
      ${descHTML || `<p>${__t("empty")}</p>`}
    </div>
  `;
  const modalFooter = qs(".sheet-footer");
  modalFooter.innerHTML = ""; 
  appModal.classList.add("open");
  appModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  appModal.classList.remove("open");
  appModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
appModal.addEventListener("click", (e) => {
  if (e.target === appModal || e.target.hasAttribute("data-close") || e.target.closest("[data-close]")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && appModal.classList.contains("open")) closeModal();
});

// === Profile Modal (ОБНОВЛЕНО) ===
window.openSettings = async function openSettings() {
  const dlg = document.getElementById("settings-modal");
  const info = dlg.querySelector("#user-info");
  if (!info) return;

  // 1. Заполняем инфо о профиле
  info.querySelector("#user-photo").src = localStorage.getItem("ursa_photo") || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = localStorage.getItem("ursa_name") || __t("guest");
  // info.querySelector("#user-email") // Элемент удален
  const status = localStorage.getItem("ursa_status") || "free";
  info.querySelector("#user-status").textContent = status === "vip" ? __t("badge_vip") : __t("badge_free");

  // 2. Логика сертификата (без изменений)
  const accLine = dlg.querySelector("#cert-account")?.closest("p");
  const expLine = dlg.querySelector("#cert-exp")?.closest("p");
  if (accLine) accLine.style.display = "none";
  if (expLine) expLine.style.display = "none";
  
  const hasSigner = !!localStorage.getItem("ursa_signer_id");
  info.querySelector("#cert-state").textContent = hasSigner ? __t("cert_state_ok") : __t("cert_state_none");
  
  const certBtn = info.querySelector("#cert-upload");
  if (certBtn) {
    certBtn.textContent = __t("cert_upload_btn");
    certBtn.onclick = () => {
      const modal = document.getElementById("signer-modal");
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    };
  }

  // 3. НОВАЯ ЛОГИКА АВТОРИЗАЦИИ (Вход/Выход)
  const isLoggedIn = !!localStorage.getItem("ursa_email");
  const loginBlock = info.querySelector("#auth-login-block"); // Блок с иконками G/F/T
  const googleLoginBtn = info.querySelector("#auth-action"); // Кнопка Google
  const logoutBtn = info.querySelector("#auth-logout-btn"); // Кнопка "Выйти"

  if (isLoggedIn) {
    // Пользователь ЗАЛОГИНЕН:
    if (loginBlock) loginBlock.style.display = "none"; // Скрыть иконки
    if (logoutBtn) {
      logoutBtn.style.display = "flex"; // Показать кнопку "Выйти"
      logoutBtn.textContent = __t("logout_btn");
      // Вешаем обработчик (предполагаем, что ursaAuthAction() обрабатывает и выход)
      logoutBtn.onclick = () => window.ursaAuthAction && window.ursaAuthAction();
    }
    if (googleLoginBtn) googleLoginBtn.onclick = null; // Отключаем клик по иконке Google

  } else {
    // Пользователь ГОСТЬ:
    if (loginBlock) loginBlock.style.display = "flex"; // Показать иконки (используем flex)
    if (logoutBtn) logoutBtn.style.display = "none"; // Скрыть кнопку "Выйти"
    
    // Вешаем обработчик ТОЛЬКО на Google (как было в оригинале)
    if (googleLoginBtn) {
      googleLoginBtn.onclick = () => window.ursaAuthAction && window.ursaAuthAction();
    }
    // (Кнопки Facebook и Twitter пока ничего не делают)
  }

  // 4. Кнопка VIP (без изменений)
  const upgradeBtn = info.querySelector("#vip-upgrade");
  if (upgradeBtn) {
    upgradeBtn.textContent = __t("upgrade_btn");
    upgradeBtn.onclick = () => {
      const vip = document.getElementById("vip-modal");
      vip.classList.add("open");
      vip.setAttribute("aria-hidden", "false");
    };
  }

  // 5. Открытие модалки (без изменений)
  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.hasAttribute("data-close") || e.target.closest("[data-close]")) {
      dlg.classList.remove("open");
      dlg.setAttribute("aria-hidden", "true");
    }
  });
};
// === КОНЕЦ ОБНОВЛЕННОГО БЛОКА ===

// === Signer Modal (без изменений) ===
const signerModal = document.getElementById("signer-modal");
if (signerModal) {
  signerModal.addEventListener("click", (e) => {
    if (e.target === signerModal || e.target.hasAttribute("data-close") || e.target.closest("[data-close]")) {
      signerModal.classList.remove("open");
      signerModal.setAttribute("aria-hidden", "true");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && signerModal.classList.contains("open")) {
      signerModal.classList.remove("open");
      signerModal.setAttribute("aria-hidden", "true");
    }
  });
}

// === Firestore LazyLoad (МОДИФИЦИРОВАНО v9.3) ===
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  document.getElementById("navSettingsIcon").src = ICONS.settings;

  const search = document.getElementById("search");
  search.placeholder = __t("search_ph");

  const state = { 
    all: [], 
    q: "", 
    tab: "apps", 
    last: null, 
    loading: false, 
    end: false 
  };

  const actBtn = qs(".nav-btn.active");
  if (actBtn && actBtn.dataset.tab) {
    state.tab = actBtn.dataset.tab;
  }

  // === loadBatch (МОДИФИЦИРОВАНО) ===
  // Теперь грузит по ТАБУ и использует МАЛЕНЬКИЙ лимит для первой загрузки
  async function loadBatch() {
    if (state.loading || state.end) return;
    state.loading = true;

    const cRef = collection(db, "ursa_ipas");
    const tabTag = state.tab; // "apps" or "games"

    // 6 для первой загрузки, 20 для скролла
    const currentLimit = state.last ? 20 : 6; 
    let qRef;

    if (state.last) {
      // Запрос для скролла (с 'startAfter')
      qRef = query(
        cRef,
        where("tags", "array-contains", tabTag), 
        orderBy("updatedAt", "desc"), 
        startAfter(state.last), 
        limit(currentLimit)
      );
    } else {
      // Самый первый запрос (без 'startAfter')
      qRef = query(
        cRef,
        where("tags", "array-contains", tabTag), 
        orderBy("updatedAt", "desc"), 
        limit(currentLimit)
      );
    }

    try {
      const snap = await getDocs(qRef);
      if (snap.empty) {
        state.end = true;
        if (state.all.length === 0) { // Если вообще ничего нет
           catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
        }
        return;
      }
      const batch = snap.docs.map(normalize);
      state.all.push(...batch); // Добавляем в кэш
      state.last = snap.docs[snap.docs.length - 1]; // Сохраняем "курсор"
      apply(); // Перерисовываем
    } catch (err) {
      console.error("Firestore error:", err);
      // Выводим ошибку индекса прямо на страницу
      catalogContainer.innerHTML =
        `<div style="text-align:center;opacity:.7;padding:40px;">
          ${__t("load_error")}
          <br><small style="opacity:0.5;font-size:12px;">(Нужен индекс, см. консоль F12)</small>
         </div>`;
    } finally {
      state.loading = false;
    }
  }

  // === apply (МОДИФИЦИРОВАНО) ===
  // Убрана фильтрация по табу (теперь это в loadBatch)
  const apply = () => {
    const q = state.q.trim().toLowerCase();
    
    // 1. Фильтруем ТОЛЬКО по поиску
    const list = state.all.filter((app) =>
      q 
        ? (app.name || "").toLowerCase().includes(q) ||
          (app.bundleId || "").toLowerCase().includes(q) ||
          (app.features || "").toLowerCase().includes(q)
        : true // Фильтр по табу больше не нужен!
    );
    
    // Очищаем контейнер (только если это не скролл)
    // В нашем случае `apply` всегда перерисовывает все, что есть в `state.all`
    catalogContainer.innerHTML = "";
    allAppsCache = {}; 

    if (!list.length && !state.loading && state.q) {
       catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("not_found")}</div>`;
       return;
    }
    
    // Если список пуст, но мы не искали, `loadBatch` сам покажет "empty"
    if (!list.length) {
        // Не показываем "не найдено", если идет загрузка
        if (!state.loading) {
           catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
        }
       return;
    }

    // 2. Сортируем (как и раньше)
    const popularList = [...list].sort((a, b) => (b.installCount || 0) - (a.installCount || 0));
    const updatesList = [...list].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    const vipList = list.filter(app => app.vipOnly).sort((a, b) => a.name.localeCompare(b.name));

    // 3. Рендерим
    renderCollectionRow(catalogContainer, "Popular", popularList);
    renderCollectionRow(catalogContainer, "Updates", updatesList);
    renderCollectionRow(catalogContainer, "VIP", vipList);
  };

  // === Search (без изменений) ===
  search.addEventListener("input", (e) => {
    state.q = e.target.value;
    apply();
    // (Поиск работает только по уже загруженным карточкам)
  });

  // === Tab Bar (МОДИФИЦИРОВАНО) ===
  // Теперь сбрасывает кэш при смене таба
  const bar = document.getElementById("tabbar");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;

    if (btn.dataset.tab) {
      // Клик по НОВОМУ табу
      if (state.tab === btn.dataset.tab) return; 
      
      state.tab = btn.dataset.tab; 
      bar.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      
      // === СБРОС СТЕЙТА ===
      state.all = [];
      state.last = null;
      state.end = false;
      state.q = ""; // Сбрасываем поиск
      search.value = "";
      catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">Загрузка ${state.tab}...</div>`; // Лоадер
      
      // Запускаем загрузку для НОВОГО таба
      loadBatch(); 
      // apply() вызовется сам

    } else if (btn.id === "lang-btn") {
      // Смена языка (просто перерисовываем то, что есть)
      lang = lang === "ru" ? "en" : "ru";
      localStorage.setItem("ursa_lang", lang);
      document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
      applyI18n();
      apply(); // Перерисовываем текущий кэш `state.all`
      
    } else if (btn.id === "settings-btn") {
      openSettings();
    }
  });

  // === Scroll (без изменений) ===
  window.addEventListener("scroll", () => {
    // Не грузим при скролле, если идет поиск
    if (state.q.length > 0) return; 
    
    const scrollY = window.scrollY;
    const scrollH = document.body.scrollHeight;
    const innerH = window.innerHeight;
    if (scrollY + innerH >= scrollH - 300) { 
      loadBatch(); 
    }
  });

  // === Initial load ===
  await loadBatch(); // Запускаем первую (быструю) загрузку
  applyI18n();
  // apply() вызовется автоматически внутри loadBatch()

  // === VIP Modal (без изменений) ===
  const vipModal = document.getElementById("vip-modal");
  if (vipModal) {
    vipModal.addEventListener("click", (e) => {
      if (e.target === vipModal || e.target.hasAttribute("data-close") || e.target.closest("[data-close]")) {
        vipModal.classList.remove("open");
        vipModal.setAttribute("aria-hidden", "true");
      }
    });
    const buyBtn = vipModal.querySelector("#buy-vip");
    if (buyBtn) {
      buyBtn.onclick = () => {
        const tgLink = "tg://resolve?domain=Ursa_ipa";
        window.location.href = tgLink;
        setTimeout(() => {
          window.open("https://t.me/Ursa_ipa", "_blank");
        }, 1200);
      };
    }
  }

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
});
