// URSA IPA — v6.8 Final Full (No Auto Modal + Working Settings)
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

// === I18N ===
const I18N = {
  ru: {
    search_ph: "Поиск по названию, bundleId…",
    install: "Установить",
    hack_features: "Функции мода",
    empty: "Пока нет приложений",
    ready: "✅ Готово! Установка начнётся…",
    signing: "Подписываем IPA…",
    load_error: "Ошибка Firestore"
  },
  en: {
    search_ph: "Search by name or bundleId…",
    install: "Install",
    hack_features: "Hack Features",
    empty: "No apps yet",
    ready: "✅ Ready! Installing…",
    signing: "Signing IPA…",
    load_error: "Firestore error"
  }
};

let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";
window.__t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Profile UI ===
window.updateProfileUI = function () {
  const info = document.getElementById("user-info");
  if (!info) return;
  const email = localStorage.getItem("ursa_email") || "—";
  const name = localStorage.getItem("ursa_name") || "Гость";
  const status = localStorage.getItem("ursa_status") || "free";
  const photo = localStorage.getItem("ursa_photo");
  info.querySelector("#user-photo").src = photo || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = name;
  info.querySelector("#user-email").textContent = email;
  info.querySelector("#user-status").textContent = status === "vip" ? "⭐ VIP" : "Free";
  info.querySelector("#auth-action").textContent = email === "—" ? "Войти через Google" : "Выйти";
};

// === Settings Modal ===
window.openSettings = function () {
  const dlg = document.getElementById("settings-modal");
  if (!dlg) return;
  window.updateProfileUI();
  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
};

window.closeSettings = function () {
  const dlg = document.getElementById("settings-modal");
  if (!dlg) return;
  dlg.classList.remove("open");
  dlg.setAttribute("aria-hidden", "true");
};

// === Main ===
window.addEventListener("DOMContentLoaded", async () => {
  console.log("⚡ URSA IPA v6.8 initialized");

  // icons
  document.getElementById("navAppsIcon").src = ICONS.apps;
  document.getElementById("navGamesIcon").src = ICONS.games;
  document.getElementById("navLangIcon").src = ICONS.lang?.[lang] || ICONS.lang.ru;
  document.getElementById("navSettingsIcon").src = ICONS.settings;

  // search
  const search = document.getElementById("search");
  if (search) search.placeholder = __t("search_ph");

  // settings button
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      console.log("⚙️ Settings clicked");
      window.openSettings();
    });
  }

  // close modal
  const settingsModal = document.getElementById("settings-modal");
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target.classList.contains("backdrop") || e.target.dataset.close !== undefined)
        window.closeSettings();
    });
  }

  // load apps
  try {
    const snap = await getDocs(collection(db, "ursa_ipas"));
    const apps = snap.docs.map((d) => d.data());
    const c = document.getElementById("catalog");

    if (!apps.length) {
      c.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;
    } else {
      c.innerHTML = apps
        .map(
          (a) => `
        <article class="card">
          <div class="row">
            <img class="icon" src="${a.iconUrl}" alt="">
            <div>
              <h3>${a.name}</h3>
              <div class="meta">${a.bundleId}</div>
              <div class="meta">v${a.version} · iOS ≥ ${a.minIOS || 15}</div>
            </div>
          </div>
        </article>`
        )
        .join("");
    }
  } catch (err) {
    console.error("Firestore load error:", err);
    document.getElementById("catalog").innerHTML =
      `<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
  }
});
