// URSA IPA — v8.0 LazyLoad + Dynamic i18n + VIP Lock Blur + Profile + AutoCert + Firestore
import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,         // <--- ДОБАВЛЕНО
  updateDoc,   // <--- ДОБАВЛЕНО
  increment    // <--- ДОБАВЛЕНО
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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
    signing_need_cert: "❌ Загрузите свой сертификат в профиле",
    // --- Новые ключи для коллекций ---
    collection_popular: "Popular",
    collection_updates: "Updates",
    collection_apps: "Apps",
    collection_games: "Games",
    badge_new: "New",
    badge_update: "Update"
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
    logout_btn: "SignOut",
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
    // --- Новые ключи для коллекций ---
    collection_popular: "Popular",
    collection_updates: "Updates",
    collection_apps: "Apps",
    collection_games: "Games",
    badge_new: "New",
    badge_update: "Update"
  }
};

let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
window.__t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Dynamic i18n Apply ===
function applyI18n() {
  qsa("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key && I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  qsa("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && I18N[lang][key]) el.placeholder = I18N[lang][key];
  });
  // Обновляем заголовок основного каталога
  const mainTitle = qs("#main-catalog-title");
  if (mainTitle) {
    const activeTab = qs(".nav-btn.active")?.dataset.tab || "apps";
    mainTitle.textContent = __t(activeTab === "games" ? "collection_games" : "collection_apps");
  }
}

// === Helpers ===
const prettyBytes = (n) => (!n ? "" : `${(n / 1e6).toFixed(0)} MB`);
const escapeHTML = (s) => (s || "").replace(/[&<>"']/g, (m) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[m]));
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// === Normalize Firestore doc ===
// Добавлен firestoreId, installCount, createdAt, updatedAt
function normalize(doc, firestoreId) {
  const tags = Array.isArray(doc.tags)
    ? doc.tags
    : doc.tags
    ? String(doc.tags).split(",").map((s) => s.trim())
    : [];
  return {
    id: firestoreId || doc.ID || doc.id || "", // <--- ID документа для счетчика
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
    tags: tags.map((t) => t.toLowerCase()),
    installCount: doc.installCount || 0,   // <--- Для "Popular"
    createdAt: doc.createdAt || null,    // <--- Для бейджа "New" (должен быть Timestamp)
    updatedAt: doc.updatedAt || null     // <--- Для бейджа "Update" (должен быть Timestamp)
  };
}

// === НОВАЯ ФУНКЦИЯ: Рендер одной карточки (DOM-элемент) ===
function renderCardElement(app, userStatus) {
  const el = document.createElement("article");
  el.className = "card";
  if (app.vipOnly && userStatus !== "vip") el.classList.add("vip-locked");

  // --- Логика бейджей "New" / "Update" ---
  let badge = null;
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 48 часов
  
  // Проверяем, что createdAt/updatedAt - это объекты Timestamp
  const created = app.createdAt?.toDate ? app.createdAt.toDate() : null;
  const updated = app.updatedAt?.toDate ? app.updatedAt.toDate() : null;

  if (created && created > twoDaysAgo) {
    badge = __t("badge_new");
  }
  // Если обновлено *после* создания и *недавно*
  if (updated && updated > twoDaysAgo && (!created || updated.getTime() > created.getTime() + 60000)) { // +1 минута допуска
    badge = __t("badge_update");
  }
  
  if (badge) {
    el.dataset.badge = badge; // Используем data-атрибут для стилизации CSS
  }
  // --- Конец логики бейджей ---

  el.innerHTML = `
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
    </div>`;
  el.addEventListener("click", () => openModal(app));
  return el;
}

// === НОВАЯ ФУНКЦИЯ: Создание блока коллекции ===
function createCollectionElement(titleKey, apps, userStatus) {
  const collectionSection = document.createElement("section");
  collectionSection.className = "collection-block";

  const title = document.createElement("h2");
  title.className = "collection-title";
  title.textContent = __t(titleKey);
  collectionSection.appendChild(title);

  const scrollContainer = document.createElement("div");
  scrollContainer.className = "collection-scroll";

  if (apps.length > 0) {
    apps.forEach(app => {
      scrollContainer.appendChild(renderCardElement(app, userStatus));
    });
  } else {
    scrollContainer.innerHTML = `<div style="opacity:.7;padding:20px 10px;">${__t("empty")}</div>`;
  }
  
  collectionSection.appendChild(scrollContainer);
  return collectionSection;
}

// === ИЗМЕНЕННАЯ ФУНКЦИЯ: Рендер основного каталога ===
function renderCatalog(apps) {
  const c = document.getElementById("catalog");
  c.innerHTML = ""; // Очищаем
  if (!apps.length) {
    c.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
    // Убедимся, что контейнер не пустой и не схлопнется
    c.style.minHeight = "100px";
    return;
  }
  
  c.style.minHeight = ""; // Сбрасываем высоту
  const userStatus = localStorage.getItem("ursa_status") || "free";

  // Используем новую функцию renderCardElement
  apps.forEach((app) => {
    c.appendChild(renderCardElement(app, userStatus));
  });
}

// === НОВАЯ ФУНКЦИЯ: Увеличение счетчика скачиваний ===
async function incrementInstallCount(appId) {
  if (!appId) return; // Не можем обновить, если нет ID
  const appRef = doc(db, "ursa_ipas", appId);
  try {
    // Используем `increment` от Firestore
    await updateDoc(appRef, {
      installCount: increment(1)
    });
    console.log(`Install count for ${appId} incremented.`);
  } catch (e) {
    console.warn("Could not update install count", e);
  }
}

// === ИЗМЕНЕННАЯ ФУНКЦИЯ: Install IPA ===
async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">${__t("signing_start")}</div><progress id="sign-progress" max="100" value="30" style="width:100%;height:8px;margin-top:6px;border-radius:8px;"></progress>`;
  try {
    const signer_id = localStorage.getItem("ursa_signer_id");
    if (!signer_id) throw new Error(__t("signing_need_cert"));
    
    // --- ВЫЗЫВАЕМ СЧЕТЧИК ---
    // Вызываем сразу, не дожидаясь ответа от API, чтобы не тормозить пользователя
    if (app.id) incrementInstallCount(app.id); 
    // --- КОНЕЦ ---

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
  // ... (код без изменений) ...
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
  // ... (код без изменений) ...
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
  // ... (код без изменений) ...
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

// === НОВАЯ ФУНКЦИЯ: Загрузка "Popular" и "Updates" ===
async function loadFeaturedCollections() {
  const container = document.getElementById('featured-collections');
  if (!container) return;

  const userStatus = localStorage.getItem("ursa_status") || "free";

  try {
    // --- Загрузка Popular ---
    // Сортируем по `installCount` (нужно, чтобы это поле было в Firestore)
    const popQuery = query(collection(db, "ursa_ipas"), orderBy("installCount", "desc"), limit(10));
    const popSnap = await getDocs(popQuery);
    const popApps = popSnap.docs.map(d => normalize(d.data(), d.id));
    container.appendChild(createCollectionElement("collection_popular", popApps, userStatus));

    // --- Загрузка Updates ---
    // Сортируем по `updatedAt` (нужно, чтобы это поле было в Firestore и было Timestamp)
    // Если `updatedAt` нет, можно заменить на `createdAt`
    const updQuery = query(collection(db, "ursa_ipas"), orderBy("updatedAt", "desc"), limit(10));
    const updSnap = await getDocs(updQuery);
    const updApps = updSnap.docs.map(d => normalize(d.data(), d.id));
    container.appendChild(createCollectionElement("collection_updates", updApps, userStatus));

  } catch (err) {
    console.error("Failed to load featured collections:", err);
    container.innerHTML = `<div style="opacity:.7;padding:20px 10px;">${__t("load_error")}</div>`;
  }
}


// === ИЗМЕНЕННАЯ ЛОГИКА ЗАГРУЗКИ ===
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  document.getElementById("navSettingsIcon").src = ICONS.settings;

  const search = document.getElementById("search");
  search.placeholder = __t("search_ph");
  
  // Показываем заголовок для основного каталога
  const mainCatalogTitle = qs("#main-catalog-title");
  mainCatalogTitle.style.display = "block";

  const state = { all: [], q: "", tab: "apps", last: null, loading: false, end: false };

  async function loadBatch() {
    if (state.loading || state.end) return;
    state.loading = true;
    
    // Показываем "загрузку" в основном каталоге
    const catalogEl = document.getElementById("catalog");
    if (!state.last) catalogEl.innerHTML = `<div style="opacity:.7;padding:40px;">Loading...</div>`;


    const cRef = collection(db, "ursa_ipas");
    // Используем `NAME` для сортировки основного списка, как и было
    let qRef = query(cRef, orderBy("NAME"), limit(10)); 
    if (state.last) qRef = query(cRef, orderBy("NAME"), startAfter(state.last), limit(10));

    try {
      const snap = await getDocs(qRef);
      if (snap.empty) {
        state.end = true;
        if (!state.all.length) {
           catalogEl.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
        }
        return;
      }
      
      // --- ВАЖНО: передаем d.id в normalize ---
      const batch = snap.docs.map((d) => normalize(d.data(), d.id));
      
      state.all.push(...batch);
      state.last = snap.docs[snap.docs.length - 1];
      apply();
    } catch (err) {
      console.error("Firestore error:", err);
      catalogEl.innerHTML =
        `<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
    } finally {
      state.loading = false;
    }
  }

  const apply = () => {
    const q = state.q.trim().toLowerCase();
    const list = state.all.filter((app) =>
      q
        ? (app.name || "").toLowerCase().includes(q) ||
          (app.bundleId || "").toLowerCase().includes(q) ||
          (app.features || "").toLowerCase().includes(q)
        : state.tab === "games"
        ? app.tags.includes("games")
        : app.tags.includes("apps")
    );
    renderCatalog(list);
    
    // Обновляем заголовок
    mainCatalogTitle.textContent = __t(state.tab === "games" ? "collection_games" : "collection_apps");
  };

  search.addEventListener("input", (e) => (state.q = e.target.value, apply()));

  const bar = document.getElementById("tabbar");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;
    if (btn.dataset.tab) {
      state.tab = btn.dataset.tab;
      bar.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      apply(); // Перерисовываем основной каталог
    } else if (btn.id === "lang-btn") {
      lang = lang === "ru" ? "en" : "ru";
      localStorage.setItem("ursa_lang", lang);
      document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
      applyI18n(); // Применяем язык
      apply(); // Перерисовываем основной каталог (для текстов внутри)
      // Перезагружаем "Popular" и "Updates" для новых заголовков и бейджей
      loadFeaturedCollections(); 
    } else if (btn.id === "settings-btn") {
      openSettings();
    }
  });

  // === Scroll-based Lazy Load (для основного каталога) ===
  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;
    const scrollH = document.body.scrollHeight;
    const innerH = window.innerHeight;
    // Загружаем следующую пачку, *если* мы внизу *И* нет активного поиска
    if (scrollY + innerH >= scrollH - 200 && !state.q) { 
      loadBatch(); // подгрузка при скролле вниз
    }
  });

  // === Initial load ===
  
  // 1. Сначала применяем язык
  applyI18n();
  
  // 2. Запускаем загрузку "Popular" и "Updates" (они загрузятся и появятся)
  loadFeaturedCollections(); 
  
  // 3. Запускаем загрузку первой пачки основного каталога
  await loadBatch();
  
  // 4. Применяем фильтры (уже вызвано внутри loadBatch)
  // apply(); // <-- уже не нужно, вызывается в loadBatch

  // === VIP Modal (без изменений) ===
  const vipModal = document.getElementById("vip-modal");
  if (vipModal) {
    // ... (код без изменений) ...
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
