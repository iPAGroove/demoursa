// URSA Signer Upload — Firebase + Live Profile Update (v4.30 Stable Upload Fix)
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
  storageBucket: "ipa-panel.firebasestorage.app",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};

// === Shared Firebase Instance ===
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

console.log("🔐 URSA Signer Upload initialized");

// === Upload Handler ===
async function uploadSigner(event) {
  event.preventDefault();
  const p12File = document.getElementById("fileP12").files[0];
  const provFile = document.getElementById("fileProv").files[0];
  const pass = document.getElementById("certPass").value || "";
  const btn = document.getElementById("uploadBtn");
  const status = document.getElementById("uploadStatus");

  if (!p12File || !provFile) {
    status.textContent = "❌ Выберите оба файла (.p12 и .mobileprovision)";
    return;
  }

  btn.disabled = true;
  status.style.opacity = ".8";
  status.textContent = "⏳ Загружается в Firebase…";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Не выполнен вход через Google");

    const uid = user.uid;
    const folder = `signers/${uid}/`;

    // === 1️⃣ Загрузка файлов в Storage ===
    const p12Ref = ref(storage, folder + p12File.name);
    const provRef = ref(storage, folder + provFile.name);
    await Promise.all([
      uploadBytes(p12Ref, p12File),
      uploadBytes(provRef, provFile)
    ]);
    const [p12Url, provUrl] = await Promise.all([
      getDownloadURL(p12Ref),
      getDownloadURL(provRef)
    ]);

    // === 2️⃣ Извлекаем CN (Common Name) ===
    const cn = await extractCommonName(p12File);

    // === 3️⃣ Сохраняем Firestore документ ===
    const signerRef = doc(db, "ursa_signers", uid);
    await setDoc(
      signerRef,
      {
        p12Url,
        provUrl,
        pass,
        createdAt: new Date().toISOString(),
        account: cn || "—",
        expires: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
      },
      { merge: true }
    );

    // === 4️⃣ Обновляем локальное состояние ===
    localStorage.setItem("ursa_signer_id", uid);
    localStorage.setItem("ursa_cert_account", cn || "—");
    localStorage.setItem("ursa_cert_exp", new Date(Date.now() + 31536000000).toISOString());

    status.textContent = "✅ Сертификат успешно загружен!";
    status.style.opacity = "1";
    document.querySelector("#cert-state").textContent = "✅ Загружен";
    document.querySelector("#cert-account").textContent = cn || "—";

    // === 5️⃣ Автообновление UI ===
    setTimeout(() => {
      if (typeof window.openSettings === "function") window.openSettings();
    }, 500);

    // === 6️⃣ Закрываем модалку ===
    const signerModal = document.getElementById("signer-modal");
    setTimeout(() => {
      signerModal?.classList.remove("open");
      signerModal?.setAttribute("aria-hidden", "true");
    }, 2000);
  } catch (err) {
    console.error("Upload error:", err);
    status.style.opacity = "1";
    status.textContent = "❌ Ошибка: " + (err.message || "Upload failed");
  } finally {
    btn.disabled = false;
  }
}

// === Извлечение CN из p12 ===
async function extractCommonName(file) {
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(new Uint8Array(buffer));
    const match = text.match(/CN=([^,\n]+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// === Автоподключение ===
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signer-form");
  if (form) form.addEventListener("submit", uploadSigner);

  onAuthStateChanged(auth, (user) => {
    if (user) console.log(`👤 Авторизован: ${user.email}`);
  });
});
