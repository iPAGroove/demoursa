// URSA Auth — v6.5 (Safe Double Login + AutoCert + Instant Logout + Live Profile Refresh)
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

console.log("🔥 URSA Auth v6.5 initialized");

// === Helper: safe set local storage ===
function setLocal(key, val) {
  try { localStorage.setItem(key, val ?? ""); } catch (e) { /* ignore */ }
}
function clearLocalAll() {
  try { localStorage.clear(); } catch (e) { /* ignore */ }
}

// === Wait for user (guards SSR/slow auth) ===
const waitForAuth = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user); }
    });
    setTimeout(() => resolve(auth.currentUser), 2500);
  });

// === Sync Firestore user + signer into localStorage ===
async function syncUser(u) {
  if (!u) u = await waitForAuth();
  if (!u) return console.error("❌ Auth not ready");

  // users/{uid}
  const userRef = doc(db, "users", u.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: u.uid,
      email: u.email || "",
      name: u.displayName || "",
      photo: u.photoURL || "",
      status: "free",
      created_at: new Date().toISOString()
    });
  }

  const status = snap.exists() ? (snap.data().status || "free") : "free";
  setLocal("ursa_uid", u.uid);
  setLocal("ursa_email", u.email || "");
  setLocal("ursa_photo", u.photoURL || "");
  setLocal("ursa_name", u.displayName || "");
  setLocal("ursa_status", status);

  // ursa_signers/{uid} — автоподгрузка сертификата
  try {
    const signerRef = doc(db, "ursa_signers", u.uid);
    const signerSnap = await getDoc(signerRef);
    if (signerSnap.exists()) {
      const s = signerSnap.data();
      setLocal("ursa_signer_id", u.uid);
      setLocal("ursa_cert_account", s.account || "—");
      setLocal("ursa_cert_exp", s.expires || "");
      console.log("📜 Сертификат подгружен из базы.");
    } else {
      // нет сертификата — почистим локальные ключи сертификата
      localStorage.removeItem("ursa_signer_id");
      localStorage.removeItem("ursa_cert_account");
      localStorage.removeItem("ursa_cert_exp");
    }
  } catch (e) {
    console.warn("⚠️ Не удалось получить signer-док:", e);
  }

  // Обновим UI, если профиль открыт
  if (typeof window.openSettings === "function" && dlgIsOpen()) window.openSettings();
function dlgIsOpen() {
  const dlg = document.getElementById("settings-modal");
  return dlg && dlg.classList.contains("open");
}

// === Login / Logout entry ===
window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    // Logout: мгновенно чистим локал и перерисовываем профиль
    await signOut(auth);
    console.log("🚪 Вышли из аккаунта");
    clearLocalAll();
    if (typeof window.openSettings === "function") window.openSettings();
    return;
  }

  // Login flow: безопасный двойной вход (popup → redirect)
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    console.log("🌐 Вход через popup…");
    alert("🔐 Пожалуйста, подождите: выполняется двойная проверка входа.\nШаг 1/2 — вход через всплывающее окно.");
    const res = await signInWithPopup(auth, provider);
    // Успех popup — всё равно сообщим про 2-й шаг (проверка токена)
    alert("✅ Шаг 2/2 — проверка безопасности пройдена.");
    await syncUser(res.user);
  } catch (err) {
    console.warn("⚠️ Popup не сработал, fallback redirect вход…", err);
    alert("↪️ Переключаемся на защищённый вход (Шаг 2/2). Продолжите в открывшейся вкладке.");
    await signInWithRedirect(auth, provider);
  }
};

// === Redirect result (второй шаг двойного входа) ===
getRedirectResult(auth)
  .then(async (res) => {
    if (res && res.user) {
      console.log("✅ Redirect вход успешен");
      await syncUser(res.user);
    }
  })
  .catch((err) => console.error("Redirect error:", err));

// === Global watcher — держим локальное состояние и профиль в актуальном виде ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Подтянем статус и сертификат
    try {
      const uref = doc(db, "users", user.uid);
      const usnap = await getDoc(uref);
      const status = usnap.exists() ? (usnap.data().status || "free") : "free";
      setLocal("ursa_uid", user.uid);
      setLocal("ursa_email", user.email || "");
      setLocal("ursa_photo", user.photoURL || "");
      setLocal("ursa_name", user.displayName || "");
      setLocal("ursa_status", status);
      console.log(`👤 Активен: ${user.email} (${status})`);
    } catch (e) {
      console.warn("⚠️ Не удалось подтянуть профиль из Firestore:", e);
    }

    // Автоподгрузка сертификата
    try {
      const signerRef = doc(db, "ursa_signers", user.uid);
      const signerSnap = await getDoc(signerRef);
      if (signerSnap.exists()) {
        const s = signerSnap.data();
        setLocal("ursa_signer_id", user.uid);
        setLocal("ursa_cert_account", s.account || "—");
        setLocal("ursa_cert_exp", s.expires || "");
      }
    } catch (e) {
      console.warn("⚠️ Не удалось подтянуть signer:", e);
    }
  } else {
    // Signed out
    clearLocalAll();
    console.log("👋 Пользователь вышел");
  }

  // Если профиль открыт — перерисуем
  const dlg = document.getElementById("settings-modal");
  if (dlg?.classList.contains("open") && typeof window.openSettings === "function") {
    window.openSettings();
  }
});
