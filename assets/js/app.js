// URSA IPA — classic UI + Firestore + i18n + tabs + settings
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
  storageBucket: "ipa-panel.firebasestorage.app",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ICONS
const ICONS = {
  apps: "https://store5.gofile.io/download/direct/9a5cf9e9-9b82-4ce4-9cc9-ce63b857dcaf/%D0%BA%D0%BE%D0%BF%D0%B8.png",
  games: "https://store-eu-par-3.gofile.io/download/direct/22931df3-7659-4095-8dd0-a7eadb14e1e6/IMG_9678.PNG",
  lang: {
    ru: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
    en: "https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG"
  },
  settings: "https://cdn-icons-png.flaticon.com/512/3524/3524659.png"
};

// i18n
const I18N = {
  ru: { search_ph:"Поиск по названию, bundleId…", download:"Загрузить IPA", hack_features:"Функции мода", not_found:"Ничего не найдено", empty:"Пока нет приложений", load_error:"Ошибка Firestore" },
  en: { search_ph:"Search by name or bundleId…",  download:"Download IPA",    hack_features:"Hack Features",  not_found:"Nothing found",   empty:"No apps yet",         load_error:"Firestore error" }
};
let lang=(localStorage.getItem("ursa_lang")||(navigator.language||"ru").slice(0,2)).toLowerCase();
if(!I18N[lang]) lang="ru";
window.__t=(k)=>(I18N[lang]&&I18N[lang][k])||k;

// Helpers
const prettyBytes=(n)=>!n?"":`${(n/1e6).toFixed(0)} MB`;
const escapeHTML=(s)=>(s||"").replace(/[&<>"']/g,(m)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));

// Normalize Firestore doc
function normalize(doc){
  const tags = Array.isArray(doc.tags) ? doc.tags : (doc.tags? String(doc.tags).split(",").map(s=>s.trim()) : []);
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
    tags: tags.map(t=>t.toLowerCase())
  };
}

// Render catalog
function renderCatalog(apps){
  const c=document.getElementById("catalog");
  c.innerHTML="";
  if(!apps.length){
    c.innerHTML=`<div style="opacity:.7;text-align:center;padding:40px 16px;">${__t("empty")}</div>`;
    return;
  }
  apps.forEach(app=>{
    const el=document.createElement("article");
    el.className="card";
    el.setAttribute("role","listitem");
    el.tabIndex=0;
    el.innerHTML=`
      <div class="row">
        <img class="icon" src="${app.iconUrl}" alt="">
        <div>
          <h3>${escapeHTML(app.name)}${app.vipOnly?' <span style="color:#00b3ff">⭐</span>':''}</h3>
          <div class="meta">${escapeHTML(app.bundleId||"")}</div>
          <div class="meta">v${escapeHTML(app.version||"")}${app.minIOS?` · iOS ≥ ${escapeHTML(app.minIOS)}`:""}${app.sizeBytes?` · ${prettyBytes(app.sizeBytes)}`:""}</div>
        </div>
      </div>`;
    const open=()=>openModal(app);
    el.addEventListener("click",open);
    el.addEventListener("keypress",(e)=>{ if(e.key==="Enter") open(); });
    c.appendChild(el);
  });
}

// App modal
const modal=document.getElementById("modal");
function openModal(app){
  document.getElementById("app-icon").src=app.iconUrl;
  document.getElementById("app-title").textContent=app.name||"";
  document.getElementById("app-bundle").textContent=app.bundleId||"";
  document.getElementById("app-info").textContent=`v${app.version||""}${app.minIOS?` · iOS ≥ ${app.minIOS}`:""}${app.sizeBytes?` · ${prettyBytes(app.sizeBytes)}`:""}`;

  // локализованные фичи
  let feats="";
  if(lang==="ru" && app.features_ru) feats=app.features_ru;
  else if(lang==="en" && app.features_en) feats=app.features_en;
  else feats=app.features;
  const featList = feats ? feats.split(",").map(f=>f.trim()).filter(Boolean) : [];
  document.getElementById("app-desc").innerHTML = featList.length
    ? `<div class="meta" style="margin-bottom:6px">${__t("hack_features")}</div>
       <ul class="bullets">${featList.map(f=>`<li>${escapeHTML(f)}`).join("")}</ul>`
    : "";

  const dl=document.getElementById("dl-buttons");
  dl.innerHTML="";
  const status=localStorage.getItem("ursa_status")||"free";
  if(app.vipOnly && status!=="vip"){
    dl.innerHTML=`<div style="color:#ff6;">🔒 Только для VIP</div>`;
  }else if(app.downloadUrl){
    const a=document.createElement("button");
    a.className="btn";
    a.textContent=__t("download");
    a.onclick=()=>window.installIPA ? window.installIPA(app) : (location.href=app.downloadUrl);
    dl.appendChild(a);
  }
  modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
function closeModal(){ modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
modal.addEventListener("click",(e)=>{ if(e.target.hasAttribute("data-close")||e.target===modal) closeModal(); });
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeModal(); });

// Main
document.addEventListener("DOMContentLoaded", async ()=>{
  // иконки
  document.getElementById("navAppsIcon").src   = ICONS.apps;
  document.getElementById("navGamesIcon").src  = ICONS.games;
  document.getElementById("navLangIcon").src   = ICONS.lang?.[lang] || ICONS.lang.ru;
  document.getElementById("navSettingsIcon").src = ICONS.settings;

  // поиск
  const search=document.getElementById("search");
  search.placeholder=__t("search_ph");

  // состояние
  const state = { all:[], q:"", tab:"apps" };

  // загрузка Firestore
  try{
    const snap = await getDocs(collection(db,"ursa_ipas"));
    state.all = snap.docs.map(d=>normalize(d.data()));
  }catch(err){
    console.error("Firestore:", err);
    document.getElementById("catalog").innerHTML = `<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
  }

  function apply(){
    const q=state.q.trim().toLowerCase();
    const list = state.all.filter(app=>{
      if(q){
        return (
          (app.name||"").toLowerCase().includes(q) ||
          (app.bundleId||"").toLowerCase().includes(q) ||
          (app.features||"").toLowerCase().includes(q) ||
          app.tags.some(t=>(t||"").toLowerCase().includes(q))
        );
      }
      return state.tab==="games" ? app.tags.includes("games") : app.tags.includes("apps");
    });
    if(!list.length){
      document.getElementById("catalog").innerHTML =
        `<div style="opacity:.7;text-align:center;padding:40px 16px;">${__t(q? "not_found":"empty")}</div>`;
    }else{
      renderCatalog(list);
    }
  }

  search.addEventListener("input", ()=>{ state.q=search.value; apply(); });

  // навбар
  const bar=document.getElementById("tabbar");
  bar.addEventListener("click",(e)=>{
    const btn=e.target.closest(".nav-btn");
    if(!btn) return;

    if(btn.dataset.tab){ // apps/games
      state.tab = btn.dataset.tab;
      bar.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      apply();
    }else if(btn.id==="lang-btn"){
      lang = lang==="ru" ? "en" : "ru";
      localStorage.setItem("ursa_lang", lang);
      location.reload();
    }else if(btn.id==="settings-btn"){
      openSettings();
    }
  });

  // settings close
  const settingsModal=document.getElementById("settings-modal");
  settingsModal.addEventListener("click",(e)=>{
    if(e.target.hasAttribute("data-close")||e.target===settingsModal){
      settingsModal.classList.remove("open");
      settingsModal.setAttribute("aria-hidden","true");
    }
  });

  // theme
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

  apply();
});

// SETTINGS
function openSettings(){
  const dlg = document.getElementById("settings-modal");
  const info= document.getElementById("user-info");
  const email = localStorage.getItem("ursa_email");
  const status= localStorage.getItem("ursa_status") || "free";
  const signer = localStorage.getItem("ursa_signer_id") ? "✅ Загружен" : "❌ Нет";
  const photo  = localStorage.getItem("ursa_photo");

  info.innerHTML = `
    <p><b>📧 Почта:</b> ${email || "—"}</p>
    <p><b>💎 Статус:</b> ${status==="vip"?"⭐ VIP":"Free"}</p>
    <p><b>🔏 Сертификат:</b> ${signer}</p>
    <div style="margin-top:10px;display:flex;gap:8px;align-items:center;">
      <img id="user-photo" class="user-avatar" ${photo?`src="${photo}"`: "hidden"}>
      <button id="auth-action" class="btn small">${email? "Выйти":"Войти через Google"}</button>
    </div>
  `;
  // повесим обработчик кнопки (auth.js экспортирует window.ursaAuthAction)
  setTimeout(()=>{
    const btn=document.getElementById("auth-action");
    btn?.addEventListener("click", ()=> window.ursaAuthAction && window.ursaAuthAction());
  },0);

  dlg.classList.add("open"); dlg.setAttribute("aria-hidden","false");
}
