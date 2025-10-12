import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const modal = document.getElementById("modal");
const form = document.getElementById("ipa-form");
const modalTitle = document.getElementById("modal-title");
const iconInput = document.getElementById("iconUrl");
const iconPreview = document.getElementById("icon-preview");
const searchBox = document.getElementById("search");
let editDocId = null;

// ===== HELPERS =====
function formatSize(bytes) {
  if (!bytes) return "-";
  return `${Math.round(bytes / 1000000)} MB`;
}

// === Загрузка ===
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

// === Рендер карточек ===
function render(apps) {
  cards.innerHTML = "";
  if (!apps.length) {
    cards.innerHTML = "<p style='color:#888'>Нет приложений</p>";
    return;
  }
  apps.forEach(app => {
    const card = document.createElement("div");
    card.className = "app-card";
    card.innerHTML = `
      <div class="app-info">
        <img src="${app.iconUrl || ""}" alt="" class="app-icon">
        <div>
          <div class="app-title">${app["NAME"] || "Без названия"}</div>
          <div class="app-meta">Bundle: ${app["Bundle ID"] || "-"}</div>
          <div class="app-meta">Версия: ${app["Version"] || "-"} · iOS ≥ ${app["minimal iOS"] || "-"}</div>
          <div class="app-meta">Размер: ${formatSize(app["sizeBytes"])}</div>
          <div class="app-meta">Категория: ${(app["tags"] || []).join(", ")}</div>
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

// === Модалка ===
function openModal(title, values = {}) {
  modalTitle.textContent = title;
  form.reset();
  editDocId = values.__docId || null;

  // Основные поля
  form.name.value = values["NAME"] || "";
  form.bundleId.value = values["Bundle ID"] || "";
  form.version.value = values["Version"] || "";
  form.minIOS.value = values["minimal iOS"] || "";
  form.sizeBytes.value = values["sizeBytes"] ? Math.round(values["sizeBytes"] / 1000000) : "";
  form.iconUrl.value = values.iconUrl || "";
  form.downloadUrl.value = values.DownloadUrl || "";

  // 🇷🇺 / 🇬🇧 фичи
  form.features_ru.value = values.features_ru || "";
  form.features_en.value = values.features_en || "";

  // категории
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

// === Превью иконки ===
iconInput.addEventListener("input", () => {
  if (iconInput.value) {
    iconPreview.src = iconInput.value;
    iconPreview.style.display = "block";
  } else {
    iconPreview.style.display = "none";
  }
});

// === Выбор тега ===
document.querySelectorAll(".tag-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    form.tag.value = btn.dataset.tag;
  });
});

// === Добавление / обновление ===
form.addEventListener("submit", async e => {
  e.preventDefault();
  const values = Object.fromEntries(new FormData(form));

  const ipa = {
    "ID": values.bundleId && values.version ? `${values.bundleId}_${values.version}` : values.bundleId,
    "NAME": values.name,
    "Bundle ID": values.bundleId,
    "Version": values.version,
    "minimal iOS": values.minIOS,
    "sizeBytes": Number(values.sizeBytes || 0) * 1000000,
    "iconUrl": values.iconUrl,
    "DownloadUrl": values.downloadUrl,
    // 🔹 Автоматические описания
    "description_ru": "Функции мода",
    "description_en": "Hack Features",
    "features_ru": values.features_ru || "",
    "features_en": values.features_en || "",
    "tags": values.tag ? [values.tag] : [],
    "updatedAt": new Date().toISOString(),
  };

  if (!editDocId) ipa["createdAt"] = new Date().toISOString();

  if (editDocId) {
    await updateDoc(doc(db, "ursa_ipas", editDocId), ipa);
  } else {
    await addDoc(collection(db, "ursa_ipas"), ipa);
  }
  closeModal();
  loadData();
});

// === Удаление ===
window.deleteItem = async id => {
  if (confirm("Удалить запись?")) {
    await deleteDoc(doc(db, "ursa_ipas", id));
    loadData();
  }
};

// === Редактирование ===
window.editItem = async id => {
  const snap = await getDocs(collection(db, "ursa_ipas"));
  const app = snap.docs.find(d => d.id === id);
  if (app) openModal("Редактировать IPA", { __docId: app.id, ...app.data() });
};

// === Поиск ===
searchBox.addEventListener("input", () => loadData(searchBox.value));

// === Кнопка добавить ===
document.getElementById("add-btn").addEventListener("click", () => openModal("Добавить IPA"));

// === Автозагрузка ===
loadData();
