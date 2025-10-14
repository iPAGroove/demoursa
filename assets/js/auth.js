// URSA Auth — v3.2 Stable (Fix Dual Login, Instant Refresh, Safe Logout)
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

console.log("🔥 URSA Auth v3.2 initialized");

// === Подготовка провайдера ===
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// === Вспомогательная функция ожидания пользователя ===
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

// === Вход / Выход ===
window.ursaAuthAction = async () => {
  const user = auth.currentUser;

  // === LOGOUT ===
  if (user) {
    await signOut(auth);
    console.log("🚪 Вышли из аккаунта");
    localStorage.clear();
    if (window.updateProfileUI) window.updateProfileUI();
    return;
  }

  // === LOGIN ===
  alert(
    "🔐 Внимание!\nПроцесс входа может занять два шага (Popup + Redirect).\nЭто нормально и нужно для безопасности ваших данных."
  );

  try {
    console.log("🌐 Попытка входа через Popup…");
    const res = await signInWithPopup(auth, provider);
    if (res?.user) await syncUser(res.user);
  } catch (err) {
    console.warn("⚠️ Popup не сработал, пробуем Redirect вход…");
    await signInWithRedirect(auth, provider);
  }
};

// === Redirect login support ===
getRedirectResult(auth)
  .then(async (res) => {
    if (res?.user) {
      console.log("✅ Redirect вход успешен");
      await syncUser(res.user);
    }
  })
  .catch((err) => console.error("Redirect error:", err));

// === Синхронизация пользователя с Firestore ===
async function syncUser(u) {
  if (!u) u = await waitForAuth();
  if (!u) return console.error("❌ Auth not ready");

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

  if (window.openSettings) window.openSettings();
}

// === Слежение за состоянием авторизации (Live Updates) ===
let lastUserId = null;
onAuthStateChanged(auth, async (user) => {
  // предотвращаем двойное срабатывание (Popup + Redirect)
  if (user?.uid === lastUserId) return;
  lastUserId = user?.uid || null;

  if (user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const status = snap.exists() ? snap.data().status || "free" : "free";

    localStorage.setItem("ursa_uid", user.uid);
    localStorage.setItem("ursa_email", user.email || "");
    localStorage.setItem("ursa_photo", user.photoURL || "");
    localStorage.setItem("ursa_name", user.displayName || "");
    localStorage.setItem("ursa_status", status);

    console.log(`👤 Активен: ${user.email} (${status})`);
    if (window.updateProfileUI) window.updateProfileUI();
  } else {
    console.log("👋 Пользователь вышел");
    localStorage.clear();
    if (window.updateProfileUI) window.updateProfileUI();
  }
});
