// assets/js/render.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ⚡️ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
  storageBucket: "ipa-panel.firebasestorage.app",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== HELPERS =====
function prettyBytes(num) {
  if (!num) return "";
  const u = ["B","KB","MB","GB"];
  const e = Math.min(Math.floor(Math.log(num)/Math.log(1024)), u.length-1);
  return `${(num/Math.pow(1024,e)).toFixed(e?1:0)} ${u[e]}`;
}
function escapeHTML(s){
  return (s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
}

// === НОРМАЛИЗАЦИЯ Firestore-документа ===
function normalize(doc) {
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
    tags: Array.isArray(doc.tags) ? doc.tags : (doc.tags ? String(doc.tags).split(",").map(s=>s.trim()) : [])
  };
}

// === РЕНДЕР КАРТОЧЕК ===
function renderCatalog(apps) {
  const catalog = document.getElementById("catalog");
  catalog.innerHTML = "";
  if (!apps.length) {
    catalog.innerHTML = `<div style="opacity:.7;text-align:center;padding:40px 16px;">Пока нет приложений</div>`;
    return;
  }

  apps.forEach(app => {
    const el = document.createElement("article");
    el.className = "card";
    el.setAttribute("role","listitem");
    el.tabIndex = 0;

    el.innerHTML = `
      <div class="row">
        <img class="icon" src="${app.iconUrl}" alt="">
        <div>
          <h3>${app.name}</h3>
          <div class="meta">${app.bundleId || ""}</div>
          <div class="meta">
            v${app.version}
            ${app.minIOS ? ` · iOS ≥ ${app.minIOS}` : ""}
            ${app.sizeBytes ? ` · ${prettyBytes(app.sizeBytes)}` : ""}
          </div>
        </div>
      </div>
    `;

    const open = ()=>openModal(app);
    el.addEventListener("click", open);
    el.addEventListener("keypress",(e)=>{ if(e.key==="Enter") open(); });
    catalog.appendChild(el);
  });
}

// === МОДАЛКА ===
const modal = document.getElementById("modal");

function openModal(app){
  document.getElementById("app-icon").src = app.iconUrl;
  document.getElementById("app-title").textContent = app.name || "";
  document.getElementById("app-bundle").textContent = app.bundleId || "";
  document.getElementById("app-info").textContent =
    `v${app.version || ""}`
    + (app.minIOS ? ` · iOS ≥ ${app.minIOS}` : "")
    + (app.sizeBytes ? ` · ${prettyBytes(app.sizeBytes)}` : "");

  const feats = app.features ? app.features.split(",").map(f=>f.trim()) : [];
  document.getElementById("app-desc").innerHTML = feats.length
    ? `<div class="meta" style="margin-bottom:6px">Hack Features</div>
       <ul class="bullets">${feats.map(f=>`<li>${escapeHTML(f)}`).join("")}</ul>`
    : "";

  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = "";
  if (app.downloadUrl){
    const a = document.createElement("a");
    a.className = "btn";
    a.href = app.downloadUrl;
    a.target = "_blank"; 
    a.rel = "noopener";
    a.textContent = "Загрузить IPA";
    dl.appendChild(a);
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
function closeModal(){
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}
modal.addEventListener("click",(e)=>{
  if (e.target.hasAttribute("data-close") || e.target === modal) closeModal();
});
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeModal(); });

// === ЗАГРУЗКА + ПОИСК + ФИЛЬТР ===
async function loadCatalog() {
  const snap = await getDocs(collection(db, "ursa_ipas"));
  const all = snap.docs.map(d => normalize(d.data()));

  let state = { all, q:"", tab:"games" };

  function apply(){
    const q = state.q.trim().toLowerCase();
    const list = state.all.filter(app=>{
      const byTab = state.tab==="games" ? app.tags.includes("games") : !app.tags.includes("games");
      if (!byTab) return false;
      if (!q) return true;
      return (
        (app.name||"").toLowerCase().includes(q) ||
        (app.bundleId||"").toLowerCase().includes(q) ||
        (app.features||"").toLowerCase().includes(q) ||
        app.tags.some(t=>(t||"").toLowerCase().includes(q))
      );
    });
    renderCatalog(list);
  }

  // поиск
  const search = document.getElementById("search");
  search.addEventListener("input", () => {
    state.q = search.value;
    apply();
  });

  // таббар (Games/Apps)
  const bar = document.getElementById("tabbar");
  bar.addEventListener("click",(e)=>{
    const pill = e.target.closest(".nav-btn[data-tab]");
    if (pill){
      state.tab = pill.dataset.tab;
      bar.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      pill.classList.add("active");
      apply();
    }
  });

  apply(); // первый рендер
}

document.addEventListener("DOMContentLoaded", loadCatalog);
