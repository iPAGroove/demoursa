// URSA Auth + Firestore User Sync (v2.3 — stable)
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

// === Init once ===
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// 🔧 Firestore fix for GitHub Pages (CORS-safe)
db._freezeSettings();
db._settings.ignoreUndefinedProperties = true;

console.log("🔥 URSA Auth initialized");

// === Wait for user ===
const waitForAuth = () =>
  new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user); }
    });
    setTimeout(() => resolve(auth.currentUser), 2500);
  });

// === Main Login / Logout ===
window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    await signOut(auth);
    console.log("🚪 Вышли из аккаунта");
    localStorage.clear();
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    console.log("🌐 Вход через popup…");
    const res = await signInWithPopup(auth, provider);
    await syncUser(res.user);
  } catch (err) {
    console.warn("⚠️ Popup не сработал, fallback redirect вход…");
    await signInWithRedirect(auth, provider);
  }
};

// === Redirect Result ===
getRedirectResult(auth)
  .then(async (res) => {
    if (res && res.user) {
      console.log("✅ Redirect вход успешен");
      await syncUser(res.user);
    }
  })
  .catch(err => console.error("Redirect error:", err));

// === Firestore Sync ===
async function syncUser(u) {
  if (!u) u = await waitForAuth();
  if (!u) return console.error("❌ Auth not ready");

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

  localStorage.setItem("ursa_uid", u.uid);
  localStorage.setItem("ursa_email", u.email || "");
  localStorage.setItem("ursa_photo", u.photoURL || "");
  localStorage.setItem("ursa_name", u.displayName || "");
  localStorage.setItem("ursa_status", snap.exists() ? (snap.data().status || "free") : "free");

  if (typeof window.openSettings === "function") window.openSettings();
}

// === State Watcher ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const status = snap.exists() ? (snap.data().status || "free") : "free";
    localStorage.setItem("ursa_uid", user.uid);
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
