// signer_upload.js — загрузка сертификатов на Firebase
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFj9gOYU49Df6ohUR5CnbRv3qdY2i_OmU",
  authDomain: "ipa-panel.firebaseapp.com",
  projectId: "ipa-panel",
  storageBucket: "ipa-panel.firebasestorage.app",
  messagingSenderId: "239982196215",
  appId: "1:239982196215:web:9de387c51952da428daaf2"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

const form = document.getElementById("signer-form");
const statusEl = document.getElementById("signer-status");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "⏳ Загружаем файлы…";

  const p12 = document.getElementById("p12file").files[0];
  const prov = document.getElementById("provfile").files[0];
  const pass = document.getElementById("p12pass").value || "";

  if (!p12 || !prov) {
    statusEl.textContent = "⚠️ Укажите оба файла";
    return;
  }

  try {
    const uid = Date.now().toString();
    const p12Ref = ref(storage, `signer/${uid}/${p12.name}`);
    const provRef = ref(storage, `signer/${uid}/${prov.name}`);

    await uploadBytes(p12Ref, p12);
    await uploadBytes(provRef, prov);

    const p12Url = await getDownloadURL(p12Ref);
    const provUrl = await getDownloadURL(provRef);

    await addDoc(collection(db, "ursa_signers"), {
      createdAt: new Date().toISOString(),
      p12Url, provUrl, pass
    });

    statusEl.textContent = "✅ Сертификаты сохранены на Firebase!";
  } catch (err) {
    console.error("Upload error:", err);
    statusEl.textContent = "❌ Ошибка: " + err.message;
  }
});
