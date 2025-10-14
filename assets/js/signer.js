// URSA IPA — v4.1 Firestore-based Signer Integration (i18n + Safe Auth Wait + Improved UX)
import { auth, db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// === API endpoints ===
const SIGNER_API = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";
const FILE_PROXY = "https://ursa-signer-239982196215.europe-west1.run.app/proxy_file?url=";

// === Local i18n ===
const LANG = (localStorage.getItem("ursa_lang") || "ru").toLowerCase();
const T = {
  ru: {
    signing: "🔄 Подписываем IPA через URSA Signer…",
    need_login: "Войдите через Google для подписи IPA",
    no_cert: "Сертификат не найден. Загрузите его в настройках.",
    bad_format: "Неверный формат сертификата.",
    done: "✅ Подпись завершена! Установка начнётся…",
    error: "Ошибка при подписи IPA",
  },
  en: {
    signing: "🔄 Signing IPA via URSA Signer…",
    need_login: "Please sign in with Google to sign IPA.",
    no_cert: "Certificate not found. Upload it in profile.",
    bad_format: "Invalid certificate format.",
    done: "✅ Signing complete! Installation will begin…",
    error: "Signing error",
  }
}[LANG];

// === Wait for Auth Helper ===
const waitForAuth = () =>
  new Promise((resolve) => {
    const unsub = firebase.auth().onAuthStateChanged((u) => {
      if (u) { unsub(); resolve(u); }
    });
    setTimeout(() => resolve(auth.currentUser), 2000);
  });

// === Main Function ===
async function installIPA(app) {
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">${T.signing}</div>
    <progress id="sign-progress" max="100" value="25" style="width:100%;height:8px;margin-top:6px;border-radius:8px;"></progress>`;

  try {
    // 🧩 Wait for Auth
    let user = auth.currentUser;
    if (!user) user = await waitForAuth();
    if (!user) throw new Error(T.need_login);

    const uid = user.uid;

    // 🔹 Get signer document
    const ref = doc(db, "ursa_signers", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(T.no_cert);

    const data = snap.data();
    const { p12Url, provUrl, pass = "" } = data;
    if (!p12Url || !provUrl) throw new Error(T.bad_format);

    // 🔹 Download certificate files (via proxy)
    const [p12Blob, provBlob] = await Promise.all([
      fetch(FILE_PROXY + encodeURIComponent(p12Url)).then(r => r.ok ? r.blob() : Promise.reject("p12 load error")),
      fetch(FILE_PROXY + encodeURIComponent(provUrl)).then(r => r.ok ? r.blob() : Promise.reject("prov load error"))
    ]);
    document.getElementById("sign-progress").value = 70;

    // 🔹 Send to signer API
    const form = new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("password", pass);
    form.append("p12", new File([p12Blob], "cert.p12"));
    form.append("mobileprovision", new File([provBlob], "profile.mobileprovision"));

    const res = await fetch(SIGNER_API, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || json.error || T.error);

    document.getElementById("sign-progress").value = 100;
    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">${T.done}</div>`;
    setTimeout(() => (location.href = json.install_link), 900);
  } catch (err) {
    console.error("Signer error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${
      typeof err === "string" ? err : err.message || T.error
    }</div>`;
  }
}

window.installIPA = installIPA;
