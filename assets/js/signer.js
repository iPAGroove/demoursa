// signer.js — интеграция сайта с URSA Signer API
const SIGNER_API = "http://127.0.0.1:8000/sign_remote"; // ⚙️ замени на свой https URL

async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA…</div>`;

  try {
    const res = await fetch(SIGNER_API, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        ipa_url: app.downloadUrl,
        bundle_id: app.bundleId,
        version: app.version,
        name: app.name
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Sign error");

    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ Готово! Установка начнётся…</div>`;
    setTimeout(()=>window.location.href=data.install_url,800);
  } catch (err) {
    console.error("Signer error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message}</div>`;
  }
}
window.installIPA = installIPA;
