// signer.js — интеграция сайта с URSA Signer API (v5.1 OpenP12 Support)
const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";

async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA…</div>`;

  try {
    const signerId = localStorage.getItem("ursa_signer_id");
    if (!signerId) throw new Error("Signer ID не найден. Загрузите сертификаты заново.");

    const resp = await fetch(`https://firestore.googleapis.com/v1/projects/ipa-panel/databases/(default)/documents/ursa_signers/${signerId}`);
    const data = await resp.json();

    if (!data.fields) throw new Error("Сертификаты не найдены или повреждены.");

    const signer = data.fields;
    const p12_url = signer.p12Url?.stringValue || "";
    const prov_url = signer.provUrl?.stringValue || "";
    let pass = signer.pass?.stringValue || "";

    // 🧠 Если пароль пустой — это нормально (open p12)
    if (!p12_url || !prov_url) throw new Error("Не найдены ссылки на сертификаты.");
    if (!pass) {
      console.log("ℹ️ Сертификат без пароля (open .p12)");
      pass = ""; // оставляем пустым, zsign примет
    }

    // ⚙️ Формируем форму
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("password", pass);

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
