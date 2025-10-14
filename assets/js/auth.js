// URSA Auth (v2.9)
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect,
  GoogleAuthProvider, signOut, getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

async function pullSignerAndStatus(uid){
  try{
    const uref = doc(db,"users",uid);
    const usnap = await getDoc(uref);
    let status = "free";
    if (usnap.exists() && usnap.data().status) status = usnap.data().status;
    localStorage.setItem("ursa_status", status);

    const sref = doc(db,"ursa_signers",uid);
    const ssnap = await getDoc(sref);
    if (ssnap.exists()){
      localStorage.setItem("ursa_signer_id", uid);
      localStorage.setItem("ursa_cert_account", ssnap.data().account || "—");
      if (ssnap.data().expires) localStorage.setItem("ursa_cert_exp", ssnap.data().expires);
    } else {
      localStorage.removeItem("ursa_signer_id");
      localStorage.removeItem("ursa_cert_account");
      localStorage.removeItem("ursa_cert_exp");
    }
  }catch(e){ console.warn("pullSignerAndStatus:", e); }
}

const waitForAuth = () => new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, (user) => { if (user) { unsub(); resolve(user); } });
  setTimeout(() => resolve(auth.currentUser), 2000);
});

window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    await signOut(auth);
    localStorage.clear();
    if (window.openSettings) window.openSettings();
    if (window.ursaToast) ursaToast("Вы вышли из аккаунта", "success");
    return;
  }

  if (window.ursaToast) ursaToast("Сейчас откроется 1–2 окна входа Google — это нормально 🔐", "info", 5000);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const res = await signInWithPopup(auth, provider);
    await syncUser(res.user);
  } catch (err) {
    console.warn("Popup не сработал, пробуем redirect:", err);
    await signInWithRedirect(auth, provider);
  }
};

getRedirectResult(auth)
  .then(async (res) => {
    if (res && res.user) {
      if (window.ursaToast) ursaToast("Вход выполнен ✅", "success");
      await syncUser(res.user);
    }
  })
  .catch((err) => console.error("Redirect error:", err));

async function syncUser(u) {
  if (!u) u = await waitForAuth();
  if (!u) return console.error("❌ Auth not ready");
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid, email: u.email, name: u.displayName, photo: u.photoURL,
      status: "free", created_at: new Date().toISOString(),
    });
  }
  localStorage.setItem("ursa_uid", u.uid);
  localStorage.setItem("ursa_email", u.email || "");
  localStorage.setItem("ursa_photo", u.photoURL || "");
  localStorage.setItem("ursa_name", u.displayName || "");
  localStorage.setItem("ursa_status", snap.exists() ? (snap.data().status || "free") : "free");
  await pullSignerAndStatus(u.uid);

  if (typeof window.openSettings === "function") window.openSettings();
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    localStorage.setItem("ursa_uid", user.uid);
    localStorage.setItem("ursa_email", user.email || "");
    localStorage.setItem("ursa_photo", user.photoURL || "");
    localStorage.setItem("ursa_name", user.displayName || "");
    await pullSignerAndStatus(user.uid);
    console.log(`👤 Активен: ${user.email}`);
  } else {
    localStorage.clear();
    console.log("👋 Пользователь вышел");
  }
  const dlg = document.getElementById("settings-modal");
  if (dlg?.classList.contains("open") && typeof window.openSettings === "function") {
    window.openSettings();
  }
});
