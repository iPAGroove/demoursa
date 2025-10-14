// URSA Auth — v3.4 (Silent Load Fix + Stable Settings Integration)
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

console.log("🔥 URSA Auth v3.4 initialized");

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// === Wait for user ===
const waitForAuth = () =>
  new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
    setTimeout(() => resolve(auth.currentUser), 2000);
  });

// === Login / Logout ===
window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    await signOut(auth);
    console.log("🚪 Вышли из аккаунта");
    localStorage.clear();
    if (window.updateProfileUI) window.updateProfileUI();
    return;
  }

  alert("🔐 Вход может занять два шага (Popup + Redirect) — это нужно для безопасности.");
  try {
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

// === Firestore Sync ===
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

  // === Load signer info (certificate) ===
  try {
    const signerRef = doc(db, "ursa_signers", u.uid);
    const signerSnap = await getDoc(signerRef);
    if (signerSnap.exists()) {
      const s = signerSnap.data();
      localStorage.setItem("ursa_signer_id", u.uid);
      localStorage.setItem("ursa_cert_account", s.account || "—");
      localStorage.setItem("ursa_cert_exp", s.expires || "—");
    }
  } catch (e) {
    console.warn("⚠️ Ошибка подгрузки сертификата:", e);
  }

  // ⚡ Только обновляем UI — не трогаем модалки
  if (window.updateProfileUI) window.updateProfileUI();
}

// === Watcher ===
let lastId = null;
onAuthStateChanged(auth, async (user) => {
  if (user?.uid === lastId) return;
  lastId = user?.uid || null;

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
