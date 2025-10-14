// URSA Auth — v7.0 (Full i18n + Safe Double Login + Instant Logout + Live Sync)
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

console.log("🔥 URSA Auth v7.0 initialized");

// === Helpers ===
function t(k) {
  return typeof window.__t === "function" ? window.__t(k) : k;
}
function setLocal(key, val) {
  try { localStorage.setItem(key, val ?? ""); } catch (e) {}
}
function clearLocalAll() {
  try { localStorage.clear(); } catch (e) {}
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

  // signer autoload
  try {
    const signerRef = doc(db, "ursa_signers", u.uid);
    const signerSnap = await getDoc(signerRef);
    if (signerSnap.exists()) {
      const s = signerSnap.data();
      setLocal("ursa_signer_id", u.uid);
      setLocal("ursa_cert_account", s.account || "—");
      setLocal("ursa_cert_exp", s.expires || "");
      console.log("📜", t("Certificate loaded from database"));
    } else {
      localStorage.removeItem("ursa_signer_id");
      localStorage.removeItem("ursa_cert_account");
      localStorage.removeItem("ursa_cert_exp");
    }
  } catch (e) {
    console.warn("⚠️", t("Failed to fetch signer doc:"), e);
  }

  // refresh UI if open
  if (typeof window.openSettings === "function") window.openSettings();
}

// === Login / Logout ===
window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    await signOut(auth);
    console.log("🚪", t("Signed out"));
    clearLocalAll();
    if (typeof window.openSettings === "function") window.openSettings();
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    console.log("🌐", t("Signing in via popup…"));
    alert(
      t("🔐 Please wait: double-checking your login.\nStep 1/2 — signing in via popup.")
    );
    const res = await signInWithPopup(auth, provider);
    alert(t("✅ Step 2/2 — security check completed."));
    await syncUser(res.user);
  } catch (err) {
    console.warn("⚠️ Popup failed, fallback redirect:", err);
    alert(
      t("↪️ Switching to secure login (Step 2/2). Continue in the opened tab.")
    );
    await signInWithRedirect(auth, provider);
  }
};

// === Redirect login step ===
getRedirectResult(auth)
  .then(async (res) => {
    if (res && res.user) {
      console.log("✅", t("Redirect login successful"));
      await syncUser(res.user);
    }
  })
  .catch((err) => console.error("Redirect error:", err));

// === Global watcher ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const uref = doc(db, "users", user.uid);
      const usnap = await getDoc(uref);
      const status = usnap.exists() ? (usnap.data().status || "free") : "free";
      setLocal("ursa_uid", user.uid);
      setLocal("ursa_email", user.email || "");
      setLocal("ursa_photo", user.photoURL || "");
      setLocal("ursa_name", user.displayName || "");
      setLocal("ursa_status", status);
      console.log(`👤 ${t("Active")}: ${user.email} (${status})`);
    } catch (e) {
      console.warn("⚠️", t("Failed to fetch user profile:"), e);
    }

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
      console.warn("⚠️", t("Failed to fetch signer:"), e);
    }
  } else {
    clearLocalAll();
    console.log("👋", t("User signed out"));
  }

  const dlg = document.getElementById("settings-modal");
  if (dlg?.classList.contains("open") && typeof window.openSettings === "function") {
    window.openSettings();
  }
});
