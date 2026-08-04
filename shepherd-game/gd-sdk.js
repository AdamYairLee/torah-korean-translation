(() => {
  const gameId = (
    document.querySelector('meta[name="gd-game-id"]')?.content || ""
  ).trim();
  const configured = /^[a-f0-9]{32}$/i.test(gameId);
  let ready = false;
  let pendingInterstitial = false;

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent("gamedistribution:" + name, { detail }),
    );
  }

  window.GD_OPTIONS = {
    debug: false,
    gameId,
    onEvent(event) {
      const name = event?.name || "";
      if (name === "SDK_READY") {
        ready = true;
        emit("ready", event);
        if (pendingInterstitial) {
          pendingInterstitial = false;
          setTimeout(() => window.GameDistributionBridge.showInterstitial(), 0);
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
    showInterstitial() {
      if (!configured) return false;
      if (!ready || typeof window.gdsdk?.showAd !== "function") {
        pendingInterstitial = true;
        return true;
      }
      try {
        const result = window.gdsdk.showAd();
        result?.catch?.((error) => emit("error", { error }));
        return true;
      } catch (error) {
        emit("error", { error });
        return false;
      }
    },
  };

  if (!configured) {
    console.info(
      "GameDistribution SDK is prepared but inactive until a valid gameId is added.",
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
