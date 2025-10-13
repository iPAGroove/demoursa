// URSA Auth + Firestore User Sync
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === Global Auth Action (вызывается из Settings)
window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    // Logout
    await signOut(auth);
  } else {
    // Login
    const provider = new GoogleAuthProvider();
    try {
      const res = await signInWithPopup(auth, provider);
      const u = res.user;

      // Добавляем пользователя в Firestore, если его ещё нет
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
    } catch (err) {
      console.error("Auth error:", err);
      alert("Ошибка авторизации: " + err.message);
    }
  }
};

// === Отслеживаем состояние
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Сохраняем данные в localStorage
    localStorage.setItem("ursa_email", user.email || "");
    localStorage.setItem("ursa_photo", user.photoURL || "");
    localStorage.setItem("ursa_name", user.displayName || "");

    // Получаем статус (vip/free)
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const status = snap.exists() ? (snap.data().status || "free") : "free";
    localStorage.setItem("ursa_status", status);
  } else {
    // Очистка
    localStorage.removeItem("ursa_email");
    localStorage.removeItem("ursa_photo");
    localStorage.removeItem("ursa_name");
    localStorage.removeItem("ursa_status");
  }

  // Обновим окно настроек, если открыто
  const dlg = document.getElementById("settings-modal");
  if (dlg?.classList.contains("open")) {
    if (typeof window.openSettings === "function") window.openSettings();
  }
});
