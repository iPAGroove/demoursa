// URSA IPA Admin — v7.7 Debug Users Mode
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

const cards = document.getElementById("cards");
const searchBox = document.getElementById("search");
const userTable = document.getElementById("user-list");
const userSection = document.getElementById("users-section");
const ipaSection = document.getElementById("ipa-section");
const ipaTab = document.getElementById("tab-ipas");
const userTab = document.getElementById("tab-users");

ipaTab.onclick = () => {
  ipaTab.classList.add("active");
  userTab.classList.remove("active");
  ipaSection.style.display = "block";
  userSection.style.display = "none";
};
userTab.onclick = () => {
  userTab.classList.add("active");
  ipaTab.classList.remove("active");
  ipaSection.style.display = "none";
  userSection.style.display = "block";
  loadUsers();
};

// === Debug users ===
async function loadUsers(query = "") {
  userTable.innerHTML = "<tr><td colspan='5' style='color:#888'>Загрузка...</td></tr>";
  const snap = await getDocs(collection(db, "users"));
  let users = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (query) {
    const q = query.toLowerCase();
    users = users.filter(u =>
      JSON.stringify(u).toLowerCase().includes(q)
    );
  }

  renderUsers(users);
}

function renderUsers(users) {
  userTable.innerHTML = "";
  if (!users.length) {
    userTable.innerHTML = "<tr><td colspan='5' style='color:#888'>Нет документов в users</td></tr>";
    return;
  }

  const ignoreKeys = ["extra", "geo", "geo_debug"];
  users.forEach(u => {
    const keys = Object.keys(u).filter(k => !ignoreKeys.includes(k)).slice(0, 6);
    const values = keys.map(k => `<div><b>${k}</b>: ${formatValue(u[k])}</div>`).join("");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div style="max-width:240px;overflow:hidden;text-overflow:ellipsis;">${u.id}</div></td>
      <td>${values || "—"}</td>
      <td><button class="btn small" onclick='showUserDetails(${JSON.stringify(JSON.stringify(u))})'>📋</button></td>
    `;
    userTable.appendChild(tr);
  });
}

function formatValue(v) {
  if (typeof v === "object") return "[object]";
  if (typeof v === "boolean") return v ? "true" : "false";
  return v;
}

window.showUserDetails = (json) => {
  const m = document.getElementById("user-modal");
  const data = JSON.parse(json);
  document.getElementById("user-json").textContent = JSON.stringify(data, null, 2);
  m.classList.add("open");
  document.body.style.overflow = "hidden";
};

document.getElementById("user-modal").addEventListener("click", e => {
  if (e.target.hasAttribute("data-close") || e.target === e.currentTarget) {
    e.currentTarget.classList.remove("open");
    document.body.style.overflow = "";
  }
});
document.getElementById("user-search").addEventListener("input", e => loadUsers(e.target.value));

loadUsers();
