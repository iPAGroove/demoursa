// URSA Signer Upload — v4.31 (Stable Upload Fix + i18n + Safe UX)
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
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

// === Shared Instance ===
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// === Local i18n ===
const LANG = (localStorage.getItem("ursa_lang") || "ru").toLowerCase();
const T = {
  ru: {
    select_files: "❌ Выберите оба файла (.p12 и .mobileprovision)",
    uploading: "⏳ Загружается в Firebase…",
    no_auth: "❌ Не выполнен вход через Google",
    success: "✅ Сертификат успешно загружен!",
    error: "❌ Ошибка при загрузке:",
  },
  en: {
    select_files: "❌ Select both files (.p12 and .mobileprovision)",
    uploading: "⏳ Uploading to Firebase…",
    no_auth: "❌ Not signed in with Google",
    success: "✅ Certificate uploaded successfully!",
    error: "❌ Upload error:",
  },
}[LANG];

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
    status.textContent = T.select_files;
    return;
  }

  btn.disabled = true;
  status.style.opacity = ".8";
  status.textContent = T.uploading;

  try {
    const user = auth.currentUser;
    if (!user) throw new Error(T.no_auth);

    const uid = user.uid;
    const folder = `signers/${uid}/`;

    // === 1️⃣ Upload Files ===
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

    // === 2️⃣ Extract CN (Common Name) ===
    const cn = await extractCommonName(p12File);

    // === 3️⃣ Save Firestore Document ===
    const signerRef = doc(db, "ursa_signers", uid);
    await setDoc(
      signerRef,
      {
        p12Url,
        provUrl,
        pass,
        createdAt: new Date().toISOString(),
        account: cn || "—",
        expires: new Date(Date.now() + 31536000000).toISOString() // +1 год
      },
      { merge: true }
    );

    // === 4️⃣ Update Local Storage ===
    localStorage.setItem("ursa_signer_id", uid);
    localStorage.setItem("ursa_cert_account", cn || "—");
    localStorage.setItem("ursa_cert_exp", new Date(Date.now() + 31536000000).toISOString());

    // === 5️⃣ Update UI ===
    status.textContent = T.success;
    status.style.opacity = "1";
    const certState = document.querySelector("#cert-state");
    if (certState) certState.textContent = "✅ Загружен";
    const certAcc = document.querySelector("#cert-account");
    if (certAcc) certAcc.textContent = cn || "—";

    setTimeout(() => {
      if (typeof window.openSettings === "function") window.openSettings();
    }, 500);

    // === 6️⃣ Close Modal ===
    const signerModal = document.getElementById("signer-modal");
    setTimeout(() => {
      signerModal?.classList.remove("open");
      signerModal?.setAttribute("aria-hidden", "true");
    }, 2000);

  } catch (err) {
    console.error("Upload error:", err);
    status.style.opacity = "1";
    status.textContent = `${T.error} ${err.message || err}`;
  } finally {
    btn.disabled = false;
  }
}

// === Extract CN from .p12 ===
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

// === Auto Hook ===
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signer-form");
  if (form) form.addEventListener("submit", uploadSigner);

  onAuthStateChanged(auth, (user) => {
    if (user) console.log(`👤 Авторизован: ${user.email}`);
  });
});
