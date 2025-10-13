// URSA Auth + Firestore User Sync (v2.2 — no double login, full stable)
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
  storageBucket: "ipa-panel.appspot.com",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};

// === Init once ===
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log("🔥 URSA Auth initialized");

// Helper to wait for Firebase user to appear
const waitForAuth = () =>
  new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user); }
    });
    setTimeout(() => resolve(auth.currentUser), 2500);
  });

// === Main login action ===
window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    await signOut(auth);
    console.log("🚪 Вышли из аккаунта");
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    console.log("🌐 Пробуем popup вход...");
    sessionStorage.setItem("ursa_popup_tried", "1");
    const res = await signInWithPopup(auth, provider);
    await syncUser(res.user);
  } catch (err) {
    // Ошибка popup — пробуем redirect только если ещё не пробовали
    if (!sessionStorage.getItem("ursa_redirect_pending")) {
      console.warn("⚠️ Popup не сработал, делаем redirect вход...");
      sessionStorage.setItem("ursa_redirect_pending", "1");
      await signInWithRedirect(auth, provider);
    } else {
      console.log("↩️ Redirect уже выполнялся, пропускаем");
    }
  }
};

// === Обрабатываем redirect результат только один раз
if (!sessionStorage.getItem("ursa_redirect_checked")) {
  getRedirectResult(auth)
    .then(async (res) => {
      if (res && res.user) {
        console.log("✅ Redirect вход успешен");
        await syncUser(res.user);
      }
    })
    .catch(err => console.error("Redirect error:", err))
    .finally(() => {
      sessionStorage.setItem("ursa_redirect_checked", "1");
      sessionStorage.removeItem("ursa_redirect_pending");
    });
}

// === Синхронизация с Firestore ===
async function syncUser(u) {
  if (!u) u = await waitForAuth();
  if (!u) {
    console.error("❌ Auth token not ready, abort Firestore sync");
    return;
  }

  console.log("✅ Пользователь вошёл:", u.email);
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

// === Реакция на изменение состояния ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const status = snap.exists() ? (snap.data().status || "free") : "free";
    localStorage.setItem("ursa_email", user.email || "");
    localStorage.setItem("ursa_photo", user.photoURL || "");
    localStorage.setItem("ursa_name", user.displayName || "");
    localStorage.setItem("ursa_status", status);
    console.log(`👤 Активен: ${user.email} (${status})`);
  } else {
    localStorage.clear();
    console.log("👋 Пользователь вышел");
  }

  const dlg = document.getElementById("settings-modal");
  if (dlg?.classList.contains("open") && typeof window.openSettings === "function") {
    window.openSettings();
  }
});
