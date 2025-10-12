(function () {
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (isIOS()) document.documentElement.classList.add("is-ios");
    // мелочи UX
    document.body.addEventListener("touchstart", () => {}, { passive: true });
  });
})();
