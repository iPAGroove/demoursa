// URSA Auth v5.2 — Popup+Redirect Fix + Firestore Sync
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  GoogleAuthProvider, signOut, getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
  storageBucket: "ipa-panel.firebasestorage.app",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🔥 URSA Auth initialized");

// === Login / Logout Handler
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
    console.log("🌐 Popup вход...");
    const res = await signInWithPopup(auth, provider);
    if (res?.user) await handleAuthResult(res);
  } catch (err) {
    console.warn("⚠️ Popup ошибка:", err.code);
    if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
      console.log("🔁 Пробуем redirect...");
      await signInWithRedirect(auth, provider);
    } else alert("Ошибка входа: " + err.message);
  }
};

// === Redirect Result
getRedirectResult(auth)
  .then((res) => { if (res && res.user) handleAuthResult(res); })
  .catch((err) => console.error("Redirect error:", err));

// === Firestore user creation / sync
async function handleAuthResult(res) {
  const u = res.user;
  if (!u) return;
  console.log("✅ Успешный вход:", u.email);

  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid, email: u.email, name: u.displayName,
      photo: u.photoURL, status: "free", created_at: new Date().toISOString()
    });
  }

  localStorage.setItem("ursa_email", u.email || "");
  localStorage.setItem("ursa_photo", u.photoURL || "");
  localStorage.setItem("ursa_name", u.displayName || "");
  localStorage.setItem("ursa_status", snap.exists() ? (snap.data().status || "free") : "free");

  if (window.openSettings) window.openSettings();
}

// === Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const status = snap.exists() ? (snap.data().status || "free") : "free";
    localStorage.setItem("ursa_email", user.email || "");
    localStorage.setItem("ursa_photo", user.photoURL || "");
    localStorage.setItem("ursa_status", status);
    console.log(`👤 Активен: ${user.email} (${status})`);
  } else {
    ["ursa_email","ursa_photo","ursa_name","ursa_status"].forEach(k=>localStorage.removeItem(k));
    console.log("👋 Пользователь вышел");
  }

  const dlg = document.getElementById("settings-modal");
  if (dlg?.classList.contains("open") && window.openSettings) window.openSettings();
});
