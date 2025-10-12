// signer.js — интеграция сайта с URSA Signer API (v5.2 CORS Proxy + OpenP12 Support)

// 🔗 Эндпоинты Cloud Run
const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";
const SIGNER_PROXY = "https://ursa-signer-239982196215.europe-west1.run.app/get_signer";

async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA…</div>`;

  try {
    // 1️⃣ Запрашиваем свежий сертификат через прокси
    const resp = await fetch(SIGNER_PROXY);
    if (!resp.ok) throw new Error(`Ошибка Firestore Proxy (${resp.status})`);
    const data = await resp.json();

    if (!data.signer) throw new Error("Сертификаты не найдены или повреждены.");

    // 2️⃣ Извлекаем поля
    const signer = data.signer;
    const p12_url = signer.p12Url?.stringValue || "";
    const prov_url = signer.provUrl?.stringValue || "";
    let pass = signer.pass?.stringValue || "";

    if (!p12_url || !prov_url) throw new Error("Ссылки на сертификаты отсутствуют.");
    if (!pass) console.log("ℹ️ Сертификат без пароля (Open .p12)");

    // 3️⃣ Подготавливаем форму для подписи
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("password", pass);

    // 4️⃣ Скачиваем файлы сертификатов
    const [p12Blob, provBlob] = await Promise.all([
      fetch(p12_url).then(r => r.ok ? r.blob() : Promise.reject("Ошибка p12")),
      fetch(prov_url).then(r => r.ok ? r.blob() : Promise.reject("Ошибка mobileprovision")),
    ]);

    form.append("p12", new File([p12Blob], "cert.p12"));
    form.append("mobileprovision", new File([provBlob], "profile.mobileprovision"));

    // 5️⃣ Отправляем запрос на подпись
    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка при подписи IPA");

    // 6️⃣ Всё готово — перенаправляем на установку
    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ Готово! Установка начнётся…</div>`;
    setTimeout(() => (window.location.href = json.install_link), 1200);
  } catch (err) {
    console.error("Signer error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message}</div>`;
  }
}

window.installIPA = installIPA;
