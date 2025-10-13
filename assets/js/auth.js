// Google Auth + Firestore users (статус хранится в users/{uid}.status)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// public action: вызывается из Settings
window.ursaAuthAction = async () => {
  const user = auth.currentUser;
  if (user) {
    await signOut(auth);
  } else {
    const provider = new GoogleAuthProvider();
    try{
      const res = await signInWithPopup(auth, provider);
      const u = res.user;
      const ref = doc(db,"users",u.uid);
      const snap = await getDoc(ref);
      if(!snap.exists()){
        await setDoc(ref,{
          uid: u.uid,
          email: u.email,
          name: u.displayName,
          photo: u.photoURL,
          status: "free",
          created_at: new Date().toISOString()
        });
      }
    }catch(e){
      console.error("Auth error:", e);
      alert("Ошибка авторизации.");
    }
  }
};

// React to auth state
onAuthStateChanged(auth, async (user)=>{
  if(user){
    const ref = doc(db,"users",user.uid);
    const snap= await getDoc(ref);
    const status = snap.exists()? (snap.data().status || "free") : "free";

    localStorage.setItem("ursa_email", user.email || "");
    localStorage.setItem("ursa_status", status);
    if(user.photoURL) localStorage.setItem("ursa_photo", user.photoURL);
  }else{
    localStorage.removeItem("ursa_email");
    localStorage.removeItem("ursa_status");
    localStorage.removeItem("ursa_photo");
  }
  // если открыт settings — перерисуем
  if (document.getElementById("settings-modal")?.classList.contains("open")){
    // функция определена в app.js
    if (typeof window.openSettings === "function") window.openSettings();
    else document.getElementById("settings-btn")?.click();
  }
});
