// URSA Signer Upload v4.2 — Firebase/CloudRun bridge
const UPLOAD_API = "https://ursa-signer-239982196215.europe-west1.run.app/upload_signer";

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("cert-upload");
  const signerModal = document.getElementById("signer-modal");

  // открыть модалку загрузки
  if (uploadBtn && signerModal) {
    uploadBtn.addEventListener("click", () => {
      signerModal.classList.add("open");
      signerModal.setAttribute("aria-hidden", "false");
    });
    signerModal.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close") || e.target === signerModal) {
        signerModal.classList.remove("open");
        signerModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  // обработчик формы
  const form = document.getElementById("signer-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p12 = document.getElementById("p12file").files[0];
    const prov = document.getElementById("provfile").files[0];
    const pass = document.getElementById("p12pass").value;
    const statusEl = document.getElementById("signer-status");
    if (!p12 || !prov) return alert("Загрузите оба файла!");

    statusEl.textContent = "⏳ Загрузка...";
    try {
      const fd = new FormData();
      fd.append("p12", p12);
      fd.append("mobileprovision", prov);
      fd.append("password", pass);
      const res = await fetch(UPLOAD_API, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || "Upload error");

      localStorage.setItem("ursa_signer_id", json.signer_id);
      if (json.account) localStorage.setItem("ursa_cert_account", json.account);
      if (json.expires) localStorage.setItem("ursa_cert_exp", json.expires);
      updateCertInfo();
      statusEl.textContent = "✅ Успешно загружено!";
    } catch (err) {
      console.error("Upload error:", err);
      statusEl.textContent = "❌ Ошибка: " + err.message;
    }
  });

  updateCertInfo();
});

function updateCertInfo() {
  const st = localStorage.getItem("ursa_signer_id") ? "✅ Загружен" : "❌ Не загружен";
  document.getElementById("cert-state").textContent = st;
  document.getElementById("cert-account").textContent = localStorage.getItem("ursa_cert_account") || "—";
  const exp = localStorage.getItem("ursa_cert_exp");
  document.getElementById("cert-exp").textContent = exp ? new Date(exp).toLocaleDateString("ru-RU") : "—";
}
