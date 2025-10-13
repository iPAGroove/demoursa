const UPLOAD_API = "https://ursa-signer-239982196215.europe-west1.run.app/upload_signer";
const form = document.getElementById("signer-form");
const statusEl = document.getElementById("signer-status");

form?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  statusEl.textContent="⏳ Загружаем сертификаты…";

  const p12=document.getElementById("p12file").files[0];
  const prov=document.getElementById("provfile").files[0];
  const pass=document.getElementById("p12pass").value || "";
  if(!p12 || !prov){ statusEl.textContent="⚠️ Укажите оба файла"; return; }

  try{
    const fd=new FormData();
    fd.append("p12", p12);
    fd.append("mobileprovision", prov);
    fd.append("password", pass);
    const resp=await fetch(UPLOAD_API,{method:"POST",body:fd});
    const json=await resp.json();
    if(!resp.ok) throw new Error(json.detail||json.error||"Ошибка при загрузке");

    localStorage.setItem("ursa_signer_id", json.signer_id);
    if(json.account) localStorage.setItem("ursa_cert_account", json.account);
    if(json.expires) localStorage.setItem("ursa_cert_exp", json.expires);

    updateCertInfo();
    statusEl.textContent="✅ Сертификаты загружены!";
  }catch(err){
    console.error(err);
    statusEl.textContent="❌ Ошибка: "+(err.message||err);
  }
});

function updateCertInfo(){
  document.getElementById("cert-state").textContent = localStorage.getItem("ursa_signer_id")?"✅ Загружен":"❌ Не загружен";
  document.getElementById("cert-account").textContent = localStorage.getItem("ursa_cert_account") || "—";
  const exp = localStorage.getItem("ursa_cert_exp");
  document.getElementById("cert-exp").textContent = exp ? new Date(exp).toLocaleDateString("ru-RU") : "—";
}
document.addEventListener("DOMContentLoaded", updateCertInfo);
