(() => {
  const gameId = (
    document.querySelector('meta[name="gd-game-id"]')?.content || ""
  ).trim();
  const configured = /^[a-f0-9]{32}$/i.test(gameId);
  const testMode = new URLSearchParams(location.search).get("adtest") === "1";
  let ready = false;
  let pendingRequest = null;
  let mockPromise = null;

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent("gamedistribution:" + name, { detail }),
    );
  }

  function mockText() {
    const lang = window.ShepherdI18n?.getLanguage?.() || "en";
    if (lang === "he")
      return { title: "בדיקת מודעה", note: "זהו מסך בדיקה בלבד — לא מוצגת מודעה אמיתית." };
    if (lang === "ko")
      return { title: "광고 연결 시험", note: "실제 광고가 아닌 내부 시험 화면입니다." };
    return { title: "Ad Connection Test", note: "Internal test screen — no real advertisement is being shown." };
  }

  function showMockInterstitial(placement) {
    if (mockPromise) return mockPromise;
    mockPromise = new Promise((resolve) => {
      emit("pause", { name: "SDK_GAME_PAUSE", test: true, placement });
      const copy = mockText();
      const overlay = document.createElement("div");
      overlay.id = "mockAdOverlay";
      overlay.setAttribute("role", "status");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;background:#111e;color:#f4ead2;font:700 18px Arial,sans-serif;text-align:center;padding:24px;";
      overlay.innerHTML =
        '<div style="width:min(520px,82vw);padding:28px;border:2px solid #ab9268;background:#29241d">' +
        '<strong style="display:block;font-size:28px;margin-bottom:12px"></strong>' +
        '<span style="display:block;font-size:14px;font-weight:400;line-height:1.5"></span>' +
        '<b style="display:block;margin-top:18px;font-size:22px">2</b></div>';
      overlay.querySelector("strong").textContent = copy.title;
      overlay.querySelector("span").textContent = copy.note;
      document.body.appendChild(overlay);
      const counter = overlay.querySelector("b");
      const startedAt = performance.now();
      const timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((2200 - (performance.now() - startedAt)) / 1000));
        counter.textContent = String(remaining);
      }, 150);
      setTimeout(() => {
        clearInterval(timer);
        overlay.remove();
        emit("resume", { name: "SDK_GAME_START", test: true, placement });
        mockPromise = null;
        resolve(true);
      }, 2200);
    });
    return mockPromise;
  }

  function playActualInterstitial(placement) {
    if (typeof window.gdsdk?.showAd !== "function") return Promise.resolve(false);
    try {
      return Promise.resolve(window.gdsdk.showAd())
        .then(() => true)
        .catch((error) => {
          emit("error", { error, placement });
          return false;
        });
    } catch (error) {
      emit("error", { error, placement });
      return Promise.resolve(false);
    }
  }

  window.GD_OPTIONS = {
    debug: false,
    gameId,
    onEvent(event) {
      const name = event?.name || "";
      if (name === "SDK_READY") {
        ready = true;
        emit("ready", event);
        if (pendingRequest) {
          const pending = pendingRequest;
          pendingRequest = null;
          playActualInterstitial(pending.placement).then(pending.resolve);
        }
      } else if (name === "SDK_GAME_PAUSE") {
        emit("pause", event);
      } else if (name === "SDK_GAME_START") {
        emit("resume", event);
      } else if (name === "SDK_ERROR") {
        emit("error", event);
      }
    },
  };

  window.GameDistributionBridge = {
    isConfigured: () => configured,
    isReady: () => ready,
    isTestMode: () => testMode,
    showInterstitial(placement = "unspecified") {
      if (testMode) return showMockInterstitial(placement);
      if (!configured) return Promise.resolve(false);
      if (ready) return playActualInterstitial(placement);
      if (pendingRequest) return pendingRequest.promise;
      let resolvePending;
      const promise = new Promise((resolve) => {
        resolvePending = resolve;
      });
      pendingRequest = { placement, promise, resolve: resolvePending };
      setTimeout(() => {
        if (pendingRequest?.promise !== promise) return;
        pendingRequest = null;
        resolvePending(false);
      }, 6000);
      return promise;
    },
  };

  if (testMode) {
    console.info("GameDistribution mock-ad test mode is active.");
    return;
  }
  if (!configured) {
    console.info(
      "GameDistribution hooks are inactive until a valid gameId is added.",
    );
    return;
  }

  const script = document.createElement("script");
  script.id = "gamedistribution-jssdk";
  script.async = true;
  script.src = "https://html5.api.gamedistribution.com/main.min.js";
  script.onerror = () =>
    emit("error", { error: new Error("GameDistribution SDK failed to load.") });
  document.head.appendChild(script);
})();
