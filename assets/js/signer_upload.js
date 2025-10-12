// signer_upload.js — загрузка сертификатов через URSA Cloud Run Proxy (v5.4)
const UPLOAD_API = "https://ursa-signer-239982196215.europe-west1.run.app/upload_signer";

const form = document.getElementById("signer-form");
const statusEl = document.getElementById("signer-status");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "⏳ Загружаем сертификаты…";

  const p12 = document.getElementById("p12file").files[0];
  const prov = document.getElementById("provfile").files[0];
  const pass = document.getElementById("p12pass").value || "";

  if (!p12 || !prov) {
    statusEl.textContent = "⚠️ Укажите оба файла (.p12 и .mobileprovision)";
    return;
  }

  try {
    const formData = new FormData();
    formData.append("p12", p12);
    formData.append("mobileprovision", prov);
    formData.append("password", pass);

    const resp = await fetch(UPLOAD_API, { method: "POST", body: formData });
    const json = await resp.json();

    if (!resp.ok) throw new Error(json.detail || json.error || "Ошибка при загрузке");

    // сохраняем ID загруженного сертификата
    localStorage.setItem("ursa_signer_id", json.signer_id);

    statusEl.textContent = "✅ Сертификаты загружены!";
  } catch (err) {
    console.error("Signer upload error:", err);
    statusEl.textContent = "❌ Ошибка: " + (err.message || err);
  }
});
