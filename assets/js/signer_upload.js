// URSA Signer Upload — Firebase + Live Profile Update (v4.22)
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

async function uploadSigner() {
  const p12File = document.getElementById("fileP12").files[0];
  const provFile = document.getElementById("fileProv").files[0];
  const pass = document.getElementById("certPass").value || "";
  const btn = document.getElementById("uploadBtn");
  const status = document.getElementById("uploadStatus");

  if (!p12File || !provFile) {
    status.textContent = "❌ Выберите оба файла (.p12 и .mobileprovision)";
    return;
  }

  btn.disabled = true;
  status.textContent = "⏳ Загрузка…";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");

    const uid = user.uid;
    const folder = `signers/${uid}/`;
    const p12Ref = ref(storage, folder + p12File.name);
    const provRef = ref(storage, folder + provFile.name);

    // Загружаем оба файла
    await uploadBytes(p12Ref, p12File);
    await uploadBytes(provRef, provFile);

    // Получаем URL’ы
    const p12Url = await getDownloadURL(p12Ref);
    const provUrl = await getDownloadURL(provRef);

    // 🧩 Пытаемся вытащить CN (Common Name) из p12 локально
    const cn = await extractCommonName(p12File);

    // Записываем в Firestore
    const signerRef = doc(db, "ursa_signers", uid);
    await setDoc(signerRef, {
      p12Url,
      provUrl,
      pass,
      createdAt: new Date().toISOString(),
      certCN: cn || "—"
    });

    // ✅ Обновляем локальное состояние (UI без перезагрузки)
    localStorage.setItem("ursa_signer_id", uid);
    localStorage.setItem("ursa_cert_account", cn || "—");
    localStorage.setItem("ursa_cert_exp", new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString()); // пример: +1 год
    document.querySelector("#cert-state").textContent = "✅ Загружен";
    document.querySelector("#cert-account").textContent = cn || "—";

    status.textContent = "✅ Загрузлено в Firebase";
  } catch (err) {
    console.error("Upload error:", err);
    status.textContent = "❌ Firestore create failed: " + err.message;
  } finally {
    btn.disabled = false;
  }
}

// === Вытаскивает CN из p12 (без внешних либ)
async function extractCommonName(file) {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder().decode(bytes);
    // Пробуем вытащить CN из строки (обычно "CN=" где-то рядом)
    const match = text.match(/CN=([^,\n]+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// === Слушатель кнопки ===
document.getElementById("uploadBtn").addEventListener("click", uploadSigner);
