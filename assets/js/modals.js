// assets/js/modals.js

import { __t, getLang } from "./i18n.js";
import { qs, escapeHTML, prettyBytes, formatTimeAgo } from "./utils.js";
import { installIPA, clearInstallListener } from "./signer_flow.js";

const appModal = document.getElementById("modal");

export function openModal(app) {
    const userStatus = localStorage.getItem("ursa_status") || "free";
    const isLocked = app.vipOnly && userStatus !== "vip";
    const modalHeader = qs(".sheet-header", appModal);

    // === Сброс листенера при открытии нового модального окна ===
    clearInstallListener();

    modalHeader.innerHTML = `
        <button class="close" data-close>✕</button>
        <header class="sheet-header">
            <div class="app-head">
                <img id="app-icon" class="icon lg" src="${app.iconUrl || ""}" alt="">
                <div class="head-content">
                    <h2 id="app-title">${escapeHTML(app.name)}</h2>
                    <div id="dl-buttons-row" class="btns-row"></div>
                </div>
            </div>
        </header>`;
    
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
    
    const modalBody = qs(".sheet-body", appModal);
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
        
    const desc = (getLang() === "ru" ? app.description_ru : app.description_en) || "";
    const feats = (getLang() === "ru" ? app.features_ru : app.features_en) || app.features || "";
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

    appModal.classList.add("open");
    appModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

export function closeModal() {
    appModal.classList.remove("open");
    appModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    // === Сброс листенера при закрытии модального окна ===
    clearInstallListener();
}

// === Event Listeners для modal.js ===
document.addEventListener("DOMContentLoaded", () => {
    // Закрытие по клику на бэкдроп/кнопку
    appModal.addEventListener("click", (e) => {
        if (e.target === appModal || e.target.hasAttribute("data-close") || e.target.closest("[data-close]")) closeModal();
    });

    // Закрытие по Esc
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && appModal.classList.contains("open")) closeModal();
    });
});
