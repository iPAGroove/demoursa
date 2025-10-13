// интеграция сайта с URSA Signer API (Cloud Run Proxy)
const SIGNER_API  = "https://ursa-signer-239982196215.europe-west1.run.app/sign_remote";
const SIGNER_PROXY= "https://ursa-signer-239982196215.europe-west1.run.app/get_signer";
const FILE_PROXY  = "https://ursa-signer-239982196215.europe-west1.run.app/proxy_file?url=";

async function installIPA(app){
  const dl = document.getElementById("dl-buttons");
  dl.innerHTML = `<div style="opacity:.8;font-size:14px;">🔄 Подписываем IPA…</div>`;
  try{
    const resp = await fetch(SIGNER_PROXY);
    if(!resp.ok) throw new Error(`Signer API ${resp.status}`);
    const data = await resp.json();
    if(!data.signer) throw new Error("Сертификаты не найдены.");

    const signer = data.signer;
    const p12_url = signer.p12Url?.stringValue || "";
    const prov_url= signer.provUrl?.stringValue || "";
    const pass    = signer.pass?.stringValue || "";
    if(!p12_url || !prov_url) throw new Error("Не найдены ссылки на сертификаты.");

    const [p12Blob,provBlob]= await Promise.all([
      fetch(FILE_PROXY+encodeURIComponent(p12_url)).then(r=>r.ok?r.blob():Promise.reject("Ошибка загрузки p12")),
      fetch(FILE_PROXY+encodeURIComponent(prov_url)).then(r=>r.ok?r.blob():Promise.reject("Ошибка загрузки .mobileprovision"))
    ]);

    const form=new FormData();
    form.append("ipa_url", app.downloadUrl);
    form.append("password", pass);
    form.append("p12", new File([p12Blob],"cert.p12"));
    form.append("mobileprovision", new File([provBlob],"profile.mobileprovision"));

    const res = await fetch(SIGNER_API,{method:"POST",body:form});
    const json= await res.json();
    if(!res.ok) throw new Error(json.detail||json.error||"Ошибка при подписи IPA");

    dl.innerHTML = `<div style="opacity:.9;font-size:14px;">✅ Готово! Установка начнётся…</div>`;
    setTimeout(()=>location.href=json.install_link, 900);
  }catch(err){
    console.error("Signer error:", err);
    dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message||err}</div>`;
  }
}
window.installIPA = installIPA;
