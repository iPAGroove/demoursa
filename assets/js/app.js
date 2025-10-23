// URSA IPA — v8.0 LazyLoad + Dynamic i18n + VIP Lock Blur + Profile + AutoCert + Firestore
// === МОДИФИЦИРОВАНО: НОВЫЙ ВИД КОЛЛЕКЦИЙ v9.0 ===

import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  // startAfter, // Больше не нужен для старой постраничной загрузки
  getDocs,
  doc,         // Добавлено
  updateDoc,   // Добавлено
  increment,   // Добавлено
  where,       // Добавлено
  Timestamp    // Добавлено
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

// === НОВАЯ ФУНКЦИЯ: Учет кликов по "Установить" ===
async function incrementInstallCount(appId) {
  if (!appId) return;
  try {
    const appRef = doc(db, "ursa_ipas", appId);
    // Убедись, что в Firestore есть поле 'installCount' (тип Number)
    await updateDoc(appRef, {
      installCount: increment(1)
    });
  } catch (err) {
    console.error("Failed to increment install count:", err);
  }
}

// === Normalize Firestore doc (МОДИФИЦИРОВАНО) ===
// Теперь принимает весь 'doc', а не 'doc.data()'
// Добавлены ID и временные метки
function normalize(doc) {
  const data = doc.data(); // Получаем данные из документа
  const tags = Array.isArray(data.tags)
    ? data.tags
    : data.tags
    ? String(data.tags).split(",").map((s) => s.trim())
    : [];
  return {
    id: doc.id, // <-- ВАЖНО: получаем ID_документа
    name: data.NAME || data.name || "",
    bundleId: data["Bundle ID"] || data.bundleId || "",
    version: data.Version || data.version || "",
    minIOS: data["minimal iOS"] || data.minIOS || "",
    sizeBytes: data.sizeBytes || 0,
    iconUrl: data.iconUrl || "",
    downloadUrl: data.DownloadUrl || data.downloadUrl || "",
    features: data.features || "",
    features_ru: data.features_ru || "",
    features_en: data.features_en || "",
    vipOnly: !!data.vipOnly,
    tags: tags.map((t) => t.toLowerCase()),
    createdAt: data.createdAt || null, // <-- НУЖНО ПОЛЕ Timestamp в Firestore
    updatedAt: data.updatedAt || null  // <-- НУЖНО ПОЛЕ Timestamp в Firestore
  };
}

// === Catalog render (ПОЛНОСТЬЮ ЗАМЕНЕН) ===
// Старая 'renderCatalog' удалена. Новая функция рендерит 1 ряд карусели.
function renderCollectionRow(containerEl, title, apps) {
  if (!apps.length) return; // Не рендерим пустые секции

  const userStatus = localStorage.getItem("ursa_status") || "free";
  const now = Timestamp.now();
  // 7 дней назад
  const sevenDaysAgo = Timestamp.fromMillis(now.toMillis() - 7 * 24 * 60 * 60 * 1000);

  let cardsHTML = "";
  apps.forEach((app) => {
    let badge = "";
    
    // Логика для плашек New/Update
    // Проверяем, было ли обновление за последние 7 дней
    if (app.updatedAt && app.updatedAt.seconds > sevenDaysAgo.seconds) {
      // Проверяем, что обновление было не в ту же минуту, что и создание
      if (app.createdAt && (app.updatedAt.seconds - app.createdAt.seconds > 60)) { 
         badge = '<span class="badge update">Update</span>';
      }
    }
    // Если не "Update", проверяем, не "New" ли (создано за последние 7 дней)
    if (!badge && app.createdAt && app.createdAt.seconds > sevenDaysAgo.seconds) {
       badge = '<span class="badge new">New</span>';
    }
    
    // Проверка на VIP-блок
    const isLocked = app.vipOnly && userStatus !== "vip";
    const cardClass = isLocked ? "card vip-locked" : "card";

    // data-app-id нужен для модального окна
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


// === Install IPA (МОДИФИЦИРОВАНО) ===
async function installIPA(app) {
  // ===> ДОБАВЛЕНО: Отправляем +1 клик в аналитику
  incrementInstallCount(app.id); 
  // <===

  const dl = document.getElementById("dl-buttons");
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
    document.getElementById("sign-progress").value = 100;
    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">${__t("signing_ready")}</div>`;
    setTimeout(() => (location.href = json.install_link), 900);
  } catch (err) {
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message || err}</div>`;
  }
}
window.installIPA = installIPA;

// === App Modal (без изменений) ===
const appModal = document.getElementById("modal");
function openModal(app) {
  const userStatus = localStorage.getItem("ursa_status") || "free";
  qs("#app-icon").src = app.iconUrl || "";
  qs("#app-title").textContent = app.name || "";
  qs("#app-bundle").textContent = app.bundleId || "";
  qs("#app-info").textContent = `v${app.version || ""}${app.minIOS ? " · iOS ≥ " + app.minIOS : ""}${app.sizeBytes ? " · " + prettyBytes(app.sizeBytes) : ""}`;

  const feats = (lang === "ru" ? app.features_ru : app.features_en) || app.features || "";
  const featList = feats ? feats.split(",").map((f) => f.trim()).filter(Boolean) : [];
  qs("#app-desc").innerHTML = featList.length
    ? `<div class="meta" style="margin-bottom:6px">${__t("hack_features")}</div><ul class="bullets">${featList.map((f) => `<li>${escapeHTML(f)}`).join("")}</ul>`
    : "";

  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = "";
  if (app.vipOnly && userStatus !== "vip") {
    dl.innerHTML = `<div style="color:#ff6;">${__t("vip_only")}</div>`;
  } else if (app.downloadUrl) {
    const a = document.createElement("button");
    a.className = "btn";
    a.textContent = __t("install");
    a.onclick = () => installIPA(app);
    dl.appendChild(a);
  }

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

// === Profile Modal (без изменений) ===
window.openSettings = async function openSettings() {
  const dlg = document.getElementById("settings-modal");
  const info = dlg.querySelector("#user-info");

  info.querySelector("#user-photo").src = localStorage.getItem("ursa_photo") || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = localStorage.getItem("ursa_name") || __t("guest");
  info.querySelector("#user-email").textContent = localStorage.getItem("ursa_email") || __t("dash");

  const accLine = dlg.querySelector("#cert-account")?.closest("p");
  const expLine = dlg.querySelector("#cert-exp")?.closest("p");
  if (accLine) accLine.style.display = "none";
  if (expLine) expLine.style.display = "none";

  const status = localStorage.getItem("ursa_status") || "free";
  info.querySelector("#user-status").textContent = status === "vip" ? __t("badge_vip") : __t("badge_free");

  const hasSigner = !!localStorage.getItem("ursa_signer_id");
  info.querySelector("#cert-state").textContent = hasSigner ? __t("cert_state_ok") : __t("cert_state_none");

  const certBtn = info.querySelector("#cert-upload");
  certBtn.textContent = __t("cert_upload_btn");
  certBtn.onclick = () => {
    const modal = document.getElementById("signer-modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  };

  const authBtn = info.querySelector("#auth-action");
  authBtn.textContent = localStorage.getItem("ursa_email") ? __t("logout_btn") : __t("login_btn");
  authBtn.onclick = () => window.ursaAuthAction && window.ursaAuthAction();

  const upgradeBtn = info.querySelector("#vip-upgrade");
  if (upgradeBtn) {
    upgradeBtn.textContent = __t("upgrade_btn");
    upgradeBtn.onclick = () => {
      const vip = document.getElementById("vip-modal");
      vip.classList.add("open");
      vip.setAttribute("aria-hidden", "false");
    };
  }

  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.hasAttribute("data-close") || e.target.closest("[data-close]")) {
      dlg.classList.remove("open");
      dlg.setAttribute("aria-hidden", "true");
    }
  });
};

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

// === Firestore LazyLoad (ПОЛНОСТЬЮ ЗАМЕНЕН) ===
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  document.getElementById("navSettingsIcon").src = ICONS.settings;

  const search = document.getElementById("search");
  search.placeholder = __t("search_ph");
  
  const catalogContainer = document.getElementById("catalog");
  
  // Кэш для хранения данных приложений (для модального окна)
  let allAppsCache = {}; 

  // Единый обработчик кликов по карточкам
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

  // Главная функция загрузки коллекций
  async function loadCollections() {
    // Временный лоадер
    catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">Загрузка...</div>`; 
    
    try {
      const cRef = collection(db, "ursa_ipas");
      
      // 1. Запрос "Popular"
      // Сортируем по 'installCount' (поле должно быть в Firestore)
      // Берем 12 штук (4 "страницы" по 3 карточки)
      const popularQuery = query(cRef, orderBy("installCount", "desc"), limit(12));
      
      // 2. Запрос "Updates"
      // Сортируем по 'updatedAt' (поле должно быть в Firestore)
      const updatesQuery = query(cRef, orderBy("updatedAt", "desc"), limit(12));
      
      // 3. Запрос "VIP"
      // Фильтруем по 'vipOnly == true'
      const vipQuery = query(cRef, where("vipOnly", "==", true), orderBy("NAME"), limit(12));

      // Выполняем все запросы параллельно
      const [popularSnap, updatesSnap, vipSnap] = await Promise.all([
        getDocs(popularQuery),
        getDocs(updatesQuery),
        getDocs(vipQuery)
      ]);

      // Нормализуем данные
      const popularApps = popularSnap.docs.map(normalize);
      const updatesApps = updatesSnap.docs.map(normalize);
      const vipApps = vipSnap.docs.map(normalize);
      
      // Очищаем лоадер
      catalogContainer.innerHTML = "";
      
      // Сбрасываем кэш и наполняем новыми данными
      allAppsCache = {};
      [...popularApps, ...updatesApps, ...vipApps].forEach(app => {
        if (app.id) allAppsCache[app.id] = app;
      });

      // Рендерим секции
      renderCollectionRow(catalogContainer, "Popular", popularApps);
      renderCollectionRow(catalogContainer, "Updates", updatesApps);
      renderCollectionRow(catalogContainer, "VIP", vipApps);
      
      // Если ничего не загрузилось
      if (catalogContainer.innerHTML === "") {
         catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
      }

    } catch (err) {
      console.error("Collection load error:", err);
      catalogContainer.innerHTML =
        `<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
    }
  }
  
  // Старый 'state', 'loadBatch', 'apply' и 'scroll' listener УДАЛЕНЫ
  // ...

  // === Tab Bar Logic (МОДИФИЦИРОВАНО) ===
  const bar = document.getElementById("tabbar");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;
    if (btn.dataset.tab) {
      // state.tab = btn.dataset.tab; // Старая логика
      bar.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      // apply(); // Старая логика
      // TODO: Табы 'apps' и 'games' теперь ничего не делают.
      // Нужно будет придумать для них новую логику.
      
    } else if (btn.id === "lang-btn") {
      lang = lang === "ru" ? "en" : "ru";
      localStorage.setItem("ursa_lang", lang);
      document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
      applyI18n(); // Применяем язык
      loadCollections(); // Перезагружаем коллекции с новым языком
      
    } else if (btn.id === "settings-btn") {
      openSettings();
    }
  });

  // === Search (МОДИФИЦИРОВАНО) ===
  search.addEventListener("input", (e) => {
     // state.q = e.target.value; // Старая логика
     // apply(); // Старая логика
     // TODO: Поиск теперь ничего не делает.
     // Его нужно будет или подключить к API, 
     // или фильтровать карточки на лету (сложно).
  });

  // === Initial load ===
  await loadCollections(); // Запускаем загрузку новых коллекций
  applyI18n();
  // apply(); // Старая логика

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
