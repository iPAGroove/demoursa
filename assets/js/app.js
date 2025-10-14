// URSA IPA — Full UI + Profile + VIP + Signer + Progress + Theme Integration (v6.3)
import { db } from "./firebase.js";
import { collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// === Signer API ===
const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";

// === ICONS ===
const ICONS = {
  apps: "https://store5.gofile.io/download/direct/9a5cf9e9-9b82-4ce4-9cc9-ce63b857dcaf/%D0%BA%D0%BE%D0%BF%D0%B8.png",
  games: "https://store-eu-par-3.gofile.io/download/direct/22931df3-7659-4095-8dd0-a7eadb14e1e6/IMG_9678.PNG",
  lang: {
    ru: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
    en: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
  },
  settings: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png",
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
  },
  en: {
    search_ph: "Search by name or bundleId…",
    install: "Install",
    hack_features: "Hack Features",
    not_found: "Nothing found",
    empty: "No apps yet",
    load_error: "Firestore error",
  },
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
    ? String(doc.tags)
        .split(",")
        .map((s) => s.trim())
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
    tags: tags.map((t) => t.toLowerCase()),
  };
}

// === PROGRESS BAR ===
function makeProgress(container) {
  container.innerHTML = `
    <div style="display:grid;gap:8px;width:100%">
      <div class="progress is-indeterminate"><div class="bar"></div></div>
      <div id="signStep" class="meta">🔄 Подписываем IPA…</div>
    </div>`;
  const step = (t) => {
    const el = document.getElementById("signStep");
    if (el) el.textContent = t;
  };
  return { step };
}

// === INSTALL LOGIC (Cloud Run) ===
async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  const prog = makeProgress(dl);
  try {
    const signer_id = localStorage.getItem("ursa_signer_id");
    if (!signer_id) throw new Error("❌ Загрузите свой сертификат в профиле");

    prog.step("⬇️ Скачиваем IPA…");
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("signer_id", signer_id);

    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || json.error || "Ошибка при подписи IPA");

    prog.step("📦 Подписываем и готовим установку…");
    setTimeout(() => {
      prog.step("✅ Готово! Установка начнётся…");
      setTimeout(() => (location.href = json.install_link), 700);
    }, 500);
  } catch (err) {
    console.error("Install error:", err);
    dl.innerHTML = `<div style="opacity:.95;color:#ff6;">❌ ${err.message || err}</div>`;
  }
}
window.installIPA = installIPA;

// === RENDER CATALOG ===
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
          <div class="meta">
            v${escapeHTML(app.version || "")}${
      app.minIOS ? " · iOS ≥ " + escapeHTML(app.minIOS) : ""
    }${app.sizeBytes ? " · " + prettyBytes(app.sizeBytes) : ""}
          </div>
        </div>
      </div>`;
    el.addEventListener("click", () => openModal(app));
    c.appendChild(el);
  });
}

// === APP MODAL ===
const modal = document.getElementById("modal");
function openModal(app) {
  document.getElementById("app-icon").src = app.iconUrl;
  document.getElementById("app-title").textContent = app.name || "";
  document.getElementById("app-bundle").textContent = app.bundleId || "";
  document.getElementById("app-info").textContent = `v${app.version || ""}${
    app.minIOS ? " · iOS ≥ " + app.minIOS : ""
  }${app.sizeBytes ? " · " + prettyBytes(app.sizeBytes) : ""}`;

  let feats = "";
  if (lang === "ru" && app.features_ru) feats = app.features_ru;
  else if (lang === "en" && app.features_en) feats = app.features_en;
  else feats = app.features;
  const featList = feats ? feats.split(",").map((f) => f.trim()).filter(Boolean) : [];
  document.getElementById("app-desc").innerHTML = featList.length
    ? `<div class="meta" style="margin-bottom:6px">${__t("hack_features")}</div>
       <ul class="bullets">${featList.map((f) => `<li>${escapeHTML(f)}</li>`).join("")}</ul>`
    : "";

  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = "";
  const status = localStorage.getItem("ursa_status") || "free";
  if (app.vipOnly && status !== "vip") {
    dl.innerHTML = `<div style="color:#ff6;">🔒 Только для VIP</div>`;
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

// === MAIN ===
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
  } catch (err) {
    console.error("Firestore:", err);
    document.getElementById("catalog").innerHTML = `<div style="text-align:center;opacity:.7;padding:40px;">${__t(
      "load_error"
    )}</div>`;
  }

  function apply() {
    const q = state.q.trim().toLowerCase();
    const list = state.all.filter((app) => {
      if (q) {
        return (
          (app.name || "").toLowerCase().includes(q) ||
          (app.bundleId || "").toLowerCase().includes(q) ||
          (app.features || "").toLowerCase().includes(q) ||
          app.tags.some((t) => (t || "").toLowerCase().includes(q))
        );
      }
      return state.tab === "games" ? app.tags.includes("games") : app.tags.includes("apps");
    });
    if (!list.length) {
      document.getElementById("catalog").innerHTML = `<div style="opacity:.7;text-align:center;padding:40px 16px;">${__t(
        q ? "not_found" : "empty"
      )}</div>`;
    } else {
      renderCatalog(list);
    }
  }

  document.getElementById("search").addEventListener("input", () => {
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

  document.getElementById("settings-modal").addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close") || e.target.id === "settings-modal") {
      e.currentTarget.classList.remove("open");
      e.currentTarget.setAttribute("aria-hidden", "true");
    }
  });

  apply();
});

// === SETTINGS MODAL ===
window.openSettings = async function openSettings() {
  const dlg = document.getElementById("settings-modal");
  const info = document.getElementById("user-info");

  const uid = localStorage.getItem("ursa_uid");
  const email = localStorage.getItem("ursa_email");
  const name = localStorage.getItem("ursa_name") || "Гость";
  const status = localStorage.getItem("ursa_status") || "free";
  const photo = localStorage.getItem("ursa_photo");

  if (uid) {
    try {
      const sref = doc(db, "ursa_signers", uid);
      const ssnap = await getDoc(sref);
      if (ssnap.exists()) {
        localStorage.setItem("ursa_signer_id", uid);
        localStorage.setItem("ursa_cert_account", ssnap.data().account || "—");
        if (ssnap.data().expires) localStorage.setItem("ursa_cert_exp", ssnap.data().expires);
      }
    } catch (e) {
      console.warn("Signer fetch:", e);
    }
  }

  const signer = localStorage.getItem("ursa_signer_id") ? "✅ Загружен" : "❌ Не загружен";
  const account = localStorage.getItem("ursa_cert_account") || "—";
  const expires = localStorage.getItem("ursa_cert_exp")
    ? new Date(localStorage.getItem("ursa_cert_exp")).toLocaleDateString("ru-RU")
    : "—";

  info.querySelector("#user-photo").src = photo || "assets/icons/avatar.png";
  info.querySelector("#user-name").textContent = name;
  info.querySelector("#user-email").textContent = email || "—";
  info.querySelector("#user-status").textContent = status === "vip" ? "⭐ VIP" : "Free";
  info.querySelector("#cert-state").textContent = signer;
  info.querySelector("#cert-account").textContent = account;
  info.querySelector("#cert-exp").textContent = expires;
  info.querySelector("#acc-status").textContent = status === "vip" ? "VIP" : "Free";

  const authBtn = info.querySelector("#auth-action");
  authBtn.textContent = email ? "Выйти" : "Войти через Google";
  authBtn.onclick = () => window.ursaAuthAction && window.ursaAuthAction();

  const certBtn = info.querySelector("#cert-upload");
  certBtn.textContent = signer.startsWith("✅") ? "🔁 Сменить сертификат" : "📤 Добавить свой сертификат";
  certBtn.onclick = () => {
    const modal = document.getElementById("signer-modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  };

  let switchWrap = info.querySelector(".status-switch");
  if (!switchWrap) {
    switchWrap = document.createElement("div");
    switchWrap.className = "status-switch";
    switchWrap.innerHTML = `
      <div class="chip" data-status="free">Free</div>
      <div class="chip" data-status="vip">VIP</div>`;
    info.appendChild(switchWrap);
  }

  switchWrap.querySelectorAll(".chip").forEach((ch) => {
    ch.classList.toggle("active", ch.dataset.status === status);
    ch.onclick = async () => {
      const newStatus = ch.dataset.status;
      if (newStatus === status) return;
      localStorage.setItem("ursa_status", newStatus);
      info.querySelector("#user-status").textContent = newStatus === "vip" ? "⭐ VIP" : "Free";
      info.querySelector("#acc-status").textContent = newStatus.toUpperCase();
      switchWrap.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === ch));
      try {
        const uid = localStorage.getItem("ursa_uid");
        if (!uid) throw new Error("Не выполнен вход");
        await setDoc(doc(db, "users", uid), { status: newStatus, updated_at: new Date().toISOString() }, { merge: true });
        if (window.ursaToast) ursaToast(`Статус изменён: ${newStatus.toUpperCase()}`, "success");
      } catch (e) {
        if (window.ursaToast) ursaToast("Не удалось сохранить статус", "error");
      }
    };
  });

  dlg.classList.add("open");
  dlg.setAttribute("aria-hidden", "false");
};
