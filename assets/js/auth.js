// URSA Auth + Firestore User Sync (v2 — single app + popup→redirect fallback)
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
  storageBucket: "ipa-panel.firebasestorage.app",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};

// === Use single Firebase app across modules ===
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🔥 URSA Auth initialized");

// === Global Auth Action (вызывается из Settings)
window.ursaAuthAction = async () => {
  console.log("⚡ Вход/выход через Google нажат");
  const user = auth.currentUser;

  if (user) {
    // Logout
    await signOut(auth);
    console.log("🚪 Вышли из аккаунта");
    return;
  }

  // Login
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    console.log("🌐 Открываем Google popup...");
    const res = await signInWithPopup(auth, provider);
    await handleAuthResult(res);
  } catch (err) {
    console.warn("⚠️ Popup вход не сработал, пробуем redirect...");
    await signInWithRedirect(auth, provider);
  }
};

// === Обработка redirect-результата (на случай блокировки popup)
getRedirectResult(auth).then((res) => {
  if (res && res.user) handleAuthResult(res);
}).catch((err) => console.error("Redirect error:", err));

// === Функция сохранения юзера в Firestore
async function handleAuthResult(res) {
  if (!res?.user) return;
  const u = res.user;
  console.log("✅ Успешный вход:", u.email);

  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid,
      email: u.email,
      name: u.displayName,
      photo: u.photoURL,
      status: "free",
      created_at: new Date().toISOString()
    });
  }

  localStorage.setItem("ursa_email", u.email || "");
  localStorage.setItem("ursa_photo", u.photoURL || "");
  localStorage.setItem("ursa_name", u.displayName || "");

  const status = snap.exists() ? (snap.data().status || "free") : "free";
  localStorage.setItem("ursa_status", status);

  if (typeof window.openSettings === "function") window.openSettings();
}

// === Отслеживаем состояние
onAuthStateChanged(auth, async (user) => {
  if (user) {
    localStorage.setItem("ursa_email", user.email || "");
    localStorage.setItem("ursa_photo", user.photoURL || "");
    localStorage.setItem("ursa_name", user.displayName || "");

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const status = snap.exists() ? (snap.data().status || "free") : "free";
    localStorage.setItem("ursa_status", status);
    console.log(`👤 Пользователь активен: ${user.email} (${status})`);
  } else {
    localStorage.removeItem("ursa_email");
    localStorage.removeItem("ursa_photo");
    localStorage.removeItem("ursa_name");
    localStorage.removeItem("ursa_status");
    console.log("👋 Пользователь вышел");
  }

  const dlg = document.getElementById("settings-modal");
  if (dlg?.classList.contains("open") && typeof window.openSettings === "function") {
    window.openSettings();
  }
});
