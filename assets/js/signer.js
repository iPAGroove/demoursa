import plist from "https://cdn.jsdelivr.net/npm/plist@3.1.0/dist/plist.min.js";

const signRemoteBtn = document.getElementById("signRemoteBtn");
const ipaUrlInput = document.getElementById("ipaUrl");
const progress = document.getElementById("progress");
const installDiv = document.getElementById("installLink");

// 🌐 URL твоего FastAPI сервера
const SIGNER_API = "https://ursa-signer.yourdomain.com/sign";

signRemoteBtn.onclick = async () => {
  const ipaUrl = ipaUrlInput.value.trim();
  if (!ipaUrl) return alert("Введите ссылку на .ipa (например, с Gofile)");

  progress.innerText = "⏳ Подписываем IPA, подожди...";
  installDiv.innerHTML = "";

  try {
    const response = await fetch(SIGNER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadUrl: ipaUrl }),
    });

    if (!response.ok) throw new Error("Ошибка сервера при подписи");

    const data = await response.json();

    if (data.status !== "ok") throw new Error("Ошибка: " + (data.message || "неизвестная"));

    // создаём plist для itms-services
    const plistObj = {
      items: [{
        assets: [{ kind: "software-package", url: data.signedUrl }],
        metadata: {
          "bundle-identifier": "com.ursa.signed.app",
          "bundle-version": "1.0",
          kind: "software",
          title: data.name || "URSA App"
        }
      }]
    };

    const plistText = plist.build(plistObj);
    const blob = new Blob([plistText], { type: "text/xml" });
    const plistUrl = URL.createObjectURL(blob);
    const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;

    progress.innerText = "✅ Готово! IPA подписан.";
    installDiv.innerHTML = `<a href="${installUrl}" class="btn">⬇️ Установить через itms-services</a>`;
  } catch (err) {
    console.error(err);
    progress.innerText = "❌ Ошибка при подписи IPA";
  }
};

// 🧭 Переключение вкладок
document.getElementById("signer-btn").addEventListener("click", () => {
  document.getElementById("catalog").style.display = "none";
  document.getElementById("signer").style.display = "block";
});
