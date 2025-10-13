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

document.getElementById("auth-action")?.addEventListener("click", async ()=>{
  const user = auth.currentUser;
  if(user){ await signOut(auth); return; }
  const provider = new GoogleAuthProvider();
  try{
    const res = await signInWithPopup(auth, provider);
    const u = res.user;
    const ref = doc(db,"users",u.uid);
    const snap = await getDoc(ref);
    if(!snap.exists()){
      await setDoc(ref,{
        uid: u.uid,email:u.email,name:u.displayName,photo:u.photoURL,
        status:"free",created_at:new Date().toISOString()
      });
    }
  }catch(e){ alert("Ошибка авторизации: "+e.message); }
});

onAuthStateChanged(auth, async (user)=>{
  const nameEl=document.getElementById("user-name");
  const emailEl=document.getElementById("user-email");
  const statusEl=document.getElementById("user-status");
  const photoEl=document.getElementById("user-photo");
  const loginBtn=document.getElementById("auth-action");
  const logoutBtn=document.getElementById("logout");

  if(user){
    const ref = doc(db,"users",user.uid);
    const snap = await getDoc(ref);
    const status = snap.exists()? (snap.data().status || "free") : "free";

    nameEl.textContent=user.displayName||"Без имени";
    emailEl.textContent=user.email;
    statusEl.textContent=status==="vip"?"⭐ VIP":"Free";
    statusEl.style.background=status==="vip"?"gold":"var(--accent)";
    photoEl.src=user.photoURL;
    loginBtn.hidden=true;
    logoutBtn.hidden=false;
  }else{
    nameEl.textContent="Гость";
    emailEl.textContent="–";
    statusEl.textContent="Free";
    photoEl.src="assets/icons/avatar.png";
    loginBtn.hidden=false;
    logoutBtn.hidden=true;
  }
});
document.getElementById("logout")?.addEventListener("click",()=>signOut(auth));
