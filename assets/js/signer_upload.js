const UPLOAD_API = "https://ursa-signer-239982196215.europe-west1.run.app/upload_signer";
const certBtn = document.getElementById("cert-upload");

certBtn?.addEventListener("click", async ()=>{
  const input1=document.createElement("input");
  const input2=document.createElement("input");
  const pass=document.createElement("input");
  input1.type="file";input1.accept=".p12";
  input2.type="file";input2.accept=".mobileprovision";
  pass.type="password";pass.placeholder="Пароль (если есть)";
  alert("Выберите файлы сертификата (.p12 и .mobileprovision)");
  input1.click();
  input1.onchange=()=>input2.click();
  input2.onchange=async ()=>{
    const p12=input1.files[0],prov=input2.files[0];
    const fd=new FormData();
    fd.append("p12",p12);fd.append("mobileprovision",prov);fd.append("password",pass.value);
    const resp=await fetch(UPLOAD_API,{method:"POST",body:fd});
    const json=await resp.json();
    if(!resp.ok){alert("Ошибка: "+(json.detail||json.error));return;}
    localStorage.setItem("ursa_signer_id",json.signer_id);
    if(json.account)localStorage.setItem("ursa_cert_account",json.account);
    if(json.expires)localStorage.setItem("ursa_cert_exp",json.expires);
    updateCertInfo();
    alert("✅ Сертификат загружен!");
  };
});

function updateCertInfo(){
  const state=localStorage.getItem("ursa_signer_id")?"✅ Загружен":"❌ Не загружен";
  document.getElementById("cert-state").textContent=state;
  document.getElementById("cert-account").textContent=localStorage.getItem("ursa_cert_account")||"—";
  const exp=localStorage.getItem("ursa_cert_exp");
  document.getElementById("cert-exp").textContent=exp?new Date(exp).toLocaleDateString("ru-RU"):"—";
}
document.addEventListener("DOMContentLoaded",updateCertInfo);
