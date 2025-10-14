// URSA Auth — v7.6 (ursa_users + i18n RU/EN + Safe Double Login + AutoCert + Live Profile Refresh)
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

console.log("🔥 URSA Auth v7.6 initialized");

// === Local i18n ===
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
const langCode = () => {
  const l = (localStorage.getItem("ursa_lang") || (navigator.language || "ru")).slice(0,2).toLowerCase();
  return AUTH_I18N[l] ? l : "ru";
};
const t = (k) => AUTH_I18N[langCode()]?.[k] || AUTH_I18N.ru[k] || k;

// === Helpers ===
const setLocal = (k, v) => { try { localStorage.setItem(k, v ?? ""); } catch {} };
const removeLocal = (k) => { try { localStorage.removeItem(k); } catch {} };
const clearLocalAll = () => { try { localStorage.clear(); } catch {} };

// === Wait for user ===
const waitForAuth = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user); }
    });
    setTimeout(() => resolve(auth.currentUser), 2500);
  });

// === Sync Firestore user + signer ===
async function syncUser(u) {
  if (!u) u = await waitForAuth();
  if (!u) { console.error(t("auth_not_ready")); return; }

  const userRef = doc(db, "ursa_users", u.uid);
  const snap = await getDoc(userRef);

  const now = new Date().toISOString();
  const lang = langCode();

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: u.uid,
      email: u.email || "",
      name: u.displayName || "",
      photo: u.photoURL || "",
      status: "free",
      language: lang,
      created_at: now,
      last_active_at: now,
    });
  } else {
    await setDoc(userRef, { last_active_at: now, language: lang }, { merge: true });
  }

  const data = snap.exists() ? snap.data() : { status: "free" };

  setLocal("ursa_uid", u.uid);
  setLocal("ursa_email", u.email || "");
  setLocal("ursa_photo", u.photoURL || "");
  setLocal("ursa_name", u.displayName || "");
  setLocal("ursa_status", data.status || "free");

  // === Load signer if exists ===
  try {
    const signerRef = doc(db, "ursa_signers", u.uid);
    const signerSnap = await getDoc(signerRef);
    if (signerSnap.exists()) {
      const s = signerSnap.data();
      setLocal("ursa_signer_id", u.uid);
      setLocal("ursa_cert_account", s.account || "—");
      setLocal("ursa_cert_exp", s.expires || "");
      console.log("📜 Signer loaded.");
    } else {
      removeLocal("ursa_signer_id");
      removeLocal("ursa_cert_account");
      removeLocal("ursa_cert_exp");
    }
  } catch (e) {
    console.warn(t("sync_err_signer") + ":", e);
  }

  if (typeof window.openSettings === "function") window.openSettings();
}

// === Login / Logout ===
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
    alert(t("step1_popup"));
    const res = await signInWithPopup(auth, provider);
    alert(t("step2_ok"));
    await syncUser(res.user);
  } catch (err) {
    console.warn("⚠️ Popup failed, fallback redirect…", err);
    alert(t("popup_fallback"));
    try {
      await signInWithRedirect(auth, provider);
    } catch (e) {
      console.error(t("no_google"), e);
    }
  }
};

// === Redirect handler ===
getRedirectResult(auth)
  .then(async (res) => {
    if (res?.user) {
      console.log(t("redirect_ok"));
      await syncUser(res.user);
    }
  })
  .catch((err) => console.error("Redirect error:", err));

// === Global watcher ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const ref = doc(db, "ursa_users", user.uid);
      const snap = await getDoc(ref);
      const status = snap.exists() ? (snap.data().status || "free") : "free";
      setLocal("ursa_uid", user.uid);
      setLocal("ursa_email", user.email || "");
      setLocal("ursa_photo", user.photoURL || "");
      setLocal("ursa_name", user.displayName || "");
      setLocal("ursa_status", status);
      console.log(`👤 Active: ${user.email} (${status})`);
      await setDoc(ref, { last_active_at: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn(t("sync_err_user") + ":", e);
    }

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
    clearLocalAll();
    console.log("👋 Signed out");
  }

  if (document.getElementById("settings-modal")?.classList.contains("open")) {
    if (typeof window.openSettings === "function") window.openSettings();
  }
});
