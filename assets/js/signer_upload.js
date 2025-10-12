// signer_upload.js — загрузка сертификатов в Firebase (v5.0 Linked Signer Upload)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey:"AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain:"ipa-panel.firebaseapp.com",
  projectId:"ipa-panel",
  storageBucket:"ipa-panel.firebasestorage.app",
  messagingSenderId:"239982196215",
  appId:"1:239982196215:web:9de387c51952da428daaf2"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

const form = document.getElementById("signer-form");
const statusEl = document.getElementById("signer-status");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "⏳ Загружаем сертификаты…";

  const p12 = document.getElementById("p12file").files[0];
  const prov = document.getElementById("provfile").files[0];
  const pass = document.getElementById("p12pass").value || "";

  if (!p12 || !prov) {
    statusEl.textContent = "⚠️ Укажите оба файла (.p12 и .mobileprovision)";
    return;
  }

  try {
    const signerId = crypto.randomUUID(); // уникальный ID этого набора
    const folder = `signer/${signerId}`;
    const p12Ref = ref(storage, `${folder}/${p12.name}`);
    const provRef = ref(storage, `${folder}/${prov.name}`);

    await uploadBytes(p12Ref, p12);
    await uploadBytes(provRef, prov);

    const p12Url = await getDownloadURL(p12Ref);
    const provUrl = await getDownloadURL(provRef);

    await setDoc(doc(db, "ursa_signers", signerId), {
      createdAt: new Date().toISOString(),
      p12Url,
      provUrl,
      pass,
    });

    // сохраняем в localStorage, чтобы сайт знал какой использовать
    localStorage.setItem("ursa_signer_id", signerId);

    statusEl.textContent = "✅ Сертификаты загружены!";
  } catch (err) {
    console.error("Signer upload error:", err);
    statusEl.textContent = "❌ Ошибка: " + err.message;
  }
});
