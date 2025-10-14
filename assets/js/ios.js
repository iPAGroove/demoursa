// URSA Toast (v1)
window.ursaToast = function (msg, type="info", timeout=3500) {
  let c = document.getElementById("ursa-toast-wrap");
  if (!c) {
    c = document.createElement("div");
    c.id = "ursa-toast-wrap";
    c.style.cssText = "position:fixed;left:0;right:0;top:12px;z-index:9999;display:grid;place-items:center;pointer-events:none;";
    document.body.appendChild(c);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = msg;
  el.dataset.type = type;
  c.appendChild(el);
  setTimeout(()=>el.classList.add("show"), 20);
  setTimeout(()=>{
    el.classList.remove("show");
    setTimeout(()=>el.remove(), 250);
  }, timeout);
};
