// URSA Signer Upload — Firebase + Live Profile Update (v4.23 AutoClose + Smooth UI)
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
  status.style.opacity = ".8";
  status.textContent = "⏳ Загрузка сертификата…";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Не выполнен вход");

    const uid = user.uid;
    const folder = `signers/${uid}/`;
    const p12Ref = ref(storage, folder + p12File.name);
    const provRef = ref(storage, folder + provFile.name);

    // 🔼 Загружаем файлы в Storage
    await uploadBytes(p12Ref, p12File);
    await uploadBytes(provRef, provFile);

    // 🔹 Получаем download URL’ы
    const [p12Url, provUrl] = await Promise.all([
      getDownloadURL(p12Ref),
      getDownloadURL(provRef)
    ]);

    // 🧩 Пробуем вытащить CN (Common Name)
    const cn = await extractCommonName(p12File);

    // 🔹 Пишем в Firestore
    const signerRef = doc(db, "ursa_signers", uid);
    await setDoc(signerRef, {
      p12Url,
      provUrl,
      pass,
      createdAt: new Date().toISOString(),
      certCN: cn || "—"
    });

    // ✅ Обновляем локально
    localStorage.setItem("ursa_signer_id", uid);
    localStorage.setItem("ursa_cert_account", cn || "—");
    localStorage.setItem("ursa_cert_exp", new Date(Date.now() + 31536000000).toISOString());

    document.querySelector("#cert-state").textContent = "✅ Загружен";
    document.querySelector("#cert-account").textContent = cn || "—";

    status.textContent = "✅ Успешно загружено!";
    status.style.opacity = "1";

    // 🔄 Обновляем профиль без перезагрузки
    if (typeof window.openSettings === "function") {
      setTimeout(() => window.openSettings(), 400);
    }

    // ⏱ Закрываем модалку через 2 секунды
    const signerModal = document.getElementById("signer-modal");
    setTimeout(() => {
      signerModal?.classList.remove("open");
      signerModal?.setAttribute("aria-hidden", "true");
    }, 2000);
  } catch (err) {
    console.error("Upload error:", err);
    status.style.opacity = "1";
    status.textContent = "❌ Ошибка: " + (err.message || "Upload failed");
  } finally {
    btn.disabled = false;
  }
}

// === Извлекает CN (Common Name) из бинаря .p12 ===
async function extractCommonName(file) {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder().decode(bytes);
    const match = text.match(/CN=([^,\n]+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// === Подключаем кнопку ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("uploadBtn");
  if (btn) btn.addEventListener("click", uploadSigner);
});
