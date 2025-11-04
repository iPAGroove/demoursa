// assets/js/catalog.js

import { db } from "./firebase.js";
import {
    collection, query, orderBy, limit, startAfter, getDocs, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { __t, applyI18n, getLang, toggleLang } from "./i18n.js";
import { qs, qsa, escapeHTML, prettyBytes } from "./utils.js";
import { openModal } from "./modals.js";
import { toggleTheme } from "./themes.js";

// === ICONS (перенесены из app.js) ===
const ICONS = {
    apps: "https://store5.gofile.io/download/direct/9a5cf9e9-9b82-4ce4-9cc9-ce63b857dcaf/%D0%BA%D0%BE%D0%BF%D0%B8.png",
    games: "https://store-eu-par-3.gofile.io/download/direct/22931df3-7659-4095-8dd0-a7eadb14e1e6/IMG_9678.PNG",
    lang: {
        ru: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
        en: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG"
    },
    settings: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png"
};

// === Global State for Catalog ===
const catalogContainer = document.getElementById("catalog");
window.allAppsCache = {}; // Глобальный кэш для доступа из modals.js
const state = {
    all: [],
    q: "",
    tab: "apps",
    last: null,
    loading: false,
    end: false
};


// === App Data Normalization (из app.js) ===
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


// === Render Collection Row (из app.js) ===
function renderCollectionRow(containerEl, title, apps) {
    if (!apps.length) return;
    const userStatus = localStorage.getItem("ursa_status") || "free";
    const now = Timestamp.now();
    const sevenDaysAgo = Timestamp.fromMillis(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
    let cardsHTML = "";
    apps.forEach((app) => {
        if (app.id) window.allAppsCache[app.id] = app;
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


// === Load Data from Firestore (из app.js) ===
async function loadBatch(isInitial = false) {
    if (state.loading || state.end) return;
    state.loading = true;

    const cRef = collection(db, "ursa_ipas");
    
    const currentLimit = isInitial
        ? 6
        : (state.q.length > 0 ? 200 : 30);
        
    let queryArgs = [orderBy("updatedAt", "desc"), limit(currentLimit)];

    if (state.last === null && !state.q.length) {
        queryArgs.unshift(where("tags", "array-contains", state.tab));
    }
    
    if (state.last) {
        queryArgs.push(startAfter(state.last));
    }

    let qRef = query(cRef, ...queryArgs);

    try {
        const snap = await getDocs(qRef);
        
        if (snap.empty) {
            state.end = true;
            if (state.all.length === 0) {
                catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
            }
            return;
        }
        
        const batch = snap.docs.map(normalize);
        state.all.push(...batch);
        state.last = snap.docs[snap.docs.length - 1];
        
    } catch (err) {
        console.error("Firestore error:", err);
        catalogContainer.innerHTML =
            `<div style="text-align:center;opacity:.7;padding:40px;">
                ${__t("load_error")}
                <br><small style="opacity:0.5;font-size:12px;">(Нужен индекс, см. консоль F12)</small>
            </div>`;
    } finally {
        state.loading = false;
    }
}


// === Load All for Global Search (из app.js) ===
async function loadAllForGlobalSearch() {
    if (state.end) return;
    
    if (state.all.length > 0 && !state.end) {
        state.all = [];
        state.last = null;
        state.end = false;
    }

    catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">Загрузка ВСЕЙ коллекции для глобального поиска...</div>`;
    
    while (!state.end) {
        if (state.loading) {
            await new Promise(resolve => setTimeout(resolve, 50));
            continue;
        }
        await loadBatch();
        apply();
    }
}


// === Apply Filters and Render (из app.js) ===
const apply = () => {
    const q = state.q.trim().toLowerCase();
    const isSearching = q.length > 0;
    
    let list = state.all;
    
    // 1. Фильтр
    if (isSearching) {
        list = list.filter((app) =>
            (app.name || "").toLowerCase().includes(q) ||
            (app.bundleId || "").toLowerCase().includes(q) ||
            (app.features || "").toLowerCase().includes(q)
        );
    } else {
        list = list.filter((app) => app.tags.includes(state.tab));
    }

    catalogContainer.innerHTML = "";
    window.allAppsCache = {};
    
    // Условие 1: Ничего не найдено
    if (!list.length && isSearching) {
        catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("not_found")}</div>`;
        return;
    }
    
    // Условие 2: Коллекция пуста
    if (!list.length && !state.loading && !isSearching) {
        catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
        return;
    }
    
    // 2. Сортировка
    const popularList = [...list].sort((a, b) => (b.installCount || 0) - (a.installCount || 0));
    const updatesList = [...list].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    const vipList = list.filter(app => app.vipOnly).sort((a, b) => a.name.localeCompare(b.name));

    // 3. Рендер
    renderCollectionRow(catalogContainer, "Popular", popularList);
    renderCollectionRow(catalogContainer, "Updates", updatesList);
    renderCollectionRow(catalogContainer, "VIP", vipList);
};


// === Main DOM Ready Logic (из app.js) ===
document.addEventListener("DOMContentLoaded", async () => {
    const search = document.getElementById("search");
    const bar = document.getElementById("tabbar");

    const actBtn = qs(".nav-btn.active");
    if (actBtn && actBtn.dataset.tab) {
        state.tab = actBtn.dataset.tab;
    }

    // 1. Инициализация иконок
    document.getElementById("navAppsIcon").src = ICONS.apps;
    document.getElementById("navGamesIcon").src = ICONS.games;
    document.getElementById("navLangIcon").src = ICONS.lang?.[getLang()] || ICONS.lang.ru;
    document.getElementById("navSettingsIcon").src = ICONS.settings;

    // 2. Поиск
    search.addEventListener("input", async (e) => {
        state.q = e.target.value;
        const isSearching = state.q.length > 0;
        if (isSearching && !state.end) {
            await loadAllForGlobalSearch();
        }
        apply();
    });

    // 3. Таб-бар
    bar.addEventListener("click", (e) => {
        const btn = e.target.closest(".nav-btn");
        if (!btn) return;

        if (btn.dataset.tab) {
            if (state.tab === btn.dataset.tab) return;

            state.tab = btn.dataset.tab;
            bar.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            if (state.end) {
                apply();
                return;
            }
            
            state.all = [];
            state.last = null;
            state.end = false;
            state.q = "";
            search.value = "";
            catalogContainer.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">Загрузка ${state.tab}...</div>`;

            loadBatch(true).then(apply);

        } else if (btn.id === "lang-btn") {
            toggleLang(ICONS.lang?.[getLang()] || ICONS.lang.ru);
            apply();
        } else if (btn.id === "settings-btn") {
            window.openSettings(); // openSettings из auth.js
        }
    });

    // 4. Обработчик клика по карточке (перенесен сюда из modals.js для доступа к кэшу)
    catalogContainer.addEventListener("click", (e) => {
        const card = e.target.closest(".card");
        if (!card) return;
        const appId = card.dataset.appId;
        if (appId && window.allAppsCache[appId]) {
            openModal(window.allAppsCache[appId]);
        } else {
            console.warn("No app data in cache for ID:", appId);
        }
    });
    
    // 5. Скролл (ленивая загрузка)
    window.addEventListener("scroll", () => {
        if (state.q.length > 0 || state.loading || state.end) return;

        const scrollY = window.scrollY;
        const scrollH = document.body.scrollHeight;
        const innerH = window.innerHeight;
        if (scrollY + innerH >= scrollH - 300) {
            loadBatch().then(apply);
        }
    });

    // 6. Начальная загрузка
    await loadBatch(true);
    apply();
    applyI18n();

    // 7. Toggle Theme
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
});
