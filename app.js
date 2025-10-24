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

async function loadCatalog() {
  const snap = await getDocs(collection(db, "ursa_ipas"));
  const data = snap.docs.map(d => d.data());

  const catalog = document.getElementById("catalog");
  const search = document.getElementById("search");

  function render(list) {
    catalog.innerHTML = "";
    list.forEach(app => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div style="display:flex;gap:1rem;align-items:center;">
          <img src="${app.iconUrl}" alt="">
          <div>
            <h3>${app.NAME || app.name}</h3>
            <small>${app["Bundle ID"] || app.bundleId}</small>
            <p>v${app.Version || app.version} · iOS ≥ ${app["minimal iOS"] || app.minIOS}</p>
          </div>
        </div>
        <div class="tags">
          ${(app.tags || []).map(t=>`<span>#${t}</span>`).join(" ")}
        </div>
        <div style="margin-top:1rem;">
          ${app.DownloadUrl 
            ? `<a href="${app.DownloadUrl}" target="_blank" style="display:inline-block;margin-right:6px;color:#0af;">Скачать IPA</a>` 
            : ""}
        </div>
      `;
      catalog.appendChild(card);
    });
  }

  render(data);

  search.addEventListener("input", () => {
    const q = search.value.toLowerCase();
    render(data.filter(app =>
      (app.NAME || app.name || "").toLowerCase().includes(q) ||
      (app["Bundle ID"] || app.bundleId || "").toLowerCase().includes(q) ||
      (app.tags || []).some(t => (t || "").toLowerCase().includes(q))
    ));
  });
}

document.addEventListener("DOMContentLoaded", loadCatalog);
