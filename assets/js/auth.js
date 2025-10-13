// auth.js — Google OAuth + Firestore users + VIP статус + сохранение email
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
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const btn = document.getElementById("login-btn");
const avatar = document.getElementById("user-photo");

// === Авторизация через Google ===
btn.onclick = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photo: user.photoURL,
        status: "free",
        created_at: new Date().toISOString()
      });
    }

  } catch (err) {
    console.error("Auth error:", err);
    alert("Ошибка авторизации. Попробуй ещё раз.");
  }
};

// === Слушатель состояния авторизации ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // пользователь вошёл
    btn.textContent = "Выйти";
    btn.onclick = () => signOut(auth);

    avatar.src = user.photoURL;
    avatar.hidden = false;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const status = snap.exists() ? snap.data().status : "free";

    // сохраняем данные в localStorage для Settings
    localStorage.setItem("ursa_status", status);
    localStorage.setItem("ursa_email", user.email);

    console.log(`👤 Вошёл: ${user.email} [${status}]`);

  } else {
    // пользователь вышел
    btn.textContent = "Войти";
    btn.onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
    avatar.hidden = true;

    localStorage.removeItem("ursa_status");
    localStorage.removeItem("ursa_email");
  }
});
