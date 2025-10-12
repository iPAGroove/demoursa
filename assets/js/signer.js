import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import plist from "https://cdn.jsdelivr.net/npm/plist@3.1.0/dist/plist.min.js";

// ⚙️ Firebase init
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

const ipaInput = document.getElementById("ipaFile");
const p12Input = document.getElementById("p12File");
const mobileInput = document.getElementById("mobileFile");
const passInput = document.getElementById("p12pass");
const signBtn = document.getElementById("signBtn");
const progress = document.getElementById("progress");
const installDiv = document.getElementById("installLink");

// 🧾 Обработка подписи
signBtn.onclick = async () => {
  if (!ipaInput.files.length || !p12Input.files.length || !mobileInput.files.length)
    return alert("Выбери все файлы (.ipa, .p12, .mobileprovision)");

  progress.innerText = "⏳ Подписываем IPA...";

  // Собираем formData
  const formData = new FormData();
  formData.append("ipa", ipaInput.files[0]);
  formData.append("p12", p12Input.files[0]);
  formData.append("mobileprovision", mobileInput.files[0]);
  formData.append("password", passInput.value);

  try {
    // Отправляем файлы на твой FastAPI сервер
    const response = await fetch("https://YOUR-SIGNER-API.com/sign", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Ошибка при подписи");

    const blob = await response.blob();
    const uid = auth.currentUser?.uid || "demo";

    // Загружаем готовый IPA в Firebase
    const ipaRef = ref(storage, `signed/${uid}/signed_${Date.now()}.ipa`);
    await uploadBytes(ipaRef, blob);
    const ipaURL = await getDownloadURL(ipaRef);

    // Создаём manifest.plist
    const manifest = {
      items: [{
        assets: [{ kind: "software-package", url: ipaURL }],
        metadata: {
          "bundle-identifier": "com.ursa.signed." + uid,
          "bundle-version": "1.0",
          kind: "software",
          title: ipaInput.files[0].name.replace(".ipa", "")
        }
      }]
    };
    const plistText = plist.build(manifest);
    const plistBlob = new Blob([plistText], { type: "text/xml" });
    const plistRef = ref(storage, `signed/${uid}/manifest_${Date.now()}.plist`);
    await uploadBytes(plistRef, plistBlob);
    const plistURL = await getDownloadURL(plistRef);

    const installURL = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistURL)}`;

    progress.innerText = "✅ Подписано!";
    installDiv.innerHTML = `<a href="${installURL}" class="btn">⬇️ Установить через itms-services</a>`;
    console.log("✅ Install link:", installURL);
  } catch (err) {
    console.error(err);
    progress.innerText = "❌ Ошибка подписи";
  }
};

// 🧭 Переключение вкладок
document.getElementById("signer-btn").addEventListener("click", () => {
  document.getElementById("catalog").style.display = "none";
  document.getElementById("signer").style.display = "block";
});
