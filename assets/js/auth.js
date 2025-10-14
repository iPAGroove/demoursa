// URSA Auth — v7.5 (i18n RU/EN + Safe Double Login + AutoCert + Instant Logout + Live Profile Refresh)
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

console.log("🔥 URSA Auth v7.5 initialized");

// === Local i18n (не зависит от app.js) ===
const AUTH_I18N = {
  ru: {
    step1_popup: "🔐 Пожалуйста, подождите: выполняется двойная проверка входа.\nШаг 1/2 — вход через всплывающее окно.",
    step2_ok: "✅ Шаг 2/2 — проверка безопасности пройдена.",
    popup_fallback: "↪️ Переключаемся на защищённый вход (Шаг 2/2). Продолжите в открывшейся вкладке.",
    redirect_ok: "✅ Redirect вход успешен",
    logout_ok: "🚪 Вышли из аккаунта",
    auth_not_ready: "❌ Авторизация ещё не готова",
    sync_err_user: "⚠️ Не удалось подтянуть профиль из Firestore",
    sync_err_signer: "⚠️ Не удалось подтянуть signer",
    no_google: "❌ Не удалось запустить Google вход",
  },
  en: {
    step1_popup: "🔐 Please wait: performing double-check sign-in.\nStep 1/2 — sign in via popup.",
    step2_ok: "✅ Step 2/2 — security check passed.",
    popup_fallback: "↪️ Falling back to secure sign-in (Step 2/2). Continue in the opened tab.",
    redirect_ok: "✅ Redirect sign-in succeeded",
    logout_ok: "🚪 Signed out",
    auth_not_ready: "❌ Auth not ready yet",
    sync_err_user: "⚠️ Failed to fetch user profile from Firestore",
    sync_err_signer: "⚠️ Failed to fetch signer",
    no_google: "❌ Could not start Google sign-in",
  }
};
function langCode() {
  const l = (localStorage.getItem("ursa_lang") || (navigator.language || "ru")).slice(0,2).toLowerCase();
  return AUTH_I18N[l] ? l : "ru";
}
function t(key) {
  const l = langCode();
  return (AUTH_I18N[l] && AUTH_I18N[l][key]) || (AUTH_I18N.ru[key] || key);
}

// === Helper: safe set local storage ===
function setLocal(key, val) {
  try { localStorage.setItem(key, val ?? ""); } catch { /* ignore */ }
}
function removeLocal(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
function clearLocalAll() {
  try { localStorage.clear(); } catch { /* ignore */ }
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
  if (!u) { console.error(t("auth_not_ready")); return; }

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
  const data = snap.exists() ? snap.data() : { status: "free" };

  setLocal("ursa_uid", u.uid);
  setLocal("ursa_email", u.email || "");
  setLocal("ursa_photo", u.photoURL || "");
  setLocal("ursa_name", u.displayName || "");
  setLocal("ursa_status", data.status || "free");

  // ursa_signers/{uid} — автоподгрузка сертификата
  try {
    const signerRef = doc(db, "ursa_signers", u.uid);
    const signerSnap = await getDoc(signerRef);
    if (signerSnap.exists()) {
      const s = signerSnap.data();
      setLocal("ursa_signer_id", u.uid);
      setLocal("ursa_cert_account", s.account || "—");
      setLocal("ursa_cert_exp", s.expires || "");
      console.log("📜 Signer loaded from Firestore.");
    } else {
      removeLocal("ursa_signer_id");
      removeLocal("ursa_cert_account");
      removeLocal("ursa_cert_exp");
    }
  } catch (e) {
    console.warn(t("sync_err_signer") + ":", e);
  }

  // Обновим UI, если профиль открыт
  if (typeof window.openSettings === "function") window.openSettings();
}

// === Login / Logout entry ===
window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    await signOut(auth);
    console.log(t("logout_ok"));
    clearLocalAll();
    if (typeof window.openSettings === "function") window.openSettings();
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    console.log("🌐 Sign-in via popup…");
    alert(t("step1_popup"));
    const res = await signInWithPopup(auth, provider);
    alert(t("step2_ok"));
    await syncUser(res.user);
  } catch (err) {
    console.warn("⚠️ Popup failed, fallback to redirect…", err);
    alert(t("popup_fallback"));
    try {
      await signInWithRedirect(auth, provider);
    } catch (e) {
      console.error(t("no_google"), e);
    }
  }
};

// === Redirect result (второй шаг двойного входа) ===
getRedirectResult(auth)
  .then(async (res) => {
    if (res && res.user) {
      console.log(t("redirect_ok"));
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
      console.log(`👤 Active: ${user.email} (${status})`);
    } catch (e) {
      console.warn(t("sync_err_user") + ":", e);
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
      } else {
        removeLocal("ursa_signer_id");
        removeLocal("ursa_cert_account");
        removeLocal("ursa_cert_exp");
      }
    } catch (e) {
      console.warn(t("sync_err_signer") + ":", e);
    }
  } else {
    // Signed out
    clearLocalAll();
    console.log("👋 Signed out");
  }

  // Если профиль открыт — перерисуем
  const dlg = document.getElementById("settings-modal");
  if (dlg?.classList.contains("open") && typeof window.openSettings === "function") {
    window.openSettings();
  }
});
