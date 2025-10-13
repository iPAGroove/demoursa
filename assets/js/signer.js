// URSA IPA — Firestore-based Signer Integration (v3.9 No-Proxy Edition)
import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";
const FILE_PROXY = "https://ursa-signer-239982196215.europe-west1.run.app/proxy_file?url=";

// === Подпись IPA ===
async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA через URSA Signer…</div>`;

  try {
    // 🧩 Проверяем вход
    const user = auth.currentUser;
    if (!user) throw new Error("Войдите через Google для подписи IPA");
    const uid = user.uid;

    // 🔹 Загружаем данные сертификата из Firestore
    const ref = doc(db, "ursa_signers", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Сертификат не найден. Загрузите его в настройках.");

    const data = snap.data();
    const p12Url = data.p12Url;
    const provUrl = data.provUrl;
    const pass = data.pass || "";
    if (!p12Url || !provUrl) throw new Error("Неверный формат документа сертификата.");

    // 🔹 Скачиваем файлы через Cloud Run proxy (чтобы обойти CORS)
    const [p12Blob, provBlob] = await Promise.all([
      fetch(FILE_PROXY + encodeURIComponent(p12Url)).then(r => r.ok ? r.blob() : Promise.reject("Ошибка загрузки .p12")),
      fetch(FILE_PROXY + encodeURIComponent(provUrl)).then(r => r.ok ? r.blob() : Promise.reject("Ошибка загрузки .mobileprovision"))
    ]);

    // 🔹 Формируем запрос к Cloud Run
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("password", pass);
    form.append("p12", new File([p12Blob], "cert.p12"));
    form.append("mobileprovision", new File([provBlob], "profile.mobileprovision"));

    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();

    if (!res.ok) throw new Error(json.detail || json.error || "Ошибка при подписи IPA");

    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ Подпись завершена! Установка начнётся…</div>`;
    setTimeout(() => (location.href = json.install_link), 900);
  } catch (err) {
    console.error("Signer error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message || err}</div>`;
  }
}

window.installIPA = installIPA;
