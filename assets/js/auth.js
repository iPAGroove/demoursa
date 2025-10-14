// URSA Auth — v3.0 Dual Login Alert + Auto Cert Load + Instant UI Refresh
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

console.log("🔥 URSA Auth v3.0 initialized");

// === Wait for user ===
const waitForAuth = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
    setTimeout(() => resolve(auth.currentUser), 2500);
  });

// === Login / Logout Handler ===
window.ursaAuthAction = async () => {
  const user = auth.currentUser;

  // === LOGOUT ===
  if (user) {
    await signOut(auth);
    console.log("🚪 Вышли из аккаунта");
    localStorage.clear();
    if (typeof window.updateProfileUI === "function") window.updateProfileUI();
    return;
  }

  // === LOGIN ===
  alert("🔐 Внимание! Процесс входа может занять два шага (Popup + Redirect) — это нормально и нужно для безопасности ваших данных.");

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    console.log("🌐 Попытка входа через Popup…");
    const res = await signInWithPopup(auth, provider);
    await syncUser(res.user);
  } catch (err) {
    console.warn("⚠️ Popup не сработал, пробуем Redirect вход…");
    await signInWithRedirect(auth, provider);
  }
};

// === Redirect login support ===
getRedirectResult(auth)
  .then(async (res) => {
    if (res && res.user) {
      console.log("✅ Redirect вход успешен");
      await syncUser(res.user);
    }
  })
  .catch((err) => console.error("Redirect error:", err));

// === Firestore User Sync ===
async function syncUser(u) {
  if (!u) u = await waitForAuth();
  if (!u) return console.error("❌ Auth not ready");

  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  // === Создаём пользователя, если нет ===
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid,
      email: u.email,
      name: u.displayName,
      photo: u.photoURL,
      status: "free",
      created_at: new Date().toISOString()
    });
    console.log("🆕 Новый пользователь добавлен в Firestore");
  }

  const data = snap.exists() ? snap.data() : {};
  localStorage.setItem("ursa_uid", u.uid);
  localStorage.setItem("ursa_email", u.email || "");
  localStorage.setItem("ursa_photo", u.photoURL || "");
  localStorage.setItem("ursa_name", u.displayName || "");
  localStorage.setItem("ursa_status", data.status || "free");

  // === Автоподгрузка сертификата (если уже был загружен) ===
  try {
    const signerRef = doc(db, "ursa_signers", u.uid);
    const signerSnap = await getDoc(signerRef);
    if (signerSnap.exists()) {
      const sdata = signerSnap.data();
      localStorage.setItem("ursa_signer_id", u.uid);
      localStorage.setItem("ursa_cert_account", sdata.account || "—");
      localStorage.setItem("ursa_cert_exp", sdata.expires || "—");
      console.log("🔁 Сертификат подгружен из Firestore");
    }
  } catch (err) {
    console.warn("⚠️ Ошибка при загрузке сертификата:", err);
  }

  if (typeof window.openSettings === "function") window.openSettings();
}

// === Auth state watcher (Live Updates) ===
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

    // Автообновляем профиль, если открыт
    const dlg = document.getElementById("settings-modal");
    if (dlg?.classList.contains("open") && typeof window.openSettings === "function") {
      window.openSettings();
    }

  } else {
    // === Пользователь вышел ===
    console.log("👋 Пользователь вышел из аккаунта");
    localStorage.clear();
    if (typeof window.updateProfileUI === "function") window.updateProfileUI();
  }
});
