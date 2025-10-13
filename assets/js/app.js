// URSA IPA — Firestore + i18n + темы + VIP статус
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

// ===== ICONS =====
const ICONS = {
  games: "https://store-eu-par-3.gofile.io/download/direct/22931df3-7659-4095-8dd0-a7eadb14e1e6/IMG_9678.PNG",
  apps:  "https://store5.gofile.io/download/direct/9a5cf9e9-9b82-4ce4-9cc9-ce63b857dcaf/%D0%BA%D0%BE%D0%BF%D0%B8.png",
  help:  "https://store-eu-par-3.gofile.io/download/direct/084828b1-4e8e-47d3-bcd0-48c12b99a49c/%D0%B2%D0%BE%D0%BF%D1%80%D0%BE%D1%81.png",
  signer:"https://store10.gofile.io/download/direct/3335936d-a58c-48bd-8686-21988ca6a23d/IMG_9617.png",
  lang: {
    ru:"https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG",
    en:"https://store-eu-par-3.gofile.io/download/direct/79e2512c-552c-4e1a-9b47-0cf1bcbfe556/IMG_9679.PNG"
  }
};

// ===== i18n =====
const I18N = {
  ru:{ search_ph:"Поиск по названию, bundleId…", download:"Установить", hack_features:"Функции мода", not_found:"Ничего не найдено", empty:"Пока нет приложений", load_error:"Ошибка Firestore" },
  en:{ search_ph:"Search by name or bundleId…", download:"Install", hack_features:"Hack Features", not_found:"Nothing found", empty:"No apps yet", load_error:"Firestore error" }
};
let lang=(localStorage.getItem("ursa_lang")||(navigator.language||"ru").slice(0,2)).toLowerCase();
if(!I18N[lang]) lang="ru";
window.__t=(k)=>(I18N[lang]&&I18N[lang][k])||k;

const prettyBytes=(num)=>!num?"":`${(num/1e6).toFixed(0)} MB`;
const escapeHTML=(s)=>(s||"").replace(/[&<>"']/g,(m)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));

function normalize(doc){
  let tags=Array.isArray(doc.tags)?doc.tags:(doc.tags?String(doc.tags).split(",").map(s=>s.trim()):["apps"]);
  tags=tags.map(t=>t.toLowerCase());
  return {
    id:doc.ID||"", name:doc.NAME||"", bundleId:doc["Bundle ID"]||"", version:doc.Version||"",
    minIOS:doc["minimal iOS"]||"", sizeBytes:doc.sizeBytes||0, iconUrl:doc.iconUrl||"",
    downloadUrl:doc.DownloadUrl||"", features_ru:doc.features_ru||"", features_en:doc.features_en||"",
    vipOnly: !!doc.vipOnly, tags
  };
}

function renderCatalog(apps){
  const c=document.getElementById("catalog");
  if(!apps.length){c.innerHTML=`<div style="opacity:.7;text-align:center;padding:40px;">${__t("empty")}</div>`;return;}
  c.innerHTML="";
  for(const app of apps){
    const el=document.createElement("article");
    el.className="card";
    el.innerHTML=`
      <div class="row">
        <img class="icon" src="${app.iconUrl}" alt="">
        <div><h3>${escapeHTML(app.name)}${app.vipOnly?' <span style="color:#00b3ff">⭐</span>':''}</h3>
          <div class="meta">${escapeHTML(app.bundleId)}</div>
          <div class="meta">v${escapeHTML(app.version)} · ${prettyBytes(app.sizeBytes)}</div>
        </div>
      </div>`;
    el.onclick=()=>openModal(app);
    c.appendChild(el);
  }
}

const modal=document.getElementById("modal");
function openModal(app){
  document.getElementById("app-icon").src=app.iconUrl;
  document.getElementById("app-title").textContent=app.name;
  document.getElementById("app-bundle").textContent=app.bundleId;
  document.getElementById("app-info").textContent=`v${app.version} · iOS ≥ ${app.minIOS}`;
  const feats=(lang==="ru"?app.features_ru:app.features_en)||"";
  document.getElementById("app-desc").innerHTML=feats?`<div class="meta">${__t("hack_features")}</div><ul class="bullets"><li>${escapeHTML(feats)}</li></ul>`:"";
  const dl=document.getElementById("dl-buttons");
  dl.innerHTML="";
  const status=localStorage.getItem("ursa_status")||"free";
  if(app.vipOnly && status!=="vip"){
    dl.innerHTML=`<div style="color:#ff6;">🔒 Только для VIP</div>`;
    return;
  }
  if(app.downloadUrl){
    const a=document.createElement("button");
    a.className="btn";
    a.textContent=__t("download");
    a.onclick=()=>window.installIPA(app);
    dl.appendChild(a);
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
function closeModal(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.style.overflow="";}
modal.addEventListener("click",(e)=>{if(e.target.hasAttribute("data-close"))closeModal();});

document.addEventListener("DOMContentLoaded",async()=>{
  document.getElementById("navGamesIcon").src=ICONS.games;
  document.getElementById("navAppsIcon").src=ICONS.apps;
  document.getElementById("navHelpIcon").src=ICONS.help;
  document.getElementById("navSignerIcon").src=ICONS.signer;
  document.getElementById("navLangIcon").src=ICONS.lang[lang];
  const search=document.getElementById("search");
  search.placeholder=__t("search_ph");

  try {
    const snap=await getDocs(collection(db,"ursa_ipas"));
    const all=snap.docs.map(d=>normalize(d.data()));
    renderCatalog(all);
  } catch {
    document.getElementById("catalog").innerHTML=`<div style="text-align:center;opacity:.7;padding:40px;">${__t("load_error")}</div>`;
  }

  // SIGNER modal
  const signerModal=document.getElementById("signer-modal");
  document.getElementById("signer-btn").addEventListener("click",()=>{
    signerModal.classList.add("open");signerModal.setAttribute("aria-hidden","false");
  });
  signerModal.addEventListener("click",(e)=>{if(e.target.hasAttribute("data-close")){signerModal.classList.remove("open");signerModal.setAttribute("aria-hidden","true");}});
});
