// signer.js — интеграция сайта с URSA Signer API (v5.3 ProxyFetch + OpenP12 Support)

const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";
const SIGNER_PROXY = "https://ursa-signer-239982196215.europe-west1.run.app/get_signer";
const FILE_PROXY = "https://ursa-signer-239982196215.europe-west1.run.app/proxy_file?url=";

async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA…</div>`;

  try {
    // 🔹 1. Получаем signer из Cloud Run Proxy
    const resp = await fetch(SIGNER_PROXY);
    if (!resp.ok) throw new Error(`Signer API error ${resp.status}`);
    const data = await resp.json();

    if (!data.signer) throw new Error("Сертификаты не найдены.");

    const signer = data.signer;
    const p12_url = signer.p12Url?.stringValue || "";
    const prov_url = signer.provUrl?.stringValue || "";
    let pass = signer.pass?.stringValue || "";

    if (!p12_url || !prov_url)
      throw new Error("Не найдены ссылки на сертификаты.");

    if (!pass) console.log("ℹ️ Сертификат без пароля (open .p12)");

    // 🔹 2. Загружаем файлы через Cloud Run File Proxy
    const [p12Blob, provBlob] = await Promise.all([
      fetch(FILE_PROXY + encodeURIComponent(p12_url)).then(r =>
        r.ok ? r.blob() : Promise.reject("Ошибка загрузки p12")
      ),
      fetch(FILE_PROXY + encodeURIComponent(prov_url)).then(r =>
        r.ok ? r.blob() : Promise.reject("Ошибка загрузки .mobileprovision")
      ),
    ]);

    // 🔹 3. Формируем форму для подписи
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("password", pass);
    form.append("p12", new File([p12Blob], "cert.p12"));
    form.append("mobileprovision", new File([provBlob], "profile.mobileprovision"));

    // 🔹 4. Отправляем на Cloud Run signer
    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();

    if (!res.ok)
      throw new Error(json.detail || json.error || "Ошибка при подписи IPA");

    console.log("✅ IPA подписан:", json);

    // 🔹 5. Редирект на установку
    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ Готово! Установка начнётся…</div>`;
    setTimeout(() => (window.location.href = json.install_link), 1200);
  } catch (err) {
    console.error("Signer error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message || err}</div>`;
  }
}

// экспортируем глобально
window.installIPA = installIPA;
