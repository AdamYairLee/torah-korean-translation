(() => {
  const DISMISS_KEY = "protectFlockInstallDismissedAt";
  const INSTALLED_KEY = "protectFlockInstalled";
  const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;
  const params = new URLSearchParams(location.search);
  const forceTest = params.get("installtest") === "1";
  let installPrompt = null;
  let fallbackTimer = 0;

  const isMobileOrTablet = () => {
    const ua = navigator.userAgent || "";
    const touchPoints = navigator.maxTouchPoints || 0;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches || false;
    const iPadDesktopMode = navigator.platform === "MacIntel" && touchPoints > 1;
    return (
      /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini|Silk|Kindle/i.test(ua) ||
      iPadDesktopMode ||
      (touchPoints > 1 && coarse && Math.min(screen.width, screen.height) < 1366)
    );
  };

  const isIos = () =>
    /iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);

  const isInstalled = () =>
    !forceTest &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      navigator.standalone === true ||
      safeGet(INSTALLED_KEY) === "1");

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function translated(text) {
    return window.ShepherdI18n?.tr?.(text) || text;
  }

  function canOfferInstall() {
    if ((!forceTest && !isMobileOrTablet()) || isInstalled()) return false;
    if (!window.isSecureContext || !/^https?:$/.test(location.protocol)) return false;
    if (window.top !== window.self) return false;
    if (document.body.classList.contains("language-unselected")) return false;
    if (forceTest) return true;
    const dismissedAt = Number(safeGet(DISMISS_KEY) || 0);
    return !dismissedAt || Date.now() - dismissedAt >= DISMISS_FOR_MS;
  }

  function showBanner() {
    if (!canOfferInstall()) return;
    const banner = document.querySelector("#installBanner");
    if (!banner) return;
    banner.classList.remove("hidden");
    document.body.classList.add("install-banner-visible");
  }

  function hideBanner() {
    document.querySelector("#installBanner")?.classList.add("hidden");
    document.body.classList.remove("install-banner-visible");
  }

  function showHelp(message) {
    const help = document.querySelector("#installHelp");
    if (!help) return;
    help.textContent = translated(message);
    help.classList.remove("hidden");
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    clearTimeout(fallbackTimer);
    setTimeout(showBanner, 450);
  });

  window.addEventListener("appinstalled", () => {
    safeSet(INSTALLED_KEY, "1");
    installPrompt = null;
    hideBanner();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const installButton = document.querySelector("#installAppBtn");
    const laterButton = document.querySelector("#installLaterBtn");

    laterButton?.addEventListener("click", () => {
      safeSet(DISMISS_KEY, String(Date.now()));
      hideBanner();
    });

    installButton?.addEventListener("click", async () => {
      if (installPrompt) {
        const promptEvent = installPrompt;
        installPrompt = null;
        await promptEvent.prompt();
        const result = await promptEvent.userChoice;
        if (result?.outcome === "accepted") {
          safeSet(INSTALLED_KEY, "1");
          hideBanner();
        } else {
          safeSet(DISMISS_KEY, String(Date.now()));
          hideBanner();
        }
        return;
      }

      if (isIos()) {
        showHelp("iPhone/iPad에서는 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하십시오.");
      } else {
        showHelp("브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하십시오.");
      }
    });

    if ("serviceWorker" in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch((error) => {
        console.warn("App installation service could not start:", error);
      });
    }

    if (isIos()) fallbackTimer = window.setTimeout(showBanner, 650);
    else fallbackTimer = window.setTimeout(showBanner, 1800);
  });
})();
