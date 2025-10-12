// signer.js — интеграция сайта с URSA Signer API (v5.0 Linked Signer Call)
const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";

async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA…</div>`;

  try {
    // читаем signer_id из localStorage
    const signerId = localStorage.getItem("ursa_signer_id");
    if (!signerId) throw new Error("Нет активного Signer ID. Загрузите сертификаты заново.");

    // получаем документ напрямую
    const url = `https://firestore.googleapis.com/v1/projects/ipa-panel/databases/(default)/documents/ursa_signers/${signerId}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.fields) throw new Error("Сертификаты не найдены или удалены.");

    const signer = data.fields;
    const p12_url = signer.p12Url?.stringValue || "";
    const prov_url = signer.provUrl?.stringValue || "";
    const pass = signer.pass?.stringValue || "";

    if (!p12_url || !prov_url) throw new Error("Сертификаты повреждены или неполные.");

    // ⚙️ Формируем форму для Cloud Run
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("password", pass);

    // загружаем сертификаты
    const [p12Blob, provBlob] = await Promise.all([
      fetch(p12_url).then(r => r.ok ? r.blob() : Promise.reject("Ошибка p12")),
      fetch(prov_url).then(r => r.ok ? r.blob() : Promise.reject("Ошибка provision")),
    ]);

    form.append("p12", new File([p12Blob], "cert.p12"));
    form.append("mobileprovision", new File([provBlob], "profile.mobileprovision"));

    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Ошибка при подписи IPA");

    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ Готово! Установка начнётся…</div>`;
    setTimeout(() => (window.location.href = json.install_link), 1000);
  } catch (err) {
    console.error("Signer error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message}</div>`;
  }
}

window.installIPA = installIPA;
