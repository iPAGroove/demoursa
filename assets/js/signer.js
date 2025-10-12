import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import plist from "https://cdn.jsdelivr.net/npm/plist@3.1.0/dist/plist.min.js";

// Firebase init
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
const storage = getStorage(app);

signInAnonymously(auth).then(() => console.log("✅ Firebase Anonymous Auth OK"));

// Выбор файлов
const ipaInput = document.getElementById("ipaFile");
const p12Input = document.getElementById("p12File");
const mobileInput = document.getElementById("mobileFile");
const passInput = document.getElementById("p12pass");
const signBtn = document.getElementById("signBtn");
const installDiv = document.getElementById("installLink");

signBtn.onclick = async () => {
  if (!ipaInput.files.length) return alert("Выбери .ipa файл");

  const uid = auth.currentUser?.uid || "demo";
  const ipaFile = ipaInput.files[0];
  const ipaRef = ref(storage, `signed/${uid}/${ipaFile.name}`);
  await uploadBytes(ipaRef, ipaFile);
  const ipaURL = await getDownloadURL(ipaRef);

  // Генерация manifest.plist
  const manifest = {
    items: [{
      assets: [{ kind: "software-package", url: ipaURL }],
      metadata: {
        "bundle-identifier": "com.ursa.signed.demo",
        "bundle-version": "1.0",
        kind: "software",
        title: ipaFile.name.replace(".ipa", "")
      }
    }]
  };
  const plistText = plist.build(manifest);
  const blob = new Blob([plistText], { type: "text/xml" });
  const plistRef = ref(storage, `signed/${uid}/${ipaFile.name.replace(".ipa", ".plist")}`);
  await uploadBytes(plistRef, blob);
  const plistURL = await getDownloadURL(plistRef);

  const installURL = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistURL)}`;

  installDiv.innerHTML = `<a href="${installURL}" class="btn">⬇️ Установить через itms-services</a>`;
  console.log("✅ Install link:", installURL);
};

// Навигация: переключаем вкладки
document.getElementById("signer-btn").addEventListener("click", () => {
  document.getElementById("catalog").style.display = "none";
  document.getElementById("signer").style.display = "block";
});
