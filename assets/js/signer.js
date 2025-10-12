// signer.js — интеграция сайта с URSA Signer API (Cloud Run)
const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";

// Кнопка "Install" из каталога
async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA…</div>`;

  try {
    // Берём последний загруженный сертификат из Firestore
    const resp = await fetch("https://firestore.googleapis.com/v1/projects/ipa-panel/databases/(default)/documents/ursa_signers?orderBy=createTime desc&pageSize=1");
    const data = await resp.json();
    if (!data.documents?.length) throw new Error("Нет сертификатов, загрузи через Signer");

    const signer = data.documents[0].fields;
    const p12_url = signer.p12Url.stringValue;
    const prov_url = signer.provUrl.stringValue;
    const pass = signer.pass.stringValue || "";

    // Отправляем запрос на Cloud Run
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("password", pass);

    // скачиваем файлы с Firebase и прикрепляем к FormData
    const [p12Blob, provBlob] = await Promise.all([
      fetch(p12_url).then(r => r.blob()),
      fetch(prov_url).then(r => r.blob())
    ]);
    form.append("p12", new File([p12Blob], "cert.p12"));
    form.append("mobileprovision", new File([provBlob], "profile.mobileprovision"));

    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || "Sign error");

    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ Готово! Установка начнётся…</div>`;
    setTimeout(() => (window.location.href = json.install_link), 1000);
  } catch (err) {
    console.error("Signer error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message}</div>`;
  }
}
window.installIPA = installIPA;
