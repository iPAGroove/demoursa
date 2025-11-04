// URSA IPA Admin — v7.9 (VIP с истечением срока и VIP-IPA)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  deleteField 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
  storageBucket: "ipa-panel.firebasestorage.app",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};

// === СПИСОК АДМИНОВ ===
const ADMIN_EMAILS = [
  "vibemusic1712@gmail.com",
  "kotvlad400@gmail.com",
  "olesyazardina@gmail.com",
  "damianberg479@gmail.com"
];

// === Init Firebase ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("⚙️ URSA Admin v7.9 started");

// === Auth Elements ===
const loginScreen = document.getElementById("login-screen");
const adminWrapper = document.getElementById("admin-wrapper");
const deniedScreen = document.getElementById("denied-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtnAdmin = document.getElementById("logout-btn-admin");
const logoutBtnDenied = document.getElementById("logout-btn-denied");

// === Admin Panel Elements ===
const cards = document.getElementById("cards");
const modal = document.getElementById("modal");
const form = document.getElementById("ipa-form");
const modalTitle = document.getElementById("modal-title");
const iconInput = document.getElementById("iconUrl");
const iconPreview = document.getElementById("icon-preview");
const searchBox = document.getElementById("search");
const userTable = document.getElementById("user-list");
let editDocId = null;

// === Tabs ===
const ipaTab = document.getElementById("tab-ipas");
const userTab = document.getElementById("tab-users");
const ipaSection = document.getElementById("ipa-section");
const userSection = document.getElementById("users-section");

// ========== AUTHENTICATION LOGIC ==========
function showLoginScreen() {
  loginScreen.style.display = "flex";
  adminWrapper.style.display = "none";
  deniedScreen.style.display = "none";
}
function showAdminPanel() {
  loginScreen.style.display = "none";
  adminWrapper.style.display = "block";
  deniedScreen.style.display = "none";
  loadData();
}
function showDeniedScreen() {
  loginScreen.style.display = "none";
  adminWrapper.style.display = "none";
  deniedScreen.style.display = "flex";
}

// Проверяем состояние входа
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (ADMIN_EMAILS.includes(user.email)) {
      console.log(`✅ Admin access granted for: ${user.email}`);
      showAdminPanel();
    } else {
      console.warn(`❌ Access denied for: ${user.email}`);
      showDeniedScreen();
    }
  } else {
    console.log("🔒 No user logged in. Showing login screen.");
    showLoginScreen();
  }
});

// Войти / Выйти
loginBtn.onclick = () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .catch((error) => {
      console.error("Auth Error:", error);
      alert("Ошибка входа: " + error.message);
    });
};
logoutBtnAdmin.onclick = () => auth.signOut();
logoutBtnDenied.onclick = () => auth.signOut();

// ========== TABS ==========
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

// ========== IPA MANAGEMENT ==========
function formatSize(bytes) {
  if (!bytes) return "-";
  return `${Math.round(bytes / 1000000)} MB`;
}

async function loadData(query = "") {
  cards.innerHTML = "<p style='color:#888'>Загрузка...</p>";
  const snap = await getDocs(collection(db, "ursa_ipas"));
  let apps = snap.docs.map(d => ({ __docId: d.id, ...d.data() }));

  if (query) {
    const q = query.toLowerCase();
    apps = apps.filter(app =>
      (app["NAME"] || "").toLowerCase().includes(q) ||
      (app["Bundle ID"] || "").toLowerCase().includes(q) ||
      (app["tags"] || []).join(",").toLowerCase().includes(q)
    );
  }

  render(apps);
}

// === render(apps) с VIP-меткой ===
function render(apps) {
  cards.innerHTML = "";
  if (!apps.length) {
    cards.innerHTML = "<p style='color:#888'>Нет приложений</p>";
    return;
  }

  apps.forEach(app => {
    const card = document.createElement("div");
    card.className = "app-card";

    const vipTag = app.vipOnly ? '<span class="badge vip">VIP</span>' : '';
    card.innerHTML = `
      <div class="app-info">
        <img src="${app.iconUrl || "https://placehold.co/44x44/1e2633/9aa7bd?text=?"}" alt="" class="app-icon" onerror="this.src='https://placehold.co/44x44/1e2633/9aa7bd?text=?'">
        <div>
          <div class="app-title">${app["NAME"] || "Без названия"}</div>
          <div class="app-meta">${vipTag}</div>
        </div>
      </div>
      <div class="app-actions">
        <button class="btn small blue" onclick="editItem('${app.__docId}')">✏️</button>
        <button class="btn small red" onclick="deleteItem('${app.__docId}')">🗑</button>
      </div>
    `;
    cards.appendChild(card);
  });
}

// === Modal logic ===
function openModal(title, values = {}) {
  modalTitle.textContent = title;
  form.reset();
  editDocId = values.__docId || null;

  form.name.value = values["NAME"] || "";
  form.bundleId.value = values["Bundle ID"] || "";
  form.version.value = values["Version"] || "";
  form.minIOS.value = values["minimal iOS"] || "";
  form.sizeBytes.value = values["sizeBytes"] ? Math.round(values["sizeBytes"] / 1000000) : "";
  form.iconUrl.value = values.iconUrl || "";
  form.downloadUrl.value = values.DownloadUrl || "";
  form.features_ru.value = values.features_ru || "";
  form.features_en.value = values.features_en || "";
  form.vipOnly.checked = !!values.vipOnly;

  iconPreview.src = form.iconUrl.value;
  iconPreview.style.display = form.iconUrl.value ? "block" : "none";

  document.querySelectorAll(".tag-btn").forEach(btn => btn.classList.remove("active"));
  if (Array.isArray(values.tags)) {
    const tag = values.tags[0];
    const btn = document.querySelector(`.tag-btn[data-tag="${tag}"]`);
    if (btn) {
      btn.classList.add("active");
      form.tag.value = tag;
    }
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  modal.classList.remove("open");
  document.body.style.overflow = "";
}
modal.addEventListener("click", e => {
  if (e.target.hasAttribute("data-close") || e.target === modal) closeModal();
});
iconInput.addEventListener("input", () => {
  iconPreview.src = iconInput.value;
  iconPreview.style.display = iconInput.value ? "block" : "none";
});
document.querySelectorAll(".tag-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    form.tag.value = btn.dataset.tag;
  });
});

// === submit ===
form.addEventListener("submit", async e => {
  e.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const ipa = {
    ID: values.bundleId && values.version ? `${values.bundleId}_${values.version}` : values.bundleId,
    NAME: values.name,
    "Bundle ID": values.bundleId,
    Version: values.version,
    "minimal iOS": values.minIOS,
    sizeBytes: Number(values.sizeBytes || 0) * 1000000,
    iconUrl: values.iconUrl,
    DownloadUrl: values.downloadUrl,
    description_ru: "Функции мода",
    description_en: "Hack Features",
    features_ru: values.features_ru || "",
    features_en: values.features_en || "",
    tags: values.tag ? [values.tag] : [],
    updatedAt: new Date().toISOString(),
    vipOnly: values.vipOnly === "on" ? true : false,
  };
  if (!editDocId) ipa.createdAt = new Date().toISOString();

  if (editDocId) await updateDoc(doc(db, "ursa_ipas", editDocId), ipa);
  else await addDoc(collection(db, "ursa_ipas"), ipa);

  closeModal();
  loadData();
});

window.deleteItem = async (id) => {
  if (confirm("Удалить запись?")) {
    try {
      await deleteDoc(doc(db, "ursa_ipas", id));
      loadData();
    } catch (e) {
      console.error("Error deleting document: ", e);
      alert("Ошибка удаления.");
    }
  }
};
window.editItem = async (id) => {
  const snap = await getDocs(collection(db, "ursa_ipas"));
  const app = snap.docs.find(d => d.id === id);
  if (app) openModal("Редактировать IPA", { __docId: app.id, ...app.data() });
};
searchBox.addEventListener("input", () => loadData(searchBox.value));
document.getElementById("add-btn").addEventListener("click", () => openModal("Добавить IPA"));

// ========== USERS MANAGEMENT ==========
async function loadUsers(query = "") {
  userTable.innerHTML = "<tr><td colspan='5' style='color:#888'>Загрузка...</td></tr>";
  const snap = await getDocs(collection(db, "ursa_users"));
  let users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  users = users.filter(u =>
    (u.status && typeof u.status === "string") ||
    (u.created_at && u.created_at.includes("202"))
  );
  if (query) {
    const q = query.toLowerCase();
    users = users.filter(u =>
      (u.email || "").toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q)
    );
  }
  users.sort((a, b) => (a.status === "vip" ? -1 : 1));
  renderUsers(users);
}

// === renderUsers ===
function renderUsers(users) {
  userTable.innerHTML = "";
  if (!users.length) {
    userTable.innerHTML = "<tr><td colspan='5' style='color:#888'>Нет пользователей</td></tr>";
    return;
  }
  users.forEach(u => {
    const tr = document.createElement("tr");
    let expiryText = "";
    if (u.status === "vip" && u.statusExpiry) {
      const expiryDate = new Date(u.statusExpiry);
      const isExpired = expiryDate < new Date();
      const dateString = expiryDate.toLocaleDateString('ru-RU');
      expiryText = isExpired
        ? `<span class="expiry-date" style="color:var(--red)">Истёк ${dateString}</span>`
        : `<span class="expiry-date">до ${dateString}</span>`;
    }
    tr.innerHTML = `
      <td>${u.email || "—"}</td>
      <td>${u.name || "—"}</td>
      <td class="muted">${u.uid || u.id}</td>
      <td>
        <span class="badge ${u.status === "vip" ? "vip" : "free"}">${u.status || "free"}</span>
        ${expiryText}
      </td>
      <td><button class="btn small" onclick="editUser('${u.id}', '${u.email}', '${u.name}', '${u.status || "free"}')">✏️</button></td>
    `;
    userTable.appendChild(tr);
  });
}

window.editUser = (id, email, name, status) => {
  const m = document.getElementById("user-modal");
  document.getElementById("edit-user-email").textContent = email;
  document.getElementById("edit-user-name").textContent = name;
  document.getElementById("edit-user-status").value = status || "free";
  m.dataset.id = id;
  m.classList.add("open");
  document.body.style.overflow = "hidden";
};

document.getElementById("save-user-status").onclick = async () => {
  const m = document.getElementById("user-modal");
  const id = m.dataset.id;
  const newStatus = document.getElementById("edit-user-status").value;
  try {
    await updateDoc(doc(db, "ursa_users", id), {
      status: newStatus,
      statusExpiry: deleteField()
    });
    console.log(`✅ User ${id} status changed to ${newStatus} (Permanent)`);
  } catch (err) {
    console.error("❌ Ошибка при обновлении статуса:", err);
  }
  m.classList.remove("open");
  document.body.style.overflow = "";
  loadUsers();
};

document.getElementById("save-user-vip-31").onclick = async () => {
  const m = document.getElementById("user-modal");
  const id = m.dataset.id;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 31);
  const expiryISO = expiryDate.toISOString();
  try {
    await updateDoc(doc(db, "ursa_users", id), {
      status: "vip",
      statusExpiry: expiryISO
    });
    console.log(`✅ User ${id} status changed to VIP until ${expiryISO}`);
  } catch (err) {
    console.error("❌ Ошибка при обновлении статуса:", err);
  }
  m.classList.remove("open");
  document.body.style.overflow = "";
  loadUsers();
};

document.getElementById("user-modal").addEventListener("click", e => {
  if (e.target.hasAttribute("data-close") || e.target === e.currentTarget) {
    e.currentTarget.classList.remove("open");
    document.body.style.overflow = "";
  }
});
document.getElementById("user-search").addEventListener("input", e => loadUsers(e.target.value));
