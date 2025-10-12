// signer.js — интеграция сайта с URSA Signer API

const SIGNER_API = "http://127.0.0.1:8000/sign_remote"; // 💡 замени на свой хост, если вынесешь на сервер

async function installIPA(app) {
  const progress = document.createElement("div");
  progress.style = "margin-top:10px; font-size:14px; opacity:.8;";
  progress.textContent = "🔄 Подписываем IPA…";
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = "";
  dl.appendChild(progress);

  try {
    // Отправляем ссылку IPA на сервер
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);

    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok || !data.install_link) {
      throw new Error(data.detail || "Ошибка подписи IPA");
    }

    progress.textContent = "✅ Готово! Установка начнётся…";
    setTimeout(() => {
      window.location.href = data.install_link;
    }, 800);
  } catch (err) {
    console.error("Signer error:", err);
    progress.textContent = "❌ Ошибка: " + err.message;
  }
}

// Экспортируем для app.js
window.installIPA = installIPA;
