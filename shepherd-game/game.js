import * as t from "./three.module.js";
import { clone as cloneSkinnedModel } from "./SkeletonUtils.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { mergeGeometries } from "./BufferGeometryUtils.js";
import { JERUSALEM_DATA } from "./jerusalemData.js";
import { createDavidModel } from "./davidModel.js?v=2.1.39";
let jerusalemMapReady = false;
let jerusalemMapBaseY = 0;
let jerusalemMapDeformedMinY = JERUSALEM_DATA.minY;
const JERUSALEM_SCALE = JERUSALEM_DATA.scale || 260;

function sampleJerusalemGround(worldX, worldZ) {
  const [xmin, xmax, zmin, zmax] = JERUSALEM_DATA.bounds;
  const lx = worldX / JERUSALEM_SCALE;
  const lz = worldZ / JERUSALEM_SCALE;
  if (lx < xmin || lx > xmax || lz < zmin || lz > zmax) return null;
  const n = JERUSALEM_DATA.heightN;
  const gx = ((lx - xmin) / (xmax - xmin)) * (n - 1);
  const gz = ((lz - zmin) / (zmax - zmin)) * (n - 1);
  const x0 = Math.max(0, Math.min(n - 1, Math.floor(gx)));
  const z0 = Math.max(0, Math.min(n - 1, Math.floor(gz)));
  const x1 = Math.min(n - 1, x0 + 1);
  const z1 = Math.min(n - 1, z0 + 1);
  const fx = gx - x0, fz = gz - z0;
  const h = JERUSALEM_DATA.height;
  const a = h[z0 * n + x0], b = h[z0 * n + x1];
  const c = h[z1 * n + x0], d = h[z1 * n + x1];
  const localY = (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  const southernDrop = 132 * t.MathUtils.smoothstep(worldZ, 320, 2700) *
    Math.exp(-(worldX * worldX) / 1300000);
  // This is the exact transform used by the visible GLB after its southern
  // vertices have been regraded.  Using the old procedural te() height here
  // buried every added house below the imported city surface.
  return jerusalemMapBaseY +
    (localY - southernDrop / JERUSALEM_SCALE - jerusalemMapDeformedMinY) *
      JERUSALEM_SCALE;
}

function loadJerusalemMap() {
  // Disabled deliberately. The imported city GLB uses a completely different
  // scale and surface from the playable procedural Jerusalem. Loading it here
  // created a second oversized ground layer around the camera. The original
  // city, Temple Mount, walls and their collision data remain authoritative.
  jerusalemMapReady = false;
  if (mt.jerusalem) mt.jerusalem.visible = true;
}

const e = (t) => document.querySelector(t),
  o = [...document.querySelectorAll(".screen")],
  n = (() => {
    const ua = navigator.userAgent || "";
    const touchPoints = navigator.maxTouchPoints || 0;
    const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches || false;
    const iPadDesktopMode = navigator.platform === "MacIntel" && touchPoints > 1;
    return (
      /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini|Silk|Kindle/i.test(ua) ||
      iPadDesktopMode ||
      (touchPoints > 1 && coarsePointer && Math.min(screen.width, screen.height) < 1366)
    );
  })();
document.body.classList.toggle("mobile-device", n);
const IS_MOBILE_DEVICE = n;
const MOBILE_MODEL_ASSETS = new Set([
  "animals/sheep_rigged_game.glb",
  "animals/lion_rigged_game.glb",
  "animals/fox_rigged_game.glb",
  "animals/wolf_rigged_game.glb",
  "bandit_rigged_game.glb",
  "kohen_rigged_game.glb",
  "south_gate_guard.glb",
  "city_boy_rigged_game.glb",
  "city_boy1_walk_game.glb",
  "city_girl2_walk_game.glb",
  "city_girl1_rigged_game.glb",
  "olive_tree_game.glb",
  "date_palm_tall_game.glb",
  "first_temple_game.glb",
  "camp_tent_game.glb",
  "camp_hay_trough_game.glb",
  "camp_water_trough_game.glb",
  "david_rotating_sling.glb",
]);
function modelAssetPath(path) {
  if (!n || typeof path !== "string") return path;
  const prefix = "./assets/models/";
  if (!path.startsWith(prefix)) return path;
  const relativePath = path.slice(prefix.length);
  return MOBILE_MODEL_ASSETS.has(relativePath)
    ? `${prefix}mobile/${relativePath}`
    : path;
}
function getVisibleViewportSize() {
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth)),
    height: Math.max(1, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight)),
  };
}
function syncMobileViewport() {
  const { width, height } = getVisibleViewportSize();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--app-width", `${width}px`);
  rootStyle.setProperty("--app-height", `${height}px`);
  rootStyle.setProperty("--viewport-top", "0px");
  document.body.classList.toggle("short-mobile-landscape", n && width >= height && height <= 560);
}
syncMobileViewport();
const mobileInput = {
  active: false,
  forward: 0,
  strafe: 0,
  targetForward: 0,
  targetStrafe: 0,
  magnitude: 0,
  running: false,
  joystickPointerId: null,
  lookPointerId: null,
  lookX: 0,
  lookY: 0,
  movementYaw: Math.PI,
};
let distributionAdPauseActive = false;
let distributionWasPausedBeforeAd = false;
function updateOrientationGate() {
  syncMobileViewport();
  const gate = e("#orientationGate");
  if (!gate) return;
  const viewport = getVisibleViewportSize();
  const portrait = viewport.height > viewport.width;
  document.body.classList.toggle("portrait-device", n && portrait);
  gate.classList.toggle("hidden", !n || !portrait);
  if (n && portrait && S) {
    b = true;
    Object.keys(K).forEach((key) => (K[key] = false));
    mobileInput.active = false;
    mobileInput.running = false;
    pauseAllGameAudio();
  } else if (n && S && !distributionAdPauseActive && e("#pause")?.classList.contains("hidden")) {
    b = false;
    Bt();
  }
}
async function requestLandscapeMode() {
  if (!IS_MOBILE_DEVICE) return;
  try {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
  } catch {}
  try {
    await screen.orientation?.lock?.("landscape-primary");
  } catch {
    try {
      await screen.orientation?.lock?.("landscape");
    } catch {}
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  syncMobileViewport();
  updateOrientationGate();
}
addEventListener("orientationchange", updateOrientationGate);
addEventListener("resize", updateOrientationGate);
window.visualViewport?.addEventListener?.("resize", updateOrientationGate);
window.visualViewport?.addEventListener?.("scroll", syncMobileViewport);
document.addEventListener("fullscreenchange", updateOrientationGate);
document.querySelectorAll("#languageGate [data-lang]").forEach((button) => {
  button.addEventListener("click", () => requestLandscapeMode(), { capture: true });
});
if (n) {
  // Mobile browsers only permit fullscreen/orientation locking from a user
  // gesture. Use the very first touch anywhere in the game, then repeat on the
  // explicit start controls below so the lock survives browser UI changes.
  document.addEventListener(
    "pointerup",
    () => requestLandscapeMode(),
    { capture: true, once: true },
  );
  document
    .querySelectorAll("#startBtn,#continueBtn,#playBtn,#davidCard")
    .forEach((button) =>
      button.addEventListener("click", () => requestLandscapeMode(), {
        capture: true,
      }),
    );
}
const s = e("#minimap").getContext("2d"),
  a = e("#rendererHost");
let i,
  r,
  c,
  l,
  h = null,
  d = null,
  p = null,
  u = null,
  m = null,
  f = null,
  w = null,
  M = null,
  y = "0" !== localStorage.getItem("shepherdSoundEnabled"),
  x = 0,
  g = 0,
  v = Number(localStorage.getItem("shepherdVolume") ?? 55) / 100;
const z = [];
const performanceState = {
  nextOcclusionAt: 0,
  nextMinimapAt: 0,
  nextTargetLockAt: 0,
  nextHudAt: 0,
  nextAdaptiveQualityAt: 0,
  nextAutoSaveAt: 0,
  currentPixelRatio: 0,
  hiddenCameraMeshes: [],
  occlusionRaycaster: new t.Raycaster(),
  targetRaycaster: new t.Raycaster(),
  targetCenter: new t.Vector2(0, 0),
  onOliveMount: false,
  smoothedFrameMs: 16.7,
  lastObservedFrameMs: 16.7,
  lastMobileRenderAt: 0,
  slowFrameFor: 0,
  campStoneNear: false,
  distantFogDensity: 0.00046,
  cityStaticBatches: [],
  cityCitizenAccumulator: 0,
  nextLightingAt: 0,
  nextAmbientAudioAt: 0,
  nextRegionUiAt: 0,
  minimapRoadCacheRevision: -1,
  minimapVisibleRoads: [],
  sheepUpdatePhase: 0,
};
function targetPixelRatio(slow = false, onOliveMount = false, insideCity = false) {
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  if (!n) {
    const target = slow
      ? onOliveMount
        ? 0.68
        : insideCity
          ? 0.72
          : 0.76
      : onOliveMount
        ? 0.84
        : insideCity
          ? 0.9
          : 0.96;
    return Math.min(dpr, target);
  }
  const viewport = getVisibleViewportSize();
  const cssPixels = viewport.width * viewport.height;
  const clearBase = cssPixels > 620000 ? 1.02 : cssPixels > 410000 ? 1.1 : 1.18;
  const scenePenalty = onOliveMount ? 0.08 : insideCity ? 0.05 : 0;
  const slowPenalty = slow ? 0.24 : 0;
  return Math.min(dpr, Math.max(0.82, clearBase - scenePenalty - slowPenalty));
}
let D = "",
  S = !1,
  b = !1,
  G = !1,
  P = !1,
  T = 0,
  L = "sling",
  C = !1,
  k = 0,
  B = Math.PI,
  I = -0.1,
  E = Number(localStorage.getItem("shepherdMouseSensitivity")) || 0.006,
  R = 190,
  V = 135,
  U = 58,
  A = 0;
let startupPromise = null;
let startupComplete = false;
const F = [
    { name: "기본 시점", distance: 190, height: 135, fov: 58 },
    { name: "사람 확대 시점", distance: 95, height: 105, fov: 52 },
    { name: "눈 시점", distance: 0, height: 77, fov: 64, firstPerson: !0 },
    { name: "원거리 시점", distance: 335, height: 205, fov: 61 },
  ],
  W = 1900,
  q = [];
let N = !1,
  O = 0,
  j = 0,
  H = !1;
const K = {},
  X = 7600;
updateOrientationGate();
let Z = new t.Vector3(-1150, 0, 1050),
  Y = "",
  templeObjText = "",
  templeObjPromise = null,
  firstTempleModelPromise = null,
  firstTempleModelTemplate = null,
  pendingFirstTemplePlacement = null,
  lionModelPromise = null,
  lionModelTemplate = null,
  foxModelPromise = null,
  foxModelTemplate = null,
  wolfModelPromise = null,
  wolfModelTemplate = null,
  sheepModelPromise = null,
  sheepModelTemplate = null,
  banditModelPromise = null,
  banditModelTemplate = null,
  kohenModelPromise = null,
  kohenModelTemplate = null,
  cityBoyModelPromise = null,
  cityBoyModelTemplate = null,
  cityBoy1ModelPromise = null,
  cityBoy1ModelTemplate = null,
  cityGirlModelPromise = null,
  cityGirlModelTemplate = null,
  cityGirl1ModelPromise = null,
  cityGirl1ModelTemplate = null,
  guardModelPromise = null,
  guardModelTemplate = null,
  oliveTreeModelPromise = null,
  oliveTreeModelTemplate = null,
  datePalmModelPromise = null,
  datePalmModelTemplate = null,
  houseModelTemplates = null,
  datePalmPlacements = [],
  _ = null,
  J = null,
  Q = null,
  $ = 1,
  tt = null,
  et = 0,
  ot = 0,
  nt = !1,
  st = [],
  at = {
    active: !1,
    shotsLeft: 0,
    hit: !1,
    target: null,
    previousCameraMode: 0,
  },
  it = 0,
  rt = 0,
  ct = !1,
  lt = !1,
  ht = 0,
  dt = null,
  citySheepWaitingForPickup = !1,
  playerWasInsideJerusalem = !1,
  citizensPlayerWasInsideJerusalem = !1,
  cityBanditEmergencyActive = !1,
  templeRecoveryArmed = !0;
const nightWatch = {
  active: !1,
  camp: new t.Vector3(),
  startedAt: 0,
  lastPhase: "",
  sheepLocked: !1,
};
const lightingPerformance = {
  nextTorchUpdateAt: 0,
  nextSunShadowUpdateAt: 0,
  maxLocalPointLights: n ? 1 : 2,
  torchLightDistance: n ? 520 : 680,
  torchVisualDistance: n ? 1450 : 1800,
  sunShadowEnabled: !n,
};
const combatFeedback = {
  shakeUntil: 0,
  shakeDuration: 0,
  shakeStrength: 0,
  lastDamagePulseAt: 0,
};
const specialSlingAttack = {
  active: false,
  target: null,
  targetLocked: false,
  aimDirection: new t.Vector3(0, 0, 1),
  startedAt: 0,
  charge: 0,
  released: false,
  projectile: null,
  energyGroup: null,
  heldStone: null,
  cameraStart: new t.Vector3(),
  previousFov: 58,
  // The source animation reaches its throwing pose at roughly 1.48 seconds.
  // The charging half is deliberately played at 0.5x speed, holding the
  // front-facing cinematic for nearly three seconds before the rear cut.
  cameraSwitchAt: 2750,
  releaseAt: 2960,
  endAt: 4380,
};
const SPECIAL_SLING_CHANCE = 0.07;
const routeChoice = {
  id: "",
  name: "",
  spawnMultiplier: 1,
  rewardRespect: 0,
  lastNoticeAt: 0,
};
const southernJerusalemUpgrade = {
  created: false,
  roads: [],
  houses: [],
  detailedGroup: null,
  proceduralGroup: null,
  detailedVisible: false,
  projectileColliders: new Set(["building", "wall", "temple", "temple-wall", "jerusalem-map"]),
};
const pt = 33,
  ut = {
    hp: 100,
    stones: 15,
    quality: "좋은 돌",
    money: 0,
    respect: 0,
    invincible: !1,
    skill: 0,
    missionDone: !1,
    cheatUsed: !1,
    thirst: 100,
    thirstFailed: !1,
    flockLost: !1,
    worldTime: 0.29,
  },
  mt = {
    player: null,
    sheep: [],
    rocks: [],
    enemies: [],
    projectiles: [],
    effects: [],
    npcs: [],
    terrain: null,
    goal: null,
    goalSite: null,
    campStoneFar: null,
    campStoneNear: null,
    campStonePlacements: [],
    aimRig: null,
    jordan: null,
    deadSea: null,
    gihon: null,
    practiceTarget: null,
    cityTorches: [],
    staffNightLight: null,
    templeNightLight: null,
    stars: null,
    eastPanorama: null,
    datePalmGrove: null,
    southGateGuard: null,
    kohen: null,
    cityCitizens: [],
    cityCitizensLoading: false,
  },
  ft = { x: 1065, z: 300, r: 145 },
  wt = new t.Vector3(),
  Mt = new t.Vector3(),
  yt = -2050,
  xt = 540,
  gt = 460;
let vt = null;
function zt(t, e, o = 0) {
  return Math.abs(t - 260) < xt + o && Math.abs(e - yt) < gt + o;
}
function Dt(t) {
  o.forEach((e) => e.classList.toggle("active", e.id === t));
}
const CAMP_SUCCESS_AD_CHANCE = 0.33;
async function requestMobileInterstitial(placement) {
  if (!n) return false;
  try {
    return !!(await window.GameDistributionBridge?.showInterstitial?.(placement));
  } catch (error) {
    console.warn("Mobile ad hook skipped:", error);
    return false;
  }
}
async function startGameWithDistributionAd(continueFromSave) {
  await requestLandscapeMode();
  if (continueFromSave) {
    await ensureSaveStorageReady();
    await requestMobileInterstitial("saved-game-reopen");
  }
  return At(continueFromSave);
}
(e("#startBtn").onclick = async () => {
  await requestLandscapeMode();
  Dt("characterScreen");
}),
  (e("#continueBtn").onclick = () => {
    startGameWithDistributionAd(!0);
  }),
  (e("#playBtn").onclick = () => {
    startGameWithDistributionAd(!1);
  }),
  (e("#davidCard").onclick = () => {
    startGameWithDistributionAd(!1);
  }),
  (e("#settingsBtn").onclick = () => Pt(!1));
const St = e("#soundEnabled");
St.checked = y;
const bt = e("#volumeRange"),
  Gt = e("#volumeValue");
function Pt(o = !0) {
  const n = e("#sensitivityRange");
  var s;
  (n.value = String(
    ((s = E), Math.round(t.MathUtils.clamp(s / 1e-4, 10, 100))),
  )),
    (e("#sensitivityValue").textContent = n.value),
    (e("#settingsPanel").dataset.fromPause = o ? "1" : "0"),
    document.body.classList.toggle("title-settings-open", !o && !S),
    e("#settingsPanel").classList.remove("hidden"),
    S && ((b = !0), document.exitPointerLock?.()),
    setTimeout(() => ke(e("#settingsPanel"), 0), 0);
}
function Tt() {
  e("#settingsPanel").classList.add("hidden");
  const t = "1" === e("#settingsPanel").dataset.fromPause;
  document.body.classList.remove("title-settings-open");
  S &&
    (t
      ? (e("#pause").classList.remove("hidden"), (b = !0))
      : ((b = !1), n || c?.domElement.requestPointerLock?.()));
}
function openKeyGuide() {
  e("#settingsPanel").classList.add("hidden");
  e("#keyGuidePanel").classList.remove("hidden");
  setTimeout(() => ke(e("#keyGuidePanel"), 0), 0);
}
function closeKeyGuide() {
  e("#keyGuidePanel").classList.add("hidden");
  e("#settingsPanel").classList.remove("hidden");
  setTimeout(() => ke(e("#settingsPanel"), 0), 0);
}
(bt.value = Math.round(100 * v)),
  (Gt.textContent = bt.value),
  e("#sensitivityRange").addEventListener("input", (t) => {
    var o;
    (o = t.target.value),
      (E = 1e-4 * Number(o)),
      (e("#sensitivityValue").textContent = t.target.value),
      localStorage.setItem("shepherdMouseSensitivity", String(E));
  }),
  (e("#settingsCloseBtn").onclick = Tt),
  (e("#keyGuideBtn").onclick = openKeyGuide),
  (e("#keyGuideCloseBtn").onclick = closeKeyGuide),
  St.addEventListener("change", () => {
    (y = St.checked),
      localStorage.setItem("shepherdSoundEnabled", y ? "1" : "0"),
      Rt(),
      m?.resume?.(),
      Vt(y),
      Ct(),
      y && setTimeout(() => Ut(620, 0.12, 0.07, "sine", 180), 80);
  }),
  bt.addEventListener("input", () => {
    (v = Number(bt.value) / 100),
      (Gt.textContent = bt.value),
      localStorage.setItem("shepherdVolume", String(bt.value)),
      Rt(),
      m?.resume?.(),
      Vt(y),
      Ct(),
      y && Ut(520, 0.05, 0.025, "sine", 60);
  }),
  (function bindPauseSoundControls() {
    const pauseSound = e("#pauseSoundEnabled");
    const pauseVolume = e("#pauseVolumeRange");
    const pauseVolumeValue = e("#pauseVolumeValue");
    if (!pauseSound || !pauseVolume || !pauseVolumeValue) return;
    pauseSound.checked = y;
    pauseVolume.value = bt.value;
    pauseVolumeValue.textContent = bt.value;
    pauseSound.addEventListener("change", () => {
      St.checked = pauseSound.checked;
      St.dispatchEvent(new Event("change", { bubbles: true }));
    });
    pauseVolume.addEventListener("input", () => {
      bt.value = pauseVolume.value;
      pauseVolumeValue.textContent = pauseVolume.value;
      bt.dispatchEvent(new Event("input", { bubbles: true }));
    });
  })(),
  (e("#pauseSettingsBtn").onclick = () => {
    e("#pause").classList.add("hidden"), Pt(!0);
  });
const Lt = {
  wind: new Audio("./assets/audio/wind.wav"),
  birds: new Audio("./assets/audio/day_birds.wav"),
  night: new Audio("./assets/audio/night_insects.wav"),
  pickup: new Audio("./assets/audio/pickup.wav"),
  mission: new Audio("./assets/audio/mission.wav"),
  danger: new Audio("./assets/audio/danger.wav"),
  staff: new Audio("./assets/audio/staff.wav"),
  sheep: [
    new Audio("./assets/audio/sheep1.mp3"),
    new Audio("./assets/audio/sheep2.mp3"),
    new Audio("./assets/audio/sheep3.mp3"),
    new Audio("./assets/audio/sheep4.mp3"),
  ],
};
Lt.sheep.forEach((audio) => {
  audio.preload = "auto";
  audio.addEventListener("error", () => {
    audio.dataset.unavailable = "1";
  });
  audio.addEventListener("canplaythrough", () => {
    delete audio.dataset.unavailable;
  });
});
let currentSheepBleatAudio = null;
function Ct() {
  const t = y ? v : 0;
  (Lt.wind.volume = 0.45 * t),
    (Lt.birds.volume = 0.55 * t),
    (Lt.night.volume = 0.45 * t),
    (Lt.pickup.volume = 0.8 * t),
    (Lt.mission.volume = 0.85 * t),
    (Lt.danger.volume = 0.92 * t),
    (Lt.staff.volume = 0.7 * t),
    Lt.sheep.forEach((e) => (e.volume = 0.55 * t));
}
function kt(t) {
  if (!y) return;
  if ("sheep" === t) {
    const playAvailableBleat = (attempt = 0) => {
      try {
        currentSheepBleatAudio &&
          (currentSheepBleatAudio.pause(),
          (currentSheepBleatAudio.currentTime = 0));
        const available = Lt.sheep.filter(
          (audio) => audio.dataset.unavailable !== "1",
        );
        if (!available.length || attempt >= Lt.sheep.length) return;
        const audio = available[Math.floor(Math.random() * available.length)];
        currentSheepBleatAudio = audio;
        audio.currentTime = 0;
        audio.play().catch(() => {
          audio.dataset.unavailable = "1";
          playAvailableBleat(attempt + 1);
        });
      } catch {}
    };
    playAvailableBleat();
    return;
  }
  const e = Lt[t];
  if (e)
    try {
      (e.currentTime = 0), e.play();
    } catch {}
}
function Bt() {
  m && "suspended" === m.state && m.resume().catch(() => {}), y && It();
}
function It() {
  if (!y) return Lt.wind.pause(), Lt.birds.pause(), void Lt.night.pause();
  Lt.wind.paused && Lt.wind.play().catch(() => {});
  const t = Ze(ut.worldTime).name;
  ["아침", "점심", "오후"].includes(t)
    ? (Lt.night.pause(), Lt.birds.paused && Lt.birds.play().catch(() => {}))
    : "밤" === t
      ? (Lt.birds.pause(), Lt.night.paused && Lt.night.play().catch(() => {}))
      : (Lt.birds.pause(), Lt.night.pause());
}
async function Et() {
  if ((Rt(), m))
    try {
      "running" !== m.state && (await m.resume()), Vt(y);
    } catch {}
}
function Rt() {
  if (m) return;
  const t = window.AudioContext || window.webkitAudioContext;
  if (!t) return;
  (m = new t()),
    (M = m.createGain()),
    (M.gain.value = y ? Math.max(0.12, v) : 0),
    M.connect(m.destination);
  const e = 2 * m.sampleRate,
    o = m.createBuffer(1, e, m.sampleRate),
    n = o.getChannelData(0);
  for (let t = 0; t < e; t++)
    n[t] = (2 * Math.random() - 1) * (0.65 - Math.min(0.55, (t / e) * 0.25));
  (f = m.createBufferSource()), (f.buffer = o), (f.loop = !0);
  const s = m.createBiquadFilter();
  (s.type = "lowpass"),
    (s.frequency.value = 650),
    (s.Q.value = 0.25),
    (w = m.createGain()),
    (w.gain.value = 0.22),
    f.connect(s).connect(w).connect(M),
    f.start();
}
function Vt(t) {
  m &&
    M &&
    (M.gain.cancelScheduledValues(m.currentTime),
    M.gain.linearRampToValueAtTime(
      t ? Math.max(0.12, v) : 0,
      m.currentTime + 0.15,
    ));
}
function pauseAllGameAudio() {
  const audioTracks = [
    Lt.wind,
    Lt.birds,
    Lt.night,
    Lt.pickup,
    Lt.mission,
    Lt.danger,
    Lt.staff,
    ...Lt.sheep,
  ];
  audioTracks.forEach((audio) => {
    try {
      audio.pause();
    } catch {}
  });
  if (m && m.state === "running") m.suspend().catch(() => {});
}
function Ut(t = 440, e = 0.12, o = 0.05, n = "sine", s = 0) {
  if (!y) return;
  if ((Rt(), !m || !M)) return;
  const a = m.createOscillator(),
    i = m.createGain();
  (a.type = n),
    a.frequency.setValueAtTime(t, m.currentTime),
    s &&
      a.frequency.exponentialRampToValueAtTime(
        Math.max(30, t + s),
        m.currentTime + e,
      ),
    i.gain.setValueAtTime(1e-4, m.currentTime),
    i.gain.exponentialRampToValueAtTime(o, m.currentTime + 0.015),
    i.gain.exponentialRampToValueAtTime(1e-4, m.currentTime + e),
    a.connect(i).connect(M),
    a.start(),
    a.stop(m.currentTime + e + 0.02);
}

function createWildernessTexture() {
  const texture = new t.TextureLoader().load(
    "assets/terrain/judean_wilderness_diffuse_2k.jpg",
  );
  texture.wrapS = texture.wrapT = t.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = t.SRGBColorSpace;
  texture.anisotropy = Math.min(8, c?.capabilities?.getMaxAnisotropy?.() || 1);
  return texture;
}

function createWildernessNormalTexture() {
  const texture = new t.TextureLoader().load(
    "assets/terrain/judean_wilderness_normal_1k.jpg",
  );
  texture.wrapS = texture.wrapT = t.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = t.NoColorSpace;
  texture.anisotropy = Math.min(4, c?.capabilities?.getMaxAnisotropy?.() || 1);
  return texture;
}
function parseTempleObj(text) {
  const vertices = [];
  const groupedPositions = new Map();
  let currentGroup = "TempleMain";
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  const positionsFor = (name) => {
    if (!groupedPositions.has(name)) groupedPositions.set(name, []);
    return groupedPositions.get(name);
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts[0] === "v" && parts.length >= 4) {
      const vertex = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
      vertices.push(vertex);
      minX = Math.min(minX, vertex[0]);
      minY = Math.min(minY, vertex[1]);
      minZ = Math.min(minZ, vertex[2]);
      maxX = Math.max(maxX, vertex[0]);
      maxY = Math.max(maxY, vertex[1]);
      maxZ = Math.max(maxZ, vertex[2]);
    } else if ((parts[0] === "g" || parts[0] === "o") && parts.length >= 2) {
      currentGroup = parts.slice(1).join("_") || "TempleMain";
    } else if (parts[0] === "f" && parts.length >= 4) {
      const face = parts.slice(1).map((token) => {
        const value = Number(token.split("/")[0]);
        return value < 0 ? vertices.length + value : value - 1;
      });
      const positions = positionsFor(currentGroup);
      for (let k = 1; k < face.length - 1; k++) {
        for (const index of [face[0], face[k], face[k + 1]]) {
          const v = vertices[index];
          if (v) positions.push(v[0], v[1], v[2]);
        }
      }
    }
  }

  const meshes = [];
  const centerX = (minX + maxX) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  for (const [name, positions] of groupedPositions) {
    if (positions.length < 9) continue;
    const geometry = new t.BufferGeometry();
    geometry.setAttribute("position", new t.Float32BufferAttribute(positions, 3));
    geometry.translate(-centerX, -minY, -centerZ);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    meshes.push({ name, geometry });
  }

  if (!meshes.length)
    throw new Error("성전 OBJ에 유효한 면 데이터가 없습니다.");

  return {
    meshes,
    size: new t.Vector3(maxX - minX, maxY - minY, maxZ - minZ),
  };
}
function templeMaterialForGroup(name) {
  const lower = name.toLowerCase();
  let color = 0xe8d7b0;
  if (lower.includes("column")) color = 0xd9ad45;
  else if (lower.includes("door")) color = 0x7b4025;
  else if (lower.includes("platform")) color = 0xb99a68;
  else if (lower.includes("wall")) color = 0xd7c29b;
  else if (lower.includes("building")) color = 0xf0dfb7;
  return new t.MeshToonMaterial({
    color,
    flatShading: true,
    gradientMap: xe(),
  });
}
function addImportedTempleModel(parent, courtY) {
  if (!templeObjText) return false;
  try {
    const parsed = parseTempleObj(templeObjText);
    const horizontal = Math.max(parsed.size.x, parsed.size.z, 1);
    const scale = 540 / horizontal;
    const templeGroup = new t.Group();
    templeGroup.name = "ImportedTempleHolyPlace";

    for (const entry of parsed.meshes) {
      const mesh = new t.Mesh(
        entry.geometry,
        templeMaterialForGroup(entry.name),
      );
      mesh.name = entry.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.neverOcclude = true;
      templeGroup.add(mesh);
    }

    templeGroup.scale.setScalar(scale);
    templeGroup.position.set(-210, courtY + 2, 0);
    // The source model's entrance axis now faces east in the game world.
    templeGroup.rotation.y = 0;
    parent.add(templeGroup);
    mt.importedTemple = templeGroup;
    return true;
  } catch (error) {
    console.error("성전 모델 적용 실패:", error);
    return false;
  }
}
const STARTUP_LOADING_MESSAGES = Object.freeze({
  ko: {
    starting: "게임을 준비하고 있습니다…",
    essential: "필수 캐릭터와 양떼를 준비하고 있습니다…",
    world: "유대 광야와 예루샬라임을 만들고 있습니다…",
    graphics: "휴대폰 그래픽을 준비하고 있습니다…",
    finalizing: "양떼와 성 안의 길을 마지막으로 배치하고 있습니다…",
    ready: "준비가 끝났습니다.",
  },
  en: {
    starting: "Preparing the game…",
    essential: "Preparing the flock and essential characters…",
    world: "Building the Judean wilderness and Jerusalem…",
    graphics: "Preparing mobile graphics…",
    finalizing: "Finishing the flock and city routes…",
    ready: "Ready.",
  },
  he: {
    starting: "מכין את המשחק…",
    essential: "מכין את הצאן ואת הדמויות החיוניות…",
    world: "בונה את מדבר יהודה ואת ירושלים…",
    graphics: "מכין את התצוגה לנייד…",
    finalizing: "משלים את הצאן ואת דרכי העיר…",
    ready: "המשחק מוכן.",
  },
});

function loadingMessage(key) {
  const language = document.documentElement.lang?.toLowerCase().startsWith("he")
    ? "he"
    : document.documentElement.lang?.toLowerCase().startsWith("en")
      ? "en"
      : "ko";
  return STARTUP_LOADING_MESSAGES[language][key] || STARTUP_LOADING_MESSAGES.ko[key];
}

function settleWithin(promise, timeoutMs, label) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn(`${label} startup wait ended after ${timeoutMs}ms; continuing with fallback.`);
      resolve(null);
    }, timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.warn(`${label} startup asset skipped:`, error);
        resolve(null);
      },
    );
  });
}

async function loadStartupAssets(setLoadingStage) {
  const davidObjTask = Y
    ? Promise.resolve(Y)
    : (_ ||
        (_ = fetch("./assets/models/david_lowpoly.obj")
          .then((response) => {
            if (!response.ok) throw new Error(`David OBJ ${response.status}`);
            return response.text();
          })
          .then((text) => {
            Y = text;
            return text;
          })
          .catch((error) => {
            console.error("다비드 OBJ 로드 실패:", error);
            Y = "";
            return "";
          })),
      _);

  setLoadingStage(18, "essential");
  if (n) {
    // Everything visible in the opening world is decoded behind the loading
    // overlay. The optimized Temple and vegetation assets are small enough to
    // prepare here, and doing so prevents the obsolete fallback Temple or an
    // empty grove from appearing during play.
    await Promise.allSettled([
      settleWithin(davidObjTask, 10000, "David OBJ"),
      settleWithin(loadSheepModel(), 16000, "Sheep model"),
      settleWithin(loadFirstTempleModel(), 30000, "First Temple"),
      settleWithin(loadOliveTreeModel(), 20000, "Olive tree"),
      settleWithin(loadDatePalmModel(), 20000, "Date palm"),
    ]);
    return;
  }

  const desktopAssets = [
    [davidObjTask, "David OBJ"],
    [loadFirstTempleModel(), "First Temple"],
    [loadLionModel(), "Lion"],
    [loadFoxModel(), "Fox"],
    [loadWolfModel(), "Wolf"],
    [loadSheepModel(), "Sheep"],
    [loadBanditModel(), "Bandit"],
    [loadOliveTreeModel(), "Olive tree"],
    [loadDatePalmModel(), "Date palm"],
    [loadSouthGateGuardModel(), "South gate guard"],
    [loadCityBoy1Model(), "City boy 1"],
    [loadCityBoyModel(), "City boy 2"],
    [loadCityGirl1Model(), "City girl 1"],
    [loadCityGirlModel(), "City girl 2"],
  ];
  await Promise.allSettled(
    desktopAssets.map(([task, label]) => settleWithin(task, 45000, label)),
  );
}

let deferredMobileAssetWarmupStarted = false;
function scheduleDeferredMobileAssetWarmup() {
  if (!n || deferredMobileAssetWarmupStarted) return;
  deferredMobileAssetWarmupStarted = true;
  // Do not decode every possible enemy and citizen immediately after play
  // begins. That background queue competed with rendering for several minutes
  // and was a major source of heat and stutter. Each optional model already
  // loads safely when its actor is actually created or Jerusalem is approached.
}

async function finishStartupWarmup(loadingScreen, loadingBar, loadingPercent, loadingStatus) {
  // Scene construction, shader compilation and the first real frame all happen
  // behind the loading overlay. This prevents the player from entering while
  // the GPU and browser are still settling the newly-created wilderness.
  if (c && i && r) {
    try {
      if (typeof c.compileAsync === "function")
        await settleWithin(c.compileAsync(i, r), IS_MOBILE_DEVICE ? 5500 : 14000, "GPU shader warmup");
      else c.compile(i, r);
    } catch (error) {
      console.warn("Startup shader warmup skipped:", error);
    }
    try {
      c.render(i, r);
    } catch (error) {
      console.warn("First frame render skipped:", error);
    }
    await settleWithin(
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
      1800,
      "First animation frame",
    );
  }
  if (loadingBar) loadingBar.style.width = "97%";
  if (loadingPercent) loadingPercent.textContent = "97%";
  if (loadingStatus) loadingStatus.textContent = loadingMessage("finalizing");
}

async function revealPlayableGame(loadingScreen, loadingBar, loadingPercent, loadingStatus) {
  // The simulation is allowed to render behind the opaque loading screen. Only
  // after two complete frames have run do we expose the controls to the player.
  // This includes the long first-frame work that previously looked like a hang.
  S = true;
  b = false;
  l?.start();
  l?.getDelta();
  await settleWithin(
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
    IS_MOBILE_DEVICE ? 4200 : 2600,
    "Playable first frames",
  );
  try {
    c?.render?.(i, r);
  } catch (error) {
    console.warn("Playable frame verification skipped:", error);
  }
  if (loadingBar) loadingBar.style.width = "100%";
  if (loadingPercent) loadingPercent.textContent = "100%";
  if (loadingStatus) loadingStatus.textContent = loadingMessage("ready");
  await new Promise((resolve) => setTimeout(resolve, 220));
  loadingScreen?.classList.add("hidden");
}

function updateJerusalemBuildingLOD() {
  const detailed = southernJerusalemUpgrade.detailedGroup;
  const procedural = southernJerusalemUpgrade.proceduralGroup;
  // Stable rollback: the lightweight instanced city and procedural palace are
  // the only active building layers at every distance. This prevents an empty
  // near-LOD group from hiding the city when the player approaches Jerusalem.
  southernJerusalemUpgrade.detailedVisible = false;
  if (detailed) detailed.visible = false;
  if (procedural) procedural.visible = true;
  if (mt.davidPalaceDetailed) mt.davidPalaceDetailed.visible = false;
  if (mt.davidPalaceProcedural) mt.davidPalaceProcedural.visible = true;
}

function At(e) {
  if (startupComplete) {
    Dt("gameScreen");
    n || c?.domElement.requestPointerLock?.();
    return Promise.resolve();
  }
  if (startupPromise) return startupPromise;
  b = true;
  const playButton = document.querySelector("#playBtn");
  const davidCard = document.querySelector("#davidCard");
  if (playButton) playButton.disabled = true;
  if (davidCard) davidCard.disabled = true;
  startupPromise = runGameStartup(e)
    .then(() => {
      startupComplete = true;
    })
    .catch((error) => {
      console.error("게임 시작 실패:", error);
      document.querySelector("#gameLoading")?.classList.add("hidden");
      Dt("characterScreen");
      eo("게임을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    })
    .finally(() => {
      b = false;
      startupPromise = null;
      if (playButton) playButton.disabled = false;
      if (davidCard) davidCard.disabled = false;
    });
  return startupPromise;
}

async function runGameStartup(e) {
  const loadingScreen = document.querySelector("#gameLoading");
  const loadingBar = document.querySelector("#loadingBar");
  const loadingPercent = document.querySelector("#loadingPercent");
  const loadingStatus = document.querySelector("#loadingStatus");
  const setLoadingStage = (percent, messageKey) => {
    if (loadingBar) loadingBar.style.width = `${percent}%`;
    if (loadingPercent) loadingPercent.textContent = `${Math.round(percent)}%`;
    if (loadingStatus) loadingStatus.textContent = loadingMessage(messageKey);
  };
  loadingScreen?.classList.remove("hidden");
  setLoadingStage(8, "starting");
  await loadStartupAssets(setLoadingStage),
    (async function () {
      if ((Ct(), y))
        try {
          await Lt.wind.play();
        } catch {}
    })(),
    Et().then(() => {
      y && Ut(520, 0.12, 0.08, "sine", 160);
    }),
    Dt("gameScreen"),
    setLoadingStage(46, "world"),
    c ||
      (function () {
        (i = new t.Scene()),
          (i.background = new t.Color(7846632)),
          // GTA-era low-detail distance treatment: nearby actors stay readable,
          // while terrain and flock members lose contrast progressively in a
          // cheap exponential haze instead of an expensive depth-blur pass.
          (i.fog = new t.FogExp2(13423565, performanceState.distantFogDensity)),
          (r = new t.PerspectiveCamera(
            58,
            innerWidth / innerHeight,
            0.1,
            9e3,
          )),
          (c = new t.WebGLRenderer({
            antialias: !1,
            powerPreference: n ? "low-power" : "high-performance",
            failIfMajorPerformanceCaveat: false,
          })),
          (performanceState.currentPixelRatio = targetPixelRatio(false, false, false)),
          c.setPixelRatio(performanceState.currentPixelRatio),
          c.setSize(innerWidth, innerHeight),
          (c.shadowMap.enabled = !n),
          (c.shadowMap.type = t.BasicShadowMap),
          // The sun completes a cycle over many real minutes. Re-rendering the
          // entire city shadow map every display frame wastes a second city
          // draw with no visible benefit, so refresh it on a measured cadence.
          (c.shadowMap.autoUpdate = !1),
          (c.shadowMap.needsUpdate = !0),
          (c.outputColorSpace = t.SRGBColorSpace),
          (c.toneMapping = t.ACESFilmicToneMapping),
          (c.toneMappingExposure = 1.13),
          a.appendChild(c.domElement),
          (l = new t.Clock()),
          (d = new t.HemisphereLight(13098736, 6243373, 2.2)),
          i.add(d);
        const e = new t.DirectionalLight(16769706, 3);
        (h = e),
          e.position.set(-700, 1200, 500),
          (e.castShadow = !n),
          e.shadow.mapSize.set(512, 512),
          (e.shadow.camera.left = -1300),
          (e.shadow.camera.right = 1300),
          (e.shadow.camera.top = 1300),
          (e.shadow.camera.bottom = -1300),
          i.add(e),
          (function () {
            const e = new t.SphereGeometry(5200, 24, 12),
              o = new t.ShaderMaterial({
                side: t.BackSide,
                depthWrite: !1,
                uniforms: {
                  top: { value: new t.Color(4034513) },
                  middle: { value: new t.Color(7715304) },
                  bottom: { value: new t.Color(13032941) },
                },
                vertexShader:
                  "varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
                fragmentShader:
                  "varying vec3 vPos; uniform vec3 top; uniform vec3 middle; uniform vec3 bottom; void main(){float h=normalize(vPos).y; vec3 c=h>0.15?mix(middle,top,smoothstep(0.15,0.9,h)):mix(bottom,middle,smoothstep(-0.25,0.15,h)); gl_FragColor=vec4(c,1.0);}",
              });
            p = o;
            const n = new t.Mesh(e, o);
            i.add(n);
            // A single GPU draw call supplies the whole star field.  Per-star
            // reveal thresholds let dusk uncover stars gradually without
            // creating lights, meshes, shadows or per-frame object loops.
            const starCount = n ? 140 : 280,
              starPositions = new Float32Array(3 * starCount),
              starColors = new Float32Array(3 * starCount),
              starReveal = new Float32Array(starCount),
              starSizes = new Float32Array(starCount);
            for (let starIndex = 0; starIndex < starCount; starIndex++) {
              const azimuth = Math.random() * Math.PI * 2,
                elevation = 0.08 + Math.pow(Math.random(), 0.72) * 1.34,
                radius = 4700,
                horizontalRadius = Math.cos(elevation) * radius,
                brightness = 0.48 + Math.pow(Math.random(), 2.1) * 0.52;
              starPositions[3 * starIndex] =
                Math.cos(azimuth) * horizontalRadius;
              starPositions[3 * starIndex + 1] =
                Math.sin(elevation) * radius;
              starPositions[3 * starIndex + 2] =
                Math.sin(azimuth) * horizontalRadius;
              starColors[3 * starIndex] = 0.78 * brightness;
              starColors[3 * starIndex + 1] = 0.86 * brightness;
              starColors[3 * starIndex + 2] = brightness;
              starReveal[starIndex] = Math.pow(Math.random(), 0.82);
              starSizes[starIndex] =
                1.45 + Math.pow(Math.random(), 3.2) * 3.4;
            }
            const starGeometry = new t.BufferGeometry();
            starGeometry.setAttribute(
              "position",
              new t.BufferAttribute(starPositions, 3),
            );
            starGeometry.setAttribute(
              "color",
              new t.BufferAttribute(starColors, 3),
            );
            starGeometry.setAttribute(
              "reveal",
              new t.BufferAttribute(starReveal, 1),
            );
            starGeometry.setAttribute(
              "starSize",
              new t.BufferAttribute(starSizes, 1),
            );
            const starMaterial = new t.ShaderMaterial({
              transparent: !0,
              depthWrite: !1,
              blending: t.AdditiveBlending,
              uniforms: {
                revealLimit: { value: 0 },
                starOpacity: { value: 0 },
              },
              vertexShader:
                "attribute vec3 color; attribute float reveal; attribute float starSize; varying vec3 vColor; varying float vReveal; void main(){vColor=color;vReveal=reveal;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=starSize;gl_Position=projectionMatrix*mv;}",
              fragmentShader:
                "uniform float revealLimit; uniform float starOpacity; varying vec3 vColor; varying float vReveal; void main(){if(vReveal>revealLimit)discard;float d=length(gl_PointCoord-vec2(0.5));float a=smoothstep(0.5,0.08,d)*starOpacity;if(a<0.015)discard;gl_FragColor=vec4(vColor,a);}",
            });
            const stars = new t.Points(starGeometry, starMaterial);
            (stars.frustumCulled = !1),
              // Draw after the opaque sky dome; terrain still occludes the
              // points through the normal depth test.
              (stars.renderOrder = 1),
              i.add(stars),
              (mt.stars = stars);
            const s = new t.Mesh(
              new t.CircleGeometry(95, 32),
              new t.MeshBasicMaterial({
                color: 16771250,
                transparent: !0,
                opacity: 0.75,
                depthWrite: !1,
              }),
            );
            s.position.set(-1300, 1150, -2500),
              s.lookAt(0, 300, 0),
              i.add(s),
              (u = s);
          })(),
          (function () {
            const e = new t.PlaneGeometry(X, X, 220, 220);
            e.rotateX(-Math.PI / 2);
            const o = e.attributes.position,
              n = [],
              // Warm pale Jerusalem-limestone palette.  The values stay close
              // to the Western Wall's cream, honey and softly weathered stone
              // range while retaining enough variation to read the terrain.
              s = new t.Color(13352351),
              a = new t.Color(14603193),
              r = new t.Color(11970441),
              c = new t.Color(12563087),
              l = new t.Color(11640713),
              h = new t.Color(15199431),
              d = new t.Color(10853515),
              p = new t.Color(14341809),
              u = new t.Color(12628878);
            for (let e = 0; e < o.count; e++) {
              const i = o.getX(e),
                m = o.getZ(e),
                f = te(i, m);
              o.setY(e, f);
              const w = t.MathUtils.smoothstep(m, -1700, 1700),
                M = t.MathUtils.smoothstep(i, 650, 2800),
                y = 0,
                x =
                  (Math.sin(0.031 * i + 0.017 * m) +
                    Math.cos(0.019 * i - 0.027 * m) +
                    2) /
                  4,
                g = (Math.sin(0.0048 * i) + Math.cos(0.0056 * m) + 2) / 4,
                v =
                  0.58 * g +
                  0.28 * x +
                  ((Math.sin(0.012 * (i + m)) + 1) / 2) * 0.14;
              let z = s.clone().lerp(r, 0.075 * w * (1 - M));
              m > 2500 && z.lerp(c, 0.035 * (1 - M)),
                z.lerp(l, 0.68 * M),
                z.lerp(h, 0.82 * y),
                z.lerp(a, 0.18 + 0.26 * v),
                z.lerp(p, Math.max(0, 0.18 - 0.16 * x)),
                z.lerp(u, Math.max(0, 0.2 * (g - 0.72))),
                x > 0.72 && z.offsetHSL(0, -0.025, 0.025),
                x < 0.24 && z.offsetHSL(0, 0.01, -0.055),
                z.lerp(d, Math.min(0.2, Math.max(0, f / 1450))),
                n.push(z.r, z.g, z.b);
            }
            e.setAttribute("color", new t.Float32BufferAttribute(n, 3)),
              e.computeVertexNormals();
            const m = createWildernessTexture();
            const normalMap = createWildernessNormalTexture();
            const f = new t.MeshStandardMaterial({
                vertexColors: !0,
                flatShading: !0,
                map: m,
                normalMap,
                normalScale: new t.Vector2(0.42, 0.42),
                roughness: 1,
                metalness: 0,
              }),
              w = new t.Mesh(e, f);
            (w.receiveShadow = !0),
              i.add(w),
              (mt.terrain = w),
              (function () {
                const e = ee(210041),
                  o = [ge(9269845), ge(11111269), ge(12624501), ge(7495500)];
                for (let n = 0; n < 140; n++) {
                  const s = 7180 * (e() - 0.5),
                    a = 7180 * (e() - 0.5);
                  if (Kt(s, a, 110) || he(s, a) > 0.62) continue;
                  const r = new t.Mesh(
                    new t.CircleGeometry(9 + 31 * e(), 5 + Math.floor(3 * e())),
                    o[n % o.length],
                  );
                  (r.rotation.x = -Math.PI / 2),
                    (r.rotation.z = e() * Math.PI),
                    r.scale.set(1.5 + 3.5 * e(), 0.6 + 0.55 * e(), 1),
                    r.position.set(s, te(s, a) + 0.34, a),
                    (r.receiveShadow = !0),
                    i.add(r);
                }
                const n = [ge(6246465), ge(7758157), ge(9598810), ge(11571816)];
                for (let o = 0; o < 640; o++) {
                  const s = 7100 * (e() - 0.5),
                    a = 7100 * (e() - 0.5);
                  if (Kt(s, a, 90) || he(s, a) > 0.74) continue;
                  const r = 2.2 + 9.5 * e(),
                    c = r > 8 ? 1 : 0,
                    l = new t.Mesh(
                      new t.IcosahedronGeometry(r, c),
                      n[o % n.length],
                    );
                  l.scale.set(
                    1 + 2.2 * e(),
                    0.28 + 0.55 * e(),
                    0.65 + 1.35 * e(),
                  ),
                    l.rotation.set(
                      0.45 * (e() - 0.5),
                      e() * Math.PI,
                      0.35 * (e() - 0.5),
                    ),
                    l.position.set(s, te(s, a) + 0.23 * r, a),
                    (l.castShadow = !0),
                    (l.receiveShadow = !0),
                    i.add(l);
                }
                for (let o = 0; o < 115; o++) {
                  const s = 6700 * (e() - 0.5),
                    a = 6700 * (e() - 0.5);
                  if (Kt(s, a, 220) || he(s, a) > 0.55) continue;
                  const r = new t.Group(),
                    c = 3 + Math.floor(5 * e());
                  for (let s = 0; s < c; s++) {
                    const a = 7 + 14 * e(),
                      i = new t.Mesh(
                        new t.DodecahedronGeometry(a, 0),
                        n[(o + s) % n.length],
                      );
                    i.scale.set(
                      1.5 + 1.6 * e(),
                      0.35 + 0.42 * e(),
                      0.65 + 0.8 * e(),
                    ),
                      i.position.set(
                        (s - (c - 1) / 2) * (10 + 7 * e()),
                        0.18 * a,
                        12 * (e() - 0.5),
                      ),
                      i.rotation.set(
                        0.3 * (e() - 0.5),
                        e() * Math.PI,
                        0.22 * (e() - 0.5),
                      ),
                      r.add(i);
                  }
                  r.position.set(s, te(s, a) + 0.2, a),
                    (r.rotation.y = e() * Math.PI),
                    i.add(r);
                }
                const s = [ge(10192220), ge(11639404), ge(7759950)],
                  a = [ge(9143401), ge(10327674), ge(7564377)];
                for (let o = 0; o < 520; o++) {
                  const n = 6980 * (e() - 0.5),
                    a = 6980 * (e() - 0.5);
                  if (Kt(n, a, 150) || he(n, a) > 0.5) continue;
                  const r = Math.exp(
                      -((n - 1030 - 70 * Math.sin(0.00125 * (a + 180))) ** 2) /
                        24e4,
                    ),
                    c =
                      0.35 + ((Math.sin(0.006 * n + 0.003 * a) + 1) / 2) * 0.65;
                  if (e() > c * (0.34 + 0.3 * r)) continue;
                  const l = new t.Group(),
                    h = 3 + Math.floor(5 * e());
                  for (let n = 0; n < h; n++) {
                    const a = 5 + 12 * e(),
                      i = new t.Mesh(
                        new t.ConeGeometry(0.6 + 0.8 * e(), a, 4),
                        s[(o + n) % s.length],
                      );
                    i.position.set(7 * (e() - 0.5), 0.5 * a, 7 * (e() - 0.5)),
                      (i.rotation.z = 0.48 * (e() - 0.5)),
                      (i.rotation.x = 0.2 * (e() - 0.5)),
                      l.add(i);
                  }
                  l.position.set(n, te(n, a) + 0.15, a),
                    (l.rotation.y = e() * Math.PI),
                    l.scale.setScalar(0.75 + 0.75 * e()),
                    i.add(l);
                }
                for (let o = 0; o < 190; o++) {
                  const n = 6900 * (e() - 0.5),
                    s = 6900 * (e() - 0.5);
                  if (Kt(n, s, 180) || he(n, s) > 0.42) continue;
                  const r = new t.Group(),
                    c = 4 + Math.floor(5 * e());
                  for (let n = 0; n < c; n++) {
                    const s = new t.Mesh(
                      new t.DodecahedronGeometry(3.2 + 4.8 * e(), 1),
                      a[(o + n) % a.length],
                    );
                    s.scale.set(
                      1.4 + 0.7 * e(),
                      0.35 + 0.25 * e(),
                      1 + 0.5 * e(),
                    ),
                      s.position.set(
                        18 * (e() - 0.5),
                        1.5 + 2 * e(),
                        18 * (e() - 0.5),
                      ),
                      r.add(s);
                  }
                  r.position.set(n, te(n, s) + 0.2, s),
                    (r.rotation.y = e() * Math.PI),
                    i.add(r);
                }
              })();
          })(),
          (function () {
            !(function (e) {
              const { x: o, z: n } = e,
                s = e.wallRX || e.wallR,
                a = e.wallRZ || e.wallR,
                r = new t.Group(),
                c = [ge(10454629), ge(12099192), ge(13810577)],
                l = (ge(6049085), c[1]);
              r.position.set(o, 0, n);
              const h = 132,
                d = [
                  { name: "남문", x: 0, z: a, rot: 0 },
                  { name: "북문", x: 0, z: -a, rot: 0 },
                  { name: "동문", x: s, z: -120, rot: Math.PI / 2 },
                ],
                p = [];
              for (let wallIndex = 0; wallIndex < h; wallIndex++) {
                const e = (wallIndex / h) * Math.PI * 2,
                  o = 1 + 0.035 * Math.sin(3 * e) - 0.018 * Math.cos(5 * e);
                let wallX = Math.sin(e) * s * o,
                  wallZ = Math.cos(e) * a * o;
                // Expand only the north-east city wall toward the Kidron shoulder.
                // The extension stops before the valley and creates a broad interior
                // circulation area beside the Temple Mount without enlarging the west.
                if (wallX > 0 && wallZ < -700) {
                  const northBlend = t.MathUtils.smoothstep(-wallZ, 700, 2350),
                    eastBlend = t.MathUtils.smoothstep(wallX, 0, s);
                  wallX += 330 * northBlend * eastBlend;
                }
                p.push({ a: e, x: wallX, z: wallZ });
              }
              const u = (t, e) =>
                d.some((o) => Math.hypot(t - o.x, e - o.z) < 189);
              for (let e = 0; e < h; e++) {
                const s = p[e],
                  a = p[(e + 1) % h],
                  i = s.a,
                  d = s.x,
                  m = s.z,
                  f = a.x,
                  w = a.z,
                  M = (d + f) / 2,
                  y = (m + w) / 2,
                  x = Math.hypot(f - d, w - m) + 15;
                if (u(M, y)) continue;
                const g = f - d,
                  v = w - m,
                  z = Math.hypot(g, v) || 1,
                  D = -v / z,
                  S = g / z,
                  b = [];
                for (let e = 0; e <= 8; e++) {
                  const s = e / 8,
                    a = t.MathUtils.lerp(d, f, s),
                    i = t.MathUtils.lerp(m, w, s);
                  for (const t of [-52, -26, 0, 26, 52])
                    b.push(te(o + a + D * t, n + i + S * t));
                }
                const G = Math.min(...b),
                  P = Math.max(...b),
                  T = Math.atan2(-v, g),
                  southWallBlend = t.MathUtils.smoothstep(y, 2050, 2760),
                  L = t.MathUtils.lerp(300 + 32 * Math.sin(3 * i), 176, southWallBlend),
                  C = G - 18,
                  k = P + L,
                  B = k - C,
                  I = new t.Mesh(
                    new t.BoxGeometry(x + 24, Math.max(70, P - G + 52), 96),
                    c[0],
                  );
                I.position.set(M, G + Math.max(70, P - G + 52) / 2 - 15, y),
                  (I.rotation.y = T),
                  (I.castShadow = !0),
                  (I.receiveShadow = !0),
                  r.add(I);
                const E = new t.Mesh(new t.BoxGeometry(x + 9, B, 70), l);
                E.position.set(M, C + B / 2, y),
                  (E.rotation.y = T),
                  (E.castShadow = !0),
                  (E.receiveShadow = !0),
                  r.add(E);
                for (let e = 0; e < 8; e++) {
                  const o = C + 42 + (e * (B - 84)) / 7,
                    n = new t.Mesh(
                      new t.BoxGeometry(x + 12, 3.4, 74),
                      e % 2 ? c[0] : c[2],
                    );
                  n.position.set(M, o, y), (n.rotation.y = T), r.add(n);
                }
                const R = (B - 82) / 7;
                for (let e = 0; e < 7; e++) {
                  const o = Math.max(2, Math.round(x / 88));
                  for (let n = 0; n < o; n++) {
                    const s = x / o - 3.5,
                      a = -x / 2 + s / 2 + n * (x / o) + (e % 2 ? 0.34 * s : 0);
                    if (a > x / 2 - s / 3) continue;
                    const i = M + Math.cos(T) * a,
                      l = y - Math.sin(T) * a,
                      h = new t.Mesh(
                        new t.BoxGeometry(s, R - 5, 9.5),
                        c[(e + n) % 3],
                      );
                    h.position.set(i, C + 48 + e * R, l),
                      (h.rotation.y = T),
                      h.translateZ(39.5),
                      (h.castShadow = !0),
                      r.add(h);
                  }
                }
                const V = new t.Mesh(new t.BoxGeometry(x + 14, 12, 104), c[2]);
                if (
                  (V.position.set(M, k - 8, y),
                  (V.rotation.y = T),
                  (V.receiveShadow = !0),
                  r.add(V),
                  de(
                    r,
                    x,
                    k + 4,
                    M,
                    y,
                    T,
                    l,
                    26,
                    34 * Math.sign(M * Math.sin(T) + y * Math.cos(T)),
                  ),
                  Ot(o + M, n + y, 0.72 * x, 50, T, "wall"),
                  e % 15 == 0)
                ) {
                  const e = L + 105,
                    o = 118,
                    n = 122,
                    s = new t.Mesh(new t.BoxGeometry(o, e + (P - G), n), c[2]);
                  s.position.set(M, G + (e + (P - G)) / 2 - 12, y),
                    (s.rotation.y = T),
                    (s.castShadow = !0),
                    (s.receiveShadow = !0),
                    r.add(s),
                    de(
                      r,
                      o,
                      G + e + (P - G) - 12,
                      M,
                      y,
                      T,
                      c[2],
                      27,
                      34 * Math.sign(M * Math.sin(T) + y * Math.cos(T) || 1),
                    );
                }
              }
              for (const t of d) pe(r, o, n, t.x, t.z, 270, l, 0, t.rot, 1);
              (function (e, o, n, s, a, i, r) {
                const c = ee(20260716);
                for (let t = 1; t <= 7; t++) {
                  const o = 8 + 5 * t,
                    n = 0.1 + 0.087 * t;
                  for (let a = 0; a < o; a++) {
                    const l = (a / o) * Math.PI * 2 + (t % 2) * 0.055,
                      h = 610 * Math.sin(l) * n + 30 * (c() - 0.5),
                      d = 1520 * Math.cos(l) * n + 38 * (c() - 0.5);
                    if (!Kt(i + h, r + d, -145)) continue;
                    if (Zt(h, d, 126)) continue;
                    if (zt(i + h, r + d, 175)) continue;
                    // Temple Mount and its eastern access road must contain no houses.
                    if (d < -620) continue;
                    if (h > 170 && d < 120) continue;
                    const p = d > 250;
                    ue(
                      e,
                      h,
                      d,
                      (p ? 78 : 92) + c() * (p ? 52 : 66),
                      (p ? 68 : 82) + c() * (p ? 45 : 58),
                      (p ? 125 : 155) + c() * (p ? 100 : 145),
                      s[(a + t) % s.length],
                      i,
                      r,
                      -l + 0.08 * (c() - 0.5),
                    );
                  }
                }
                const l = new t.MeshToonMaterial({
                  color: 13283722,
                  flatShading: !0,
                });
                for (const [t, o, n] of Xt)
                  zt(i + (t[0] + o[0]) / 2, r + (t[1] + o[1]) / 2, 85) ||
                    me(e, t, o, n, i, r, l);
                const h = [
                  [[0, 1500], [-620, 1320], 62],
                  [[0, 1500], [610, 1340], 62],
                  [[0, 930], [-760, 760], 66],
                  [[0, 930], [760, 760], 66],
                  [[0, 360], [-820, 160], 68],
                  [[0, 360], [760, 120], 70],
                  [[0, -250], [-650, -430], 72],
                ];
                for (const [t, o, n] of h) me(e, t, o, n, i, r, ge(12559742));
              })(r, 0, 0, c, 0, o, n),
                // Restore a dense southern residential quarter while preserving all mapped roads.
                (function (group, materials, cityX, cityZ) {
                  const rnd = ee(2026071903);
                  let placed = 0;
                  // The southern quarter is built by createSouthernJerusalemUpgrade().
                  // Keeping this older random pass as well made the final density depend
                  // on collision-registration order and could paradoxically remove houses.
                  for (let attempt = 0; attempt < 0 && placed < 0; attempt++) {
                    const localX = -650 + rnd() * 1300;
                    const localZ = 300 + rnd() * 1500;
                    const worldX = cityX + localX;
                    const worldZ = cityZ + localZ;
                    if (!Kt(worldX, worldZ, -125)) continue;
                    if (Zt(localX, localZ, 125)) continue;
                    if (zt(worldX, worldZ, 145)) continue;
                    // Keep the Siloam approach and main southern gate plaza open.
                    if (localZ > 1320 && Math.abs(localX) < 190) continue;
                    // Keep the entire northern Temple Mount and curved eastern approach clear.
                    if (localZ < -620) continue;
                    if (localX > 170 && localZ < 140) continue;
                    const width = 62 + rnd() * 54;
                    const depth = 58 + rnd() * 48;
                    const height = 92 + rnd() * 88;
                    const rot = (rnd() - 0.5) * 0.22;
                    // Reject overlaps with already registered houses/walls.
                    if (jt(new t.Vector3(worldX, te(worldX, worldZ) + 4, worldZ), 42)) continue;
                    ue(
                      group,
                      localX,
                      localZ,
                      width,
                      depth,
                      height,
                      materials[placed % materials.length],
                      cityX,
                      cityZ,
                      rot,
                    );
                    placed++;
                  }
                })(r, c, o, n),
                (function (e, o, n, s) {
                  const a = 40,
                    i = -410,
                    r = 720,
                    c = 430,
                    l = [];
                  for (const t of [-360, 0, 360])
                    for (const e of [-215, 0, 215])
                      l.push(te(n + a + t, s + i + e));
                  const h = Math.min(...l),
                    d = Math.max(...l) + 10,
                    p = d - h + 42,
                    u = new t.Mesh(new t.BoxGeometry(810, p, 510), o[0]);
                  u.position.set(a, h + p / 2 - 6, i),
                    (u.castShadow = !0),
                    (u.receiveShadow = !0),
                    e.add(u);
                  const m = new t.Mesh(new t.BoxGeometry(r, 18, c), o[2]);
                  m.position.set(a, d + 9, i), (m.receiveShadow = !0), e.add(m);
                  const f = [
                    [-205, -70, 225, 190, 180],
                    [40, -80, 250, 205, 215],
                    [220, 55, 170, 150, 175],
                    [-95, 100, 230, 135, 165],
                  ];
                  for (const [n, s, r, c, l] of f) {
                    const h = new t.Mesh(new t.BoxGeometry(r, l, c), o[1]);
                    h.position.set(a + n, d + 18 + l / 2, i + s),
                      (h.castShadow = !0),
                      (h.receiveShadow = !0),
                      e.add(h);
                    const p = new t.Mesh(
                      new t.BoxGeometry(r + 10, 10, c + 10),
                      o[2],
                    );
                    p.position.set(a + n, d + 23 + l, i + s), e.add(p);
                  }
                  for (let o = -5; o <= 5; o++) {
                    const n = new t.Mesh(
                      new t.CylinderGeometry(8, 10, 88, 8),
                      ge(14206628),
                    );
                    n.position.set(a + 48 * o, d + 53, -216.5), e.add(n);
                  }
                  Ot(n + a, s + i, 518.4, 0.68 * c, 0, "government");
                })(r, c, o, n),
                (function (e, o, n, s) {
                  const a = new t.Group(),
                    i = -45,
                    r = -1010,
                    c = 600,
                    l = 360,
                    h = [
                      [-300, -180],
                      [300, -180],
                      [-300, 180],
                      [300, 180],
                      [0, 0],
                    ].map(([t, e]) => te(n + i + t, s + r + e)),
                    d = Math.min(...h),
                    p = Math.max(...h) + 12,
                    u = p - d + 35,
                    m = new t.Mesh(new t.BoxGeometry(575, u, 365), o[0]);
                  m.position.set(i, d + u / 2 - 5, r),
                    (m.castShadow = !0),
                    (m.receiveShadow = !0),
                    a.add(m);
                  const f = new t.Mesh(new t.BoxGeometry(c, 14, l), o[2]);
                  f.position.set(i, p + 8, r), (f.receiveShadow = !0), a.add(f);
                  const w = [
                    [-150, 0, 165, 170, 170],
                    [55, -55, 205, 155, 215],
                    [120, 80, 120, 105, 150],
                    [-50, 90, 115, 90, 145],
                  ];
                  for (const [e, n, s, c, l] of w) {
                    const h = new t.Mesh(new t.BoxGeometry(s, l, c), o[1]);
                    h.position.set(i + e, p + 16 + l / 2, r + n),
                      (h.castShadow = !0),
                      (h.receiveShadow = !0),
                      a.add(h);
                    const d = new t.Mesh(
                      new t.BoxGeometry(s + 8, 10, c + 8),
                      o[2],
                    );
                    d.position.set(i + e, p + 21 + l, r + n), a.add(d);
                  }
                  for (let e = -3; e <= 3; e++) {
                    const o = new t.Mesh(
                      new t.CylinderGeometry(9, 11, 105, 8),
                      ge(14272680),
                    );
                    o.position.set(i + 42 * e, p + 68, -844.4),
                      (o.castShadow = !0),
                      a.add(o);
                  }
                  a.name = "DavidPalaceProceduralLOD";
                  mt.davidPalaceProcedural = a;
                  e.add(a);
                  Ot(n + i, s + r, 468, 259.2, 0, "palace");
                })(r, c, o, n),
                (function (e, o, n, s) {
                  const a = 70,
                    i = -2050,
                    r = new t.Group();
                  r.position.set(a, 0, i);
                  const c = 650,
                    l = 520,
                    h = [];
                  for (const t of [-500, -250, 0, 250, 500])
                    for (const e of [-460, -230, 0, 230, 460])
                      h.push($t(n + a + t, s + i + e));
                  // Keep the court only slightly above the natural summit. The previous
                  // max+18 calculation forced a visible artificial pedestal.
                  const summitAverage = h.reduce((sum, value) => sum + value, 0) / h.length,
                    d = t.MathUtils.clamp(summitAverage + 2, 166, 178),
                    p = [
                      { x: n + 360, z: s - 720 },
                      { x: n + 470, z: s - 980 },
                      { x: n + 590, z: s - 1240 },
                      { x: n + 670, z: s - 1480 },
                      { x: n + 690, z: s - 1700 },
                      { x: n + 700, z: s - 1880 },
                      { x: n + a + c, z: s + i },
                    ];
                  dt = {
                    points: p,
                    halfWidth: 410,
                    courtY: d,
                    startY: $t(p[0].x, p[0].z) + 2,
                    steps: 0,
                    courtXMin: n + a - c,
                    courtXMax: n + a + c,
                    courtZMin: s + i - l,
                    courtZMax: s + i + l,
                    courtSurfaceY: d + 4,
                    // Bounds measured from first_temple_game.glb after applying
                    // the exact runtime rotation and non-uniform scale.
                    altarX: n + a + 270,
                    altarZ: s + i - 275,
                    altarHalfX: 30,
                    altarHalfZ: 35,
                    altarTopY: d + 41.65,
                    altarRampXMin: n + a + 250,
                    altarRampXMax: n + a + 290,
                    altarRampZMin: s + i - 240,
                    altarRampZMax: s + i - 180,
                    altarRampSteps: 5,
                    templeStageXMin: n + a - 345,
                    templeStageXMax: n + a + 90,
                    templeStageZMin: s + i - 205,
                    templeStageZMax: s + i + 15,
                    templeStageTopY: d + 58.43,
                    templeStageRampXMin: n + a + 90,
                    templeStageRampXMax: n + a + 155,
                    templeStageRampZMin: s + i - 105,
                    templeStageRampZMax: s + i + 5,
                    templeStageSteps: 10,
                  };
                  if (mt.terrain?.geometry?.attributes?.position) {
                    const e = mt.terrain.geometry.attributes.position;
                    // Rebuild the visible terrain from the same height function used by
                    // player/animal movement. This prevents the eastern approach from
                    // visually or physically dropping below the ground.
                    for (let t = 0; t < e.count; t++) {
                      const terrainX = e.getX(t), terrainZ = e.getZ(t);
                      const underTempleCourt =
                        terrainX >= dt.courtXMin &&
                        terrainX <= dt.courtXMax &&
                        terrainZ >= dt.courtZMin &&
                        terrainZ <= dt.courtZMax;
                      // The visible terrain is deliberately recessed below the marble slab.
                      // Player/animal movement still uses the exact marble surface height via te().
                      // This separation removes z-fighting, brown ridge bleed-through and pits.
                      e.setY(t, underTempleCourt ? d - 3 : te(terrainX, terrainZ));
                    }
                    e.needsUpdate = true;
                    mt.terrain.geometry.computeVertexNormals();
                    mt.terrain.geometry.computeBoundingSphere();
                  }
                  const templeMarble = new t.MeshToonMaterial({
                    color: 15790320,
                    flatShading: !0,
                  });
                  // The temple court is now cut directly into the summit terrain.
                  // Keep only a shallow buried footing instead of a raised platform.
                  const foundationBase = d - 4;
                  const foundationHeight = 4;
                  const foundation = new t.Mesh(
                    new t.BoxGeometry(1300, foundationHeight, 1040),
                    o[0],
                  );
                  foundation.position.set(0, foundationBase + foundationHeight / 2, 0);
                  foundation.castShadow = true;
                  foundation.receiveShadow = true;
                  r.add(foundation);
                  // One continuous marble slab covers the entire court. A shallow box is
                  // used instead of a single plane so the floor never flickers or reveals
                  // terrain cracks when the camera is close to the surface.
                  const u = new t.Mesh(
                    new t.BoxGeometry(1312, 8, 1052),
                    templeMarble,
                  );
                  u.position.y = d;
                  u.receiveShadow = !0;
                  u.castShadow = !1;
                  r.add(u);
                  // The court is intentionally open. Do not rebuild the obsolete
                  // procedural perimeter, gate lintel, piers or entry lip around the
                  // purchased columned court: from outside those meshes read as a
                  // solid closed wall and no longer match the visible architecture.
                  const y = -210,
                    x = new t.Mesh(new t.BoxGeometry(420, 430, 320), o[2]);
                  x.position.set(-315, d + 239, 0),
                    (x.castShadow = !0),
                    (x.receiveShadow = !0),
                    r.add(x);
                  const g = new t.Mesh(new t.BoxGeometry(295, 165, 270), o[1]);
                  g.position.set(-375, d + 520, 0),
                    (g.castShadow = !0),
                    (g.visible = !1),
                    r.add(g);
                  const v = new t.Mesh(new t.BoxGeometry(124, 490, 410), o[0]);
                  v.position.set(-35, d + 265, 0),
                    (v.castShadow = !0),
                    r.add(v);
                  const z = ge(12819259),
                    D = ge(7033909);
                  for (const e of [-112, 112]) {
                    const o = new t.Mesh(
                      new t.CylinderGeometry(23, 29, 372, 12),
                      z,
                    );
                    o.position.set(35, d + 212, e),
                      (o.castShadow = !0),
                      r.add(o);
                    const n = new t.Mesh(
                      new t.CylinderGeometry(36, 29, 36, 12),
                      z,
                    );
                    n.position.set(35, d + 415, e), r.add(n);
                  }
                  const S = new t.Mesh(new t.BoxGeometry(8, 245, 120), D);
                  S.position.set(28, d + 212, 0),
                    r.add(S),
                    // Collision proxy for the purchased sanctuary's closed rear body.
                    // The former 350 x 330 box covered the entrance landing and caused
                    // an invisible block in the middle of the doors.  Keep the entire
                    // eastern stair and landing open; only the masonry behind them blocks.
                    Ot(
                      n + a - 125,
                      s + i - 30,
                      190,
                      310,
                      0,
                      "temple",
                      d + 4,
                      d + 620,
                    );
                  const b = 255,
                    altarLocalZ = -265,
                    G = 184,
                    P = ge(9332808),
                    T = d + 2 + 105,
                    L = new t.Mesh(new t.BoxGeometry(170, 105, G), P);
                  L.position.set(b, d + 2 + 52.5, altarLocalZ),
                    (L.castShadow = !0),
                    (L.receiveShadow = !0),
                    r.add(L);
                  const C = new t.BufferGeometry(),
                    k = d + 3,
                    B = T - 2;
                  C.setAttribute(
                    "position",
                    new t.Float32BufferAttribute(
                      [
                        125,
                        k,
                        250,
                        285,
                        k,
                        250,
                        125,
                        B,
                        90,
                        285,
                        B,
                        90,
                        125,
                        k,
                        90,
                        285,
                        k,
                        90,
                      ],
                      3,
                    ),
                  ),
                    C.setIndex([
                      0, 1, 2, 1, 3, 2, 0, 2, 4, 1, 5, 3, 2, 3, 4, 3, 5, 4,
                    ]),
                    C.computeVertexNormals();
                  const I = new t.Mesh(C, P);
                  (I.castShadow = !0), (I.receiveShadow = !0), r.add(I);
                  // Keep the original lightweight altar until the cleaned GLB is ready,
                  // then replace only its visible body and ramp. Fire and smoke below
                  // remain separate effects and therefore survive the replacement.
                  // The purchased full-scene temple includes its own altar and
                  // approach. Keep these lightweight meshes only as a fallback
                  // if the new GLB cannot be loaded.
                  // Replace every hidden procedural visual with the purchased model
                  // before creating live effects. Fire, smoke and the laver are added
                  // afterwards so loading the temple can never hide them again.
                  const templeFallbackChildren = [...r.children].filter(
                    (child) => !child.isLight,
                  );
                  if (
                    !addPurchasedFirstTemple(
                      r,
                      d,
                      n + a,
                      s + i,
                      templeFallbackChildren,
                    )
                  ) {
                    // On mobile the 28 MB sanctuary mesh is intentionally
                    // decoded after play begins. Preserve exactly the old
                    // fallback children so the late swap cannot remove fire,
                    // smoke, the laver or other effects added below.
                    pendingFirstTemplePlacement = {
                      parent: r,
                      courtY: d,
                      worldCenterX: n + a,
                      worldCenterZ: s + i,
                      removableChildren: templeFallbackChildren,
                    };
                  }
                  // addPurchasedFirstTemple removes the old visual construction, so
                  // its old collision proxies must not survive invisibly. Rebuild the
                  // collision set from the two actual solid bodies only.
                  for (let colliderIndex = z.length - 1; colliderIndex >= 0; colliderIndex--)
                    if (z[colliderIndex].type === "temple") z.splice(colliderIndex, 1);
                  collisionRevision++;
                  // Sanctuary masonry stops before the measured landing and stair.
                  Ot(n + a - 125, s + i - 95, 190, 220, 0, "temple", d + 58, d + 620);
                  // Altar: three thin faces stay exactly on the measured 60 x 80 body.
                  // The entire stair side remains open, with no enlarged flank boxes.
                  Ot(dt.altarX - dt.altarHalfX + 3, dt.altarZ, 6, dt.altarHalfZ * 2, 0, "temple", d + 2, dt.altarTopY);
                  Ot(dt.altarX + dt.altarHalfX - 3, dt.altarZ, 6, dt.altarHalfZ * 2, 0, "temple", d + 2, dt.altarTopY);
                  Ot(dt.altarX, dt.altarZ - dt.altarHalfZ + 3, dt.altarHalfX * 2, 6, 0, "temple", d + 2, dt.altarTopY);
                  const V = new t.Group();
                  // Flame spread is derived from the current altar footprint, so it
                  // remains centred and proportionate if the court is resized again.
                  const flameSpreadX = dt.altarHalfX * 0.46;
                  const flameSpreadZ = dt.altarHalfZ * 0.28;
                  const altarFireY = dt.altarTopY + 10;
                  for (let e = 0; e < 4; e++) {
                    const column = e % 2;
                    const row = Math.floor(e / 2);
                    const o = new t.MeshBasicMaterial({
                        color: e % 3 === 0 ? 16772125 : e % 2 ? 16757051 : 16735008,
                        transparent: !0,
                        opacity: 0.82,
                        depthWrite: !1,
                      }),
                      n = new t.Mesh(
                        new t.ConeGeometry(
                          10 + (e % 2) * 3,
                          30 + (e % 2) * 6,
                          6,
                        ),
                        o,
                      );
                    n.position.set(
                      b + t.MathUtils.lerp(-flameSpreadX, flameSpreadX, column),
                      altarFireY + (e % 2) * 2,
                      altarLocalZ + t.MathUtils.lerp(-flameSpreadZ, flameSpreadZ, row),
                    ),
                      (n.rotation.y = 0.61 * e),
                      (n.userData.phase = 0.73 * e),
                      (n.userData.baseY = n.position.y),
                      V.add(n);
                  }
                  r.add(V), (mt.templeFlames = V);
                  // One shadow-free light keeps the Temple readable at night.
                  // It is enabled only while David is near the Temple Mount.
                  const templeNightLight = new t.PointLight(
                    16765872,
                    0,
                    980,
                    1.45,
                  );
                  templeNightLight.position.set(-170, d + 255, 0);
                  templeNightLight.castShadow = false;
                  r.add(templeNightLight);
                  mt.templeNightLight = templeNightLight;
                  // Restore the earlier continuous white translucent smoke pillar.
                  // Its lower edge begins directly over the fire and its tapered body
                  // continues beyond the visible sky ceiling without puff clusters.
                  const smokeHeight = 16000;
                  const smokeMaterial = new t.MeshBasicMaterial({
                    color: 0xf3f1e8,
                    transparent: !0,
                    opacity: 0.105,
                    depthWrite: !1,
                    side: t.DoubleSide,
                  });
                  const A = new t.Mesh(
                    new t.CylinderGeometry(48, 30, smokeHeight, 10, 1, true),
                    smokeMaterial,
                  );
                  A.name = "TempleAltarContinuousSmokeColumn";
                  A.position.set(
                    b,
                    altarFireY + 28 + smokeHeight / 2,
                    altarLocalZ,
                  );
                  A.userData.baseX = A.position.x;
                  A.userData.baseZ = A.position.z;
                  r.add(A), (mt.templeSmoke = A);
                  // Do not recreate the later procedural bronze basin. The purchased
                  // model contains the original authored laver restored in the GLB.
                  e.add(r);
                })(r, c, o, n);
              const m = ge(13086339),
                f = [
                  [[s - 135, 120], [330, -320], 84],
                  [[330, -320], [260, -1030], 92],
                ];
              for (const [t, e, s] of f) me(r, t, e, s, o, n, m);
              (function (e, o, n) {
                const candidates = [];
                for (const [start, end, width] of Xt) {
                  const dx = end[0] - start[0];
                  const dz = end[1] - start[1];
                  const length = Math.hypot(dx, dz);
                  const count = Math.max(1, Math.floor(length / 330));
                  for (let index = 0; index <= count; index++) {
                    const amount = index / count;
                    const cx = t.MathUtils.lerp(start[0], end[0], amount);
                    const cz = t.MathUtils.lerp(start[1], end[1], amount);
                    const side = (index + candidates.length) % 2 ? 1 : -1;
                    const offset = Math.min(34, Math.max(22, width * 0.36));
                    candidates.push([
                      cx - (dz / (length || 1)) * offset * side,
                      cz + (dx / (length || 1)) * offset * side,
                    ]);
                  }
                }
                const accepted = [];
                for (const [a, i] of candidates) {
                  const worldX = o + a;
                  const worldZ = n + i;
                  if (
                    !Kt(worldX, worldZ, -130) ||
                    jt(new t.Vector3(worldX, te(worldX, worldZ) + 36, worldZ), 14) ||
                    accepted.some(([x, z]) => Math.hypot(x - a, z - i) < 170)
                  ) continue;
                  accepted.push([a, i]);
                  fe(e, o, n, a, i);
                }
              })(r, o, n),
                batchJerusalemStaticGeometry(r),
                i.add(r),
                (mt.jerusalem = r);
            })(Ft[0]),
              (function () {
                ge(10125923);
                for (let t = 0; t < 7; t++) {
                  const e = 2480 + 105 * t,
                    o = [];
                  for (let n = -1900; n <= 1700; n += 180)
                    o.push([e + 30 * Math.sin(0.002 * (n + 80 * t)), n]);
                  we(o, 10125923, 12, 0.72);
                }
                // Only the Mount of Olives receives olive trees. The imported
                // model is instanced in several spatial batches so the grove is
                // dense without multiplying geometry, materials, or draw calls.
                createMountOfOlivesGrove();
              })(),
              createDistantMountainHorizon(),
              (function () {
                const e = new t.LineBasicMaterial({
                    color: 5984583,
                    transparent: !0,
                    opacity: 0.75,
                  }),
                  o = new t.Group();
                for (let n = 0; n < 13; n++) {
                  const s = new t.BufferGeometry().setFromPoints([
                      new t.Vector3(-8, 0, 0),
                      new t.Vector3(0, 4, 0),
                      new t.Vector3(8, 0, 0),
                    ]),
                    a = new t.Line(s, e);
                  a.position.set(
                    (n % 5) * 42,
                    25 * Math.floor(n / 5),
                    (n % 3) * 28,
                  ),
                    (a.rotation.y = (n % 4) * 0.25),
                    o.add(a);
                }
                o.position.set(500, 720, -1900),
                  (o.userData.drift = 0),
                  i.add(o),
                  (mt.birds = o);
              })(),
              [
                [-980, -2750, 0.95],
                [-720, -1550, 0.8],
                [520, -1450, 0.85],
                [430, -100, 0.75],
                [-820, 850, 0.8],
                [690, 1820, 0.85],
                [-560, 2520, 0.75],
              ].forEach((t) => oe(...t));
            const e = ee(4401),
              o = [8416601, 9599068, 10849128, 7234390];
            for (let n = 0; n < 300; n++) {
              const s = (e() - 0.5) * X * 0.9,
                a = (e() - 0.5) * X * 0.9;
              if (Yt(s, a, 80)) continue;
              const r = 4 + 16 * e(),
                c = new t.Mesh(new t.DodecahedronGeometry(r, 0), ge(o[n % 4]));
              c.scale.set(0.8 + 0.9 * e(), 0.45 + 0.55 * e(), 0.7 + 1.1 * e()),
                c.position.set(s, te(s, a) + 0.35 * r, a),
                c.rotation.set(e(), e() * Math.PI, e()),
                // Decorative wilderness rocks do not need hundreds of
                // individual sun-shadow submissions.
                (c.castShadow = !1),
                i.add(c);
                // Decorative wilderness rocks no longer create invisible movement blockers.
                // Buildings, walls and trees retain collision, but open ground stays traversable.
              }
            oe(1550, 900, 1.05),
              oe(1900, 250, 0.9),
              oe(-1750, 850, 0.8),
              (function () {
                const { x: e, z: o, r: n } = ft,
                  s = new t.Group(),
                  a = [ge(9403233), ge(11574136), ge(7299150)],
                  r = [];
                for (let t = -2; t <= 2; t++)
                  for (let n = -2; n <= 2; n++)
                    r.push(te(e + 55 * t, o + 55 * n));
                const c = Math.min(...r),
                  l = Math.max(...r) + 3,
                  h = l - c + 38,
                  d = new t.Mesh(new t.CylinderGeometry(128, 150, h, 20), a[2]);
                d.position.set(0, -h / 2 + 8, 0),
                  (d.castShadow = !0),
                  (d.receiveShadow = !0),
                  s.add(d);
                for (let e = 0; e < 18; e++) {
                  const o = (e / 18) * Math.PI * 2,
                    n = 88 + (e % 3) * 5;
                  if (Math.cos(o) < -0.35) continue;
                  const i = new t.Mesh(
                    new t.BoxGeometry(30, 34 + (e % 2) * 8, 44),
                    a[e % 3],
                  );
                  i.position.set(Math.sin(o) * n, 18, Math.cos(o) * n),
                    (i.rotation.y = o),
                    (i.castShadow = !0),
                    s.add(i);
                }
                const p = new t.Mesh(
                  new t.CylinderGeometry(64, 72, 20, 20),
                  a[0],
                );
                (p.position.y = 4), s.add(p);
                const u = new t.Mesh(
                  new t.CircleGeometry(56, 24),
                  new t.MeshToonMaterial({
                    color: 5212048,
                    transparent: !0,
                    opacity: 0.92,
                  }),
                );
                (u.rotation.x = -Math.PI / 2),
                  (u.position.y = 15),
                  s.add(u),
                  s.position.set(e, l, o),
                  i.add(s),
                  (mt.gihon = s),
                  q.push({ x: e, z: o, r: n });
                const m = new t.Group();
                me(m, [840, 110], [915, 165], 52, 0, 0, ge(11836019)),
                  me(m, [915, 165], [990, 230], 48, 0, 0, ge(11836019)),
                  me(m, [990, 230], [1065, 300], 44, 0, 0, ge(11836019)),
                  i.add(m);
              })(),
              (function () {
                // The pool belongs outside the south-east wall on the Kidron
                // shoulder, rather than projecting through the southern gate.
                const poolX = 1035,
                  e = 2380,
                  o = new t.Group(),
                  n = ge(10849385),
                  s = ge(7889999),
                  a = new t.MeshToonMaterial({
                    color: 5212048,
                    transparent: !0,
                    opacity: 0.92,
                    side: t.DoubleSide,
                  }),
                  r = te(poolX, e),
                  c = 18,
                  l = new t.Mesh(new t.BoxGeometry(88, 18, 8), s);
                (l.position.y = -72), (l.receiveShadow = !0), o.add(l);
                // Fill the stepped pool so that only the uppermost stair remains
                // above the water line; the lower six steps are submerged.
                const h = new t.Mesh(new t.PlaneGeometry(304, 224), a);
                (h.rotation.x = -Math.PI / 2), (h.position.y = -7.5), o.add(h);
                for (let e = 0; e < 7; e++) {
                  const s = 9 * -e,
                    a = 340 - e * c * 2,
                    i = 260 - e * c * 2,
                    r = new t.Mesh(new t.BoxGeometry(a, 9, c), n);
                  r.position.set(0, s, i / 2 - 9), o.add(r);
                  const l = r.clone();
                  (l.position.z = -i / 2 + 9), o.add(l);
                  const h = Math.max(20, i - 36),
                    d = new t.Mesh(new t.BoxGeometry(c, 9, h), n);
                  d.position.set(a / 2 - 9, s, 0), o.add(d);
                  const p = d.clone();
                  (p.position.x = -a / 2 + 9), o.add(p);
                }
                o.position.set(poolX, r + 28.35, e),
                  i.add(o),
                  (mt.siloam = o),
                  q.push({ x: poolX, z: e, r: 205, name: "쉴로악흐" });
              })();
          })(),
          (function () {
            const e = new t.Mesh(
              new t.RingGeometry(130, 150, 48),
              new t.MeshBasicMaterial({
                color: 15124576,
                side: t.DoubleSide,
                transparent: !0,
                opacity: 0.75,
              }),
            );
            (e.rotation.x = -Math.PI / 2),
              i.add(e),
              (mt.goal = e),
              (function () {
                const e = new t.Group(),
                  o = ge(11969151),
                  n = ge(8150085);
                ge(6833192);
                const campStoneFar = new t.Group();
                campStoneFar.name = "CampStoneFarLOD";
                const campStonePlacements = [];
                for (let n = 0; n < 18; n++) {
                  const s = (n / 18) * Math.PI * 2;
                  if (Math.abs(Math.sin(s)) < 0.2 && Math.cos(s) < 0) continue;
                  const a = new t.Mesh(new t.BoxGeometry(38, 22, 18), o);
                  const localX = 155 * Math.sin(s);
                  const localZ = 120 * Math.cos(s);
                  a.position.set(localX, 11, localZ),
                    (a.rotation.y = s),
                    (a.castShadow = !1),
                    (a.receiveShadow = !0),
                    campStoneFar.add(a),
                    campStonePlacements.push({
                      x: localX,
                      z: localZ,
                      rotation: s,
                    });
                }
                e.add(campStoneFar);
                const stoneTextureLoader = new t.TextureLoader();
                const stoneMap = stoneTextureLoader.load(
                  "./assets/models/camp_stone_basecolor.jpg",
                );
                stoneMap.colorSpace = t.SRGBColorSpace;
                stoneMap.anisotropy = Math.min(
                  2,
                  c?.capabilities?.getMaxAnisotropy?.() || 1,
                );
                const stoneNormalMap = stoneTextureLoader.load(
                  "./assets/models/camp_stone_normal.jpg",
                );
                stoneNormalMap.anisotropy = 1;
                const detailedStoneMaterial = new t.MeshStandardMaterial({
                  color: 0xffffff,
                  map: stoneMap,
                  normalMap: stoneNormalMap,
                  roughness: 0.92,
                  metalness: 0,
                });
                const detailedStoneGeometry = new t.BoxGeometry(38, 22, 18, 2, 2, 2);
                const campStoneNear = new t.InstancedMesh(
                  detailedStoneGeometry,
                  detailedStoneMaterial,
                  campStonePlacements.length,
                );
                campStoneNear.name = "CampStoneDetailedNearLOD";
                campStoneNear.castShadow = false;
                campStoneNear.receiveShadow = true;
                campStoneNear.frustumCulled = true;
                campStoneNear.visible = false;
                e.add(campStoneNear);
                mt.campStoneFar = campStoneFar;
                mt.campStoneNear = campStoneNear;
                mt.campStonePlacements = campStonePlacements;
                // Detailed camp furniture is loaded asynchronously so it does
                // not hold up first play.  Every holder is grounded again when
                // the travelling camp moves.
                e.userData.campProps = [];
                loadCampProp(e, {
                  name: "CampTent",
                  url: "./assets/models/camp_tent_game.glb",
                  position: [205, 35],
                  size: 260,
                  // Tripo's open/front end is the model's +Z side. Point it at
                  // the camp centre in local space, regardless of camp rotation.
                  faceCampCenter: true,
                });
                const a = createDatePalmClone();
                a &&
                  (a.position.set(292, 0, 18),
                  a.scale.setScalar(118),
                  (a.rotation.y = 1.15),
                  e.add(a)),
                  (e.userData.campTreeLocal = new t.Vector3(292, 0, 18)),
                  (e.userData.campTreeRadius = 18);
                const d = new t.Group();
                d.position.set(126, 0, -64);
                const p = new t.Mesh(
                  new t.CylinderGeometry(4.5, 6.2, 92, 8),
                  ge(5912867),
                );
                (p.position.y = 46), (p.castShadow = !0), d.add(p);
                const u = new t.Mesh(
                  new t.CylinderGeometry(13, 8, 10, 10),
                  ge(3878178),
                );
                (u.position.y = 94), d.add(u);
                const m = new t.Mesh(
                  new t.ConeGeometry(10, 30, 9),
                  new t.MeshBasicMaterial({
                    color: 16742946,
                    transparent: !0,
                    opacity: 0,
                    depthWrite: !1,
                  }),
                );
                (m.position.y = 115), d.add(m);
                const f = new t.PointLight(16753212, 0, 520, 1.2);
                (f.position.y = 110),
                  (f.castShadow = !1),
                  d.add(f),
                  (d.userData = {
                    flame: m,
                    glow: f,
                    phase: Math.random() * Math.PI * 2,
                    campTorch: !0,
                  }),
                  e.add(d),
                  mt.cityTorches.push(d);
                const w = new t.Mesh(
                  new t.ConeGeometry(8, 22, 7),
                  ge(13859388),
                );
                w.position.set(160, 11, -35), e.add(w);
                loadCampProp(e, {
                  name: "CampHayTrough",
                  url: "./assets/models/camp_hay_trough_game.glb",
                  position: [-236, 78],
                  size: 122,
                  yaw: Math.PI / 2,
                });
                loadCampProp(e, {
                  name: "CampWaterTrough",
                  url: "./assets/models/camp_water_trough_game.glb",
                  position: [-204, -76],
                  size: 127,
                  yaw: Math.PI / 2,
                });
                // The obsolete four-stone cairn was removed.  It had no
                // gameplay function and read as an unexplained stone tower.
                i.add(e), (mt.goalSite = e), ce();
              })(),
              ce();
          })(),
          (function () {
            mt.aimRig && r.remove(mt.aimRig);
            const e = new t.Group();
            e.name = "DavidFirstPersonSlingRig";

            // The first-person limbs repeat David's established tunic, skin
            // and hand palette instead of the old anonymous rectangular arm.
            const tunicMaterial = ge(0xc8a06c);
            const skinMaterial = ge(0xc9895a);
            const handMaterial = ge(0xe3a06a);
            const rightShoulder = new t.Group();
            rightShoulder.name = "DavidFirstPersonRightShoulder";
            // Corner-entry first-person framing: only the hand and a clipped
            // strip of wrist rise from the lower-right edge.  The hidden
            // shoulder remains outside the camera frustum.
            rightShoulder.position.set(65, -34, -50);
            rightShoulder.rotation.set(-0.05, -0.06, -0.1);
            const upperArm = new t.Mesh(
              new t.CylinderGeometry(5.4, 4.8, 6, 7),
              tunicMaterial,
            );
            upperArm.position.y = -3;
            upperArm.visible = false;
            const elbow = new t.Group();
            elbow.position.y = 0;
            elbow.rotation.z = -0.04;
            const forearm = new t.Mesh(
              new t.CylinderGeometry(4.3, 3.7, 12, 7),
              skinMaterial,
            );
            forearm.position.set(-3, 2, 0);
            forearm.rotation.z = 0.45;
            const hand = new t.Mesh(
              new t.DodecahedronGeometry(5.1, 1),
              handMaterial,
            );
            hand.name = "DavidFirstPersonRightHand";
            hand.position.set(-7, 8, 0);
            hand.scale.set(0.78, 1.05, 0.72);
            const grip = new t.Group();
            grip.name = "SlingGripPivot";
            grip.position.set(-11, 8, -0.5);
            elbow.add(forearm, hand, grip);
            rightShoulder.add(upperArm, elbow);
            e.add(rightShoulder);

            const slingSpin = new t.Group();
            slingSpin.name = "HistoricalRotatingSlingSpinPivot";
            grip.add(slingSpin);
            // The source asset is authored vertically (grip at Y=0, pouch at
            // negative Y).  Its resting direction now hangs down-left under
            // gravity and also points slightly forward into the scene rather
            // than lying perfectly horizontal across the screen.
            const slingDisplay = new t.Group();
            slingDisplay.name = "HistoricalRotatingSlingDownLeftForwardDisplay";
            const slingReadyDirection = new t.Vector3(-0.92, -0.4, -0.32).normalize();
            slingDisplay.quaternion.setFromUnitVectors(
              new t.Vector3(0, -1, 0),
              slingReadyDirection,
            );
            slingSpin.add(slingDisplay);
            const stone = new t.Mesh(
              new t.DodecahedronGeometry(3.9, 1),
              ge(0x6b6254),
            );
            stone.name = "LoadedSlingStone";
            stone.position.set(0, -41, 0);
            stone.scale.set(1.18, 0.82, 0.92);
            stone.castShadow = true;
            slingDisplay.add(stone);

            // Keep a lightweight sling visible while the supplied GLB is
            // decoded; it is replaced, not duplicated, when loading finishes.
            const fallbackSling = new t.Group();
            const cordMaterial = new t.LineBasicMaterial({ color: 0xc9ad78 });
            const fallbackCord = new t.Line(
              new t.BufferGeometry().setFromPoints([
                new t.Vector3(-2.2, 0, 0),
                new t.Vector3(-4.2, -36, 0),
                new t.Vector3(0, -42, 0),
                new t.Vector3(4.2, -36, 0),
                new t.Vector3(2.2, 0, 0),
              ]),
              cordMaterial,
            );
            fallbackSling.add(fallbackCord);
            slingDisplay.add(fallbackSling);

            new GLTFLoader().load(
              modelAssetPath("./assets/models/david_rotating_sling.glb"),
              (gltf) => {
                const slingModel = gltf.scene;
                slingModel.name = "DavidHistoricalRotatingSlingModel";
                slingModel.traverse((object) => {
                  if (!object.isMesh) return;
                  object.castShadow = true;
                  object.frustumCulled = false;
                  const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                  for (const material of materials) {
                    if (!material) continue;
                    material.roughness = Math.max(0.7, material.roughness ?? 0.7);
                    material.metalness = 0;
                    material.side = t.DoubleSide;
                    if (material.map) {
                      material.map.colorSpace = t.SRGBColorSpace;
                      material.map.anisotropy = 2;
                    }
                  }
                });
                slingModel.updateMatrixWorld(true);
                let box = new t.Box3().setFromObject(slingModel);
                const size = box.getSize(new t.Vector3());
                const scale = 42 / Math.max(size.y, size.x, size.z, 0.001);
                slingModel.scale.setScalar(scale);
                slingModel.updateMatrixWorld(true);
                box = new t.Box3().setFromObject(slingModel);
                const center = box.getCenter(new t.Vector3());
                // Highest end is the hand grip; the low central recess is the
                // pouch. This removes the source model's arbitrary origin.
                slingModel.position.set(-center.x, -box.max.y, -center.z);
                slingModel.updateMatrixWorld(true);
                const fittedBox = new t.Box3().setFromObject(slingModel);
                const pouchCenter = fittedBox.getCenter(new t.Vector3());
                stone.position.set(
                  pouchCenter.x,
                  fittedBox.min.y + Math.min(4.2, fittedBox.getSize(new t.Vector3()).y * 0.07),
                  pouchCenter.z + 1.2,
                );
                slingDisplay.add(slingModel);
                fallbackSling.visible = false;
              },
              undefined,
              (error) => console.warn("돌팔매 모델 로딩 실패; 대체 모델 유지:", error),
            );

            e.userData.sling = slingSpin;
            e.userData.slingDisplay = slingDisplay;
            // This near-camera-facing axis is also perpendicular to the new
            // down-left/forward resting vector.  That preserves a large,
            // readable orbit instead of shrinking the sling into a cone.
            e.userData.slingSpinAxis = new t.Vector3(-0.3, -0.06, 1).normalize();
            e.userData.slingStone = stone;
            e.userData.rightShoulder = rightShoulder;
            e.userData.rightElbow = elbow;
              e.position.set(0, 0, -10),
              (e.visible = !1),
              r.add(e),
              (mt.aimRig = e);
          })(),
          i.add(r),
          addEventListener("resize", Le),
          c.setAnimationLoop(Qe);
      })();

  // All heavy synchronous world work stays behind the loading screen. This is
  // the stage that used to run after the overlay disappeared on mobile.
  setLoadingStage(90, "finalizing");
  Te();
  if (e) no();
  try {
    createSouthernJerusalemUpgrade();
  } catch (error) {
    console.error("예루샬라임 주택·골목 생성 실패:", error);
  }
  setLoadingStage(94, "graphics");
  await finishStartupWarmup(
    loadingScreen,
    loadingBar,
    loadingPercent,
    loadingStatus,
  );
  await revealPlayableGame(
    loadingScreen,
    loadingBar,
    loadingPercent,
    loadingStatus,
  );
  scheduleDeferredMobileAssetWarmup();
  requestLandscapeMode();
  if (!n) c.domElement.requestPointerLock?.();
  eo(
    `다비드의 도시 · 성전산 · 키드론 골짜기 · 올리브산
성문과 골목을 따라 성전산까지 올라갈 수 있습니다.`,
  );
}
(Lt.wind.loop = !0), (Lt.birds.loop = !0), (Lt.night.loop = !0);
const Ft = [
    {
      name: "예루샬라임",
      x: 0,
      z: 0,
      r: 2280,
      size: "capital",
      wallR: 2100,
      wallRX: 980,
      wallRZ: 3000,
    },
  ],
  Wt = "2.3.6",
  SAVE_SCHEMA_VERSION = 2,
  SAVE_PRIMARY_KEY = "shepherdGame3DSave",
  SAVE_BACKUP_KEY = "shepherdGame3DSaveBackup",
  qt = { x: -1180, z: 1650 };
const SAVE_DB_NAME = "protectTheFlockSaves";
const SAVE_DB_STORE = "gameSaves";
const SAVE_DB_SLOT = "latest";
let indexedSaveCache = null;
let saveDatabasePromise = null;
function Nt(t, e, o, n = "solid") {
  z.push({ shape: "circle", x: t, z: e, r: o, type: n });
  collisionRevision++;
}
function Ot(t, e, o, n, s = 0, a = "building", yMin = -Infinity, yMax = Infinity) {
  z.push({ shape: "rect", x: t, z: e, w: o, d: n, rotation: s, type: a, yMin, yMax });
  collisionRevision++;
}
const COLLISION_CELL_SIZE = 320;
let collisionRevision = 0,
  indexedCollisionRevision = -1,
  collisionQueryStamp = 0;
const collisionGrid = new Map(),
  globalCollisionObjects = [];
function collisionCellKey(x, z) {
  return `${x},${z}`;
}
function rebuildCollisionIndex() {
  collisionGrid.clear();
  globalCollisionObjects.length = 0;
  for (const collider of z) {
    let halfX, halfZ;
    if ("rect" === collider.shape) {
      const cos = Math.abs(Math.cos(collider.rotation || 0)),
        sin = Math.abs(Math.sin(collider.rotation || 0));
      halfX = 0.5 * (cos * collider.w + sin * collider.d);
      halfZ = 0.5 * (sin * collider.w + cos * collider.d);
    } else {
      halfX = halfZ = collider.r;
    }
    const minX = Math.floor((collider.x - halfX) / COLLISION_CELL_SIZE),
      maxX = Math.floor((collider.x + halfX) / COLLISION_CELL_SIZE),
      minZ = Math.floor((collider.z - halfZ) / COLLISION_CELL_SIZE),
      maxZ = Math.floor((collider.z + halfZ) / COLLISION_CELL_SIZE),
      occupiedCells = (maxX - minX + 1) * (maxZ - minZ + 1);
    if (occupiedCells > 196) {
      globalCollisionObjects.push(collider);
      continue;
    }
    for (let cellX = minX; cellX <= maxX; cellX++)
      for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
        const key = collisionCellKey(cellX, cellZ);
        let bucket = collisionGrid.get(key);
        bucket || (collisionGrid.set(key, (bucket = [])));
        bucket.push(collider);
      }
  }
  indexedCollisionRevision = collisionRevision;
}
function colliderBlocksPoint(collider, point, clearance, verticalPadding = 0) {
  if (
    Number.isFinite(collider.yMin) &&
    Number.isFinite(collider.yMax) &&
    (point.y - verticalPadding >= collider.yMax - 5 ||
      point.y + verticalPadding <= collider.yMin)
  )
    return false;
  if ("rect" === collider.shape) {
    const dx = point.x - collider.x,
      dz = point.z - collider.z,
      cos = Math.cos(-collider.rotation),
      sin = Math.sin(-collider.rotation),
      localX = dx * cos - dz * sin,
      localZ = dx * sin + dz * cos;
    return (
      Math.abs(localX) < collider.w / 2 + clearance &&
      Math.abs(localZ) < collider.d / 2 + clearance
    );
  }
  return (
    Math.hypot(point.x - collider.x, point.z - collider.z) <
    collider.r + clearance
  );
}
function colliderBlocksHorizontal(collider, x, zValue, clearance) {
  if ("rect" === collider.shape) {
    const dx = x - collider.x,
      dz = zValue - collider.z,
      cos = Math.cos(-(collider.rotation || 0)),
      sin = Math.sin(-(collider.rotation || 0)),
      localX = dx * cos - dz * sin,
      localZ = dx * sin + dz * cos;
    return (
      Math.abs(localX) < collider.w / 2 + clearance &&
      Math.abs(localZ) < collider.d / 2 + clearance
    );
  }
  return Math.hypot(x - collider.x, zValue - collider.z) <
    collider.r + clearance;
}
function jt(t, e = 18) {
  if (Math.abs(t.x) > 4050 || Math.abs(t.z) > 4050) return !0;
  indexedCollisionRevision !== collisionRevision && rebuildCollisionIndex();
  collisionQueryStamp++;
  const testCollider = (collider) => {
    if (collider._collisionQueryStamp === collisionQueryStamp) return !1;
    collider._collisionQueryStamp = collisionQueryStamp;
    return colliderBlocksPoint(collider, t, e, pt);
  };
  for (const collider of globalCollisionObjects)
    if (testCollider(collider)) return !0;
  const minX = Math.floor((t.x - e) / COLLISION_CELL_SIZE),
    maxX = Math.floor((t.x + e) / COLLISION_CELL_SIZE),
    minZ = Math.floor((t.z - e) / COLLISION_CELL_SIZE),
    maxZ = Math.floor((t.z + e) / COLLISION_CELL_SIZE);
  for (let cellX = minX; cellX <= maxX; cellX++)
    for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
      const bucket = collisionGrid.get(collisionCellKey(cellX, cellZ));
      if (!bucket) continue;
      for (const collider of bucket) if (testCollider(collider)) return !0;
    }
  if (mt.goalSite?.userData?.campTreeLocal) {
    const o = mt.goalSite.localToWorld(
      mt.goalSite.userData.campTreeLocal.clone(),
    );
    if (
      Math.hypot(t.x - o.x, t.z - o.z) <
      mt.goalSite.userData.campTreeRadius + e
    )
      return !0;
  }
  return !1;
}
function collisionPenetrationScore(point, clearance = 18) {
  // A player can occasionally finish a frame just inside camp furniture or a
  // tree collider.  A boolean-only collision test then rejects every following
  // step, including the step that would leave the collider.  Measure overlap so
  // movement that strictly reduces it can be allowed without permitting entry.
  let score = 0;
  indexedCollisionRevision !== collisionRevision && rebuildCollisionIndex();
  collisionQueryStamp++;
  const nearby = [];
  const collect = (collider) => {
    if (collider._collisionQueryStamp === collisionQueryStamp) return;
    collider._collisionQueryStamp = collisionQueryStamp;
    nearby.push(collider);
  };
  for (const collider of globalCollisionObjects) collect(collider);
  const minX = Math.floor((point.x - clearance) / COLLISION_CELL_SIZE);
  const maxX = Math.floor((point.x + clearance) / COLLISION_CELL_SIZE);
  const minZ = Math.floor((point.z - clearance) / COLLISION_CELL_SIZE);
  const maxZ = Math.floor((point.z + clearance) / COLLISION_CELL_SIZE);
  for (let cellX = minX; cellX <= maxX; cellX++)
    for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
      const bucket = collisionGrid.get(collisionCellKey(cellX, cellZ));
      if (bucket) for (const collider of bucket) collect(collider);
    }
  for (const collider of nearby) {
    if (
      Number.isFinite(collider.yMin) &&
      Number.isFinite(collider.yMax) &&
      (point.y - pt >= collider.yMax - 5 ||
        point.y + pt <= collider.yMin)
    )
      continue;
    if ("rect" === collider.shape) {
      const dx = point.x - collider.x,
        dz = point.z - collider.z,
        cos = Math.cos(-(collider.rotation || 0)),
        sin = Math.sin(-(collider.rotation || 0)),
        localX = dx * cos - dz * sin,
        localZ = dx * sin + dz * cos,
        overlapX = collider.w / 2 + clearance - Math.abs(localX),
        overlapZ = collider.d / 2 + clearance - Math.abs(localZ);
      if (overlapX > 0 && overlapZ > 0) score += Math.min(overlapX, overlapZ);
    } else {
      const overlap =
        collider.r +
        clearance -
        Math.hypot(point.x - collider.x, point.z - collider.z);
      if (overlap > 0) score += overlap;
    }
  }
  if (mt.goalSite?.userData?.campTreeLocal) {
    const tree = mt.goalSite.localToWorld(
        mt.goalSite.userData.campTreeLocal.clone(),
      ),
      overlap =
        mt.goalSite.userData.campTreeRadius +
        clearance -
        Math.hypot(point.x - tree.x, point.z - tree.z);
    if (overlap > 0) score += overlap;
  }
  return score;
}
function canPlayerMoveTo(current, candidate, clearance = 17) {
  // During a night watch the flock and camp stay fixed, never David.  Camp
  // props are intentionally non-blocking for the player inside the watch area
  // so entering between several overlapping props cannot freeze every exit.
  if (
    nightWatch.active &&
    Math.hypot(candidate.x - nightWatch.camp.x, candidate.z - nightWatch.camp.z) <
      520
  )
    return !0;
  if (!jt(candidate, clearance)) return !0;
  const currentOverlap = collisionPenetrationScore(current, clearance);
  if (currentOverlap <= 0) return !1;
  return (
    collisionPenetrationScore(candidate, clearance) <
    currentOverlap - 0.001
  );
}
function samplePlayerSurface(worldX, worldZ, currentPlayerY) {
  let surface = te(worldX, worldZ);
  // The player's origin sits pt units above the supporting surface.  A roof is
  // eligible only when the feet have cleared its real upper face; this prevents
  // entering a house volume and then being lifted from inside it.
  const playerFeet = currentPlayerY - pt;
  for (const collider of z) {
    if (
      collider.type !== "building" ||
      !Number.isFinite(collider.yMax) ||
      collider.yMax <= surface + 5 ||
      playerFeet < collider.yMax - 6
    )
      continue;
    const probe = { x: worldX, y: collider.yMax - 1, z: worldZ };
    if (colliderBlocksPoint(collider, probe, 0, 0))
      surface = Math.max(surface, collider.yMax);
  }
  return surface;
}
function movePlayerWithSweptCollision(player, delta) {
  // Check the whole travelled segment instead of only its end point.  This
  // prevents fast diagonal movement and frame-time spikes from crossing walls.
  const distance = Math.hypot(delta.x, delta.z);
  const steps = Math.max(1, Math.min(10, Math.ceil(distance / 7)));
  const stepX = delta.x / steps;
  const stepZ = delta.z / steps;
  for (let step = 0; step < steps; step++) {
    const xProbe = player.position.clone();
    xProbe.x += stepX;
    if (canPlayerMoveTo(player.position, xProbe, 17))
      player.position.x = xProbe.x;
    const zProbe = player.position.clone();
    zProbe.z += stepZ;
    if (canPlayerMoveTo(player.position, zProbe, 17))
      player.position.z = zProbe.z;
  }
}
function Ht(t, e, o, n = 0) {
  let s = (t.wallRX || t.wallR) + n;
  const a = (t.wallRZ || t.wallR) + n,
    localX = e - t.x,
    localZ = o - t.z;
  // Match the visible north-east wall extension. This preserves the Kidron drop
  // outside the wall while giving the Temple Mount a usable interior forecourt.
  if (localX > 0 && localZ < -700) {
    const northBlend = Math.max(0, Math.min(1, (-localZ - 700) / 1650)),
      eastBlend = Math.max(0, Math.min(1, localX / Math.max(s, 1)));
    s += 330 * northBlend * eastBlend;
  }
  return (localX * localX) / (s * s) + (localZ * localZ) / (a * a);
}
function Kt(t, e, o = 0) {
  return Ht(Ft[0], t, e, o) < 1;
}
const Xt = [
  [[0, 1700], [0, -1320], 108],
  [[-420, 1180], [420, 1180], 72],
  [[-500, 680], [500, 680], 76],
  [[-520, 180], [520, 180], 78],
  [[-460, -340], [460, -340], 84],
  [[0, 1260], [310, 850], 74],
  [[310, 850], [430, 360], 76],
  [[430, 360], [350, -260], 82],
  [[350, -260], [350, -760], 92],
  // Broad eastern approach to the Temple Mount: the road leaves the eastern
  // city lane, bends north, then turns gently west into the eastern gate.
  [[350, -760], [430, -780], 110],
  [[430, -780], [560, -1050], 126],
  [[560, -1050], [690, -1320], 132],
  [[690, -1320], [790, -1560], 138],
  [[790, -1560], [800, -1780], 142],
  [[800, -1780], [760, -1930], 146],
  [[760, -1930], [720, -2050], 150],
  [[0, 980], [-350, 620], 68],
  [[-350, 620], [-390, -260], 70],
  // Narrow southern-quarter alleys. These exact center lines are also drawn
  // by the minimap, so the map and the playable lanes cannot drift apart.
  [[-420, 1180], [-610, 1510], 52],
  [[-610, 1510], [-480, 1840], 48],
  [[420, 1180], [600, 1490], 54],
  [[600, 1490], [470, 1830], 48],
  [[-480, 1840], [-250, 2130], 50],
  [[470, 1830], [250, 2130], 50],
  [[-250, 2130], [250, 2130], 52],
  [[-390, 620], [-610, 900], 48],
  [[430, 360], [610, 900], 50],
  [[-610, 900], [-300, 1080], 44],
  [[-300, 1080], [0, 1260], 44],
  [[610, 900], [300, 1080], 44],
  [[300, 1080], [0, 1260], 44],
  [[-610, 1510], [-250, 1580], 42],
  [[-250, 1580], [120, 1510], 42],
  [[120, 1510], [600, 1490], 42],
  [[-480, 1840], [-100, 1900], 40],
  [[-100, 1900], [250, 2130], 40],
  // Fine-grained lanes between the southern housing blocks.  The same
  // segments drive placement clearance, navigation, torches and the minimap.
  [[-700, 560], [-700, 2050], 28],
  [[-520, 500], [-520, 2160], 28],
  [[-335, 470], [-335, 2200], 26],
  [[-165, 440], [-165, 2240], 26],
  [[165, 440], [165, 2240], 26],
  [[335, 470], [335, 2200], 26],
  [[520, 500], [520, 2160], 28],
  [[700, 560], [700, 2050], 28],
  [[-760, 760], [760, 760], 28],
  [[-780, 1030], [780, 1030], 26],
  [[-800, 1320], [800, 1320], 28],
  [[-790, 1600], [790, 1600], 26],
  [[-720, 1880], [720, 1880], 28],
];

// 성내 양 이동용 도로 그래프. 양은 건물 사이를 직선으로 가로지르지
// 않고 이 도로망의 중심선을 따라가며, 각 선분의 폭은 안전 여유로 쓴다.
let citySheepRoadGraph = null;
function closestPointOnCityRoad(x, z) {
  let best = null;
  for (let index = 0; index < Xt.length; index++) {
    const [start, end, width] = Xt[index];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const lengthSq = dx * dx + dz * dz || 1;
    const amount = Math.max(
      0,
      Math.min(1, ((x - start[0]) * dx + (z - start[1]) * dz) / lengthSq),
    );
    const px = start[0] + dx * amount;
    const pz = start[1] + dz * amount;
    const distance = Math.hypot(x - px, z - pz);
    if (!best || distance < best.distance) {
      best = { x: px, z: pz, distance, index, amount, width };
    }
  }
  return best;
}
function buildCitySheepRoadGraph() {
  if (citySheepRoadGraph) return citySheepRoadGraph;
  const nodes = [];
  const keyToIndex = new Map();
  const nodeIndex = (point) => {
    const key = `${point[0].toFixed(3)},${point[1].toFixed(3)}`;
    if (!keyToIndex.has(key)) {
      keyToIndex.set(key, nodes.length);
      nodes.push({ x: point[0], z: point[1], edges: [] });
    }
    return keyToIndex.get(key);
  };
  const pointsBySegment = Xt.map(([start, end]) => [
    { point: [...start], amount: 0 },
    { point: [...end], amount: 1 },
  ]);
  for (let first = 0; first < Xt.length; first++) {
    const [a, b] = Xt[first];
    const rX = b[0] - a[0];
    const rZ = b[1] - a[1];
    for (let second = first + 1; second < Xt.length; second++) {
      const [c, d] = Xt[second];
      const sX = d[0] - c[0];
      const sZ = d[1] - c[1];
      const denominator = rX * sZ - rZ * sX;
      if (Math.abs(denominator) < 1e-6) continue;
      const cax = c[0] - a[0];
      const caz = c[1] - a[1];
      const firstAmount = (cax * sZ - caz * sX) / denominator;
      const secondAmount = (cax * rZ - caz * rX) / denominator;
      if (
        firstAmount < -1e-6 ||
        firstAmount > 1 + 1e-6 ||
        secondAmount < -1e-6 ||
        secondAmount > 1 + 1e-6
      )
        continue;
      const point = [
        a[0] + rX * firstAmount,
        a[1] + rZ * firstAmount,
      ];
      pointsBySegment[first].push({ point, amount: firstAmount });
      pointsBySegment[second].push({ point, amount: secondAmount });
    }
  }
  for (const segmentPoints of pointsBySegment) {
    segmentPoints.sort((a, b) => a.amount - b.amount);
    for (let index = 1; index < segmentPoints.length; index++) {
      const start = segmentPoints[index - 1].point;
      const end = segmentPoints[index].point;
      if (Math.hypot(end[0] - start[0], end[1] - start[1]) < 0.01)
        continue;
      const from = nodeIndex(start);
      const to = nodeIndex(end);
      const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
      nodes[from].edges.push({ to, distance });
      nodes[to].edges.push({ to: from, distance });
    }
  }
  citySheepRoadGraph = { nodes };
  return citySheepRoadGraph;
}
function cityRoadPointKey(point) {
  return `${Math.round(point.x)},${Math.round(point.z)}`;
}
function cityRoadEdgeKey(first, second) {
  const a = cityRoadPointKey(first);
  const b = cityRoadPointKey(second);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function shortestCityRoadNodePath(startIndex, goalIndex, options = null) {
  const { nodes } = buildCitySheepRoadGraph();
  const blockedEdges = options?.blockedEdges;
  const discouragedEdges = options?.discouragedEdges;
  const cachedTree = options?.pathTreeCache?.get(startIndex);
  if (cachedTree) {
    if (!Number.isFinite(cachedTree.distances[goalIndex])) return null;
    const path = [];
    for (let at = goalIndex; at >= 0; at = cachedTree.previous[at]) {
      path.push(at);
      if (at === startIndex) break;
    }
    return {
      indices: path.reverse(),
      distance: cachedTree.distances[goalIndex],
    };
  }
  const distances = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = nodes.map(() => false);
  distances[startIndex] = 0;
  for (let pass = 0; pass < nodes.length; pass++) {
    let current = -1;
    for (let index = 0; index < nodes.length; index++) {
      if (
        !visited[index] &&
        (current < 0 || distances[index] < distances[current])
      )
        current = index;
    }
    if (current < 0 || !Number.isFinite(distances[current])) break;
    // Citizen route selection evaluates many destinations from the same two
    // road exits. Build the complete tree once when a cache is supplied;
    // otherwise a normal sheep query can still stop at its requested goal.
    if (current === goalIndex && !options?.pathTreeCache) break;
    visited[current] = true;
    for (const edge of nodes[current].edges) {
      const edgeKey = cityRoadEdgeKey(nodes[current], nodes[edge.to]);
      if (blockedEdges?.has(edgeKey)) continue;
      const repeatPenalty = discouragedEdges?.has(edgeKey)
        ? 180 + edge.distance * 1.4
        : 0;
      const nextDistance = distances[current] + edge.distance + repeatPenalty;
      if (nextDistance < distances[edge.to]) {
        distances[edge.to] = nextDistance;
        previous[edge.to] = current;
      }
    }
  }
  if (options?.pathTreeCache)
    options.pathTreeCache.set(startIndex, { distances, previous });
  if (!Number.isFinite(distances[goalIndex])) return null;
  const path = [];
  for (let at = goalIndex; at >= 0; at = previous[at]) {
    path.push(at);
    if (at === startIndex) break;
  }
  return { indices: path.reverse(), distance: distances[goalIndex] };
}
function makeCitySheepPath(startX, startZ, goalX, goalZ, options = null) {
  const startRoad = closestPointOnCityRoad(startX, startZ);
  const goalRoad = closestPointOnCityRoad(goalX, goalZ);
  if (!startRoad || !goalRoad) return [];
  if (startRoad.index === goalRoad.index && !options?.forceGraphRoute) {
    return [
      { x: startRoad.x, z: startRoad.z },
      { x: goalRoad.x, z: goalRoad.z },
    ];
  }
  const graph = buildCitySheepRoadGraph();
  const startSegment = Xt[startRoad.index];
  const goalSegment = Xt[goalRoad.index];
  const nodeFor = (point) =>
    graph.nodes.findIndex(
      (node) => node.x === point[0] && node.z === point[1],
    );
  const startCandidates = [startSegment[0], startSegment[1]];
  const goalCandidates = [goalSegment[0], goalSegment[1]];
  let best = null;
  for (const startPoint of startCandidates) {
    if (options?.blockedWaypoints?.has(cityRoadPointKey({ x: startPoint[0], z: startPoint[1] })))
      continue;
    for (const goalPoint of goalCandidates) {
      const startIndex = nodeFor(startPoint);
      const goalIndex = nodeFor(goalPoint);
      const route = shortestCityRoadNodePath(startIndex, goalIndex, options);
      if (!route) continue;
      const total =
        Math.hypot(startRoad.x - startPoint[0], startRoad.z - startPoint[1]) +
        route.distance +
        Math.hypot(goalRoad.x - goalPoint[0], goalRoad.z - goalPoint[1]);
      if (!best || total < best.total) best = { total, route };
    }
  }
  if (!best)
    return options?.requireConnectedRoute
      ? []
      : [{ x: goalRoad.x, z: goalRoad.z }];
  return [
    { x: startRoad.x, z: startRoad.z },
    ...best.route.indices.map((index) => ({
      x: graph.nodes[index].x,
      z: graph.nodes[index].z,
    })),
    { x: goalRoad.x, z: goalRoad.z },
  ];
}
function nearestClearCityRoadPoint(x, z, clearance = 24) {
  const nearest = closestPointOnCityRoad(x, z);
  if (!nearest) return null;
  if (!jt(nearest, clearance)) return nearest;
  const [start, end] = Xt[nearest.index];
  for (let step = 1; step <= 12; step++) {
    for (const direction of [-1, 1]) {
      const amount = Math.max(
        0,
        Math.min(1, nearest.amount + direction * step * 0.035),
      );
      const point = {
        x: start[0] + (end[0] - start[0]) * amount,
        z: start[1] + (end[1] - start[1]) * amount,
      };
      if (!jt(point, clearance)) return point;
    }
  }
  let bestClear = null;
  for (const [start, end] of Xt) {
    for (let step = 0; step <= 20; step++) {
      const amount = step / 20;
      const point = {
        x: start[0] + (end[0] - start[0]) * amount,
        z: start[1] + (end[1] - start[1]) * amount,
      };
      if (jt(point, clearance)) continue;
      const distance = Math.hypot(point.x - x, point.z - z);
      if (!bestClear || distance < bestClear.distance) {
        bestClear = { ...point, distance };
      }
    }
  }
  return bestClear;
}
function Zt(t, e, o = 95) {
  return Xt.some(
    ([n, s, a]) =>
      (function (t, e, o, n, s, a) {
        const i = s - o,
          r = a - n,
          c = i * (t - o) + r * (e - n);
        if (c <= 0) return Math.hypot(t - o, e - n);
        const l = i * i + r * r;
        if (l <= c) return Math.hypot(t - s, e - a);
        const h = c / l;
        return Math.hypot(t - (o + h * i), e - (n + h * r));
      })(t, e, n[0], n[1], s[0], s[1]) < Math.max(o, 0.72 * a),
  );
}
function Yt(t, e, o = 0) {
  return Ft.some((n) => Ht(n, t, e, o) < 1);
}
function isSheepBlockedAt(point, clearance = 24) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return !0;
  if (jt(point, clearance)) return !0;
  // Sheep never enter Jerusalem. This also prevents a sheep from being
  // squeezed into a wall segment while trying to follow a player through a gate.
  if (Yt(point.x, point.z, 72 + clearance)) return !0;
  if (
    mt.sheepShop &&
    Math.hypot(
      point.x - mt.sheepShop.position.x,
      point.z - mt.sheepShop.position.z,
    ) <
      158 + clearance
  )
    return !0;
  if (
    mt.siloam &&
    Math.hypot(point.x - mt.siloam.position.x, point.z - mt.siloam.position.z) <
      218 + clearance
  )
    return !0;
  return !1;
}
function isNearJerusalemWall(point) {
  if (!point) return false;
  const wallBand = Ht(Ft[0], point.x, point.z, 0);
  return wallBand > 0.68 && wallBand < 1.48;
}
function findSheepWallEscape(point, clearance = 38) {
  const city = Ft[0];
  let outwardX = point.x - city.x;
  let outwardZ = point.z - city.z;
  let length = Math.hypot(outwardX, outwardZ);
  if (length < 0.001) {
    outwardX = 0;
    outwardZ = 1;
    length = 1;
  }
  outwardX /= length;
  outwardZ /= length;
  for (let distance = 24; distance <= 1200; distance += 24) {
    const x = point.x + outwardX * distance;
    const z = point.z + outwardZ * distance;
    const candidate = { x, y: te(x, z) + 5, z };
    if (!isSheepBlockedAt(candidate, clearance)) return candidate;
  }
  return null;
}
function _t(e, o) {
  const n = [[e, o]];
  for (let t = 1; t <= 24; t++) {
    const s = 95 * t;
    for (let t = 0; t < 20; t++) {
      const a = (t / 20) * Math.PI * 2;
      n.push([e + Math.sin(a) * s, o + Math.cos(a) * s]);
    }
  }
  for (const [e, o] of n)
    if (
      !(
        Math.abs(e) > 3980 ||
        Math.abs(o) > 3980 ||
        he(e, o) > 0.68 ||
        jt(new t.Vector3(e, te(e, o) + 4, o), 28)
      )
    )
      return { x: e, z: o };
  return { x: qt.x, z: qt.z };
}
function Jt(t, e) {
  const o = _t(t, e);
  return mt.player.position.set(o.x, te(o.x, o.z) + pt, o.z), o;
}
function Qt(t) {
  if (D === t) return;
  D = t;
  const o = e("#worldRegionLabel");
  // Keep region state for ambience and missions without showing a feature
  // banner every time the player crosses a regional boundary.
  o?.classList.remove("show");
}
function $t(e, o) {
  // v1.0 playable geography: City of David ridge, Temple Mount,
  // Kidron Valley and the Mount of Olives. Western terrain remains open pasture.
  let n = 58;

  // Broad natural undulation.
  n += 11 * Math.sin(0.0036 * e) + 8 * Math.cos(0.0041 * o);
  n += 5 * Math.sin(0.0052 * (e + o));

  // Narrow north-south ridge of ancient Jerusalem / City of David.
  const ridgeWidth = 520 + 80 * t.MathUtils.clamp((900 - o) / 2400, 0, 1);
  const ridge = Math.exp(-(e * e) / (ridgeWidth * ridgeWidth));
  const northRise = 105 + 150 * t.MathUtils.clamp((1250 - o) / 2700, 0, 1);
  n += ridge * northRise;

  // Southern City of David spur, descending toward Siloam.
  n += 62 * Math.exp(-((e + 20) ** 2) / 170000 - ((o - 720) ** 2) / 720000);
  n -= 70 * Math.exp(-((e + 10) ** 2) / 240000 - ((o - 1720) ** 2) / 220000);
  // Inside Jerusalem the southern ridge now descends continuously away from
  // the Temple Mount. This removes the old raised southern lip.
  const cityRidgeMask = Math.exp(-(e * e) / 760000);
  n -= cityRidgeMask * 126 * t.MathUtils.smoothstep(o, 260, 2850);

  // Temple Mount: a broad continuation of the northern ridge. The mountain rises
  // gradually from the city on the south and west, while its eastern shoulder stops
  // before the Kidron Valley instead of spilling down into it.
  const templeBase = Math.exp(-((e - 40) ** 2) / 3600000 - ((o + 1780) ** 2) / 4700000);
  const templeShoulder = Math.exp(-((e - 10) ** 2) / 2600000 - ((o + 1500) ** 2) / 3400000);
  const templeSummit = Math.exp(-((e - 70) ** 2) / 1750000 - ((o + 2050) ** 2) / 1550000);
  // Keep the Temple Mount lower than the previous versions. It is a broad,
  // gently raised continuation of the city ridge, not a separate earthen tower.
  n += 22 * templeBase + 14 * templeShoulder + 16 * templeSummit;
  n += 16 * Math.exp(-((e - 430) ** 2) / 1700000 - ((o + 1050) ** 2) / 2200000);
  n += 18 * Math.exp(-((e - 650) ** 2) / 1300000 - ((o + 1450) ** 2) / 2100000);
  n += 20 * Math.exp(-((e - 760) ** 2) / 1100000 - ((o + 1800) ** 2) / 1700000);
  n += 16 * Math.exp(-((e + 380) ** 2) / 2200000 - ((o + 1700) ** 2) / 3200000);
  // A wide low summit replaces the former steep mound. The blend is smooth,
  // so the eastern road reaches the court without a sudden climb or drop.
  const lowSummitInfluence = Math.exp(-((e - 70) ** 2) / 2100000 - ((o + 2050) ** 2) / 2200000);
  n = t.MathUtils.lerp(n, 172, 0.82 * lowSummitInfluence);

  // Kidron Valley: a deep, traversable north-south valley east of the city.
  const kidronX = 1080 + 70 * Math.sin(0.0014 * (o + 300));
  n -= 245 * Math.exp(-((e - kidronX) ** 2) / 105000);
  n -= 55 * Math.exp(-((e - kidronX - 150) ** 2) / 250000);

  // Mount of Olives rises east of Kidron, with broad climbable slopes.
  n += 245 * Math.exp(-((e - 2200) ** 2) / 820000) *
       Math.exp(-((o + 100) ** 2) / 5000000);

  // Tyropoeon / western saddle. West remains open grazing terrain.
  n -= 55 * Math.exp(-((e + 720) ** 2) / 170000);
  n += 45 * Math.exp(-((e + 1750) ** 2) / 1800000) *
       Math.exp(-((o - 200) ** 2) / 5000000);

  // Siloam basin and Gihon spring vicinity.
  n -= 42 * Math.exp(-((e - 900) ** 2 + (o - 1050) ** 2) / 150000);
  n -= 52 * Math.exp(-((e - 1035) ** 2 + (o - 2380) ** 2) / 170000);

  // Keep distant map edges below the core elevations without creating cliffs.
  const edge = Math.max(Math.abs(e), Math.abs(o));
  if (edge > 3100) n -= 90 * t.MathUtils.smoothstep(edge, 3100, 5200);

  return n;
}
function te(e, o) {
  const n = $t(e, o),
    s = dt;
  if (!s) return n;
  const a = (function (e, o, n) {
    if (!n?.points?.length) return null;
    let s = null,
      a = 0;
    const i = [];
    for (let t = 0; t < n.points.length - 1; t++) {
      const e = n.points[t],
        o = n.points[t + 1],
        s = Math.hypot(o.x - e.x, o.z - e.z);
      i.push(s), (a += s);
    }
    let r = 0;
    for (let c = 0; c < n.points.length - 1; c++) {
      const l = n.points[c],
        h = n.points[c + 1],
        d = h.x - l.x,
        p = h.z - l.z,
        u = d * d + p * p || 1,
        m = t.MathUtils.clamp(((e - l.x) * d + (o - l.z) * p) / u, 0, 1),
        f = l.x + d * m,
        w = l.z + p * m,
        M = Math.hypot(e - f, o - w),
        y = (r + i[c] * m) / Math.max(a, 1);
      (!s || M < s.distance) &&
        (s = { distance: M, progress: y, px: f, pz: w }),
        (r += i[c]);
    }
    return s;
  })(e, o, s);
  if (a && a.distance <= s.halfWidth) {
    const e = a.progress * a.progress * (3 - 2 * a.progress),
      o = t.MathUtils.lerp(s.startY, s.courtY, e),
      i = t.MathUtils.smoothstep(a.distance, 0.68 * s.halfWidth, s.halfWidth);
    return t.MathUtils.lerp(o, n, i);
  }
  // Blend the temple court into the surrounding summit instead of cutting a hard
  // rectangular cliff. The inner court stays level, while a broad shoulder transitions
  // smoothly back to the natural hill on all sides.
  const dx = Math.max(s.courtXMin - e, 0, e - s.courtXMax);
  const dz = Math.max(s.courtZMin - o, 0, o - s.courtZMax);
  const outsideDistance = Math.hypot(dx, dz);
  const inside =
    e >= s.courtXMin &&
    e <= s.courtXMax &&
    o >= s.courtZMin &&
    o <= s.courtZMax;
  if (inside) {
    const courtSurfaceY = s.courtSurfaceY ?? s.courtY + 4;

    // Purchased temple entrance: the broad eastern approach rises smoothly to
    // the authored sanctuary platform. This collision height is deliberately
    // simple and continuous so David cannot fall between decorative steps.
    const onTempleStageRamp =
      e >= s.templeStageRampXMin &&
      e <= s.templeStageRampXMax &&
      o >= s.templeStageRampZMin &&
      o <= s.templeStageRampZMax;
    if (onTempleStageRamp) {
      // Exact tread tops sampled from the transformed GLB. The former equal
      // interpolation did not match the authored tread widths or riser heights.
      const localX = e - (s.templeStageRampXMin - 90);
      if (localX > 151) return courtSurfaceY;
      if (localX > 143) return s.courtY + 11.32;
      if (localX > 137) return s.courtY + 16.5;
      if (localX > 132) return s.courtY + 22;
      if (localX > 123) return s.courtY + 27.03;
      if (localX > 117) return s.courtY + 32.52;
      if (localX > 112) return s.courtY + 37.5;
      if (localX > 107) return s.courtY + 42.5;
      if (localX > 98) return s.courtY + 47.97;
      if (localX > 92) return s.courtY + 53;
      return s.templeStageTopY;
    }
    if (
      e >= s.templeStageXMin &&
      e <= s.templeStageXMax &&
      o >= s.templeStageZMin &&
      o <= s.templeStageZMax
    )
      return s.templeStageTopY;

    // Walkable altar ramp: the southern end begins flush with the marble court
    // and rises continuously to the altar platform.
    const onAltarRamp =
      e >= s.altarRampXMin &&
      e <= s.altarRampXMax &&
      o >= s.altarRampZMin &&
      o <= s.altarRampZMax;
    if (onAltarRamp) {
      const localZ = o - (s.altarRampZMax + 180);
      if (localZ > -185) return courtSurfaceY;
      if (localZ > -195) return s.courtY + 8.24;
      if (localZ > -205) return s.courtY + 12.98;
      if (localZ > -215) return s.courtY + 22.45;
      if (localZ > -225) return s.courtY + 31.93;
      if (localZ > -235) return s.courtY + 32.52;
      return s.altarTopY;
    }

    // The altar top itself is a stable walkable surface at one fixed height.
    if (
      Math.abs(e - s.altarX) <= s.altarHalfX &&
      Math.abs(o - s.altarZ) <= s.altarHalfZ
    )
      return s.altarTopY;

    // Every other point inside the Temple court uses the exact marble height.
    // No natural terrain height is allowed to leak through this area.
    return courtSurfaceY;
  }
  if (outsideDistance < 560) {
    // The lowered court merges into the natural ridge without producing a mound.
    const shoulderBlend = 1 - t.MathUtils.smoothstep(outsideDistance, 70, 560);
    return t.MathUtils.lerp(n, s.courtY, 0.5 * shoulderBlend * shoulderBlend);
  }
  return n;
}
function ee(t) {
  let e = t >>> 0;
  return () => {
    e += 1831565813;
    let t = Math.imul(e ^ (e >>> 15), 1 | e);
    return (
      (t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)),
      ((t ^ (t >>> 14)) >>> 0) / 4294967296
    );
  };
}
function oe(e, o, n = 1) {
  if (zt(e, o, 120) || Kt(e, o, -20)) return null;
  datePalmPlacements.push({
    x: e,
    z: o,
    y: te(e, o),
    scale: 112 * n,
    rotation: (0.73 * datePalmPlacements.length) % (Math.PI * 2),
  });
  Nt(e, o, 8.5 * n, "date-palm");
  rebuildDatePalmInstances();
  return mt.datePalmGrove;
}
function ne(t = 4300) {
  const o = e("#mission");
  o &&
    ((o.textContent =
      "밤" === Ze(ut.worldTime).name || nightWatch.active
        ? "이 야영지에 머물며 밤이 끝날 때까지 양 떼를 지키십시오."
        : "양을 다음 구유가 있는 야영지까지 보호하십시오."),
    (o.style.display = "block"),
    o.classList.remove("prompt-show"),
    o.offsetWidth,
    o.classList.add("prompt-show"),
    clearTimeout(tt),
    (tt = setTimeout(() => {
      o.classList.remove("prompt-show"), (o.style.display = "none");
    }, t)));
}
function se() {
  const t = e("#skillToast");
  t &&
    ((e("#skillToastValue").textContent = ut.skill + "/50"),
    (e("#skillToastBar").style.width = (ut.skill / 50) * 100 + "%"),
    t.classList.remove("show"),
    t.offsetWidth,
    t.classList.add("show"),
    clearTimeout(se.timer),
    (se.timer = setTimeout(() => t.classList.remove("show"), 3600)));
}
function ae() {
  mt.practiceTarget &&
    (i.remove(mt.practiceTarget), (mt.practiceTarget = null));
}
function ie() {
  (ut.missionDone = !1),
    ne(4300),
    eo(
      "밤" === Ze(ut.worldTime).name
        ? "밤 동안에는 이 야영지에 머물러 양 떼를 지키십시오."
        : "멀리 새로운 목동 야영지가 정해졌습니다.",
    );
}
function re(t) {
  (at.active = !1),
    (G = !1),
    (P = !1),
    (e("#crosshair").style.display = "none"),
    (e("#charge").style.display = "none"),
    (A = at.previousCameraMode || 0),
    ae(),
    t
      ? ((ut.skill = Math.min(50, ut.skill + 2)),
        eo("돌팔매 조준 및 타격 기술이 향상되었습니다."),
        se())
      : eo("돌팔매 연습을 마쳤습니다."),
    setTimeout(ie, 900);
}
function ce() {
  if (!le(Z.x, Z.z)) {
    const t = [
      [-1500, 1500],
      [-1700, -1300],
      [1550, 1500],
      [1450, -1500],
      [-2200, 300],
    ].find(([t, e]) => le(t, e)) || [-1800, 1200];
    Z.set(t[0], 0, t[1]);
  }
  var t;
  mt.goal && mt.goal.position.set(Z.x, te(Z.x, Z.z) + 3, Z.z),
    mt.goalSite &&
      (mt.goalSite.position.set(Z.x, te(Z.x, Z.z), Z.z),
      (mt.goalSite.rotation.y = Math.atan2(
        ((t = Z.z), 90 * Math.sin(8e-4 * t) - 120 - Z.x),
        420,
      )),
      updateCampStoneGrounding(),
      updateCampPropGrounding());
  mt.sheep.forEach((sheep) => {
    sheep.userData.campArrivalCycle = -1;
  });
}

function loadCampProp(camp, config) {
  const holder = new t.Group();
  holder.name = `${config.name}GroundedHolder`;
  holder.userData.campLocalX = config.position[0];
  holder.userData.campLocalZ = config.position[1];
  holder.userData.campYaw = config.faceCampCenter
    ? Math.atan2(-config.position[0], -config.position[1])
    : config.yaw || 0;
  holder.position.set(config.position[0], 0, config.position[1]);
  holder.visible = false;
  camp.add(holder);
  camp.userData.campProps.push(holder);

  new GLTFLoader().load(
    modelAssetPath(config.url),
    (gltf) => {
      const model = gltf.scene;
      const sourceBounds = new t.Box3().setFromObject(model);
      const sourceSize = sourceBounds.getSize(new t.Vector3());
      const longestSide = Math.max(sourceSize.x, sourceSize.z);
      const scale = config.size / Math.max(longestSide, 0.0001);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);

      // Correct the imported origin from measured geometry rather than using
      // an asset-specific magic Y offset. This guarantees the actual lowest
      // vertex rests on the holder's ground plane.
      const scaledBounds = new t.Box3().setFromObject(model);
      model.position.y -= scaledBounds.min.y;
      model.traverse((part) => {
        if (!part.isMesh) return;
        part.castShadow = false;
        part.receiveShadow = true;
        part.frustumCulled = true;
        if (part.material) {
          const materials = Array.isArray(part.material)
            ? part.material
            : [part.material];
          materials.forEach((material) => {
            material.metalness = 0;
            material.roughness = Math.max(material.roughness ?? 0.8, 0.72);
          });
        }
      });
      holder.add(model);
      holder.visible = true;
      updateCampPropGrounding();
    },
    undefined,
    (error) => console.error(`${config.name} 모델 로딩 실패:`, error),
  );
}

function updateCampPropGrounding() {
  const camp = mt.goalSite;
  const props = camp?.userData?.campProps;
  if (!camp || !props?.length) return;
  const up = new t.Vector3(0, 1, 0);
  const worldNormal = new t.Vector3();
  const localNormal = new t.Vector3();
  const inverseCampYaw = new t.Quaternion().setFromAxisAngle(
    up,
    -camp.rotation.y,
  );
  const cosYaw = Math.cos(camp.rotation.y);
  const sinYaw = Math.sin(camp.rotation.y);
  const worldPoint = (localX, localZ) => ({
    x: camp.position.x + localX * cosYaw + localZ * sinYaw,
    z: camp.position.z - localX * sinYaw + localZ * cosYaw,
  });

  props.forEach((holder) => {
    const localX = holder.userData.campLocalX;
    const localZ = holder.userData.campLocalZ;
    const center = worldPoint(localX, localZ);
    const plusX = worldPoint(localX + 10, localZ);
    const minusX = worldPoint(localX - 10, localZ);
    const plusZ = worldPoint(localX, localZ + 10);
    const minusZ = worldPoint(localX, localZ - 10);
    const centerY = te(center.x, center.z);
    const slopeX = (te(plusX.x, plusX.z) - te(minusX.x, minusX.z)) / 20;
    const slopeZ = (te(plusZ.x, plusZ.z) - te(minusZ.x, minusZ.z)) / 20;
    worldNormal.set(-slopeX, 1, -slopeZ).normalize();
    localNormal.copy(worldNormal).applyQuaternion(inverseCampYaw);
    holder.position.set(localX, centerY - camp.position.y, localZ);
    holder.quaternion.setFromUnitVectors(up, localNormal);
    holder.rotateY(holder.userData.campYaw);
  });
}

function updateCampStoneGrounding() {
  const camp = mt.goalSite;
  const far = mt.campStoneFar;
  const near = mt.campStoneNear;
  const placements = mt.campStonePlacements;
  if (!camp || !far || !near || !placements?.length) return;
  const dummy = new t.Object3D();
  const up = new t.Vector3(0, 1, 0);
  const normal = new t.Vector3();
  const yaw = camp.rotation.y;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const worldPoint = (localX, localZ) => ({
    x: camp.position.x + localX * cosYaw + localZ * sinYaw,
    z: camp.position.z - localX * sinYaw + localZ * cosYaw,
  });
  placements.forEach((placement, index) => {
    const center = worldPoint(placement.x, placement.z);
    const plusX = worldPoint(placement.x + 8, placement.z);
    const minusX = worldPoint(placement.x - 8, placement.z);
    const plusZ = worldPoint(placement.x, placement.z + 8);
    const minusZ = worldPoint(placement.x, placement.z - 8);
    const centerY = te(center.x, center.z);
    const slopeX = (te(plusX.x, plusX.z) - te(minusX.x, minusX.z)) / 16;
    const slopeZ = (te(plusZ.x, plusZ.z) - te(minusZ.x, minusZ.z)) / 16;
    normal.set(-slopeX, 1, -slopeZ).normalize();
    dummy.position.set(placement.x, centerY - camp.position.y + 11, placement.z);
    dummy.quaternion.setFromUnitVectors(up, normal);
    dummy.rotateY(placement.rotation);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    near.setMatrixAt(index, dummy.matrix);
    const lowStone = far.children[index];
    if (lowStone) {
      lowStone.position.copy(dummy.position);
      lowStone.quaternion.copy(dummy.quaternion);
    }
  });
  near.instanceMatrix.needsUpdate = true;
  near.computeBoundingSphere();
}
function le(e, o) {
  if (!Number.isFinite(e) || !Number.isFinite(o)) return !1;
  if (Math.abs(e) > 3280 || Math.abs(o) > 3280) return !1;
  if (Kt(e, o, 760)) return !1;
  if (e > 3040) return !1;
  const n = te(e, o);
  return (
    !(!Number.isFinite(n) || n < -120 || n > 610 || he(e, o) > 0.34) &&
    !jt(new t.Vector3(e, n + 3, o), 230)
  );
}
function he(t, e, o = 42) {
  const n = te(t, e);
  return (
    Math.max(
      Math.abs(te(t + o, e) - n),
      Math.abs(te(t - o, e) - n),
      Math.abs(te(t, e + o) - n),
      Math.abs(te(t, e - o) - n),
    ) / o
  );
}
function de(e, o, n, s, a, i, r, c = 34, l = 0) {
  const h = Math.max(2, Math.floor(o / c)),
    d = o / h,
    p = Math.sin(i),
    u = Math.cos(i);
  for (let o = 0; o < h; o++) {
    const c = (o - (h - 1) / 2) * d,
      m = new t.Mesh(new t.BoxGeometry(18, 24, 22), r);
    m.position.set(
      s + Math.cos(i) * c + p * l,
      n + 12,
      a - Math.sin(i) * c + u * l,
    ),
      (m.rotation.y = i),
      (m.castShadow = !0),
      e.add(m);
  }
}
function pe(e, o, n, s, a, i, r, c, l = 0, h = 1) {
  const d = 138 * h,
    p = 345 * h,
    u = 132 * h,
    m = Math.cos(l),
    f = -Math.sin(l),
    w = Math.sin(l),
    M = Math.cos(l),
    y = [];
  for (const t of [0.55 * -i, 0, 0.55 * i])
    for (const e of [0.55 * -u, 0, 0.55 * u])
      y.push(te(o + s + m * t + w * e, n + a + f * t + M * e));
  const x = Math.min(...y),
    g = Math.max(...y);
  for (const c of [-1, 1]) {
    const h = c * (i / 2 + d / 2),
      y = s + m * h,
      x = a + f * h,
      g = [];
    for (const t of [0.5 * -d, 0, 0.5 * d])
      for (const e of [0.5 * -u, 0, 0.5 * u])
        g.push(te(o + y + m * t + w * e, n + x + f * t + M * e));
    const v = Math.min(...g),
      z = Math.max(...g),
      D = z - v + 42,
      S = new t.Mesh(new t.BoxGeometry(d + 16, D, u + 16), ge(10191458));
    S.position.set(y, v + D / 2 - 8, x),
      (S.rotation.y = l),
      (S.castShadow = !0),
      (S.receiveShadow = !0),
      e.add(S);
    const b = new t.Mesh(new t.BoxGeometry(d, p, u), r);
    b.position.set(y, z - 4 + p / 2, x),
      (b.rotation.y = l),
      (b.castShadow = !0),
      (b.receiveShadow = !0),
      e.add(b),
      de(
        e,
        d,
        z - 4 + p,
        y,
        x,
        l,
        r,
        28,
        Math.sign(y * w + x * M || 1) * u * 0.34,
      ),
      Ot(o + y, n + x, 0.8 * d, 0.8 * u, l, "wall");
  }
  const v = g + p - 70 * h,
    z = new t.Mesh(new t.BoxGeometry(i, 82 * h, 86 * h), r);
  z.position.set(s, v, a), (z.rotation.y = l), (z.castShadow = !0), e.add(z);
  const D = new t.Mesh(new t.BoxGeometry(i + 24, 18, 98), ge(13678991));
  D.position.set(s, v + 48, a), (D.rotation.y = l), e.add(D);
  for (const o of [-1, 1]) {
    const n = new t.Mesh(new t.BoxGeometry(24, g - x + 96, 92), ge(10980972)),
      r = o * (0.5 * i - 12);
    n.position.set(s + m * r, x + (g - x + 96) / 2, a + f * r),
      (n.rotation.y = l),
      e.add(n);
    for (let n = 0; n < 5; n++) {
      const i = new t.Mesh(
        new t.BoxGeometry(34, 18, 98),
        ge(n % 2 ? 12033142 : 13086084),
      );
      i.position.set(s + m * (r - 4 * o), g + 18 + 19 * n, a + f * (r - 4 * o)),
        (i.rotation.y = l),
        (i.castShadow = !0),
        e.add(i);
    }
  }
  de(e, i + 12, v + 58, s, a, l, r, 34, 18 * Math.sign(s * w + a * M || 1));
}
function ue(e, o, n, s, a, i, r, c, l, h = 0) {
  const d = [];
  for (const t of [0.5 * -s, 0, 0.5 * s])
    for (const e of [0.5 * -a, 0, 0.5 * a]) d.push(te(c + o + t, l + n + e));
  const p = Math.min(...d),
    u = Math.max(...d) - 3,
    m = Math.max(20, u - p + 18),
    f = new t.Mesh(new t.BoxGeometry(s + 8, m, a + 8), ge(10257766));
  f.position.set(o, p + m / 2 - 2, n),
    (f.rotation.y = h),
    (f.castShadow = !0),
    (f.receiveShadow = !0),
    e.add(f);
  const w = new t.Mesh(new t.BoxGeometry(s, i, a), r);
  w.position.set(o, u + i / 2, n),
    (w.rotation.y = h),
    (w.castShadow = !0),
    (w.receiveShadow = !0),
    e.add(w);
  const M = new t.Mesh(new t.BoxGeometry(s + 5, 9, a + 5), r);
  M.position.set(o, u + i + 4, n), (M.rotation.y = h), e.add(M);
  const y = new t.Mesh(
    new t.BoxGeometry(Math.max(14, 0.2 * s), Math.min(52, 0.42 * i), 4),
    ge(5522227),
  );
  y.position.set(o, u + Math.min(52, 0.42 * i) / 2, n + 0.5 * a + 2),
    (y.rotation.y = h),
    e.add(y);
  const x = new t.Mesh(new t.BoxGeometry(s + 9, 7, a + 9), ge(14140316));
  x.position.set(o, u + i + 10, n), (x.rotation.y = h), e.add(x);
  for (const r of [-1, 1]) {
    const c = new t.Mesh(
      new t.BoxGeometry(Math.max(9, 0.08 * s), 14, 3),
      ge(5062708),
    );
    c.position.set(o + r * s * 0.25, u + 0.62 * i, n + 0.5 * a + 2),
      (c.rotation.y = h),
      e.add(c);
  }
  Ot(c + o, l + n, 0.84 * s, 0.84 * a, h, "building");
}
function createSouthernJerusalemUpgrade() {
  if (southernJerusalemUpgrade.created || !i || !mt.jerusalem) return;
  southernJerusalemUpgrade.created = true;
  const group = new t.Group();
  group.name = "JerusalemProceduralSurfaceResidentialLayer";
  // Houses and roads use the exact same height function as David, the visible
  // terrain and the original city. No imported-map coordinates are involved.
  const visibleGroundCache = new Map();
  function visibleGroundAt(x, z) {
    const key = `${Math.round(x / 4)},${Math.round(z / 4)}`;
    if (visibleGroundCache.has(key)) return visibleGroundCache.get(key);
    const ground = te(x, z) + 2;
    visibleGroundCache.set(key, ground);
    return ground;
  }
  const stoneMaterials = [
    new t.MeshToonMaterial({ color: 0xbca579, flatShading: true }),
    new t.MeshToonMaterial({ color: 0xcab58a, flatShading: true }),
    new t.MeshToonMaterial({ color: 0xa98f65, flatShading: true }),
  ];
  const roofMaterials = [
    new t.MeshToonMaterial({ color: 0xd5c39c, flatShading: true }),
    new t.MeshToonMaterial({ color: 0xc6b187, flatShading: true }),
    new t.MeshToonMaterial({ color: 0xb9a078, flatShading: true }),
  ];
  const doorMaterial = new t.MeshToonMaterial({ color: 0x493421, flatShading: true });
  const houseGeometry = new t.BoxGeometry(1, 1, 1);
  const roofGeometry = new t.BoxGeometry(1, 1, 1);
  const parapetGeometry = new t.BoxGeometry(1, 1, 1);
  const doorGeometry = new t.BoxGeometry(1, 1, 1);
  const random = ee(2026072619);
  const houses = [];
  // Rebuilt from fixed lots. Roads are cut from this grid, rather than houses
  // being added by an unreliable random-attempt loop.
  for (let zBase = 400; zBase <= 2320; zBase += 92) {
    for (let xBase = -860; xBase <= 860; xBase += 92) {
      const x = xBase + (random() - 0.5) * 13;
      const z = zBase + (random() - 0.5) * 13;
      if (!Kt(x, z, -72)) continue;
      const road = closestPointOnCityRoad(x, z);
      if (road && road.distance < road.width * 0.5 + 15) continue;
      const ground = visibleGroundAt(x, z);
      if (!Number.isFinite(ground)) continue;
      // Do not place a new lot through an original house, wall or landmark.
      // The existing city remains authoritative and the new layer only fills
      // genuinely open blocks between its streets.
      if (jt(new t.Vector3(x, ground + 8, z), 34)) continue;
      const width = 72 + random() * 12;
      const depth = 70 + random() * 13;
      const tierWave = Math.floor((Math.abs(xBase) / 92 + (zBase - 400) / 92) % 4);
      const tier = Math.min(3, Math.max(0, tierWave + (random() > 0.82 ? 1 : 0)));
      const height = 72 + tier * 22 + random() * 8;
      const rotation = Math.round(random() * 3) * Math.PI / 2;
      houses.push({
        x,
        z,
        ground,
        width,
        depth,
        height,
        rotation,
        material: Math.floor(random() * 3),
      });
    }
  }
  southernJerusalemUpgrade.houseCount = houses.length;
  // Fill the centres of the real blocks, not the shoulders of a road. The
  // previous x=±142 candidates sat only 23 units from the x=±165 lanes, so the
  // road-clearance test rejected every candidate and could add zero houses.
  // These anchors lie between the shared road segments and never replace the
  // grid houses above; they only add a compact house to a genuinely empty lot.
  const infillBlockCentres = [];
  for (const x of [-610, -425, -250, 250, 425, 610])
    for (const z of [590, 895, 1175, 1460, 1740, 2020])
      infillBlockCentres.push([x, z]);
  let infillHouseCount = 0;
  for (const [baseX, baseZ] of infillBlockCentres) {
    const width = 54 + random() * 7;
    const depth = 54 + random() * 7;
    let chosen = null;
    // Search a small area inside the same block. This handles an original
    // imported house occupying the exact centre without crossing a road.
    for (const [offsetX, offsetZ] of [
      [0, 0], [-18, 0], [18, 0], [0, -18], [0, 18],
    ]) {
      const x = baseX + offsetX;
      const z = baseZ + offsetZ;
      if (!Kt(x, z, -72)) continue;
      const road = closestPointOnCityRoad(x, z);
      const lotRadius = Math.max(width, depth) * 0.5;
      if (road && road.distance < road.width * 0.5 + lotRadius + 18) continue;
      if (
        houses.some(
          (house) =>
            Math.abs(house.x - x) < (house.width + width) * 0.54 &&
            Math.abs(house.z - z) < (house.depth + depth) * 0.54,
        )
      )
        continue;
      const ground = visibleGroundAt(x, z);
      if (
        !Number.isFinite(ground) ||
        jt(new t.Vector3(x, ground + 8, z), lotRadius + 5)
      )
        continue;
      chosen = { x, z, ground };
      break;
    }
    if (!chosen) continue;
    houses.push({
      ...chosen,
      width,
      depth,
      height: 78 + random() * 34,
      rotation: Math.round(random()) * Math.PI / 2,
      material: Math.floor(random() * 3),
    });
    infillHouseCount++;
  }
  southernJerusalemUpgrade.houseCount = houses.length;
  southernJerusalemUpgrade.houses = houses;
  // The supplied image-to-3D house meshes are unsuitable for city-wide
  // replication: even their reduced versions are too dense and contain
  // reconstruction artifacts. Keep every lot on the stable instanced house
  // renderer so geometry, collision and roof height remain consistent.
  houses.forEach((house) => {
    house.detailed = false;
  });

  // Keep road coordinates for lot spacing, minimap and sheep navigation only.
  // No visible stone-road geometry is generated inside the city.
  const roadTiles = [];
  for (const [start, end, width] of Xt) {
    const dx = end[0] - start[0], dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(length / 54));
    const angle = Math.atan2(dx, dz);
    for (let step = 0; step < steps; step++) {
      const amount = (step + 0.5) / steps;
      const x = t.MathUtils.lerp(start[0], end[0], amount);
      const z = t.MathUtils.lerp(start[1], end[1], amount);
      if (!Kt(x, z, -58)) continue;
      roadTiles.push({
        x,
        z,
        y: visibleGroundAt(x, z) + 2.2,
        width: Math.max(24, width),
        length: length / steps + 7,
        angle,
      });
    }
  }
  for (let materialIndex = 0; materialIndex < stoneMaterials.length; materialIndex++) {
    const selected = houses.filter(
      (house) => house.material === materialIndex && !house.detailed,
    );
    const mesh = new t.InstancedMesh(houseGeometry, stoneMaterials[materialIndex], selected.length);
    const dummy = new t.Object3D();
    selected.forEach((house, index) => {
      dummy.position.set(house.x, house.ground + house.height / 2 + 2, house.z);
      dummy.rotation.set(0, house.rotation, 0);
      dummy.scale.set(house.width, house.height, house.depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.computeBoundingSphere();
    mesh.frustumCulled = false;
    group.add(mesh);

    const roofs = new t.InstancedMesh(roofGeometry, roofMaterials[materialIndex], selected.length);
    selected.forEach((house, index) => {
      dummy.position.set(house.x, house.ground + house.height + 5, house.z);
      dummy.rotation.set(0, house.rotation, 0);
      dummy.scale.set(house.width + 7, 10, house.depth + 7);
      dummy.updateMatrix();
      roofs.setMatrixAt(index, dummy.matrix);
    });
    roofs.instanceMatrix.needsUpdate = true;
    roofs.frustumCulled = false;
    group.add(roofs);
  }
  // Four low parapet runs per roof. These make the residential quarter read as
  // real flat-roofed houses from street level without adding hundreds of meshes.
  for (let edge = 0; edge < 4; edge++) {
    const parapets = new t.InstancedMesh(
      parapetGeometry,
      roofMaterials[edge % roofMaterials.length],
      houses.filter((house) => !house.detailed).length,
    );
    const dummy = new t.Object3D();
    houses.filter((house) => !house.detailed).forEach((house, index) => {
      const horizontal = edge < 2;
      const side = edge % 2 === 0 ? -1 : 1;
      const localX = horizontal ? 0 : side * (house.width / 2 + 1);
      const localZ = horizontal ? side * (house.depth / 2 + 1) : 0;
      const cos = Math.cos(house.rotation), sin = Math.sin(house.rotation);
      dummy.position.set(
        house.x + localX * cos + localZ * sin,
        house.ground + house.height + 14,
        house.z - localX * sin + localZ * cos,
      );
      dummy.rotation.set(0, house.rotation, 0);
      dummy.scale.set(horizontal ? house.width + 7 : 8, 12, horizontal ? 8 : house.depth + 7);
      dummy.updateMatrix();
      parapets.setMatrixAt(index, dummy.matrix);
    });
    parapets.instanceMatrix.needsUpdate = true;
    parapets.frustumCulled = false;
    group.add(parapets);
  }
  const simpleHouses = houses.filter((house) => !house.detailed);
  const doors = new t.InstancedMesh(doorGeometry, doorMaterial, simpleHouses.length);
  const doorDummy = new t.Object3D();
  simpleHouses.forEach((house, index) => {
    const side = index % 4;
    const direction = house.rotation + side * Math.PI / 2;
    const alongX = Math.sin(direction);
    const alongZ = Math.cos(direction);
    const outward = side % 2 === 0 ? house.depth / 2 + 1.2 : house.width / 2 + 1.2;
    const ground = house.ground;
    house.doorX = house.x + alongX * outward;
    house.doorZ = house.z + alongZ * outward;
    house.doorDirection = direction;
    doorDummy.position.set(house.doorX, ground + 23, house.doorZ);
    doorDummy.rotation.set(0, direction, 0);
    doorDummy.scale.set(18, 42, 3);
    doorDummy.updateMatrix();
    doors.setMatrixAt(index, doorDummy.matrix);
    // The roof box is centred five units above the wall and is ten units thick,
    // so its true walkable upper face is wallTop + 10.
    const roofSurface = ground + house.height + 10;
    Ot(
      house.x,
      house.z,
      house.width + 7,
      house.depth + 7,
      house.rotation,
      "building",
      ground,
      roofSurface,
    );
  });
  doors.instanceMatrix.needsUpdate = true;
  doors.castShadow = false;
  doors.computeBoundingSphere();
  doors.frustumCulled = false;
    group.add(doors);

  // Detailed lots use their measured model height for the walkable collision
  // top. This avoids an invisible roof plane floating above a shorter model.
  houses.filter((house) => house.detailed).forEach((house) => {
    Ot(
      house.x,
      house.z,
      house.width,
      house.depth,
      house.rotation,
      "building",
      house.ground,
      house.ground + house.modelHeight,
    );
  });

  // Near LOD: every current lot receives one of the three supplied house
  // models. Geometry and textures remain shared between clones; only transforms
  // differ. Uniform scaling prevents the six-view models from being stretched.
  const detailedGroup = new t.Group();
  detailedGroup.name = "JerusalemDetailedHouseLOD";
  detailedGroup.visible = false;
  if (houseModelTemplates) {
    houses.filter((house) => house.detailed).forEach((house, index) => {
      const kind = house.modelKind;
      const template = houseModelTemplates[kind];
      const native = template.userData.nativeSize;
      const quarterTurn = house.rotation + (native.z > native.x ? Math.PI / 2 : 0);
      const building = template.clone(true);
      building.name = `JerusalemHouse_${kind}_${index}`;
      building.scale.set(
        house.modelScale.x,
        house.modelScale.y,
        house.modelScale.z,
      );
      building.rotation.y = quarterTurn;
      building.position.set(house.x, house.ground - 1.5, house.z);
      building.traverse((part) => {
        if (part.isMesh) part.frustumCulled = true;
      });
      detailedGroup.add(building);
    });
  }
  i.add(detailedGroup);
  southernJerusalemUpgrade.detailedGroup = detailedGroup;
  southernJerusalemUpgrade.proceduralGroup = group;

  // City torches are created before this residential layer. Revalidate them
  // after all new house colliders exist, place them on an actual mapped lane,
  // and keep only well-spaced fixtures. This prevents a later-added house from
  // swallowing a torch while retaining the distance-based light optimisation.
  const acceptedTorchPositions = [];
  for (const torch of mt.cityTorches || []) {
    if (!torch?.parent || torch.userData?.campTorch) continue;
    torch.getWorldPosition(wt);
    const road = closestPointOnCityRoad(wt.x, wt.z);
    if (!road) {
      torch.visible = false;
      torch.userData.disabledByRoadValidation = true;
      continue;
    }
    let placement = null;
    const [roadStart, roadEnd] = Xt[road.index];
    for (let step = 0; step <= 16 && !placement; step++) {
      for (const direction of step ? [-1, 1] : [0]) {
        const amount = t.MathUtils.clamp(
          road.amount + direction * step * 0.022,
          0,
          1,
        );
        const x = t.MathUtils.lerp(roadStart[0], roadEnd[0], amount);
        const z = t.MathUtils.lerp(roadStart[1], roadEnd[1], amount);
        const probe = new t.Vector3(x, te(x, z) + 48, z);
        if (
          jt(probe, 11) ||
          acceptedTorchPositions.some(
            (other) => Math.hypot(other.x - x, other.z - z) < 175,
          )
        )
          continue;
        placement = { x, z };
        break;
      }
    }
    if (!placement) {
      torch.visible = false;
      torch.userData.disabledByRoadValidation = true;
      continue;
    }
    const local = torch.parent.worldToLocal(
      new t.Vector3(placement.x, te(placement.x, placement.z), placement.z),
    );
    torch.position.copy(local);
    torch.userData.roadOnly = true;
    torch.userData.disabledByRoadValidation = false;
    acceptedTorchPositions.push(placement);
  }

  // The earlier earthen ramps, raised towers and extra wall walk are deliberately
  // removed. The original imported southern wall remains untouched at its native
  // height and silhouette.
  i.add(group);
  mt.southernJerusalemUpgrade = group;
  console.info(
    `[Jerusalem] visible-surface quarter rendered: ${houses.length} houses (${infillHouseCount} verified infill); visible stone roads removed`,
  );
}
function me(e, o, n, s, a, i, r) {
  const c = Math.max(12, Math.ceil(Math.hypot(n[0] - o[0], n[1] - o[1]) / 32)),
    l = [],
    h = [];
  for (let e = 0; e <= c; e++) {
    const r = e / c,
      d = t.MathUtils.lerp(o[0], n[0], r),
      p = t.MathUtils.lerp(o[1], n[1], r),
      u = n[0] - o[0],
      m = n[1] - o[1],
      f = Math.hypot(u, m) || 1,
      w = ((-m / f) * s) / 2,
      M = ((u / f) * s) / 2;
    for (const t of [-1, 1]) {
      const e = d + w * t,
        o = p + M * t;
      l.push(e, te(a + e, i + o) + 0.06, o);
    }
    if (e < c) {
      const t = 2 * e;
      h.push(t, t + 2, t + 1, t + 2, t + 3, t + 1);
    }
  }
  const d = new t.BufferGeometry();
  d.setAttribute("position", new t.Float32BufferAttribute(l, 3)),
    d.setIndex(h),
    d.computeVertexNormals();
  const p = new t.Mesh(d, r);
  return (p.receiveShadow = !0), e.add(p), p;
}
function fe(e, o, n, s, a, i = 0) {
  const r = new t.Group(),
    worldX = o + s,
    worldZ = n + a;
  // Road-derived city torches must not appear inside the purchased Temple
  // architecture.  The Temple keeps its dedicated shadow-free night light.
  if (
    dt &&
    worldX >= dt.courtXMin - 30 &&
    worldX <= dt.courtXMax + 30 &&
    worldZ >= dt.courtZMin - 30 &&
    worldZ <= dt.courtZMax + 30
  )
    return null;
  const c = te(worldX, worldZ) + i;
  r.position.set(s, c, a);
  const l = new t.Mesh(new t.CylinderGeometry(4.2, 5.6, 92, 9), ge(5978659));
  (l.position.y = 46), (l.castShadow = !0), r.add(l);
  const h = new t.Mesh(new t.CylinderGeometry(12, 7, 10, 10), ge(4010022));
  (h.position.y = 94), r.add(h);
  const d = new t.MeshBasicMaterial({
      color: 16743204,
      transparent: !0,
      opacity: 0,
      depthWrite: !1,
    }),
    p = new t.Mesh(new t.ConeGeometry(9, 27, 9), d);
  (p.position.y = 112), r.add(p);
  const u = new t.PointLight(16752954, 0, 430, 1.25);
  return (
    (u.position.y = 108),
    r.add(u),
    (r.userData = { flame: p, glow: u, phase: Math.random() * Math.PI * 2 }),
    e.add(r),
    mt.cityTorches.push(r),
    r
  );
}
function we(e, o, n = 22, s = 0.72) {
  const a = e.map(([e, o]) => new t.Vector3(e, te(e, o) + 2, o)),
    r = new t.CatmullRomCurve3(a),
    c = new t.Mesh(
      new t.TubeGeometry(r, 220, n, 8, !1),
      new t.MeshToonMaterial({
        color: o,
        flatShading: !0,
        transparent: !0,
        opacity: s,
      }),
    );
  return (c.scale.y = 0.035), (c.receiveShadow = !0), i.add(c), c;
}
function Me(e, o, n = 1) {
  if (zt(e, o, 120) || Kt(e, o, -20)) return null;
  const s = new t.Group();
  (s.userData.isTree = !0), ze(s, 12, 20, 105, [0, 52, 0], 6965809, 8);
  for (let e = 0; e < 7; e++) {
    const o = new t.Mesh(
      new t.IcosahedronGeometry(35 + (e % 3) * 8, 1),
      ge(e % 2 ? 6846542 : 8095322),
    );
    o.scale.set(1.2, 0.65, 1),
      o.position.set(
        32 * ((e % 3) - 1),
        105 + (e % 2) * 22,
        26 * (Math.floor(e / 3) - 1),
      ),
      s.add(o);
  }
  s.position.set(e, te(e, o), o), s.scale.setScalar(n), i.add(s);
}
let ye = null;
function xe() {
  if (ye) return ye;
  const e = new Uint8Array([
      38, 38, 38, 100, 100, 100, 174, 174, 174, 235, 235, 235,
    ]),
    o = new t.DataTexture(e, 4, 1, t.RedFormat);
  return (
    (o.minFilter = o.magFilter = t.NearestFilter),
    (o.needsUpdate = !0),
    (ye = o),
    o
  );
}
function ge(e) {
  return new t.MeshToonMaterial({
    color: e,
    flatShading: !0,
    gradientMap: xe(),
  });
}

// Jerusalem was authored from many small boxes, cylinders and road pieces.
// Submitting each immutable piece as a separate draw call was the main city
// slowdown. Merge only opaque, untextured toon meshes into spatial cells:
// silhouettes, colours and collision data stay unchanged, while the renderer
// can cull whole neighbourhood cells and draw them in a small number of calls.
function batchJerusalemStaticGeometry(root) {
  if (!root || root.userData.staticGeometryBatched) return;
  root.userData.staticGeometryBatched = true;
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const worldPosition = new t.Vector3();
  const relativeMatrix = new t.Matrix4();
  const buckets = new Map();
  const candidates = [];
  const isDynamicOrProtected = (mesh) => {
    for (let node = mesh; node && node !== root; node = node.parent) {
      if (
        node.userData?.neverOcclude ||
        node.userData?.flame ||
        node.userData?.glow ||
        node.userData?.isDynamicCityAsset ||
        /Temple|Altar|Laver|Fire|Torch|Kohen|Guard/i.test(node.name || "")
      ) return true;
    }
    return false;
  };
  root.traverse((mesh) => {
    if (
      !mesh.isMesh ||
      mesh.isSkinnedMesh ||
      mesh.isInstancedMesh ||
      isDynamicOrProtected(mesh)
    ) return;
    const material = mesh.material;
    const geometry = mesh.geometry;
    if (
      Array.isArray(material) ||
      !material?.isMeshToonMaterial ||
      material.transparent ||
      material.opacity < 0.999 ||
      material.map ||
      material.alphaMap ||
      material.aoMap ||
      material.lightMap ||
      material.normalMap ||
      !geometry?.attributes?.position
    ) return;
    mesh.getWorldPosition(worldPosition);
    const cellX = Math.floor(worldPosition.x / 620);
    const cellZ = Math.floor(worldPosition.z / 620);
    const attributes = Object.entries(geometry.attributes)
      .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`)
      .sort()
      .join(",");
    const key = [
      cellX,
      cellZ,
      material.color?.getHexString?.() || "none",
      material.gradientMap?.uuid || "no-gradient",
      material.side,
      material.vertexColors ? 1 : 0,
      material.fog ? 1 : 0,
      material.depthTest ? 1 : 0,
      material.depthWrite ? 1 : 0,
      mesh.castShadow ? 1 : 0,
      mesh.receiveShadow ? 1 : 0,
      geometry.index ? 1 : 0,
      attributes,
    ].join("|");
    if (!buckets.has(key))
      buckets.set(key, {
        geometries: [],
        material,
        castShadow: mesh.castShadow,
        receiveShadow: mesh.receiveShadow,
      });
    relativeMatrix.multiplyMatrices(rootInverse, mesh.matrixWorld);
    const transformed = geometry.clone();
    transformed.applyMatrix4(relativeMatrix);
    buckets.get(key).geometries.push(transformed);
    candidates.push(mesh);
  });
  if (!candidates.length) return;
  candidates.forEach((mesh) => mesh.parent?.remove(mesh));
  const batches = [];
  let sourceMeshCount = 0;
  for (const bucket of buckets.values()) {
    for (let start = 0; start < bucket.geometries.length; start += 72) {
      const geometries = bucket.geometries.slice(start, start + 72);
      const merged = mergeGeometries(geometries, false);
      if (!merged) continue;
      sourceMeshCount += geometries.length;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      // Camera obstruction code uses this lightweight height hint.
      merged.parameters = { height: 220 };
      const batch = new t.Mesh(merged, bucket.material);
      batch.name = `JerusalemStaticBatch_${batches.length}`;
      batch.castShadow = bucket.castShadow;
      batch.receiveShadow = bucket.receiveShadow;
      batch.frustumCulled = true;
      batch.userData.cityStaticBatch = true;
      batch.userData.distanceHidden = false;
      const sphere = merged.boundingSphere;
      batch.userData.batchCenterX = sphere?.center.x || 0;
      batch.userData.batchCenterZ = sphere?.center.z || 0;
      batch.userData.batchRadius = sphere?.radius || 0;
      root.add(batch);
      batches.push(batch);
    }
  }
  performanceState.cityStaticBatches = batches;
  console.info(
    `[Jerusalem] ${sourceMeshCount} static meshes merged into ${batches.length} spatial batches`,
  );
}
function ve(e, o, n, s) {
  const a = new t.Mesh(new t.BoxGeometry(...o), ge(s));
  return (
    a.position.set(...n),
    (a.castShadow = !0),
    (a.receiveShadow = !0),
    e.add(a),
    a
  );
}
function ze(e, o, n, s, a, i, r = 7) {
  const c = new t.Mesh(new t.CylinderGeometry(o, n, s, r), ge(i));
  return c.position.set(...a), (c.castShadow = !0), e.add(c), c;
}
function De() {
  return createDavidModel({
    THREE: t,
    material: ge,
    groundOffset: pt,
    scene: i,
    runtime: mt,
  });
  /*
  return (function () {
    const e = new t.Group();
    (e.userData.velocity = new t.Vector3()),
      (e.userData.verticalVelocity = 0),
      (e.userData.grounded = !0),
      (e.userData.walkPhase = 0),
      (e.userData.lastSafePosition = new t.Vector3());
    const o = ge(12155477),
      n = ge(14271887),
      s = ge(16118248),
      a = ge(3043218),
      r = ge(6308651),
      c = ge(13194541),
      l = ge(15260839),
      h = ge(7557166),
      d = new t.Group();
    e.add(d), (e.userData.bodyRoot = d);
    const p = new t.SphereGeometry(1, 16, 12),
      u = p.attributes.position;
    for (let e = 0; e < u.count; e++) {
      let o = u.getX(e),
        n = u.getY(e),
        s = u.getZ(e);
      const a = 1 - 0.34 * t.MathUtils.clamp((0.05 - n) / 1.05, 0, 1);
      u.setXYZ(e, o * a, 1.1 * n, s * a);
    }
    p.computeVertexNormals();
    const m = new t.Mesh(p, o);
    m.scale.set(21.5, 25, 19.5),
      m.position.set(0, 70, 0),
      (m.castShadow = !0),
      d.add(m);
    const f = new t.Mesh(new t.ConeGeometry(3.2, 10, 5), o);
    (f.rotation.x = Math.PI / 2),
      f.position.set(0, 65, 20.5),
      (f.castShadow = !0),
      d.add(f);
    const w = new t.Mesh(new t.SphereGeometry(1, 14, 10), c);
    w.scale.set(20.8, 18.5, 19.8),
      w.position.set(0, 74, -6.2),
      (w.castShadow = !0),
      d.add(w);
    for (let e = 0; e < 16; e++) {
      const o = (e / 16) * Math.PI * 2,
        n = Math.cos(o) * 18.2 - 2;
      if (n > 8 && Math.abs(Math.sin(o)) < 0.62) continue;
      const s = new t.Mesh(new t.IcosahedronGeometry(3.65, 1), c);
      s.position.set(Math.sin(o) * 19.2, 79, n),
        s.scale.set(1.08, 0.88, 1),
        (s.castShadow = !0),
        d.add(s);
    }
    for (let e = 0; e < 2; e++)
      for (let o = 0; o < 13; o++) {
        const n = (o / 13) * Math.PI * 2,
          s = Math.cos(n) * (17.2 - 0.6 * e) - 5;
        if (s > 1) continue;
        const a = new t.Mesh(new t.IcosahedronGeometry(3.65 - 0.2 * e, 1), c);
        a.position.set(Math.sin(n) * (18.5 - 0.6 * e), 73 - 6 * e, s),
          a.scale.set(1.08, 0.9, 1),
          (a.castShadow = !0),
          d.add(a);
      }
    for (let e = 0; e < 4; e++) {
      const o = new t.Mesh(new t.TorusGeometry(21 - 0.7 * e, 3.8, 6, 18), l);
      (o.rotation.x = Math.PI / 2),
        (o.rotation.z = 0.07 * (e - 1.5)),
        (o.position.y = 86 + 3.4 * e),
        (o.castShadow = !0),
        d.add(o);
    }
    const M = new t.Mesh(new t.DodecahedronGeometry(15, 1), l);
    M.scale.set(1.15, 0.55, 1),
      M.position.set(2, 99, -1),
      (M.rotation.z = -0.18),
      d.add(M);
    const y = new t.Mesh(new t.CylinderGeometry(22, 18, 54, 8), n);
    y.position.set(0, 24, 0), (y.castShadow = !0), d.add(y);
    const x = new t.Mesh(new t.CylinderGeometry(22, 17, 28, 8), n);
    x.position.set(0, -17, 0), (x.castShadow = !0), d.add(x);
    const g = new t.Mesh(new t.TorusGeometry(19.5, 3.1, 6, 18), r);
    (g.rotation.x = Math.PI / 2), (g.position.y = -2), d.add(g);
    const v = new t.Mesh(new t.BoxGeometry(47, 54, 3.8), s);
    v.position.set(0, 21, 15.8), (v.castShadow = !0), d.add(v);
    const z = new t.Mesh(new t.BoxGeometry(47, 54, 3.8), s);
    z.position.set(0, 21, -15.8), (z.castShadow = !0), d.add(z);
    const ztFront = new t.Mesh(new t.CircleGeometry(13, 3), s);
    (ztFront.rotation.z = Math.PI / 2),
      (ztFront.scale.y = 0.58),
      ztFront.position.set(0, 43, 16.15),
      (ztFront.castShadow = !0),
      d.add(ztFront);
    const ztBack = new t.Mesh(new t.CircleGeometry(13, 3), s);
    (ztBack.rotation.z = -Math.PI / 2),
      (ztBack.rotation.y = Math.PI),
      (ztBack.scale.y = 0.58),
      ztBack.position.set(0, 43, -16.15),
      (ztBack.castShadow = !0),
      d.add(ztBack);
    for (const e of [-1, 1]) {
      const o = new t.Mesh(new t.BoxGeometry(12, 5, 34), s);
      o.position.set(16.5 * e, 44, 0), d.add(o);
    }
    const D = {};
    for (const [e, s] of [
      [-1, "leftArm"],
      [1, "rightArm"],
    ]) {
      const a = new t.Group();
      a.position.set(27 * e, 43, 0), d.add(a);
      const i = new t.Mesh(new t.CylinderGeometry(6.3, 5.6, 24, 7), n);
      (i.position.y = -12), a.add(i);
      const r = new t.Mesh(new t.CylinderGeometry(5.1, 4.7, 33, 7), o);
      (r.position.y = -40.5), a.add(r);
      const c = new t.Mesh(new t.DodecahedronGeometry(5.4, 1), o);
      c.scale.set(0.8, 1.05, 0.72), (c.position.y = -59), a.add(c), (D[s] = a);
    }
    D.leftArm.rotation.z = -0.18;
    for (const [e, n] of [
      [-1, "leftLeg"],
      [1, "rightLeg"],
    ]) {
      const s = new t.Group();
      s.position.set(10 * e, -30, 0), d.add(s);
      const a = new t.Mesh(new t.CylinderGeometry(4.2, 4.8, 25, 7), o);
      (a.position.y = -12.5), s.add(a);
      const i = new t.Mesh(new t.BoxGeometry(10, 5, 17), r);
      i.position.set(0, -27, 3.2), s.add(i), (D[n] = s);
    }
    e.userData.limbs = D;
    const S = new t.Mesh(new t.CylinderGeometry(3.6, 5.8, 36, 7), h);
    S.position.set(25, -3, -7), (S.rotation.z = 0.12), d.add(S);
    const b = new t.Mesh(new t.CylinderGeometry(7.4, 4.5, 165, 8), h);
    b.position.set(-36, -5, -5),
      (b.rotation.z = -0.02),
      d.add(b),
      (e.userData.staff = b),
      (e.userData.staffSwing = 0);
    const G = ge(16051939);
    for (const [e, o] of [
      [-20, 17],
      [-20, -17],
      [20, 17],
      [20, -17],
    ]) {
      const n = new t.Group();
      n.position.set(e, -5, o);
      for (let e = 0; e < 4; e++) {
        const o = new t.Mesh(
          new t.CylinderGeometry(0.75, 0.75, 31, 5),
          1 === e ? a : G,
        );
        o.position.set(1.9 * (e - 1.5), -16, 0), n.add(o);
      }
      d.add(n);
    }
    return (
      e.scale.setScalar(0.54),
      (e.userData.groundOffset = pt),
      i.add(e),
      (mt.player = e),
      (function (e) {
        if (!e) return;
        const o = new t.Group();
        o.position.set(-36, 70, -5);
        const n = new t.MeshBasicMaterial({
            color: 16742946,
            transparent: !0,
            opacity: 0,
            depthWrite: !1,
          }),
          s = new t.Mesh(new t.ConeGeometry(8.5, 28, 9), n);
        (s.position.y = 18), o.add(s);
        const a = new t.PointLight(16752957, 0, 520, 1.15);
        (a.position.y = 16),
          o.add(a),
          (o.userData = { flame: s, glow: a, phase: 6.28 * Math.random() }),
          e.add(o),
          (mt.staffNightLight = o);
      })(e),
      e
    );
  })(); */
}
function Se(e) {
  const o = new t.Group(),
    n = ge(e % 4 == 0 ? 13220245 : 14668985),
    s = ge(e % 3 == 0 ? 12035971 : 13352349),
    a = ge(e % 5 == 0 ? 4866104 : 3157033),
    r = ge(15854296),
    c = ge(1512723),
    l = ge(2433310),
    h = new t.Mesh(new t.IcosahedronGeometry(30, 2), n);
  h.scale.set(1.36, 0.83, 0.9),
    (h.position.y = 34),
    (h.castShadow = !0),
    o.add(h);
  for (let e = 0; e < 14; e++) {
    const a = (e / 14) * Math.PI * 2,
      i = new t.Mesh(
        new t.IcosahedronGeometry(7 + (e % 3) * 1.2, 1),
        e % 2 ? n : s,
      );
    i.scale.set(1.25, 0.72, 0.86),
      i.position.set(25 * Math.cos(a), 35 + (e % 4) * 4, 18 * Math.sin(a)),
      o.add(i);
  }
  const d = new t.Mesh(new t.CylinderGeometry(6.5, 9.5, 21, 8), a);
  (d.rotation.z = -0.32), d.position.set(29, 39, 0), o.add(d);
  const p = new t.Mesh(new t.IcosahedronGeometry(13.5, 2), a);
  p.scale.set(0.78, 1.22, 0.7),
    p.position.set(43, 42, 0),
    (p.castShadow = !0),
    o.add(p);
  const u = new t.Mesh(new t.ConeGeometry(6.3, 13, 7), a);
  (u.rotation.z = -Math.PI / 2),
    u.scale.set(0.72, 0.92, 0.68),
    u.position.set(47.2, 35.3, 0),
    o.add(u);
  const m = ge(1512723);
  for (const e of [-1, 1]) {
    const n = new t.Mesh(new t.ConeGeometry(4.6, 17, 8), a);
    (n.rotation.z = (e * Math.PI) / 2),
      n.position.set(38.5, 46.5, 12.2 * e),
      n.scale.set(1, 0.62, 1),
      o.add(n);
    const s = new t.Mesh(new t.SphereGeometry(3.4, 10, 8), r);
    s.scale.set(0.42, 1, 0.72), s.position.set(52.3, 44.3, 5.4 * e), o.add(s);
    const i = new t.Mesh(new t.SphereGeometry(1.45, 8, 6), c);
    i.scale.set(0.36, 1, 0.65), i.position.set(53.5, 44.1, 5.45 * e), o.add(i);
    const l = new t.Mesh(new t.SphereGeometry(0.85, 7, 5), m);
    l.scale.set(0.35, 0.75, 0.55),
      l.position.set(52.9, 34.9, 2.15 * e),
      o.add(l);
  }
  const f = [];
  [
    [-18, -11],
    [-18, 11],
    [19, -11],
    [19, 11],
  ].forEach(([e, n]) => {
    const s = new t.Group();
    s.position.set(e, 29, n), o.add(s);
    const i = new t.Mesh(new t.CylinderGeometry(2.8, 3.4, 28, 7), a);
    (i.position.y = -14), s.add(i);
    const r = new t.Mesh(new t.BoxGeometry(5.5, 4, 8), l);
    r.position.set(1.5, -29, 0), s.add(r), f.push(s);
  });
  const w = new t.Mesh(new t.IcosahedronGeometry(6.5, 1), n);
  return (
    w.scale.set(0.9, 1.15, 0.85),
    w.position.set(-40, 39, 0),
    o.add(w),
    (o.userData = {
      phase: 0.73 * e,
      target: new t.Vector3(),
      thirst: 100,
      recallUntil: 0,
      stuckTime: 0,
      lastPos: new t.Vector3(),
      lastBleat: 0,
      legs: f,
      runPhase: 0.9 * e,
      hp: 100,
      maxHp: 100,
      fear: 0,
      fearDirection: new t.Vector3(),
      fearJitter: (e * 1.61803398875 % 1 - 0.5) * 0.9,
      // 86% is the absolute largest sheep. Most of the flock remains smaller,
      // so no sheep visually rivals David's body size.
      modelScale: 0.68 + ((e * 37) % 10) * 0.02,
    }),
    i.add(o),
    mt.sheep.push(o),
    applySheepModel(o),
    o
  );
}
function be(e, o, n) {
  const s = {
      "거친 돌": 7101513,
      "둥근 돌": 8945784,
      "좋은 돌": 10718572,
      "큰 돌": 5589824,
    }[e],
    a = new t.Mesh(
      new t.DodecahedronGeometry("큰 돌" === e ? 9 : 6.2, 0),
      ge(s),
    );
  a.position.set(o, te(o, n) + 4, n),
    (a.castShadow = !0),
    (a.userData = { quality: e, pickup: !0 }),
    i.add(a),
    mt.rocks.push(a);
}
function Ge(t) {
  t.userData.healthUI?.wrap?.remove(), (t.userData.healthUI = null);
}
// The four Tripo quadrupeds were authored with different local forward axes.
// Movement rotates the predator container so +Z faces its target, while the
// legacy sheep container uses +X as its forward direction. Keep the model-axis
// correction on the imported child only so AI steering, hitboxes, sizes and
// procedural bone animation remain unchanged.
const IMPORTED_ANIMAL_FACING_Y = Object.freeze({
  // Rest-pose heading measured from the rig's tail/spine toward its head.
  sheep: 2.3749,
  lion: 0.7378,
  wolf: 1.5759,
  fox: 0.0265,
});
function loadLionModel() {
  if (lionModelPromise) return lionModelPromise;
  lionModelPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      modelAssetPath("./assets/models/animals/lion_rigged_game.glb"),
      (gltf) => {
        const model = gltf.scene;
        lionModelTemplate = model;
        model.traverse((obj) => {
          if (obj.isMesh || obj.isSkinnedMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            const materials = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            for (const material of materials) {
              if (!material) continue;
              material.side = t.FrontSide;
              material.transparent = false;
              material.depthWrite = true;
              if (material.map) {
                material.map.colorSpace = t.SRGBColorSpace;
                material.map.anisotropy = Math.min(4, i?.capabilities?.getMaxAnisotropy?.() || 1);
                material.map.needsUpdate = true;
              }
              material.needsUpdate = true;
            }
          }
        });
        prepareImportedAnimalModel(model);
        resolve(model);
      },
      undefined,
      (error) => {
        console.warn("사자 3D 모델을 불러오지 못해 기존 사자 모델을 사용합니다.", error);
        lionModelPromise = null;
        reject(error);
      },
    );
  });
  return lionModelPromise;
}
function applyLionModel(enemy, fallbackModel) {
  loadLionModel()
    .then((template) => {
      if (!enemy.parent || enemy.userData.type !== "lion") return;
      const model = cloneSkinnedModel(template);
      model.name = "Lion3DModel";
      model.updateMatrixWorld(true);
      const initialBox = new t.Box3().setFromObject(model);
      const initialSize = initialBox.getSize(new t.Vector3());
      const longest = Math.max(initialSize.x, initialSize.z, 0.001);
      const scale = 92 / longest;
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);
      const box = new t.Box3().setFromObject(model);
      const center = box.getCenter(new t.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      model.rotation.y = IMPORTED_ANIMAL_FACING_Y.lion;
      enemy.add(model);
      fallbackModel.visible = false;
      enemy.userData.animalRig = createRiggedAnimalAnimation(model, "lion");
      enemy.userData.lion3D = model;
      enemy.userData.importedModel = model;
      enemy.userData.importedModelBaseY = model.position.y;
    })
    .catch(() => {
      fallbackModel.visible = true;
    });
}

function prepareImportedAnimalModel(model) {
  model.traverse((obj) => {
    if (!(obj.isMesh || obj.isSkinnedMesh)) return;
    // Imported animal meshes are visually detailed and duplicated across the
    // flock. Keeping them out of the shadow pass removes the largest repeated
    // GPU cost while the terrain still supplies grounding shadows.
    obj.castShadow = false;
    obj.receiveShadow = false;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      if (!material) continue;
      material.side = t.FrontSide;
      material.transparent = false;
      material.depthWrite = true;
      material.roughness = Math.max(0.68, material.roughness ?? 0.68);
      if (material.map) {
        material.map.colorSpace = t.SRGBColorSpace;
        material.map.anisotropy = Math.min(4, c?.capabilities?.getMaxAnisotropy?.() || 1);
        material.map.needsUpdate = true;
      }
      material.needsUpdate = true;
    }
  });
  return model;
}

// Tripo's quadruped export contains a usable skeleton and skin weights, but no
// animation clips. Keep a copy of every relevant rest quaternion and animate
// the bones additively so the original rig pose is never lost or accumulated.
const animalAnimationEuler = new t.Euler();
const animalAnimationOffset = new t.Quaternion();
function createRiggedAnimalAnimation(model, type) {
  const bones = {};
  model.traverse((part) => {
    if (!part.isBone) return;
    bones[part.name] = part;
    part.userData.animalRestQuaternion = part.quaternion.clone();
  });
  const find = (name) => bones[`tripo::${name}`] || null;
  const rig = {
    type,
    phase: Math.random() * Math.PI * 2,
    idlePhase: Math.random() * Math.PI * 2,
    nextUpdateAt: 0,
    bones,
    spine: [0, 1, 2, 3, 4, 5].map((n) => find(`Spine_${n}`)).filter(Boolean),
    head: [0, 1, 2, 3, 4].map((n) => find(`Head_${n}`)).filter(Boolean),
    tail: [0, 1, 2].map((n) => find(`Tail_${n}`)).filter(Boolean),
    legs: [
      [0, "Left"],
      [0, "Right"],
      [1, "Left"],
      [1, "Right"],
    ].map(([pair, side]) =>
      [0, 1, 2, 3, 4]
        .map((n) => find(`${pair}_${side}_Limb_${n}`))
        .filter(Boolean),
    ),
  };
  return rig;
}
function setAnimalBoneRotation(bone, x = 0, y = 0, z = 0) {
  if (!bone?.userData?.animalRestQuaternion) return;
  animalAnimationEuler.set(x, y, z, "XYZ");
  animalAnimationOffset.setFromEuler(animalAnimationEuler);
  bone.quaternion
    .copy(bone.userData.animalRestQuaternion)
    .multiply(animalAnimationOffset);
}
function updateRiggedAnimalAnimation(owner, moving, intensity, attacking = false) {
  const rig = owner?.userData?.animalRig;
  if (!rig || !mt.player) return;
  // `frameNow` belongs to the main update function's local scope and is not
  // visible here. Referencing it stopped the render loop as soon as the first
  // rigged animal finished loading. Use this function's own monotonic clock so
  // asynchronous model attachment can never break rendering.
  const now = performance.now();
  const distance = Math.hypot(
    owner.position.x - mt.player.position.x,
    owner.position.z - mt.player.position.z,
  );
  // Bone matrices are the expensive part for a flock. Near animals remain
  // fluid, while distant/off-action animals update at a progressively lower
  // cadence without changing their AI or travel speed.
  const interval = n
    ? distance < 320
      ? 50
      : distance < 700
        ? 145
        : 340
    : distance < 360
      ? 34
      : distance < 780
        ? 105
        : 260;
  if (now < rig.nextUpdateAt) return;
  const step = Math.min(0.18, Math.max(0.016, (now - (rig.lastUpdateAt || now - interval)) / 1000));
  rig.lastUpdateAt = now;
  rig.nextUpdateAt = now + interval + ((owner.id || 0) % 4) * 4;
  const gait = moving ? 5.6 + 7.2 * intensity : 0;
  rig.phase += step * gait;
  rig.idlePhase += step * 1.35;
  const wave = Math.sin(rig.phase);
  const counter = Math.sin(rig.phase + Math.PI);
  const breathe = Math.sin(rig.idlePhase);
  const gaitAmount = moving ? 0.22 + 0.48 * intensity : 0;
  const attackPulse = attacking ? Math.sin(Math.min(Math.PI, (rig.phase % Math.PI))) : 0;

  rig.legs.forEach((chain, index) => {
    const diagonal = index === 0 || index === 3 ? wave : counter;
    chain.forEach((bone, joint) => {
      const bend = joint === 0
        ? diagonal * gaitAmount
        : joint === 1
          ? -diagonal * gaitAmount * 0.72
          : Math.max(0, -diagonal) * gaitAmount * 0.36;
      setAnimalBoneRotation(bone, 0, 0, bend);
    });
  });
  rig.spine.forEach((bone, index) => {
    const bodyWave = moving
      ? Math.sin(rig.phase * 2 + index * 0.55) * (0.012 + intensity * 0.022)
      : breathe * 0.009;
    setAnimalBoneRotation(bone, 0, bodyWave, attacking && index > 1 ? -0.07 * attackPulse : 0);
  });
  rig.head.forEach((bone, index) => {
    let nod = moving ? Math.sin(rig.phase * 2) * 0.025 * intensity : breathe * 0.018;
    let look = moving ? 0 : Math.sin(rig.idlePhase * 0.47) * 0.035;
    if (rig.type === "sheep" && !moving) {
      // A calm sheep periodically lowers its head to graze, then looks up.
      const graze = Math.max(0, Math.sin(rig.idlePhase * 0.31));
      nod += graze * (index === 0 ? 0.16 : 0.07);
      look += Math.sin(rig.idlePhase * 0.23) * 0.025;
    }
    if (attacking) nod -= attackPulse * (index === 0 ? 0.2 : 0.08);
    setAnimalBoneRotation(bone, 0, look, nod);
  });
  rig.tail.forEach((bone, index) => {
    const tailSpeed = rig.type === "sheep" ? 1.4 : moving ? 1.9 : 0.72;
    const tailAmount = rig.type === "lion" ? 0.12 : rig.type === "fox" ? 0.18 : 0.14;
    setAnimalBoneRotation(
      bone,
      0,
      Math.sin(rig.phase * tailSpeed + index * 0.5) * tailAmount * (moving ? 1 : 0.65),
      moving ? -0.025 * intensity : 0,
    );
  });
}
function loadFoxModel() {
  if (foxModelTemplate) return Promise.resolve(foxModelTemplate);
  if (foxModelPromise) return foxModelPromise;
  foxModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/animals/fox_rigged_game.glb"),
      (gltf) => {
        const model = gltf.scene;
        foxModelTemplate = prepareImportedAnimalModel(model);
        resolve(foxModelTemplate);
      },
      undefined,
      (error) => {
        console.warn("여우 3D 모델을 불러오지 못해 기존 여우 모델을 사용합니다.", error);
        foxModelPromise = null;
        reject(error);
      },
    );
  });
  return foxModelPromise;
}
function loadWolfModel() {
  if (wolfModelTemplate) return Promise.resolve(wolfModelTemplate);
  if (wolfModelPromise) return wolfModelPromise;
  wolfModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/animals/wolf_rigged_game.glb"),
      (gltf) => {
        const scene = prepareImportedAnimalModel(gltf.scene);
        scene.animations = gltf.animations || [];
        wolfModelTemplate = scene;
        resolve(scene);
      },
      undefined,
      (error) => {
        console.warn("늑대 3D 모델을 불러오지 못해 기존 늑대 모델을 사용합니다.", error);
        wolfModelPromise = null;
        reject(error);
      },
    );
  });
  return wolfModelPromise;
}
function loadSheepModel() {
  if (sheepModelTemplate) return Promise.resolve(sheepModelTemplate);
  if (sheepModelPromise) return sheepModelPromise;
  sheepModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/animals/sheep_rigged_game.glb"),
      (gltf) => {
        const scene = prepareImportedAnimalModel(gltf.scene);
        sheepModelTemplate = scene;
        resolve(scene);
      },
      undefined,
      (error) => {
        console.warn("양 3D 모델을 불러오지 못해 기존 양 모델을 사용합니다.", error);
        sheepModelPromise = null;
        reject(error);
      },
    );
  });
  return sheepModelPromise;
}
function applySheepModel(sheep) {
  if (!sheep || sheep.userData.sheepModelAttachStarted) return;
  sheep.userData.sheepModelAttachStarted = true;
  const fallbackChildren = [...sheep.children];
  loadSheepModel()
    .then((template) => {
      if (!sheep.parent || !mt.sheep.includes(sheep) || sheep.userData.importedSheepModel) return;
      const model = cloneSkinnedModel(template);
      model.name = "SheepRiggedModel";
      model.rotation.set(0, IMPORTED_ANIMAL_FACING_Y.sheep, 0);
      model.updateMatrixWorld(true);
      let box = new t.Box3().setFromObject(model);
      const size = box.getSize(new t.Vector3());
      const targetHeight = 72 * (sheep.userData.modelScale || 1);
      model.scale.setScalar(targetHeight / Math.max(size.y, 0.001));
      model.updateMatrixWorld(true);
      box = new t.Box3().setFromObject(model);
      const center = box.getCenter(new t.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      sheep.add(model);
      fallbackChildren.forEach((child) => {
        child.visible = false;
      });
      sheep.userData.importedSheepModel = model;
      sheep.userData.importedSheepBaseY = model.position.y;
      sheep.userData.animalRig = createRiggedAnimalAnimation(model, "sheep");
    })
    .catch(() => {
      fallbackChildren.forEach((child) => {
        child.visible = true;
      });
    });
}
function loadBanditModel() {
  if (banditModelTemplate) return Promise.resolve(banditModelTemplate);
  if (banditModelPromise) return banditModelPromise;
  banditModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/bandit_rigged_game.glb"),
      (gltf) => {
        const scene = prepareImportedAnimalModel(gltf.scene);
        scene.animations = gltf.animations || [];
        banditModelTemplate = scene;
        resolve(scene);
      },
      undefined,
      (error) => {
        console.warn("강도 3D 모델을 불러오지 못해 기존 강도 모델을 사용합니다.", error);
        banditModelPromise = null;
        reject(error);
      },
    );
  });
  return banditModelPromise;
}
function loadKohenModel() {
  if (kohenModelTemplate) return Promise.resolve(kohenModelTemplate);
  if (kohenModelPromise) return kohenModelPromise;
  kohenModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/kohen_rigged_game.glb"),
      (gltf) => {
        const scene = gltf.scene;
        scene.animations = (gltf.animations || []).map((clip) => {
          const groundedClip = clip.clone();
          // World translation belongs to the patrol controller, not the clip.
          // Removing it prevents the imported walk from drifting or hovering.
          groundedClip.tracks = groundedClip.tracks.filter(
            (track) =>
              !/(^|\.)(Root|Armature)\.position$/i.test(track.name),
          );
          return groundedClip;
        });
        scene.traverse((part) => {
          if (!part.isMesh) return;
          part.castShadow = false;
          part.receiveShadow = false;
          part.frustumCulled = true;
          const materials = Array.isArray(part.material)
            ? part.material
            : [part.material];
          materials.forEach((material) => {
            if (!material) return;
            material.side = t.FrontSide;
            material.depthWrite = true;
            material.roughness = Math.max(0.76, material.roughness ?? 0.76);
            if (material.normalMap) {
              material.normalMap.dispose?.();
              material.normalMap = null;
            }
            if (material.roughnessMap) {
              material.roughnessMap.dispose?.();
              material.roughnessMap = null;
            }
            material.metalnessMap = null;
            material.metalness = 0;
            material.needsUpdate = true;
            if (material.map) {
              material.map.colorSpace = t.SRGBColorSpace;
              material.map.anisotropy = Math.min(
                2,
                c?.capabilities?.getMaxAnisotropy?.() || 1,
              );
            }
          });
        });
        kohenModelTemplate = scene;
        resolve(scene);
      },
      undefined,
      (error) => {
        console.warn("코헨 모델을 불러오지 못했습니다.", error);
        kohenModelPromise = null;
        reject(error);
      },
    );
  });
  return kohenModelPromise;
}
function loadSouthGateGuardModel() {
  if (guardModelTemplate) return Promise.resolve(guardModelTemplate);
  if (guardModelPromise) return guardModelPromise;
  guardModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/south_gate_guard.glb"),
      (gltf) => {
        const scene = gltf.scene;
        scene.traverse((part) => {
          if (!part.isMesh) return;
          part.castShadow = false;
          part.receiveShadow = false;
          part.frustumCulled = true;
          const materials = Array.isArray(part.material)
            ? part.material
            : [part.material];
          materials.forEach((material) => {
            if (!material) return;
            material.side = t.FrontSide;
            material.depthWrite = true;
            material.roughness = Math.max(0.68, material.roughness ?? 0.68);
            if (material.map) {
              material.map.colorSpace = t.SRGBColorSpace;
              material.map.anisotropy = Math.min(
                2,
                c?.capabilities?.getMaxAnisotropy?.() || 1,
              );
            }
          });
        });
        guardModelTemplate = scene;
        resolve(scene);
      },
      undefined,
      (error) => {
        console.warn("남문 경비병 모델을 불러오지 못했습니다.", error);
        guardModelPromise = null;
        reject(error);
      },
    );
  });
  return guardModelPromise;
}
function ensureGuardAlertIndicator() {
  let marker = document.querySelector("#guardAlertIndicator");
  if (marker) return marker;
  marker = document.createElement("div");
  marker.id = "guardAlertIndicator";
  marker.textContent = "✡";
  marker.setAttribute("aria-label", "경비병 경계");
  (document.querySelector("#weaponHud") || document.body).appendChild(marker);
  return marker;
}
function setGuardAlerted(alerted) {
  const guard = mt.southGateGuard;
  if (!guard) return;
  if (alerted && getActiveCityBandits().length) alerted = false;
  guard.userData.alerted = !!alerted;
  const marker = ensureGuardAlertIndicator();
  marker.classList.toggle("show", !!alerted);
  marker.style.display = alerted ? "" : "none";
  marker.setAttribute("aria-hidden", alerted ? "false" : "true");
}
function createSouthGateGuard() {
  if (!i) return;
  if (mt.southGateGuard?.parent) return;
  // Remove every stale guard left by a restarted/continued session before
  // creating the one authoritative south-gate instance.
  const staleGuards = [];
  i.traverse((object) => {
    if (
      object !== i &&
      (object.name === "SingleSouthGateGuard" ||
        object.name === "SouthGateGuardTripoSingleModel" ||
        object.userData?.isSouthGateGuard)
    ) staleGuards.push(object);
  });
  staleGuards.forEach((object) => object.parent?.remove(object));
  const guard = new t.Group();
  guard.name = "SingleSouthGateGuard";
  // The old z=2865 point was still inside the south-wall ellipse. Starting a
  // large NPC there made every first step overlap the wall. Keep the guard
  // wholly outside, left of the open gate, with a clear approach to its centre.
  const homeX = -170;
  const homeZ = 3135;
  guard.position.set(homeX, te(homeX, homeZ), homeZ);
  guard.userData = {
    homeX,
    homeZ,
    alerted: false,
    chaseActivated: false,
    runPhase: 0,
    speed: 126,
    hitRadius: 42,
    importedModel: null,
    importedModelBaseY: 0,
    isSouthGateGuard: true,
    // The extracted guard asset's authored front follows the same +Z heading
    // used by NPC movement. The old PI offset made his back face David.
    facingOffset: 0,
    chasePose: 0,
    // Larger than David, but small enough to negotiate the broad city lanes.
    collisionRadius: 34,
    bodyHeight: 168,
    maxStepUp: 13,
    maxDrop: 16,
    maxSlope: 0.72,
    lastSafePosition: new t.Vector3(homeX, te(homeX, homeZ), homeZ),
    stuckFor: 0,
    searchFor: 0,
    searchPhase: 0,
    searchWaypoint: 0,
    searchWaypointFor: 0,
    searchOriginX: homeX,
    searchOriginZ: homeZ,
    sightCheckFor: 0,
    cachedHasSight: false,
    returningHome: false,
    returnStuckFor: 0,
    sightLostFor: 0,
    lastSeenX: homeX,
    lastSeenZ: homeZ,
    caughtCooldownUntil: 0,
  };
  i.add(guard);
  mt.southGateGuard = guard;
  setGuardAlerted(false);
  loadSouthGateGuardModel()
    .then((template) => {
      if (!guard.parent || mt.southGateGuard !== guard) return;
      guard.clear();
      const model = template.clone(true);
      model.name = "SouthGateGuardTripoSingleModel";
      model.rotation.set(0, 0, 0);
      model.updateMatrixWorld(true);
      let box = new t.Box3().setFromObject(model);
      const size = box.getSize(new t.Vector3());
      // Slightly smaller than the previous guard while remaining clearly
      // taller than David.
      model.scale.setScalar(176 / Math.max(size.y, 0.001));
      model.updateMatrixWorld(true);
      box = new t.Box3().setFromObject(model);
      const center = box.getCenter(new t.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      guard.add(model);
      guard.userData.importedModel = model;
      guard.userData.importedModelBaseY = model.position.y;
    })
    .catch(() => {
      if (guard.parent) i.remove(guard);
      if (mt.southGateGuard === guard) mt.southGateGuard = null;
    });
}
function hitSouthGateGuard() {
  const guard = mt.southGateGuard;
  if (!guard?.parent) return false;
  if (getActiveCityBandits().length) {
    suspendGuardForCityBandits();
    return false;
  }
  setGuardAlerted(true);
  guard.userData.returningHome = false;
  guard.userData.searchFor = 0;
  guard.userData.searchWaypoint = 0;
  guard.userData.searchWaypointFor = 0;
  guard.userData.sightLostFor = 0;
  guard.userData.lastSeenX = mt.player.position.x;
  guard.userData.lastSeenZ = mt.player.position.z;
  if (Yt(mt.player.position.x, mt.player.position.z, -55))
    guard.userData.chaseActivated = true;
  eo("남문 경비병이 다비드를 추격합니다.");
  return true;
}
function resetSouthGateGuard(guard, clearAlert = true) {
  if (!guard) return;
  if (clearAlert) setGuardAlerted(false);
  guard.userData.chaseActivated = false;
  guard.userData.stuckFor = 0;
  guard.userData.searchFor = 0;
  guard.userData.searchWaypoint = 0;
  guard.userData.searchWaypointFor = 0;
  guard.userData.returningHome = false;
  guard.userData.returnStuckFor = 0;
  guard.userData.sightLostFor = 0;
  guard.position.set(
    guard.userData.homeX,
    te(guard.userData.homeX, guard.userData.homeZ),
    guard.userData.homeZ,
  );
  guard.userData.lastSafePosition?.copy(guard.position);
  // At the outside post the guard always resumes watching away from the city.
  guard.rotation.y = guard.userData.facingOffset;
}
function hasClearNpcSight(npc, target) {
  const dx = target.position.x - npc.position.x;
  const dz = target.position.z - npc.position.z;
  const distance = Math.hypot(dx, dz);
  const samples = Math.max(2, Math.min(28, Math.ceil(distance / 30)));
  const bodyY = (npc.userData.bodyHeight ?? 150) * 0.58;
  for (let sample = 1; sample < samples; sample++) {
    const ratio = sample / samples;
    const x = npc.position.x + dx * ratio;
    const z = npc.position.z + dz * ratio;
    const ground = te(x, z);
    if (!Number.isFinite(ground)) return false;
    // A narrow sight probe is intentionally separate from the guard's broad
    // body collision, so corners hide David without making sight too fragile.
    if (jt(new t.Vector3(x, ground + bodyY, z), 5)) return false;
  }
  return true;
}
function beginGuardReturn(guard) {
  if (!guard) return;
  setGuardAlerted(false);
  guard.userData.chaseActivated = false;
  guard.userData.searchFor = 0;
  guard.userData.stuckFor = 0;
  guard.userData.sightLostFor = 0;
  guard.userData.returningHome = true;
  guard.userData.returnStuckFor = 0;
}
function showGuardCaught() {
  const caught = e("#guardCaught");
  const guard = mt.southGateGuard;
  if (!caught || !guard || !caught.classList.contains("hidden")) return;
  // Apply the arrest penalty exactly once, before the overlay blocks another
  // catch event. Values are clamped so neither resource can become negative.
  ut.money = Math.max(0, ut.money - 15);
  ut.respect = Math.max(0, ut.respect - 5);
  caught.classList.remove("hidden");
  b = true;
  document.exitPointerLock?.();
  guard.userData.caughtCooldownUntil = performance.now() + 3400;
  setTimeout(() => {
    caught.classList.add("hidden");
    resetSouthGateGuard(guard, true);
    b = false;
    n || c?.domElement?.requestPointerLock?.().catch?.(() => {});
  }, 3000);
}
function canNpcMoveBetween(npc, from, to) {
  const data = npc.userData;
  const clearance = data.collisionRadius ?? 30;
  if (data.isCityCitizen) {
    if (isInsideTempleCourt(to.x, to.z, 34)) return false;
    // Citizens are not free-roaming agents.  Keep every prospective footstep
    // inside the authored broad-road corridor so a collision detour can never
    // lead them between houses or alongside a wall.
    const road = closestPointOnCityRoad(to.x, to.z);
    const corridor = road
      ? Math.max(
        18,
        Math.min(data.roadCorridorRadius ?? 48, road.width * 0.5 + 8),
      )
      : 0;
    if (!road || road.distance > corridor) return false;
  }
  const fromGround = te(from.x, from.z);
  const toGround = te(to.x, to.z);
  const rise = toGround - fromGround;
  const horizontal = Math.max(0.001, Math.hypot(to.x - from.x, to.z - from.z));
  if (
    !Number.isFinite(toGround) ||
    rise > (data.maxStepUp ?? 12) ||
    rise < -(data.maxDrop ?? 15) ||
    Math.abs(rise) / horizontal > (data.maxSlope ?? 0.75)
  )
    return false;
  // Check both the feet and torso. A single mid-body probe could sit above a
  // low house collider and incorrectly let citizens, guards or enemies pass
  // through the wall below it.
  const bodyHeight = data.bodyHeight ?? 150;
  const probeHeights = [
    4,
    Math.min(bodyHeight * 0.28, 36),
    Math.min(bodyHeight * 0.55, 72),
  ];
  // Give citizens an additional preventative buffer around buildings.  Their
  // visible body therefore turns before touching a facade instead of relying
  // on penetration recovery after they have already reached it.
  const preventativeClearance = data.isCityCitizen
    ? clearance + (data.buildingAvoidancePadding ?? 4)
    : clearance;
  if (
    !npcPositionBlocked(
      to.x,
      to.z,
      toGround,
      preventativeClearance,
      probeHeights,
    )
  )
    return true;
  // If an NPC spawned or was pushed slightly into a collider, permit only a
  // movement that strictly reduces penetration. This is essential for guards
  // returning from a gate threshold instead of becoming permanently wedged.
  const toProbes = probeHeights.map(
    (height) => new t.Vector3(to.x, toGround + height, to.z),
  );
  const fromProbes = probeHeights.map(
    (height) => new t.Vector3(from.x, fromGround + height, from.z),
  );
  return (
    toProbes.reduce(
      (sum, probe) =>
        sum + collisionPenetrationScore(probe, preventativeClearance),
      0,
    ) + 0.001 <
    fromProbes.reduce(
      (sum, probe) =>
        sum + collisionPenetrationScore(probe, preventativeClearance),
      0,
    )
  );
}
const npcCollisionNearby = [],
  npcCollisionProbe = new t.Vector3();
function npcPositionBlocked(x, zValue, ground, clearance, probeHeights) {
  // Gather the nearby collider bucket once for all body probes. Previously
  // each height ran a complete spatial lookup, tripling the busiest city-NPC
  // collision work.
  indexedCollisionRevision !== collisionRevision && rebuildCollisionIndex();
  collisionQueryStamp++;
  const stamp = collisionQueryStamp;
  npcCollisionNearby.length = 0;
  const collect = (collider) => {
    if (collider._npcCollisionQueryStamp === stamp) return;
    collider._npcCollisionQueryStamp = stamp;
    npcCollisionNearby.push(collider);
  };
  for (const collider of globalCollisionObjects) collect(collider);
  const minX = Math.floor((x - clearance) / COLLISION_CELL_SIZE);
  const maxX = Math.floor((x + clearance) / COLLISION_CELL_SIZE);
  const minZ = Math.floor((zValue - clearance) / COLLISION_CELL_SIZE);
  const maxZ = Math.floor((zValue + clearance) / COLLISION_CELL_SIZE);
  for (let cellX = minX; cellX <= maxX; cellX++)
    for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
      const bucket = collisionGrid.get(collisionCellKey(cellX, cellZ));
      if (bucket) for (const collider of bucket) collect(collider);
    }
  const insideCity = Yt(x, zValue, -80);
  npcCollisionProbe.set(x, ground + 4, zValue);
  for (const collider of npcCollisionNearby) {
    // City buildings and walls are full-height navigation obstacles for ground
    // NPCs. This closes the old loophole where a low yMax let a torso probe
    // cross a house footprint or climb onto a roof.
    const fullHeightCityObstacle =
      insideCity &&
      (collider.type === "building" ||
        collider.type === "wall" ||
        collider.type === "cityWall" ||
        collider.type === "government" ||
        collider.type === "palace" ||
        collider.type === "temple" ||
        collider.type === "temple-wall");
    if (fullHeightCityObstacle) {
      if (colliderBlocksHorizontal(collider, x, zValue, clearance)) return true;
      continue;
    }
    for (const height of probeHeights) {
      npcCollisionProbe.y = ground + height;
      if (colliderBlocksPoint(collider, npcCollisionProbe, clearance, 2))
        return true;
    }
  }
  return false;
}
function moveNpcWithSweptCollision(npc, angle, distance) {
  // A 2.5-unit sweep cannot jump across the thinnest authored city wall.
  const substeps = Math.max(1, Math.min(16, Math.ceil(distance / 2.5)));
  const step = distance / substeps;
  let moved = false;
  for (let index = 0; index < substeps; index++) {
    const from = npc.position.clone();
    const to = from.clone();
    to.x += Math.sin(angle) * step;
    to.z += Math.cos(angle) * step;
    if (!canNpcMoveBetween(npc, from, to)) break;
    to.y = te(to.x, to.z);
    npc.position.copy(to);
    npc.userData.lastSafePosition?.copy(to);
    moved = true;
  }
  return moved;
}
function tryMoveGuard(guard, dx, dz, distance, step) {
  const desired = Math.atan2(dx, dz);
  // Try the direct route first, then increasingly broad left/right detours.
  // This lets the large guard follow alleys without ever passing through walls.
  const offsets = [0, 0.34, -0.34, 0.68, -0.68, 1.02, -1.02, 1.4, -1.4];
  for (const offset of offsets) {
    const angle = desired + offset;
    if (moveNpcWithSweptCollision(guard, angle, step)) return true;
  }
  return false;
}
function chooseGuardRoadWaypoint(guard, targetX, targetZ) {
  const candidates = [...CITY_CITIZEN_MAIN_LOOP, ...CITY_CITIZEN_SOUTH_SPUR];
  let best = null;
  for (const point of candidates) {
    const fromDistance = Math.hypot(
      point.x - guard.position.x,
      point.z - guard.position.z,
    );
    const targetDistance = Math.hypot(point.x - targetX, point.z - targetZ);
    if (fromDistance < 35 || isInsideTempleCourt(point.x, point.z, 40)) continue;
    const score = fromDistance * 0.38 + targetDistance;
    if (!best || score < best.score) best = { ...point, score };
  }
  if (best) {
    guard.userData.roadWaypointX = best.x;
    guard.userData.roadWaypointZ = best.z;
    guard.userData.roadWaypointFor = 1.1;
  }
}
function updateSouthGateGuard(delta) {
  const guard = mt.southGateGuard;
  const player = mt.player;
  if (!guard?.parent || !player) return;
  if (getActiveCityBandits().length) suspendGuardForCityBandits();
  const playerInside = Yt(player.position.x, player.position.z, -55);
  if (guard.userData.alerted && playerInside)
    guard.userData.chaseActivated = true;
  if (guard.userData.alerted && !playerInside && guard.userData.chaseActivated)
    beginGuardReturn(guard);
  const playerDx = player.position.x - guard.position.x;
  const playerDz = player.position.z - guard.position.z;
  const playerDistance = Math.max(0.001, Math.hypot(playerDx, playerDz));
  // Sight ray sampling is one of the most expensive NPC operations.  Cache it
  // briefly; pursuit remains responsive while avoiding dozens of collision
  // probes every rendered frame.
  guard.userData.sightCheckFor -= delta;
  if (guard.userData.sightCheckFor <= 0) {
    guard.userData.sightCheckFor = 0.11;
    guard.userData.cachedHasSight =
      guard.userData.alerted &&
      playerInside &&
      playerDistance < 920 &&
      hasClearNpcSight(guard, player);
  }
  const hasSight = guard.userData.cachedHasSight;
  if (hasSight) {
    guard.userData.lastSeenX = player.position.x;
    guard.userData.lastSeenZ = player.position.z;
    guard.userData.sightLostFor = 0;
  } else if (guard.userData.alerted && playerInside) {
    guard.userData.sightLostFor += delta;
  }
  // When chasing from outside, route through the physical south-gate opening
  // before pursuing David. A direct line to an interior player intersects the
  // wall and leaves a large NPC wedged against it.
  const guardInside = Yt(guard.position.x, guard.position.z, -42);
  const gateWaypointActive =
    guard.userData.alerted && playerInside && !guardInside;
  let targetX = gateWaypointActive
    ? 0
    : hasSight
      ? player.position.x
      : guard.userData.lastSeenX;
  let targetZ = gateWaypointActive
    ? 2825
    : hasSight
      ? player.position.z
      : guard.userData.lastSeenZ;
  if (
    guard.userData.alerted &&
    playerInside &&
    !gateWaypointActive &&
    (guard.userData.roadWaypointFor || 0) > 0
  ) {
    const waypointDistance = Math.hypot(
      guard.userData.roadWaypointX - guard.position.x,
      guard.userData.roadWaypointZ - guard.position.z,
    );
    guard.userData.roadWaypointFor -= delta;
    if (waypointDistance > 28) {
      targetX = guard.userData.roadWaypointX;
      targetZ = guard.userData.roadWaypointZ;
    } else {
      guard.userData.roadWaypointFor = 0;
    }
  }
  if (guard.userData.returningHome) {
    // An interior guard first walks through the actual south-gate opening,
    // then turns toward his outside post. He is never teleported home.
    if (guardInside) {
      targetX = 0;
      targetZ = 3060;
    } else {
      targetX = guard.userData.homeX;
      targetZ = guard.userData.homeZ;
    }
  }
  const dx = targetX - guard.position.x;
  const dz = targetZ - guard.position.z;
  const distance = Math.max(0.001, Math.hypot(dx, dz));
  let moving = false;
  if (guard.userData.returningHome) {
    if (distance <= 18 && !guardInside) {
      guard.position.set(
        guard.userData.homeX,
        te(guard.userData.homeX, guard.userData.homeZ),
        guard.userData.homeZ,
      );
      guard.userData.lastSafePosition?.copy(guard.position);
      guard.userData.returningHome = false;
      guard.userData.returnStuckFor = 0;
      guard.rotation.y = guard.userData.facingOffset;
    } else {
      const step = Math.min(Math.max(0, distance - 10), guard.userData.speed * 0.72 * delta);
      if (tryMoveGuard(guard, dx, dz, distance, step)) {
        moving = true;
        guard.userData.returnStuckFor = Math.max(
          0,
          guard.userData.returnStuckFor - delta * 2,
        );
      } else {
        guard.userData.returnStuckFor += delta;
        // Keep visibly searching for a walkable direction instead of vanishing.
        guard.rotation.y += delta * 1.5;
      }
    }
  } else if (guard.userData.searchFor > 0) {
    guard.userData.searchFor -= delta;
    guard.userData.searchPhase += delta * 2.7;
    if (hasSight) {
      guard.userData.searchFor = 0;
      guard.userData.stuckFor = 0;
    } else {
      // Actively sweep several reachable points around the last sighting.
      // When a doorway or alley is blocked the guard tries the next point,
      // visibly turning and walking instead of rotating in one spot.
      const searchOffsets = [
        [0, 0], [95, 0], [-95, 0], [0, 95], [0, -95],
        [72, 72], [-72, 72], [72, -72], [-72, -72],
      ];
      const offset =
        searchOffsets[guard.userData.searchWaypoint % searchOffsets.length];
      const searchX = guard.userData.searchOriginX + offset[0];
      const searchZ = guard.userData.searchOriginZ + offset[1];
      const searchDx = searchX - guard.position.x;
      const searchDz = searchZ - guard.position.z;
      const searchDistance = Math.hypot(searchDx, searchDz);
      guard.userData.searchWaypointFor += delta;
      if (
        searchDistance < 24 ||
        guard.userData.searchWaypointFor > 1.15
      ) {
        guard.userData.searchWaypoint =
          (guard.userData.searchWaypoint + 1) % searchOffsets.length;
        guard.userData.searchWaypointFor = 0;
      } else {
        const searchStep = Math.min(
          searchDistance - 12,
          guard.userData.speed * 0.64 * delta,
        );
        moving = tryMoveGuard(
          guard,
          searchDx,
          searchDz,
          searchDistance,
          searchStep,
        );
        if (moving)
          guard.rotation.y =
            Math.atan2(searchDx, searchDz) + guard.userData.facingOffset;
        else
          guard.rotation.y += delta * 1.8;
      }
      if (guard.userData.searchFor <= 0) beginGuardReturn(guard);
    }
  } else if (guard.userData.alerted && distance > 70) {
    const step = Math.min(distance - 62, guard.userData.speed * delta);
    if (tryMoveGuard(guard, dx, dz, distance, step)) {
      moving = true;
      guard.userData.stuckFor = Math.max(0, guard.userData.stuckFor - delta * 2);
    } else {
      guard.userData.stuckFor += delta;
      if (guard.userData.stuckFor > 0.22)
        chooseGuardRoadWaypoint(
          guard,
          hasSight ? player.position.x : guard.userData.lastSeenX,
          hasSight ? player.position.z : guard.userData.lastSeenZ,
        );
    }
    if (
      guard.userData.stuckFor > 2.4 ||
      (!hasSight && guard.userData.sightLostFor > 4.2 && distance < 92)
    ) {
      // Look substantially farther left/right before giving up the search.
      guard.userData.searchFor = 5.2;
      guard.userData.searchPhase = 0;
      guard.userData.searchWaypoint = 0;
      guard.userData.searchWaypointFor = 0;
      guard.userData.searchOriginX = guard.userData.lastSeenX;
      guard.userData.searchOriginZ = guard.userData.lastSeenZ;
      guard.userData.stuckFor = 0;
    }
  } else if (
    guard.userData.alerted &&
    !gateWaypointActive &&
    playerDistance <= 70 &&
    performance.now() >= guard.userData.caughtCooldownUntil
  ) {
    showGuardCaught();
  }
  if (guard.userData.searchFor <= 0) {
    if (guard.userData.returningHome || guard.userData.alerted) {
      guard.rotation.y = Math.atan2(dx, dz) + guard.userData.facingOffset;
    } else {
      // Idle surveillance is independent of stale chase/search targets.
      // Re-evaluate David's live position every frame while he loiters near
      // the south gate; otherwise face outward (+Z) from the wall.
      const watchingGateVisitor =
        ut.respect <= 70 &&
        playerDistance < 760 &&
        hasClearNpcSight(guard, player);
      guard.rotation.y = watchingGateVisitor
        ? Math.atan2(playerDx, playerDz) + guard.userData.facingOffset
        : guard.userData.facingOffset;
    }
  }
  const groundedY = te(guard.position.x, guard.position.z);
  if (Number.isFinite(groundedY)) guard.position.y = groundedY;
  else if (guard.userData.lastSafePosition)
    guard.position.copy(guard.userData.lastSafePosition);
  const model = guard.userData.importedModel;
  if (model) {
    if (moving) {
      guard.userData.runPhase += delta * 11;
      model.position.y =
        guard.userData.importedModelBaseY +
        Math.abs(Math.sin(guard.userData.runPhase)) * 1.2;
      model.rotation.z = Math.sin(guard.userData.runPhase) * 0.022;
      // The supplied guard is one fused mesh, so the spear cannot be animated
      // independently. A restrained forward pursuit lean makes the held spear
      // read as aimed without deforming or duplicating the character.
      guard.userData.chasePose = t.MathUtils.lerp(
        guard.userData.chasePose,
        0.12,
        Math.min(1, delta * 7),
      );
      model.rotation.x = -guard.userData.chasePose;
    } else {
      model.position.y = t.MathUtils.lerp(
        model.position.y,
        guard.userData.importedModelBaseY,
        Math.min(1, delta * 10),
      );
      model.rotation.z *= Math.max(0, 1 - delta * 10);
      guard.userData.chasePose = t.MathUtils.lerp(
        guard.userData.chasePose,
        0,
        Math.min(1, delta * 8),
      );
      model.rotation.x = -guard.userData.chasePose;
    }
  }
}
function loadOliveTreeModel() {
  if (oliveTreeModelTemplate) return Promise.resolve(oliveTreeModelTemplate);
  if (oliveTreeModelPromise) return oliveTreeModelPromise;
  oliveTreeModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/olive_tree_game.glb"),
      (gltf) => {
        const scene = gltf.scene;
        // Keep the authored olive proportions. Palm-trunk deformation must
        // never be applied to this separate olive asset.
        scene.traverse((obj) => {
          if (!obj.isMesh) return;
          obj.castShadow = false;
          obj.receiveShadow = true;
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((material) => {
            if (!material) return;
            material.side = t.FrontSide;
            material.transparent = false;
            material.depthWrite = true;
            material.roughness = Math.max(0.72, material.roughness ?? 0.72);
            if (material.map) {
              material.map.colorSpace = t.SRGBColorSpace;
              material.map.anisotropy = Math.min(2, c?.capabilities?.getMaxAnisotropy?.() || 1);
            }
          });
        });
        oliveTreeModelTemplate = scene;
        resolve(scene);
      },
      undefined,
      (error) => {
        console.warn("올리브나무 모델을 불러오지 못했습니다.", error);
        oliveTreeModelPromise = null;
        reject(error);
      },
    );
  });
  return oliveTreeModelPromise;
}
function loadDatePalmModel() {
  if (datePalmModelTemplate) return Promise.resolve(datePalmModelTemplate);
  if (datePalmModelPromise) return datePalmModelPromise;
  datePalmModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/date_palm_tall_game.glb"),
      (gltf) => {
        const scene = gltf.scene;
        scene.traverse((obj) => {
          if (!obj.isMesh) return;
          // The new palm is one mesh. Lengthen only the lower trunk range and
          // translate the crown upward, preserving the authored frond shape.
          const position = obj.geometry?.attributes?.position;
          if (position && !obj.geometry.userData.tallDatePalmApplied) {
            obj.geometry.computeBoundingBox();
            const bounds = obj.geometry.boundingBox;
            const height = Math.max(0.001, bounds.max.y - bounds.min.y);
            const trunkTop = bounds.min.y + height * 0.57;
            const trunkStretch = 2.85;
            for (let vertex = 0; vertex < position.count; vertex++) {
              const y = position.getY(vertex);
              const relative = y - bounds.min.y;
              position.setY(
                vertex,
                y <= trunkTop
                  ? bounds.min.y + relative * trunkStretch
                  : y + (trunkTop - bounds.min.y) * (trunkStretch - 1),
              );
            }
            position.needsUpdate = true;
            obj.geometry.computeVertexNormals();
            obj.geometry.computeBoundingBox();
            obj.geometry.computeBoundingSphere();
            obj.geometry.userData.tallDatePalmApplied = true;
          }
          obj.castShadow = false;
          obj.receiveShadow = true;
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((material) => {
            if (!material) return;
            material.side = t.FrontSide;
            material.transparent = false;
            material.depthWrite = true;
            material.roughness = Math.max(0.72, material.roughness ?? 0.72);
            if (material.map) {
              material.map.colorSpace = t.SRGBColorSpace;
              material.map.anisotropy = Math.min(
                2,
                c?.capabilities?.getMaxAnisotropy?.() || 1,
              );
            }
          });
        });
        datePalmModelTemplate = scene;
        resolve(scene);
      },
      undefined,
      (error) => {
        console.warn("대추야자나무 모델을 불러오지 못했습니다.", error);
        datePalmModelPromise = null;
        reject(error);
      },
    );
  });
  return datePalmModelPromise;
}
function loadFirstTempleModel() {
  if (firstTempleModelTemplate) return Promise.resolve(firstTempleModelTemplate);
  if (firstTempleModelPromise) return firstTempleModelPromise;
  firstTempleModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/first_temple_game.glb"),
      (gltf) => {
        const scene = gltf.scene;
        scene.traverse((obj) => {
          if (!obj.isMesh) return;
          // The optimized temple is six material primitives in one mesh.
          // The building fills most of the view at the eastern approach.
          // Dynamic shadow sampling across all of its columns was a major
          // entrance-frame cost, so both passes stay disabled.
          obj.castShadow = false;
          obj.receiveShadow = false;
          obj.frustumCulled = true;
          obj.userData.neverOcclude = true;
          const materials = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          materials.forEach((material) => {
            if (!material) return;
            material.side = t.FrontSide;
            material.transparent = false;
            material.depthWrite = true;
            material.roughness = Math.max(0.5, material.roughness ?? 0.72);
            if (material.normalMap) {
              material.normalMap.dispose?.();
              material.normalMap = null;
            }
            if (material.roughnessMap) {
              material.roughnessMap.dispose?.();
              material.roughnessMap = null;
            }
            if (material.map) material.map.anisotropy = 1;
            material.needsUpdate = true;
            // The purchased model's authored metal group contains the laver.
            // Give it a matte copper finish without adding a glow or reflection pass.
            if (material.name === "TempleGold") {
              material.color.setHex(0xb87333);
              // The optimized primitive still carries the source vertex colours.
              // Disable their multiplication here so the authored laver cannot
              // remain ivory even after the material colour is changed.
              material.vertexColors = false;
              material.metalness = 0.12;
              material.roughness = 0.82;
              material.needsUpdate = true;
            }
          });
        });
        firstTempleModelTemplate = scene;
        applyPendingFirstTempleModel();
        resolve(scene);
      },
      undefined,
      (error) => {
        console.warn("최적화된 1차 성전 모델을 불러오지 못했습니다.", error);
        firstTempleModelPromise = null;
        reject(error);
      },
    );
  });
  return firstTempleModelPromise;
}
function addPurchasedFirstTemple(
  parent,
  courtY,
  worldCenterX,
  worldCenterZ,
  removableChildren = null,
) {
  if (!firstTempleModelTemplate) return false;
  const model = firstTempleModelTemplate.clone(true);
  // Face the sanctuary entrance toward geographic east (+X in this world).
  // This is the opposite of the earlier placement, whose rear faced the
  // eastern approach.
  model.rotation.y = Math.PI / 2;
  model.updateMatrixWorld(true);
  const sourceBounds = new t.Box3().setFromObject(model);
  const sourceSize = sourceBounds.getSize(new t.Vector3());
  const sourceCenter = sourceBounds.getCenter(new t.Vector3());
  // Leave a circulation margin inside the existing 1300 x 1040 court.
  const modelScale = Math.min(
    1180 / Math.max(sourceSize.x, 1),
    930 / Math.max(sourceSize.z, 1),
  );
  // Preserve the optimized footprint while making the sanctuary visible from
  // the Mount of Olives. Only the vertical axis is enlarged.
  const verticalScale = modelScale * 1.28;
  model.scale.set(modelScale, verticalScale, modelScale);
  // The authored court is about 9.15% of the model height above the lowest
  // decorative/column point. Align that actual walkable surface—not the lowest
  // vertex—to the terrain. This removes the thigh-high floating platform.
  const authoredCourtOffset = sourceSize.y * 0.0915;
  model.position.set(
    -sourceCenter.x * modelScale,
    courtY + 4 - (sourceBounds.min.y + authoredCourtOffset) * verticalScale,
    -sourceCenter.z * modelScale,
  );
  model.name = "PurchasedFirstTempleOptimized";
  // Permanently remove the obsolete procedural temple, wall and basin meshes.
  // Removing them (instead of toggling visibility) prevents the old enclosure
  // from returning after entering/leaving the Temple Mount.
  const obsoleteChildren = removableChildren || [...parent.children].filter((child) => !child.isLight);
  for (const child of obsoleteChildren) {
    if (child.parent === parent && !child.isLight) parent.remove(child);
  }
  parent.add(model);
  // The imported court must not receive an old rectangular collision shell.
  // Only the sanctuary, altar and real fixtures use the explicit colliders
  // registered by the authored court code.
  mt.purchasedFirstTemple = model;
  mt.importedTemple = model;
  return true;
}
function applyPendingFirstTempleModel() {
  const pending = pendingFirstTemplePlacement;
  if (!pending || !firstTempleModelTemplate || !pending.parent?.parent) return false;
  const applied = addPurchasedFirstTemple(
    pending.parent,
    pending.courtY,
    pending.worldCenterX,
    pending.worldCenterZ,
    pending.removableChildren,
  );
  if (applied) pendingFirstTemplePlacement = null;
  return applied;
}
function createDatePalmClone() {
  if (!datePalmModelTemplate) return null;
  const palm = datePalmModelTemplate.clone(true);
  palm.name = "CampDatePalm";
  palm.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = true;
    obj.frustumCulled = true;
  });
  return palm;
}
function getBakedInstancingSource(template) {
  if (!template) return null;
  if (template.userData?.bakedInstancingSource)
    return template.userData.bakedInstancingSource;
  template.updateMatrixWorld(true);
  let sourceMesh = null;
  template.traverse((object) => {
    if (!sourceMesh && object.isMesh) sourceMesh = object;
  });
  if (!sourceMesh?.geometry) return null;
  // Mobile GLBs keep quantization scale and translation on their mesh node.
  // InstancedMesh only receives geometry, so those transforms must be baked or
  // the trees become thousands of times too large and vanish through culling.
  const geometry = sourceMesh.geometry.clone();
  const convertAttributeToFloat = (name) => {
    const attribute = geometry.getAttribute(name);
    if (!attribute) return;
    if (!attribute.isInterleavedBufferAttribute && attribute.array instanceof Float32Array)
      return;
    const values = new Float32Array(attribute.count * attribute.itemSize);
    const getters = ["getX", "getY", "getZ", "getW"];
    for (let index = 0; index < attribute.count; index++) {
      for (let component = 0; component < attribute.itemSize; component++) {
        const getter = attribute[getters[component]];
        values[index * attribute.itemSize + component] =
          typeof getter === "function" ? getter.call(attribute, index) : 0;
      }
    }
    geometry.setAttribute(
      name,
      new t.BufferAttribute(values, attribute.itemSize, false),
    );
  };
  // Applying decimal node transforms directly to quantized Uint16/Int8
  // attributes truncates them to zero. Convert only transform-sensitive data
  // to floats first; UVs, colours and indices remain compact.
  convertAttributeToFloat("position");
  convertAttributeToFloat("normal");
  convertAttributeToFloat("tangent");
  geometry.applyMatrix4(sourceMesh.matrixWorld);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const source = { geometry, material: sourceMesh.material };
  template.userData.bakedInstancingSource = source;
  return source;
}
function rebuildDatePalmInstances() {
  if (!i || !datePalmModelTemplate || !datePalmPlacements.length) return;
  const source = getBakedInstancingSource(datePalmModelTemplate);
  if (!source) return;
  if (mt.datePalmGrove) {
    i.remove(mt.datePalmGrove);
    mt.datePalmGrove.traverse((obj) => {
      if (obj.isInstancedMesh) obj.instanceMatrix.dispose?.();
    });
  }
  const grove = new t.Group();
  grove.name = "AllFormerAcaciasAsDatePalms";
  const dummy = new t.Object3D();
  const instances = new t.InstancedMesh(
    source.geometry,
    source.material,
    datePalmPlacements.length,
  );
  instances.castShadow = false;
  instances.receiveShadow = true;
  instances.frustumCulled = true;
  datePalmPlacements.forEach((palm, index) => {
    dummy.position.set(palm.x, palm.y, palm.z);
    dummy.rotation.set(0, palm.rotation, 0);
    // The source geometry already has a lengthened trunk. Uniform instance
    // scaling preserves the crown's natural proportions in one draw call.
    dummy.scale.setScalar(palm.scale);
    dummy.updateMatrix();
    instances.setMatrixAt(index, dummy.matrix);
  });
  instances.instanceMatrix.needsUpdate = true;
  instances.computeBoundingSphere();
  instances.userData.datePalmBatch = true;
  grove.add(instances);
  i.add(grove);
  mt.datePalmGrove = grove;
}
function createMountOfOlivesGrove() {
  loadOliveTreeModel()
    .then((template) => {
      if (!i || mt.oliveGrove) return;
      const source = getBakedInstancingSource(template);
      if (!source) return;
      const random = ee(118611);
      // Eight smaller instance batches allow whole sections behind the camera
      // or beyond the fog to be culled, instead of drawing all 88 detailed trees.
      const zones = Array.from({ length: 8 }, () => []);
      let attempts = 0;
      const treeTarget = n ? 64 : 88;
      while (zones.reduce((sum, zone) => sum + zone.length, 0) < treeTarget && attempts++ < 1800) {
        // Bias the distribution toward the western and central slopes rather
        // than stacking rows on the far-eastern summit.
        const westBiased = random() < 0.62;
        const x = westBiased
          ? 1460 + 780 * Math.pow(random(), 0.82)
          : 2180 + 760 * random();
        const z = -1900 + 3800 * random();
        const kidronCenter = 1080 + 70 * Math.sin(0.0014 * (z + 300));
        // Keep the Kidron floor completely treeless. A few trees begin only on
        // the rising route and western foot of the Mount of Olives.
        if (x < kidronCenter + 300) continue;
        if (he(x, z, 34) > 0.57 || Kt(x, z, 70) || zt(x, z, 80)) continue;
        const zone = Math.min(7, Math.max(0, Math.floor((z + 1900) / 475)));
        zones[zone].push({
          x,
          z,
          scale: 112 + 42 * random(),
          rotation: random() * Math.PI * 2,
        });
      }
      const grove = new t.Group();
      grove.name = "MountOfOlivesGrove";
      const dummy = new t.Object3D();
      const farTrunkGeometry = new t.CylinderGeometry(1, 1.2, 1, 6);
      const farCanopyGeometry = new t.IcosahedronGeometry(1, 1);
      const farTrunkMaterial = new t.MeshToonMaterial({
        color: 0x6c5133,
        flatShading: true,
      });
      const farCanopyMaterial = new t.MeshToonMaterial({
        color: 0x73784d,
        flatShading: true,
      });
      for (const zone of zones) {
        if (!zone.length) continue;
        const batch = new t.Group();
        batch.name = "OliveGroveSpatialBatch";
        const detailedInstances = new t.InstancedMesh(
          source.geometry,
          source.material,
          zone.length,
        );
        detailedInstances.castShadow = false;
        detailedInstances.receiveShadow = true;
        detailedInstances.frustumCulled = true;
        const farTrunks = new t.InstancedMesh(
          farTrunkGeometry,
          farTrunkMaterial,
          zone.length,
        );
        const farCanopies = new t.InstancedMesh(
          farCanopyGeometry,
          farCanopyMaterial,
          zone.length,
        );
        farTrunks.castShadow = false;
        farTrunks.receiveShadow = true;
        farCanopies.castShadow = false;
        farCanopies.receiveShadow = true;
        let centerX = 0;
        let centerZ = 0;
        zone.forEach((tree, index) => {
          const groundY = te(tree.x, tree.z);
          centerX += tree.x;
          centerZ += tree.z;
          dummy.position.set(tree.x, groundY, tree.z);
          dummy.rotation.set(0, tree.rotation, 0);
          dummy.scale.setScalar(tree.scale);
          dummy.updateMatrix();
          detailedInstances.setMatrixAt(index, dummy.matrix);

          dummy.position.set(tree.x, groundY + tree.scale * 0.28, tree.z);
          dummy.rotation.set(0, tree.rotation, 0);
          dummy.scale.set(
            tree.scale * 0.065,
            tree.scale * 0.56,
            tree.scale * 0.065,
          );
          dummy.updateMatrix();
          farTrunks.setMatrixAt(index, dummy.matrix);

          dummy.position.set(tree.x, groundY + tree.scale * 0.72, tree.z);
          dummy.rotation.set(0, tree.rotation, 0);
          dummy.scale.set(
            tree.scale * 0.38,
            tree.scale * 0.31,
            tree.scale * 0.4,
          );
          dummy.updateMatrix();
          farCanopies.setMatrixAt(index, dummy.matrix);
        });
        detailedInstances.instanceMatrix.needsUpdate = true;
        farTrunks.instanceMatrix.needsUpdate = true;
        farCanopies.instanceMatrix.needsUpdate = true;
        detailedInstances.computeBoundingSphere();
        farTrunks.computeBoundingSphere();
        farCanopies.computeBoundingSphere();
        const farGroup = new t.Group();
        farGroup.name = "OliveGroveDistantSilhouette";
        farGroup.add(farTrunks, farCanopies);
        farGroup.visible = false;
        batch.userData.centerX = centerX / zone.length;
        batch.userData.centerZ = centerZ / zone.length;
        batch.userData.detailedInstances = detailedInstances;
        batch.userData.farGroup = farGroup;
        batch.add(detailedInstances, farGroup);
        grove.add(batch);
      }
      i.add(grove);
      mt.oliveGrove = grove;
    })
    .catch(() => {
      // Keep the wilderness treeless rather than substituting acacias on the
      // Mount of Olives when the olive asset is unavailable.
    });
}
function createDistantMountainHorizon() {
  if (!i || mt.distantMountains) return;
  const horizon = new t.Group();
  horizon.name = "DistantDetailedMountainHorizon";
  const materials = [
    new t.MeshToonMaterial({ color: 10062454, flatShading: true, fog: false }),
    new t.MeshToonMaterial({ color: 11180920, flatShading: true, fog: false }),
    new t.MeshToonMaterial({ color: 12234612, flatShading: true, fog: false }),
  ];
  const segments = 80;
  for (let layer = 0; layer < 3; layer++) {
    const positions = [];
    const indices = [];
    for (let index = 0; index <= segments; index++) {
      const angle = (index / segments) * Math.PI * 2;
      const eastness = Math.max(0, Math.cos(angle));
      // East of Jerusalem opens toward the Dead Sea descent, so its opposite
      // ridge sits substantially farther away than the north/west/south ring.
      const radius =
        5350 + layer * 620 +
        eastness * eastness * (2600 + layer * 320) +
        180 * Math.sin(angle * 5 + layer * 1.7);
      const outer = radius + 360 + 80 * Math.sin(angle * 9 + layer);
      const baseY = -35 + layer * 22;
      const peak =
        230 + layer * 105 +
        95 * Math.sin(angle * 7 + layer * 2.1) +
        52 * Math.sin(angle * 17 - layer);
      const x = Math.cos(angle);
      const zc = Math.sin(angle);
      positions.push(x * (radius - 260), baseY, zc * (radius - 260));
      positions.push(x * radius, baseY + Math.max(115, peak), zc * radius);
      positions.push(x * outer, baseY - 20, zc * outer);
      if (index < segments) {
        const a = index * 3;
        const b = (index + 1) * 3;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
        indices.push(a + 1, b + 1, a + 2, b + 1, b + 2, a + 2);
      }
    }
    const geometry = new t.BufferGeometry();
    geometry.setAttribute("position", new t.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const ridge = new t.Mesh(geometry, materials[layer]);
    ridge.castShadow = false;
    ridge.receiveShadow = false;
    ridge.frustumCulled = true;
    ridge.renderOrder = -2 - layer;
    horizon.add(ridge);
  }
  i.add(horizon);
  mt.distantMountains = horizon;
}
function applyBanditModel(enemy) {
  if (enemy.userData.banditModelAttachStarted) return;
  enemy.userData.banditModelAttachStarted = true;
  const fallback = enemy.userData.banditFallback;
  loadBanditModel()
    .then((template) => {
      if (!enemy.parent || enemy.userData.type !== "bandit") return;
      if (enemy.userData.importedModel) return;
      const model = cloneSkinnedModel(template);
      model.name = "BanditRiggedGameModel";
      model.traverse((part) => {
        if (!part.isMesh) return;
        // The scanned model's complex shadow read as a second flattened body.
        // Terrain lighting still grounds the character without that duplicate.
        part.castShadow = false;
        part.receiveShadow = false;
      });
      model.rotation.set(0, 0, 0);
      model.updateMatrixWorld(true);
      let box = new t.Box3().setFromObject(model);
      const size = box.getSize(new t.Vector3());
      // Keep bandits larger than both David and the Kohen.
      const scale = 190 / Math.max(size.y, 0.001);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);
      box = new t.Box3().setFromObject(model);
      const center = box.getCenter(new t.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      enemy.add(model);
      if (fallback?.parent === enemy) {
        enemy.remove(fallback);
        fallback.clear();
      }
      enemy.userData.banditFallback = null;
      enemy.userData.importedModel = model;
      enemy.userData.importedModelBaseY = model.position.y;
      enemy.userData.importedModelPhase = Math.random() * Math.PI * 2;
      const rig = {};
      model.traverse((part) => {
        if (!part.isBone) return;
        if (
          ["L_Thigh", "R_Thigh", "L_Calf", "R_Calf", "L_Upperarm",
            "R_Upperarm", "L_Forearm", "R_Forearm", "Spine01", "Spine02",
            "Head"].includes(part.name)
        ) {
          rig[part.name] = {
            bone: part,
            base: part.rotation.clone(),
          };
        }
      });
      enemy.userData.banditRig = rig;
    })
    .catch(() => {
      enemy.userData.banditModelAttachStarted = false;
      if (fallback && fallback.parent !== enemy) enemy.add(fallback);
      if (fallback) fallback.visible = true;
    });
}
function applyImportedPredatorModel(enemy, type) {
  const config = {
    fox: {
      load: loadFoxModel,
      targetLength: 138,
      rotationY: IMPORTED_ANIMAL_FACING_Y.fox,
      rotationX: 0,
    },
    wolf: {
      load: loadWolfModel,
      targetLength: 122,
      rotationY: IMPORTED_ANIMAL_FACING_Y.wolf,
      rotationX: 0,
    },
  }[type];
  if (!config) return;
  const fallbackChildren = [...enemy.children];
  config.load()
    .then((template) => {
      if (!enemy.parent || enemy.userData.type !== type) return;
      const model = cloneSkinnedModel(template);
      model.name = type === "fox" ? "Fox3DModel" : "Wolf3DModel";
      model.updateMatrixWorld(true);
      const initialBox = new t.Box3().setFromObject(model);
      const initialSize = initialBox.getSize(new t.Vector3());
      const horizontalLength = Math.max(initialSize.x, initialSize.z, 0.001);
      const scale = config.targetLength / horizontalLength;
      model.scale.setScalar(scale);
      model.rotation.x = config.rotationX || 0;
      model.rotation.y = config.rotationY;
      model.updateMatrixWorld(true);
      const box = new t.Box3().setFromObject(model);
      const center = box.getCenter(new t.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      enemy.add(model);
      fallbackChildren.forEach((child) => { child.visible = false; });
      enemy.userData.importedModel = model;
      enemy.userData.importedModelBaseY = model.position.y;
      enemy.userData.importedModelPhase = Math.random() * Math.PI * 2;
      enemy.userData.animalRig = createRiggedAnimalAnimation(model, type);
    })
    .catch(() => fallbackChildren.forEach((child) => { child.visible = true; }));
}
function Pe(o = "lion") {
  const n = new t.Group(),
    lionFallback = new t.Group(),
    banditFallback = new t.Group(),
    s = {
      lion: {
        hp: 105,
        speed: 60,
        body: 11631160,
        head: 10117677,
        scale: 1.18,
        label: "사자",
      },
      wolf: {
        hp: 52,
        speed: 78,
        body: 7368553,
        head: 5132364,
        scale: 0.68,
        label: "늑대",
      },
      fox: {
        hp: 34,
        speed: 88,
        body: 12150322,
        head: 9257765,
        scale: 0.54,
        label: "여우",
      },
      bandit: {
        hp: 78,
        speed: 62,
        body: 7031863,
        head: 10118985,
        scale: 0.78,
        label: "강도",
      },
    },
    a = s[o] || s.lion;
  if ("bandit" === o) {
    n.add(banditFallback);
    n.userData.banditFallback = banditFallback;
    ze(banditFallback, 9, 14, 52, [0, 40, 0], a.body, 7),
      ze(banditFallback, 9, 9, 16, [0, 76, 0], a.head, 8),
      ve(banditFallback, [8, 48, 8], [-18, 38, 0], a.body),
      ve(banditFallback, [8, 48, 8], [18, 38, 0], a.body),
      ve(banditFallback, [7, 46, 7], [-8, 4, 0], 5060908),
      ve(banditFallback, [7, 46, 7], [8, 4, 0], 5060908),
      (ve(banditFallback, [8, 54, 8], [27, 38, 0], 5978916).rotation.z = -0.35);
  }
  else if ("lion" === o) {
    n.add(lionFallback);
    (ve(lionFallback, [72, 33, 31], [0, 27, 0], a.body).scale.x = 1.22),
      ve(lionFallback, [31, 31, 30], [47, 34, 0], a.head);
    const e = new t.Mesh(new t.IcosahedronGeometry(24, 1), ge(7030056));
    e.scale.set(0.78, 1.05, 0.92),
      e.position.set(39, 36, 0),
      lionFallback.add(e),
      ve(lionFallback, [27, 28, 27], [49, 35, 0], a.head);
    for (const t of [-11, 11])
      ve(lionFallback, [8, 38, 8], [-24, 9, t], a.body),
        ve(lionFallback, [8, 38, 8], [29, 9, t], a.body);
    ze(lionFallback, 3, 4, 58, [-48, 34, 0], a.body, 7).rotation.z = -1.1;
    const o = new t.Mesh(new t.IcosahedronGeometry(8, 1), ge(7030056));
    o.position.set(-72, 53, 0), lionFallback.add(o);
  } else if ("wolf" === o) {
    ve(n, [72, 25, 25], [0, 28, 0], a.body).scale.x = 1.2;
    const e = new t.Mesh(new t.IcosahedronGeometry(18, 1), ge(9079169));
    e.scale.set(0.8, 1.15, 0.72),
      e.position.set(27, 34, 0),
      n.add(e),
      ve(n, [26, 25, 24], [47, 37, 0], a.head);
    const o = new t.Mesh(new t.ConeGeometry(8, 25, 7), ge(a.head));
    (o.rotation.z = -Math.PI / 2), o.position.set(66, 34, 0), n.add(o);
    for (const e of [-9, 9]) {
      const o = new t.Mesh(new t.ConeGeometry(7, 18, 6), ge(a.head));
      o.position.set(46, 57, e), n.add(o);
    }
    for (const t of [-9, 9])
      ve(n, [7, 34, 7], [-24, 9, t], a.body),
        ve(n, [7, 34, 7], [27, 9, t], a.body);
    const s = new t.Mesh(new t.ConeGeometry(10, 48, 7), ge(5987158));
    (s.rotation.z = 1.2), s.position.set(-49, 35, 0), n.add(s);
  } else {
    (ve(n, [62, 23, 22], [0, 27, 0], a.body).scale.x = 1.25),
      ve(n, [23, 23, 22], [42, 34, 0], a.head);
    const e = new t.Mesh(new t.ConeGeometry(11, 28, 7), ge(15063231));
    e.position.set(30, 30, 0), n.add(e);
    const o = new t.Mesh(new t.ConeGeometry(6, 22, 7), ge(a.head));
    (o.rotation.z = -Math.PI / 2), o.position.set(59, 31, 0), n.add(o);
    for (const e of [-8, 8]) {
      const o = new t.Mesh(new t.ConeGeometry(6, 17, 6), ge(a.head));
      o.position.set(42, 53, e), n.add(o);
    }
    for (const t of [-8, 8])
      ve(n, [6, 30, 6], [-21, 8, t], a.body),
        ve(n, [6, 30, 6], [23, 8, t], a.body);
    const s = new t.Mesh(new t.ConeGeometry(13, 58, 8), ge(a.body));
    (s.rotation.z = 1.12), s.position.set(-46, 38, 0), n.add(s);
    const i = new t.Mesh(new t.ConeGeometry(9, 18, 8), ge(15655886));
    (i.rotation.z = 1.12), i.position.set(-70, 55, 0), n.add(i);
  }
  return (
    (n.userData = {
      hp: a.hp,
      maxHp: a.hp,
      speed: a.speed,
      state: "hunt",
      type: o,
      label: a.label,
      banditFallback: "bandit" === o ? banditFallback : null,
    }),
    n.scale.setScalar(a.scale),
    i.add(n),
    "lion" === o && applyLionModel(n, lionFallback),
    ("wolf" === o || "fox" === o) && applyImportedPredatorModel(n, o),
    "bandit" === o && applyBanditModel(n),
    mt.enemies.push(n),
    (function (t) {
      const o = document.createElement("div");
      o.className = "enemy-health";
      const n = document.createElement("i"),
        s = document.createElement("b");
      (s.textContent = t.userData.label || "적"),
        o.append(n, s),
        e("#enemyHealthLayer").appendChild(o),
        (t.userData.healthUI = { wrap: o, fill: n, label: s });
    })(n),
    n
  );
}
function isInsideTempleCourt(x, z, margin = 0) {
  return !!dt &&
    x >= dt.courtXMin - margin &&
    x <= dt.courtXMax + margin &&
    z >= dt.courtZMin - margin &&
    z <= dt.courtZMax + margin;
}
function isBanditStreetPointClear(x, z, clearance = 34) {
  if (!Yt(x, z, -74) || isInsideTempleCourt(x, z, 10)) return false;
  if (jt({ x, z }, clearance)) return false;
  const ground = te(x, z);
  // Reject rooftops, walls and abrupt ledges even when their visual mesh does
  // not have a sufficiently broad collision box at the sampled point.
  const sample = 12;
  return Math.max(
    Math.abs(te(x + sample, z) - ground),
    Math.abs(te(x - sample, z) - ground),
    Math.abs(te(x, z + sample) - ground),
    Math.abs(te(x, z - sample) - ground),
  ) < 18;
}
function moveBanditAlongStreets(bandit, target, delta) {
  const dx = target.position.x - bandit.position.x;
  const dz = target.position.z - bandit.position.z;
  const distance = Math.max(0.001, Math.hypot(dx, dz));
  const desired = Math.atan2(dx, dz);
  const travel = Math.min(bandit.userData.speed * delta, 8);
  const probe = Math.max(54, travel * 8);
  const offsets = [0, 0.34, -0.34, 0.7, -0.7, 1.08, -1.08, 1.5, -1.5, Math.PI];
  let best = null;
  for (const offset of offsets) {
    const angle = desired + offset;
    const ux = Math.sin(angle);
    const uz = Math.cos(angle);
    let clear = true;
    // Three probes prevent a valid endpoint from cutting through a house corner.
    for (const fraction of [0.34, 0.67, 1]) {
      if (!isBanditStreetPointClear(
        bandit.position.x + ux * probe * fraction,
        bandit.position.z + uz * probe * fraction,
      )) {
        clear = false;
        break;
      }
    }
    if (!clear) continue;
    const nextX = bandit.position.x + ux * travel;
    const nextZ = bandit.position.z + uz * travel;
    if (!isBanditStreetPointClear(nextX, nextZ)) continue;
    const remaining = Math.hypot(target.position.x - nextX, target.position.z - nextZ);
    const turn = Math.abs(Math.atan2(
      Math.sin(angle - (bandit.userData.streetHeading ?? desired)),
      Math.cos(angle - (bandit.userData.streetHeading ?? desired)),
    ));
    const score = remaining + Math.abs(offset) * 13 + turn * 7;
    if (!best || score < best.score) best = { angle, nextX, nextZ, score };
  }
  if (!best) {
    bandit.userData.streetBlockedFor = (bandit.userData.streetBlockedFor || 0) + delta;
    if (bandit.userData.streetBlockedFor > 0.65) {
      bandit.userData.streetHeading = desired +
        (bandit.userData.streetTurnSide || 1) * (Math.PI * 0.5);
      bandit.userData.streetTurnSide = -(bandit.userData.streetTurnSide || 1);
      bandit.userData.streetBlockedFor = 0;
    }
    return false;
  }
  bandit.userData.streetBlockedFor = 0;
  bandit.userData.streetHeading = best.angle;
  if (!moveNpcWithSweptCollision(bandit, best.angle, travel)) return false;
  bandit.rotation.y = best.angle;
  return true;
}
function isKohenPatrolPointClear(x, z) {
  if (!isInsideTempleCourt(x, z, -85)) return false;
  if (
    x >= dt.templeStageXMin - 42 &&
    x <= dt.templeStageXMax + 42 &&
    z >= dt.templeStageZMin - 42 &&
    z <= dt.templeStageZMax + 42
  ) return false;
  return Math.hypot(x - dt.altarX, z - dt.altarZ) > 105;
}
function chooseKohenWaypoint(kohen) {
  const candidates = [
    [dt.courtXMin + 155, dt.courtZMin + 155],
    [(dt.courtXMin + dt.courtXMax) * 0.5, dt.courtZMin + 145],
    [dt.courtXMax - 155, dt.courtZMin + 155],
    [dt.courtXMax - 145, (dt.courtZMin + dt.courtZMax) * 0.5],
    [dt.courtXMax - 155, dt.courtZMax - 155],
    [(dt.courtXMin + dt.courtXMax) * 0.5, dt.courtZMax - 145],
    [dt.courtXMin + 155, dt.courtZMax - 155],
    [dt.courtXMin + 145, (dt.courtZMin + dt.courtZMax) * 0.5],
  ].filter(([x, z]) => isKohenPatrolPointClear(x, z));
  // Keep one continuous circuit. Random reversals made the NPC retrace the
  // segment it had just walked and look trapped in a short repeated loop.
  if (!candidates.length) return;
  const lastIndex = Number.isInteger(kohen.userData.waypointIndex)
    ? kohen.userData.waypointIndex
    : -1;
  const nextIndex = lastIndex < 0
    ? 0
    : (lastIndex + 1) % candidates.length;
  kohen.userData.waypointIndex = nextIndex;
  const point = candidates[nextIndex] ||
    [dt.courtXMin + 150, dt.courtZMax - 150];
  kohen.userData.target.set(point[0], 0, point[1]);
  kohen.userData.waitFor = 0.6 + Math.random() * 1.2;
  kohen.userData.gesture = Math.floor(Math.random() * 3);
}
function captureKohenWalkRig(model) {
  const wanted = new Set([
    "L_Thigh", "R_Thigh", "L_Calf", "R_Calf",
    "L_Upperarm", "R_Upperarm", "Spine01",
  ]);
  const rig = {};
  model.traverse((part) => {
    if (part.isBone && wanted.has(part.name)) {
      rig[part.name] = {
        bone: part,
        base: part.quaternion.clone(),
      };
    }
  });
  return rig;
}
function updateProceduralKohenWalk(kohen, moving, delta, visible) {
  const rig = kohen.userData.walkRig;
  if (!rig || !visible) return;
  kohen.userData.animationAccumulator += delta;
  if (kohen.userData.animationAccumulator < 1 / 30) return;
  const elapsed = kohen.userData.animationAccumulator;
  kohen.userData.animationAccumulator = 0;
  if (moving) kohen.userData.walkPhase += elapsed * 7.2;
  const phase = kohen.userData.walkPhase;
  const stride = moving ? Math.sin(phase) : 0;
  const bendL = moving ? Math.max(0, -stride) * 0.34 : 0;
  const bendR = moving ? Math.max(0, stride) * 0.34 : 0;
  const setX = (name, angle) => {
    const entry = rig[name];
    if (!entry) return;
    entry.bone.quaternion.copy(entry.base).multiply(
      new t.Quaternion().setFromAxisAngle(new t.Vector3(1, 0, 0), angle),
    );
  };
  setX("L_Thigh", stride * 0.42);
  setX("R_Thigh", -stride * 0.42);
  setX("L_Calf", bendL);
  setX("R_Calf", bendR);
  setX("L_Upperarm", -stride * 0.25);
  setX("R_Upperarm", stride * 0.25);
  setX("Spine01", moving ? Math.sin(phase * 0.5) * 0.025 : 0);
}
function ensureKohen() {
  if (!i || !dt || mt.kohen?.parent) return;
  const kohen = new t.Group();
  kohen.name = "TempleCourtKohen";
  const startX = dt.courtXMin + 165;
  const startZ = dt.courtZMax - 165;
  kohen.position.set(startX, te(startX, startZ), startZ);
  kohen.userData = {
    isKohen: true,
    bodyHeight: 106,
    collisionRadius: 20,
    maxStepUp: 10,
    maxDrop: 12,
    maxSlope: 0.62,
    lastSafePosition: new t.Vector3(startX, te(startX, startZ), startZ),
    target: new t.Vector3(),
    phase: Math.random() * Math.PI * 2,
    waitFor: 1,
    gesture: 0,
    importedModel: null,
    importedModelBaseY: 0,
    walkRig: null,
    walkPhase: Math.random() * Math.PI * 2,
    waypointIndex: -1,
    animationAccumulator: 0,
  };
  i.add(kohen);
  mt.kohen = kohen;
  chooseKohenWaypoint(kohen);
  loadKohenModel().then((template) => {
    if (!kohen.parent || mt.kohen !== kohen) return;
    const model = cloneSkinnedModel(template);
    model.name = "KohenOptimizedModel";
    model.updateMatrixWorld(true);
    let box = new t.Box3().setFromObject(model);
    const size = box.getSize(new t.Vector3());
    // Match the intended human scale: only a little taller than David.
    model.scale.setScalar(106 / Math.max(size.y, 0.001));
    model.updateMatrixWorld(true);
    box = new t.Box3().setFromObject(model);
    const center = box.getCenter(new t.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);
    kohen.add(model);
    kohen.userData.importedModel = model;
    kohen.userData.importedModelBaseY = model.position.y;
    // The supplied clip contains a short repeating body translation that
    // visibly snaps backwards. Keep the rig but drive a stable in-place gait
    // ourselves while the parent group performs continuous world movement.
    kohen.userData.walkRig = captureKohenWalkRig(model);
  }).catch(() => {});
}
function updateKohen(delta) {
  ensureKohen();
  const kohen = mt.kohen;
  if (!kohen?.parent || !dt) return;
  kohen.userData.phase += delta;
  const target = kohen.userData.target;
  const dx = target.x - kohen.position.x;
  const dz = target.z - kohen.position.z;
  const distance = Math.hypot(dx, dz);
  const model = kohen.userData.importedModel;
  const playerDistance = mt.player
    ? Math.hypot(
      mt.player.position.x - kohen.position.x,
      mt.player.position.z - kohen.position.z,
    )
    : 0;
  const renderKohen = playerDistance < 1250;
  if (model) model.visible = renderKohen;
  if (distance > 12) {
    updateProceduralKohenWalk(kohen, true, delta, renderKohen);
    const step = Math.min(distance, 35 * delta);
    const nextX = kohen.position.x + (dx / distance) * step;
    const nextZ = kohen.position.z + (dz / distance) * step;
    if (
      isKohenPatrolPointClear(nextX, nextZ) &&
      moveNpcWithSweptCollision(kohen, Math.atan2(dx, dz), step)
    ) {
      kohen.rotation.y = Math.atan2(dx, dz);
    } else {
      chooseKohenWaypoint(kohen);
    }
    if (model) {
      model.position.y = kohen.userData.importedModelBaseY;
      model.rotation.z = 0;
      model.rotation.x = 0;
    }
  } else {
    updateProceduralKohenWalk(kohen, false, delta, renderKohen);
    kohen.userData.waitFor -= delta;
    if (model) {
      const gesture = kohen.userData.gesture;
      model.position.y = kohen.userData.importedModelBaseY;
      model.rotation.z = gesture === 2
        ? Math.sin(kohen.userData.phase * 1.7) * 0.045
        : 0;
      model.rotation.x = gesture === 1
        ? 0.035 + Math.sin(kohen.userData.phase * 1.4) * 0.025
        : 0;
    }
    if (kohen.userData.waitFor <= 0) chooseKohenWaypoint(kohen);
  }
  kohen.position.y = te(kohen.position.x, kohen.position.z);
}
function prepareCityCitizenTemplate(scene) {
  scene.traverse((part) => {
    if (!part.isMesh) return;
    part.castShadow = false;
    part.receiveShadow = false;
    // These are animated skinned meshes. Their exported rest-pose bounds do
    // not follow every bone, which caused the four citizens to flicker and
    // made Boy 2 / Girl 2 appear to alternate near the camera edge.
    part.frustumCulled = false;
    const materials = Array.isArray(part.material) ? part.material : [part.material];
    for (const material of materials) {
      if (!material) continue;
      material.side = t.FrontSide;
      material.depthWrite = true;
      material.roughness = Math.max(0.78, material.roughness ?? 0.78);
      material.metalness = 0;
      material.normalMap = null;
      material.roughnessMap = null;
      material.metalnessMap = null;
      if (material.map) {
        material.map.colorSpace = t.SRGBColorSpace;
        material.map.anisotropy = 1;
      }
      material.needsUpdate = true;
    }
  });
  return scene;
}
function loadCityBoyModel() {
  if (cityBoyModelTemplate) return Promise.resolve(cityBoyModelTemplate);
  if (cityBoyModelPromise) return cityBoyModelPromise;
  cityBoyModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/city_boy_rigged_game.glb"),
      (gltf) => {
        cityBoyModelTemplate = prepareCityCitizenTemplate(gltf.scene);
        resolve(cityBoyModelTemplate);
      },
      undefined,
      (error) => {
        cityBoyModelPromise = null;
        reject(error);
      },
    );
  });
  return cityBoyModelPromise;
}
function loadCityBoy1Model() {
  if (cityBoy1ModelTemplate) return Promise.resolve(cityBoy1ModelTemplate);
  if (cityBoy1ModelPromise) return cityBoy1ModelPromise;
  cityBoy1ModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/city_boy1_walk_game.glb"),
      (gltf) => {
        cityBoy1ModelTemplate = prepareCityCitizenTemplate(gltf.scene);
        cityBoy1ModelTemplate.animations = gltf.animations || [];
        resolve(cityBoy1ModelTemplate);
      },
      undefined,
      (error) => {
        cityBoy1ModelPromise = null;
        reject(error);
      },
    );
  });
  return cityBoy1ModelPromise;
}
function loadCityGirlModel() {
  if (cityGirlModelTemplate) return Promise.resolve(cityGirlModelTemplate);
  if (cityGirlModelPromise) return cityGirlModelPromise;
  cityGirlModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/city_girl2_walk_game.glb"),
      (gltf) => {
        cityGirlModelTemplate = prepareCityCitizenTemplate(gltf.scene);
        cityGirlModelTemplate.animations = gltf.animations || [];
        resolve(cityGirlModelTemplate);
      },
      undefined,
      (error) => {
        cityGirlModelPromise = null;
        reject(error);
      },
    );
  });
  return cityGirlModelPromise;
}
function loadCityGirl1Model() {
  if (cityGirl1ModelTemplate) return Promise.resolve(cityGirl1ModelTemplate);
  if (cityGirl1ModelPromise) return cityGirl1ModelPromise;
  cityGirl1ModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      modelAssetPath("./assets/models/city_girl1_rigged_game.glb"),
      (gltf) => {
        cityGirl1ModelTemplate = prepareCityCitizenTemplate(gltf.scene);
        resolve(cityGirl1ModelTemplate);
      },
      undefined,
      (error) => {
        cityGirl1ModelPromise = null;
        reject(error);
      },
    );
  });
  return cityGirl1ModelPromise;
}
function getCitizenNavigationOptions(citizen) {
  const now = performance.now();
  const blockedEdges = new Set();
  const blockedWaypoints = new Set();
  citizen.userData.temporarilyBlockedEdges = (
    citizen.userData.temporarilyBlockedEdges || []
  ).filter((entry) => {
    if (entry.until <= now) return false;
    blockedEdges.add(entry.key);
    return true;
  });
  citizen.userData.temporarilyBlockedWaypoints = (
    citizen.userData.temporarilyBlockedWaypoints || []
  ).filter((entry) => {
    if (entry.until <= now) return false;
    blockedWaypoints.add(entry.key);
    return true;
  });
  return {
    blockedEdges,
    blockedWaypoints,
    discouragedEdges: new Set(citizen.userData.recentRouteEdges || []),
    forceGraphRoute: blockedEdges.size > 0 || blockedWaypoints.size > 0,
    requireConnectedRoute: true,
    pathTreeCache: new Map(),
  };
}
function rememberCitizenBlockedPath(citizen, duration = 9000) {
  const path = citizen.userData.path || [];
  const index = citizen.userData.pathIndex || 0;
  const waypoint = path[index];
  if (!waypoint) return;
  const until = performance.now() + duration;
  const addOrExtend = (entries, key) => {
    const existing = entries.find((entry) => entry.key === key);
    if (existing) existing.until = Math.max(existing.until, until);
    else entries.push({ key, until });
  };
  const blockedWaypoints = citizen.userData.temporarilyBlockedWaypoints ||
    (citizen.userData.temporarilyBlockedWaypoints = []);
  addOrExtend(blockedWaypoints, cityRoadPointKey(waypoint));
  const previous = index > 0
    ? path[index - 1]
    : { x: citizen.position.x, z: citizen.position.z };
  if (previous) {
    const blockedEdges = citizen.userData.temporarilyBlockedEdges ||
      (citizen.userData.temporarilyBlockedEdges = []);
    addOrExtend(blockedEdges, cityRoadEdgeKey(previous, waypoint));
  }
  // If route selection ever has to fall back to the simple main loop, begin
  // from its opposite direction instead of reversing over the same short leg.
  citizen.userData.mainRoadDirection = -(citizen.userData.mainRoadDirection || 1);
  citizen.userData.keepRoadDirection = true;
}
function citizenThreatDistance(x, z, bandits) {
  if (!bandits.length) return Infinity;
  let distance = Infinity;
  for (const bandit of bandits)
    distance = Math.min(
      distance,
      Math.hypot(x - bandit.position.x, z - bandit.position.z),
    );
  return distance;
}
function chooseCitizenRoadTarget(citizen, fleeing = false) {
  const graph = buildCitySheepRoadGraph();
  if (!graph.nodes.length) return;
  const current = closestPointOnCityRoad(citizen.position.x, citizen.position.z);
  const candidates = [];
  const previousDistrict = citizen.userData.currentDistrict ?? -1;
  const bandits = getActiveCityBandits();
  const navigationOptions = getCitizenNavigationOptions(citizen);
  const initialDangerDistance = citizenThreatDistance(
    citizen.position.x,
    citizen.position.z,
    bandits,
  );
  for (const node of graph.nodes) {
    if (isInsideTempleCourt(node.x, node.z, 55)) continue;
    const travel = Math.hypot(node.x - citizen.position.x, node.z - citizen.position.z);
    if (travel < (fleeing ? 320 : 700)) continue;
    if (
      !fleeing &&
      citizen.userData.recentTargets.some(
        (target) => Math.hypot(node.x - target.x, node.z - target.z) < 180,
      )
    ) continue;
    let dangerDistance = bandits.length ? Infinity : Math.hypot(
      node.x - (mt.player?.position.x ?? citizen.position.x),
      node.z - (mt.player?.position.z ?? citizen.position.z),
    );
    for (const bandit of bandits)
      dangerDistance = Math.min(
        dangerDistance,
        Math.hypot(node.x - bandit.position.x, node.z - bandit.position.z),
      );
    const district = node.z < -700 ? 0 : node.z < 350 ? 1 :
      node.z < 1150 ? 2 : node.x < -220 ? 3 : node.x > 220 ? 4 : 5;
    if (!fleeing && district === previousDistrict) continue;
    const path = makeCitySheepPath(
      current?.x ?? citizen.position.x,
      current?.z ?? citizen.position.z,
      node.x,
      node.z,
      navigationOptions,
    );
    if (
      path.length < 5 ||
      path.some((point) => isInsideTempleCourt(point.x, point.z, 42))
    ) continue;
    let routeLength = 0;
    for (let index = 1; index < path.length; index++)
      routeLength += Math.hypot(
        path[index].x - path[index - 1].x,
        path[index].z - path[index - 1].z,
      );
    if (routeLength < (fleeing ? 360 : 1050)) continue;
    const edgeKeys = [];
    let repeatedEdges = 0;
    for (let index = 1; index < path.length; index++) {
      const a = path[index - 1];
      const b = path[index];
      const first = `${Math.round(a.x)},${Math.round(a.z)}`;
      const second = `${Math.round(b.x)},${Math.round(b.z)}`;
      const key = first < second ? `${first}|${second}` : `${second}|${first}`;
      edgeKeys.push(key);
      if (citizen.userData.recentRouteEdges.includes(key)) repeatedEdges++;
    }
    const novelty = 1 - repeatedEdges / Math.max(edgeKeys.length, 1);
    if (!fleeing && novelty < 0.38) continue;
    let minimumPathDanger = Infinity;
    for (const point of path)
      minimumPathDanger = Math.min(
        minimumPathDanger,
        citizenThreatDistance(point.x, point.z, bandits),
      );
    const firstEscapePoint = path.find(
      (point) => Math.hypot(
        point.x - citizen.position.x,
        point.z - citizen.position.z,
      ) > 45,
    );
    const firstEscapeGain = firstEscapePoint && bandits.length
      ? citizenThreatDistance(firstEscapePoint.x, firstEscapePoint.z, bandits) -
        initialDangerDistance
      : 0;
    // An escape route must visibly lead away from the nearest robber from its
    // first useful road node. A remote safe destination is not enough if the
    // shortest path initially runs back toward the threat.
    if (fleeing && bandits.length && firstEscapeGain < -22) continue;
    const score = fleeing
      ? dangerDistance * 1.4 +
        minimumPathDanger * 0.75 +
        firstEscapeGain * 5.5 +
        novelty * 160 -
        routeLength * 0.08
      : routeLength * 0.55 + novelty * 900 + Math.random() * 260;
    candidates.push({ node, score, path, district, edgeKeys });
  }
  candidates.sort((a, b) => b.score - a.score);
  let best = candidates.length
    ? fleeing
      ? candidates[0]
      : candidates[Math.floor(Math.random() * Math.min(6, candidates.length))]
    : null;
  if (!best) {
    citizen.userData.recentTargets.splice(
      0,
      Math.ceil(citizen.userData.recentTargets.length / 2),
    );
    citizen.userData.recentRouteEdges.splice(
      0,
      Math.ceil(citizen.userData.recentRouteEdges.length / 2),
    );
    const fallbackNodes = graph.nodes
      .filter((node) => !isInsideTempleCourt(node.x, node.z, 55))
      .map((node) => ({
        node,
        distance: Math.hypot(
          node.x - citizen.position.x,
          node.z - citizen.position.z,
        ),
        safety: citizenThreatDistance(node.x, node.z, bandits),
      }))
      .sort((a, b) =>
        fleeing && bandits.length
          ? b.safety - a.safety || b.distance - a.distance
          : b.distance - a.distance,
      );
    // Search the whole reachable component. Limiting this to a handful of
    // farthest nodes failed when a remembered blocked edge temporarily split
    // off a small lane: every sampled goal was unreachable, so the NPC fell
    // back to the same simple loop again.
    for (const candidate of fallbackNodes) {
      const path = makeCitySheepPath(
        current?.x ?? citizen.position.x,
        current?.z ?? citizen.position.z,
        candidate.node.x,
        candidate.node.z,
        navigationOptions,
      );
      if (
        path.length >= 3 &&
        !path.some((point) => isInsideTempleCourt(point.x, point.z, 42))
      ) {
        const district = candidate.node.z < -700 ? 0 :
          candidate.node.z < 350 ? 1 :
          candidate.node.z < 1150 ? 2 :
          candidate.node.x < -220 ? 3 : candidate.node.x > 220 ? 4 : 5;
        best = { node: candidate.node, path, district, edgeKeys: [] };
        break;
      }
    }
  }
  if (!best) return;
  if (!fleeing) {
    // A single shortest path makes every citizen converge on the same central
    // lane. Insert a safe, randomly selected cross-town waypoint so successive
    // trips use different alleys and cover the whole city rather than shuttling
    // along one repeated segment.
    const viaCandidates = graph.nodes.filter((node) => {
      if (isInsideTempleCourt(node.x, node.z, 55)) return false;
      const fromCitizen = Math.hypot(
        node.x - citizen.position.x,
        node.z - citizen.position.z,
      );
      const fromGoal = Math.hypot(node.x - best.node.x, node.z - best.node.z);
      return (
        fromCitizen > 420 &&
        fromGoal > 420 &&
        !citizen.userData.recentTargets.some(
          (target) => Math.hypot(node.x - target.x, node.z - target.z) < 160,
        )
      );
    });
    for (let attempt = 0; attempt < Math.min(10, viaCandidates.length); attempt++) {
      const pick = Math.floor(Math.random() * viaCandidates.length);
      const via = viaCandidates.splice(pick, 1)[0];
      const firstLeg = makeCitySheepPath(
        current?.x ?? citizen.position.x,
        current?.z ?? citizen.position.z,
        via.x,
        via.z,
        navigationOptions,
      );
      const secondLeg = makeCitySheepPath(
        via.x,
        via.z,
        best.node.x,
        best.node.z,
        navigationOptions,
      );
      const combined = [...firstLeg, ...secondLeg.slice(1)];
      if (
        firstLeg.length >= 3 &&
        secondLeg.length >= 3 &&
        !combined.some((point) => isInsideTempleCourt(point.x, point.z, 42))
      ) {
        best.path = combined;
        citizen.userData.recentTargets.push({ x: via.x, z: via.z });
        break;
      }
    }
  }
  citizen.userData.path = best.path;
  citizen.userData.pathIndex = Math.min(1, citizen.userData.path.length - 1);
  citizen.userData.currentDistrict = best.district;
  citizen.userData.recentTargets.push({ x: best.node.x, z: best.node.z });
  if (citizen.userData.recentTargets.length > 10)
    citizen.userData.recentTargets.shift();
  citizen.userData.recentRouteEdges.push(...best.edgeKeys);
  if (citizen.userData.recentRouteEdges.length > 56)
    citizen.userData.recentRouteEdges.splice(
      0,
      citizen.userData.recentRouteEdges.length - 56,
    );
}
function getActiveCityBandits() {
  return mt.enemies.filter(
    (enemy) =>
      enemy?.parent &&
      enemy.userData.type === "bandit" &&
      enemy.userData.hp > 0,
  );
}
function suspendGuardForCityBandits() {
  const guard = mt.southGateGuard;
  const marker = ensureGuardAlertIndicator();
  marker.classList.remove("show");
  marker.style.display = "none";
  marker.setAttribute("aria-hidden", "true");
  if (!guard) return;
  guard.userData.alerted = false;
  guard.userData.chaseActivated = false;
  guard.userData.searchFor = 0;
  guard.userData.searchWaypoint = 0;
  guard.userData.searchWaypointFor = 0;
  guard.userData.sightLostFor = 0;
  // If the guard had already started pursuing David, he disengages and walks
  // back to his post. A robber event and a wanted-star event never overlap.
  if (
    Math.hypot(
      guard.position.x - guard.userData.homeX,
      guard.position.z - guard.userData.homeZ,
    ) > 18
  ) {
    guard.userData.returningHome = true;
    guard.userData.returnStuckFor = 0;
  }
}
function captureCitizenWalkRig(model) {
  const rig = {};
  const aliases = [
    "L_Thigh", "R_Thigh", "L_Calf", "R_Calf",
    "L_Upperarm", "R_Upperarm", "Spine01",
  ];
  model.traverse((part) => {
    if (!part.isBone || !aliases.includes(part.name)) return;
    rig[part.name] = { bone: part, base: part.quaternion.clone() };
  });
  return Object.keys(rig).length ? rig : null;
}
function animateCityCitizen(citizen, moving, fleeing, delta, visible) {
  if (!visible) return;
  citizen.userData.animationAccumulator += delta;
  if (citizen.userData.animationAccumulator < 1 / 20) return;
  const elapsed = citizen.userData.animationAccumulator;
  citizen.userData.animationAccumulator = 0;
  if (citizen.userData.walkMixer && citizen.userData.walkAction) {
    citizen.userData.walkAction.paused = !moving;
    citizen.userData.walkAction.timeScale = fleeing ? 1.55 : 1;
    if (moving) citizen.userData.walkMixer.update(Math.min(elapsed, 0.1));
    return;
  }
  if (moving) citizen.userData.walkPhase += elapsed * (fleeing ? 10.5 : 6.4);
  const stride = moving ? Math.sin(citizen.userData.walkPhase) : 0;
  const rig = citizen.userData.walkRig;
  if (rig) {
    const setX = (name, angle) => {
      const entry = rig[name];
      if (!entry) return;
      entry.bone.quaternion.copy(entry.base).multiply(
        new t.Quaternion().setFromAxisAngle(new t.Vector3(1, 0, 0), angle),
      );
    };
    setX("L_Thigh", stride * (fleeing ? 0.52 : 0.36));
    setX("R_Thigh", -stride * (fleeing ? 0.52 : 0.36));
    setX("L_Calf", Math.max(0, -stride) * 0.35);
    setX("R_Calf", Math.max(0, stride) * 0.35);
    setX("L_Upperarm", -stride * 0.24);
    setX("R_Upperarm", stride * 0.24);
    setX("Spine01", fleeing ? -0.08 : 0);
  } else if (citizen.userData.importedModel) {
    citizen.userData.importedModel.rotation.z = moving
      ? Math.sin(citizen.userData.walkPhase) * 0.018
      : 0;
    citizen.userData.importedModel.rotation.x = fleeing ? -0.055 : 0;
  }
}
const cityCitizenProfiles = {
  boy1: { name: "JerusalemBiblicalBoy1", height: 106, radius: 20, walkSpeed: 32, fleeSpeed: 108 },
  boy2: { name: "JerusalemBiblicalBoy2", height: 92, radius: 16, walkSpeed: 34, fleeSpeed: 112 },
  // David's imported mesh is fitted to 164 local units, then the complete
  // playable group is scaled to 0.54. Match the real world-space height.
  girl1: { name: "JerusalemBiblicalGirl1", height: 88.56, radius: 16, walkSpeed: 31, fleeSpeed: 106 },
  girl2: { name: "JerusalemBiblicalGirl2", height: 106, radius: 20, walkSpeed: 33, fleeSpeed: 110 },
};
// Citizens use only the broad public streets. The loop covers the eastern
// gate/Gihon side, David's palace forecourt, the central avenue and the large
// southern square. The south-gate excursion is an optional spur.
const CITY_CITIZEN_MAIN_LOOP = [
  { x: 610, z: 900, zone: "gihon" },
  { x: 430, z: 360, zone: "east-road" },
  { x: 350, z: -260, zone: "east-road" },
  { x: 0, z: -340, zone: "palace" },
  { x: -390, z: -260, zone: "palace" },
  { x: -350, z: 620, zone: "central" },
  { x: 0, z: 980, zone: "central" },
  { x: 0, z: 1260, zone: "south-square" },
  { x: 420, z: 1180, zone: "south-square" },
  { x: 500, z: 680, zone: "east-road" },
];
const CITY_CITIZEN_ALLEY_LOOPS = [
  [
    { x: -700, z: 760 },
    { x: -700, z: 1030 },
    { x: -700, z: 1320 },
    { x: -700, z: 1600 },
    { x: -700, z: 1880 },
    { x: -520, z: 1880 },
    { x: -520, z: 1600 },
    { x: -520, z: 1320 },
    { x: -520, z: 1030 },
    { x: -520, z: 760 },
  ],
  [
    { x: 520, z: 760 },
    { x: 520, z: 1030 },
    { x: 520, z: 1320 },
    { x: 520, z: 1600 },
    { x: 520, z: 1880 },
    { x: 700, z: 1880 },
    { x: 700, z: 1600 },
    { x: 700, z: 1320 },
    { x: 700, z: 1030 },
    { x: 700, z: 760 },
  ],
];
const CITY_CITIZEN_SOUTH_SPUR = [
  { x: 0, z: 1510, zone: "south-road" },
  { x: 0, z: 1900, zone: "south-gate" },
  { x: 0, z: 2220, zone: "south-gate" },
  { x: 0, z: 2350, zone: "outside-south" },
];
function closestPointOnCitizenRoadSegment(x, z, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const amount = lengthSquared
    ? t.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / lengthSquared, 0, 1)
    : 0;
  const roadX = a.x + dx * amount;
  const roadZ = a.z + dz * amount;
  return {
    x: roadX,
    z: roadZ,
    distance: Math.hypot(x - roadX, z - roadZ),
  };
}
function closestCitizenMainRoadPoint(x, z) {
  let best = null;
  const consider = (a, b) => {
    const candidate = closestPointOnCitizenRoadSegment(x, z, a, b);
    if (!best || candidate.distance < best.distance) best = candidate;
  };
  for (let index = 0; index < CITY_CITIZEN_MAIN_LOOP.length; index++)
    consider(
      CITY_CITIZEN_MAIN_LOOP[index],
      CITY_CITIZEN_MAIN_LOOP[(index + 1) % CITY_CITIZEN_MAIN_LOOP.length],
    );
  consider(CITY_CITIZEN_MAIN_LOOP[7], CITY_CITIZEN_SOUTH_SPUR[0]);
  for (let index = 1; index < CITY_CITIZEN_SOUTH_SPUR.length; index++)
    consider(CITY_CITIZEN_SOUTH_SPUR[index - 1], CITY_CITIZEN_SOUTH_SPUR[index]);
  return best;
}
function chooseCitizenMainRoadRoute(citizen, fleeing = false) {
  const loop = CITY_CITIZEN_MAIN_LOOP;
  let nearest = 0;
  let nearestDistance = Infinity;
  for (let index = 0; index < loop.length; index++) {
    const distance = Math.hypot(
      loop[index].x - citizen.position.x,
      loop[index].z - citizen.position.z,
    );
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  }
  let direction = citizen.userData.mainRoadDirection || (Math.random() < 0.5 ? 1 : -1);
  // Direction changes only after a completed broad journey. Preserve it while
  // recovering from a blocked corner so an NPC never shuttles on one segment.
  if (!citizen.userData.keepRoadDirection && Math.random() < 0.18) direction *= -1;
  citizen.userData.keepRoadDirection = false;
  citizen.userData.mainRoadDirection = direction;
  const path = [];
  const count = fleeing ? 4 : loop.length + 2 + Math.floor(Math.random() * 4);
  for (let step = 1; step <= count; step++) {
    const index = (nearest + direction * step + loop.length * 4) % loop.length;
    path.push({ x: loop[index].x, z: loop[index].z });
    if (
      !fleeing &&
      loop[index].zone === "south-square" &&
      Math.random() < 0.28
    ) {
      path.push(...CITY_CITIZEN_SOUTH_SPUR);
      path.push(...CITY_CITIZEN_SOUTH_SPUR.slice(0, -1).reverse());
    }
  }
  citizen.userData.path = path.filter(
    (point) => !isInsideTempleCourt(point.x, point.z, 55),
  );
  citizen.userData.pathIndex = 0;
}
function chooseCitizenAlleyRoute(citizen) {
  const loopIndex = Number.isInteger(citizen.userData.alleyLoopIndex)
    ? citizen.userData.alleyLoopIndex
    : Math.floor(Math.random() * CITY_CITIZEN_ALLEY_LOOPS.length);
  const loop = CITY_CITIZEN_ALLEY_LOOPS[loopIndex];
  citizen.userData.alleyLoopIndex = loopIndex;
  let nearest = 0;
  let nearestDistance = Infinity;
  for (let index = 0; index < loop.length; index++) {
    const distance = Math.hypot(
      loop[index].x - citizen.position.x,
      loop[index].z - citizen.position.z,
    );
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }
  const direction = citizen.userData.mainRoadDirection || (Math.random() < 0.5 ? 1 : -1);
  citizen.userData.mainRoadDirection = direction;
  citizen.userData.path = [];
  for (let step = 1; step <= loop.length + 2; step++) {
    const index = (nearest + direction * step + loop.length * 3) % loop.length;
    citizen.userData.path.push({ x: loop[index].x, z: loop[index].z });
  }
  citizen.userData.pathIndex = 0;
}
function addCityCitizen(kind, index, template) {
  if (!i || !dt) return;
  const profile = cityCitizenProfiles[kind];
  const road = Xt[(index * 11 + 7) % Xt.length];
  const amount = 0.2 + 0.6 * ((index * 0.37 + 0.21) % 1);
  const x = t.MathUtils.lerp(road[0][0], road[1][0], amount);
  const z = t.MathUtils.lerp(road[0][1], road[1][1], amount);
  const citizen = new t.Group();
  citizen.name = profile.name;
  citizen.position.set(x, te(x, z), z);
  citizen.userData = {
    isCityCitizen: true,
    citizenKind: kind,
    hitRadius: Math.max(25, profile.radius + 9),
    bodyHeight: profile.height,
    collisionRadius: Math.max(11, profile.radius * 0.72),
    roadCorridorRadius: 48,
    buildingAvoidancePadding: 4,
    walkSpeed: profile.walkSpeed,
    fleeSpeed: profile.fleeSpeed,
    maxStepUp: 11,
    maxDrop: 13,
    maxSlope: 0.7,
    path: [],
    pathIndex: 0,
    repathFor: Math.random() * 0.4,
    walkPhase: Math.random() * Math.PI * 2,
    animationAccumulator: 0,
    importedModel: null,
    walkRig: null,
    walkMixer: null,
    walkAction: null,
    lastSafePosition: new t.Vector3(x, te(x, z), z),
    attackedFleeFor: 0,
    fleeing: false,
    recentTargets: [],
    recentRouteEdges: [],
    temporarilyBlockedEdges: [],
    temporarilyBlockedWaypoints: [],
    keepRoadDirection: false,
    stuckFor: 0,
    progressPosition: new t.Vector3(x, te(x, z), z),
    progressCheckFor: 1.2,
    currentDistrict: -1,
    blockedWaypointFor: 0,
    panicFor: 0,
    dangerRepathFor: 0,
    updateOffset: index * 0.025,
    entryActive: false,
    entryRole: "hidden",
    alleyLoopIndex: index % CITY_CITIZEN_ALLEY_LOOPS.length,
  };
  const model = (kind === "boy1" || kind === "boy2" || kind === "girl1" || kind === "girl2")
    ? cloneSkinnedModel(template)
    : template.clone(true);
  model.visible = true;
  model.traverse((part) => {
    part.visible = true;
    if (part.isMesh || part.isSkinnedMesh) part.frustumCulled = false;
  });
  model.updateMatrixWorld(true);
  let box = new t.Box3().setFromObject(model);
  const targetHeight = profile.height;
  model.scale.setScalar(targetHeight / Math.max(box.getSize(new t.Vector3()).y, 0.001));
  model.updateMatrixWorld(true);
  box = new t.Box3().setFromObject(model);
  const center = box.getCenter(new t.Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);
  citizen.add(model);
  citizen.userData.importedModel = model;
  const clip = (template.animations || [])[0];
  if ((kind === "boy1" || kind === "girl2") && clip) {
    const mixer = new t.AnimationMixer(model);
    const action = mixer.clipAction(clip);
    action.setLoop(t.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.play();
    citizen.userData.walkMixer = mixer;
    citizen.userData.walkAction = action;
  } else {
    citizen.userData.walkRig = captureCitizenWalkRig(model);
  }
  i.add(citizen);
  mt.cityCitizens.push(citizen);
  citizen.visible = false;
}
function removeDuplicateDavidCharacters() {
  if (!i || !mt.player) return;
  const stale = [];
  i.traverse((object) => {
    if (
      object !== mt.player &&
      object.name === "DavidFinalPlayableModel" &&
      !mt.player.getObjectById(object.id)
    ) stale.push(object);
  });
  stale.forEach((object) => object.parent?.remove(object));
}
function resetCityCitizensForEntry() {
  if (!mt.cityCitizens.length) return;
  const citizens = [...mt.cityCitizens];
  for (let index = citizens.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [citizens[index], citizens[swapIndex]] = [citizens[swapIndex], citizens[index]];
  }
  const houseCandidates = southernJerusalemUpgrade.houses
    .filter((house) => {
      if (!Number.isFinite(house.doorX) || !Number.isFinite(house.doorZ)) return false;
      const road = closestPointOnCityRoad(house.doorX, house.doorZ);
      return !!road && road.distance < road.width * 0.5 + 58;
    })
    .sort(() => Math.random() - 0.5);

  const resetNavigation = (citizen) => {
    citizen.userData.lastSafePosition.copy(citizen.position);
    citizen.userData.progressPosition.copy(citizen.position);
    citizen.userData.path = [];
    citizen.userData.pathIndex = 0;
    citizen.userData.recentTargets = [];
    citizen.userData.recentRouteEdges = [];
    citizen.userData.temporarilyBlockedEdges = [];
    citizen.userData.temporarilyBlockedWaypoints = [];
    citizen.userData.currentDistrict = -1;
    citizen.userData.blockedWaypointFor = 0;
    citizen.userData.stuckFor = 0;
    citizen.userData.repathFor = 0;
    citizen.userData.panicFor = 0;
    citizen.userData.dangerRepathFor = 0;
    citizen.userData.attackedFleeFor = 0;
    citizen.userData.fleeing = false;
    citizen.userData.mainRoadDirection = Math.random() < 0.5 ? -1 : 1;
  };
  const place = (citizen, point, role, active = true) => {
    citizen.userData.entryRole = role;
    citizen.userData.entryActive = active;
    citizen.visible = active;
    if (!active) {
      citizen.userData.path = [];
      return;
    }
    citizen.position.set(point.x, te(point.x, point.z), point.z);
    resetNavigation(citizen);
  };

  citizens.forEach((citizen) => place(citizen, citizen.position, "hidden", false));

  const mainCitizen = citizens[0];
  const mainSpawn = CITY_CITIZEN_MAIN_LOOP[
    Math.floor(Math.random() * CITY_CITIZEN_MAIN_LOOP.length)
  ];
  place(mainCitizen, mainSpawn, "main-road");
  chooseCitizenMainRoadRoute(mainCitizen, false);

  const alleyCitizen = citizens[1];
  if (!alleyCitizen) return;
  const alleyLoopIndex = Math.floor(Math.random() * CITY_CITIZEN_ALLEY_LOOPS.length);
  const alleyLoop = CITY_CITIZEN_ALLEY_LOOPS[alleyLoopIndex];
  const alleySpawn = alleyLoop[Math.floor(Math.random() * alleyLoop.length)];
  place(alleyCitizen, alleySpawn, "alley");
  alleyCitizen.userData.alleyLoopIndex = alleyLoopIndex;
  chooseCitizenAlleyRoute(alleyCitizen);

  for (let optionalIndex = 2; optionalIndex < Math.min(4, citizens.length); optionalIndex++) {
    const citizen = citizens[optionalIndex];
    const appears = Math.random() < 0.58;
    const house = houseCandidates.shift();
    if (!appears || !house) continue;
    const direction = Number(house.doorDirection) || 0;
    const outside = {
      x: house.doorX + Math.sin(direction) * 30,
      z: house.doorZ + Math.cos(direction) * 30,
    };
    const roadExit = nearestClearCityRoadPoint(outside.x, outside.z, 22);
    const blocked = jt(
      new t.Vector3(outside.x, te(outside.x, outside.z) + 5, outside.z),
      citizen.userData.collisionRadius || 14,
    );
    const spawn = blocked && roadExit ? roadExit : outside;
    place(citizen, spawn, "house");
    citizen.userData.alleyLoopIndex = Math.floor(
      Math.random() * CITY_CITIZEN_ALLEY_LOOPS.length,
    );
    if (roadExit && Math.hypot(roadExit.x - spawn.x, roadExit.z - spawn.z) > 8)
      citizen.userData.path = [{ x: roadExit.x, z: roadExit.z }];
    else chooseCitizenAlleyRoute(citizen);
  }
}
async function loadCityCitizenWithRetry(loader, attempts = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts)
        await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
    }
  }
  throw lastError;
}
function ensureCityCitizens() {
  if (!i || !dt || mt.cityCitizens.length >= 4 || mt.cityCitizensLoading) return;
  // Reserve creation once, but let every asset succeed independently. One bad
  // model must never cancel the other three citizens.
  mt.cityCitizensLoading = true;
  const requests = [
    ["boy1", 0, loadCityCitizenWithRetry(loadCityBoy1Model)],
    ["boy2", 1, loadCityCitizenWithRetry(loadCityBoyModel)],
    ["girl1", 2, loadCityCitizenWithRetry(loadCityGirl1Model)],
    ["girl2", 3, loadCityCitizenWithRetry(loadCityGirlModel)],
  ];
  Promise.allSettled(requests.map((entry) => entry[2])).then((results) => {
    if (!i) {
      mt.cityCitizensLoading = false;
      return;
    }
    removeDuplicateDavidCharacters();
    const hadCitizens = mt.cityCitizens.length > 0;
    results.forEach((result, index) => {
      const [kind, citizenIndex] = requests[index];
      if (
        result.status === "fulfilled" &&
        !mt.cityCitizens.some((citizen) => citizen.userData.citizenKind === kind)
      )
        addCityCitizen(kind, citizenIndex, result.value);
      else if (result.status === "rejected")
        console.warn(`성 안 시민 ${kind} 모델을 불러오지 못했습니다.`, result.reason);
    });
    mt.cityCitizensLoading = false;
    // Do not relocate already-visible citizens when one independently retried
    // asset finishes loading. That late whole-group reset was perceived as a
    // blink/alternation. Only the first complete creation receives start slots.
    if (!hadCitizens) {
      const playerInside = !!mt.player && Yt(mt.player.position.x, mt.player.position.z, -55);
      if (playerInside) resetCityCitizensForEntry();
      else mt.cityCitizens.forEach((citizen) => {
        citizen.userData.entryActive = false;
        citizen.userData.entryRole = "hidden";
        citizen.visible = false;
      });
    }
  });
}
function planCityCitizenRoute(citizen, fleeing) {
  citizen.userData.path = [];
  citizen.userData.pathIndex = 0;
  if (fleeing) {
    chooseCitizenRoadTarget(citizen, true);
    if (!citizen.userData.path.length)
      chooseCitizenMainRoadRoute(citizen, true);
  } else if (citizen.userData.entryRole === "main-road") {
    chooseCitizenMainRoadRoute(citizen, false);
  } else {
    chooseCitizenAlleyRoute(citizen);
  }
  citizen.userData.repathFor = fleeing ? 1.25 : 4.2;
}
function isCityCitizenCrowdedAt(citizen, x, z) {
  for (const other of mt.cityCitizens) {
    if (other === citizen || !other?.parent || !other.userData.entryActive) continue;
    const minimum =
      (citizen.userData.collisionRadius || 12) +
      (other.userData.collisionRadius || 12) +
      (citizen.userData.fleeing ? 3 : 8);
    if (Math.hypot(other.position.x - x, other.position.z - z) < minimum)
      return true;
  }
  return false;
}
function tryMoveCityCitizen(citizen, desiredAngle, distance) {
  const offsets = citizen.userData.fleeing
    ? [0, 0.2, -0.2, 0.42, -0.42, 0.7, -0.7, 1.02, -1.02,
      1.38, -1.38, 1.72, -1.72, Math.PI]
    : [0, 0.18, -0.18, 0.38, -0.38, 0.62, -0.62];
  for (const offset of offsets) {
    const angle = desiredAngle + offset;
    const probeDistance = Math.max(16, distance * 5);
    const probeX = citizen.position.x + Math.sin(angle) * probeDistance;
    const probeZ = citizen.position.z + Math.cos(angle) * probeDistance;
    const road = closestPointOnCityRoad(probeX, probeZ);
    const corridor = road
      ? Math.max(
        18,
        Math.min(
          citizen.userData.roadCorridorRadius || 48,
          road.width * 0.5 + 8,
        ),
      )
      : 0;
    if (!road || road.distance > corridor) continue;
    const nextX = citizen.position.x + Math.sin(angle) * distance;
    const nextZ = citizen.position.z + Math.cos(angle) * distance;
    if (isCityCitizenCrowdedAt(citizen, nextX, nextZ)) continue;
    if (!moveNpcWithSweptCollision(citizen, angle, distance)) continue;
    citizen.rotation.y = angle;
    return true;
  }
  return false;
}
function beginCityBanditEmergency() {
  const bandits = getActiveCityBandits();
  if (!bandits.length) return;
  cityBanditEmergencyActive = true;
  suspendGuardForCityBandits();
  for (const citizen of mt.cityCitizens) {
    if (!citizen?.parent || !citizen.userData.entryActive) continue;
    citizen.userData.fleeing = true;
    citizen.userData.panicFor = 1.35;
    citizen.userData.dangerRepathFor = 0.7;
    citizen.userData.blockedWaypointFor = 0;
    planCityCitizenRoute(citizen, true);
  }
}
function endCityBanditEmergency() {
  cityBanditEmergencyActive = false;
  for (const citizen of mt.cityCitizens) {
    if (
      !citizen?.parent ||
      !citizen.userData.entryActive ||
      citizen.userData.attackedFleeFor > 0
    ) continue;
    citizen.userData.fleeing = false;
    citizen.userData.panicFor = 0;
    citizen.userData.path = [];
    citizen.userData.pathIndex = 0;
    planCityCitizenRoute(citizen, false);
  }
}
function updateCityCitizens(delta) {
  const playerInside = !!mt.player &&
    Yt(mt.player.position.x, mt.player.position.z, -55);
  const playerNearCity = !!mt.player &&
    Yt(mt.player.position.x, mt.player.position.z, 320);
  if (playerNearCity && mt.cityCitizens.length < 4 && !mt.cityCitizensLoading)
    ensureCityCitizens();
  if (playerInside && !citizensPlayerWasInsideJerusalem) {
    removeDuplicateDavidCharacters();
    resetCityCitizensForEntry();
  }
  citizensPlayerWasInsideJerusalem = playerInside;
  if (!playerNearCity) {
    mt.cityCitizens.forEach((citizen) => {
      citizen.visible = false;
    });
    performanceState.cityCitizenAccumulator = 0;
    return;
  }
  const activeBandits = getActiveCityBandits();
  const banditActive = activeBandits.length > 0;
  if (banditActive && !cityBanditEmergencyActive)
    beginCityBanditEmergency();
  else if (banditActive)
    suspendGuardForCityBandits();
  else if (cityBanditEmergencyActive)
    endCityBanditEmergency();
  // Only the citizens selected for this entry are simulated. Mobile uses a
  // stable 24 Hz city-agent step; the renderer still interpolates their motion.
  performanceState.cityCitizenAccumulator += delta;
  const citizenInterval = playerInside
    ? IS_MOBILE_DEVICE
      ? 1 / 24
      : 1 / 30
    : 1 / 10;
  if (performanceState.cityCitizenAccumulator < citizenInterval) return;
  const stepDelta = Math.min(0.13, performanceState.cityCitizenAccumulator);
  performanceState.cityCitizenAccumulator = 0;
  for (const citizen of mt.cityCitizens) {
    if (!citizen.parent || !citizen.userData.entryActive) {
      citizen.visible = false;
      continue;
    }
    const playerDistance = mt.player
      ? Math.hypot(
        mt.player.position.x - citizen.position.x,
        mt.player.position.z - citizen.position.z,
      )
      : Infinity;
    const visible = playerInside || playerDistance < 1100;
    citizen.visible = visible;
    citizen.userData.repathFor -= stepDelta;
    citizen.userData.dangerRepathFor = Math.max(
      0,
      (citizen.userData.dangerRepathFor || 0) - stepDelta,
    );
    citizen.userData.attackedFleeFor = Math.max(
      0,
      (citizen.userData.attackedFleeFor || 0) - stepDelta,
    );
    const fleeing = banditActive || citizen.userData.attackedFleeFor > 0;
    const fleeStateChanged = citizen.userData.fleeing !== fleeing;
    if (fleeStateChanged || !citizen.userData.path.length) {
      citizen.userData.fleeing = fleeing;
      if (fleeing) citizen.userData.panicFor = Math.max(citizen.userData.panicFor || 0, 0.8);
      planCityCitizenRoute(citizen, fleeing);
    }
    if (fleeing && banditActive && citizen.userData.dangerRepathFor <= 0) {
      const nextWaypoint = citizen.userData.path[citizen.userData.pathIndex];
      const currentThreat = citizenThreatDistance(
        citizen.position.x,
        citizen.position.z,
        activeBandits,
      );
      const nextThreat = nextWaypoint
        ? citizenThreatDistance(nextWaypoint.x, nextWaypoint.z, activeBandits)
        : -Infinity;
      if (!nextWaypoint || nextThreat < currentThreat - 18)
        planCityCitizenRoute(citizen, true);
      citizen.userData.dangerRepathFor = 0.85;
    }
    let waypoint = citizen.userData.path[citizen.userData.pathIndex];
    let moving = false;
    if (fleeing && banditActive && citizen.userData.panicFor > 0) {
      let nearestBandit = null;
      let nearestDistance = Infinity;
      for (const bandit of activeBandits) {
        const distance = Math.hypot(
          citizen.position.x - bandit.position.x,
          citizen.position.z - bandit.position.z,
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestBandit = bandit;
        }
      }
      citizen.userData.panicFor = Math.max(0, citizen.userData.panicFor - stepDelta);
      if (nearestBandit) {
        const awayAngle = Math.atan2(
          citizen.position.x - nearestBandit.position.x,
          citizen.position.z - nearestBandit.position.z,
        );
        moving = tryMoveCityCitizen(
          citizen,
          awayAngle,
          citizen.userData.fleeSpeed * stepDelta,
        );
      }
    }
    for (let advance = 0; waypoint && advance < 3; advance++) {
      const distance = Math.hypot(
        waypoint.x - citizen.position.x,
        waypoint.z - citizen.position.z,
      );
      if (distance >= 10) break;
      citizen.userData.pathIndex++;
      if (citizen.userData.pathIndex >= citizen.userData.path.length) {
        planCityCitizenRoute(citizen, fleeing);
      }
      waypoint = citizen.userData.path[citizen.userData.pathIndex];
    }
    if (waypoint && !moving) {
      const dx = waypoint.x - citizen.position.x;
      const dz = waypoint.z - citizen.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= 10) {
        const angle = Math.atan2(dx, dz);
        const speed = fleeing
          ? citizen.userData.fleeSpeed
          : citizen.userData.walkSpeed;
        const step = Math.min(distance, speed * stepDelta);
        if (tryMoveCityCitizen(citizen, angle, step)) {
          moving = true;
          citizen.userData.blockedWaypointFor = 0;
        } else {
          citizen.userData.blockedWaypointFor += stepDelta;
          if (citizen.userData.blockedWaypointFor > (fleeing ? 0.34 : 0.58)) {
            rememberCitizenBlockedPath(citizen, fleeing ? 6500 : 10500);
            citizen.userData.blockedWaypointFor = 0;
            planCityCitizenRoute(citizen, fleeing);
          }
        }
      }
    }
    citizen.userData.progressCheckFor -= stepDelta;
    if (citizen.userData.progressCheckFor <= 0) {
      const progress = Math.hypot(
        citizen.position.x - citizen.userData.progressPosition.x,
        citizen.position.z - citizen.userData.progressPosition.z,
      );
      if (progress < 4 && citizen.userData.path.length) {
        citizen.userData.stuckFor++;
        if (citizen.userData.stuckFor >= 2) {
          // Remember the failed exit/edge. Replanning without this memory chose
          // the identical shortest path and created an endless two-point loop.
          rememberCitizenBlockedPath(citizen, fleeing ? 7500 : 12000);
          planCityCitizenRoute(citizen, fleeing);
          citizen.userData.stuckFor = 0;
        }
      } else {
        citizen.userData.stuckFor = 0;
      }
      citizen.userData.progressPosition.copy(citizen.position);
      citizen.userData.progressCheckFor = 1.5;
    }
    citizen.position.y = te(citizen.position.x, citizen.position.z);
    animateCityCitizen(citizen, moving, fleeing, stepDelta, visible);
  }
}
function hitCityCitizen(citizen) {
  if (!citizen?.parent || !citizen.userData.entryActive || !citizen.visible)
    return false;
  const banditEmergency = getActiveCityBandits().length > 0;
  setGuardAlerted(!banditEmergency);
  const guard = mt.southGateGuard;
  if (guard && !banditEmergency) {
    guard.userData.returningHome = false;
    guard.userData.searchFor = 0;
    guard.userData.lastSeenX = mt.player.position.x;
    guard.userData.lastSeenZ = mt.player.position.z;
    guard.userData.chaseActivated = Yt(mt.player.position.x, mt.player.position.z, -55);
  } else if (banditEmergency) {
    suspendGuardForCityBandits();
  }
  citizen.userData.fleeing = true;
  citizen.userData.attackedFleeFor = 6;
  citizen.userData.path = [];
  citizen.userData.repathFor = 0;
  if (!banditEmergency)
    eo("성 안의 사람을 공격해 경비병이 추격합니다.");
  return true;
}
function Te() {
  specialSlingAttack.active && finishSpecialSlingAttack();
  [mt.player, mt.sheepShop, mt.southGateGuard, mt.kohen, ...mt.cityCitizens, ...mt.sheep, ...mt.rocks, ...mt.enemies, ...mt.projectiles]
    .filter(Boolean)
    .forEach((t) => i.remove(t)),
    (mt.sheep = []),
    (mt.sheepShop = null),
    (mt.rocks = []),
    (mt.enemies = []),
    (mt.projectiles = []),
    (mt.southGateGuard = null),
    (mt.kohen = null),
    (mt.cityCitizens = []),
    (mt.cityCitizensLoading = false),
    (performanceState.cityCitizenAccumulator = 0),
    (mt.effects = []),
    ae(),
    (at = {
      active: !1,
      shotsLeft: 0,
      hit: !1,
      target: null,
      previousCameraMode: 0,
    }),
    (et = 0),
    (ot = 0),
    (nt = !1),
    (st = []),
    (citySheepWaitingForPickup = !1),
    (playerWasInsideJerusalem = !1),
    (citizensPlayerWasInsideJerusalem = !1),
    (cityBanditEmergencyActive = !1),
    (nightWatch.active = !1),
    nightWatch.camp.set(0, 0, 0),
    (nightWatch.startedAt = 0),
    (nightWatch.lastPhase = ""),
    (nightWatch.sheepLocked = !1),
    (routeChoice.id = ""),
    (routeChoice.name = ""),
    (routeChoice.spawnMultiplier = 1),
    (routeChoice.rewardRespect = 0),
    Object.assign(ut, {
      hp: 100,
      stones: 15,
      quality: "좋은 돌",
      money: 0,
      respect: 0,
      invincible: !1,
      skill: 0,
      missionDone: !1,
      cheatUsed: !1,
      thirst: 100,
      thirstFailed: !1,
      worldTime: 0.29,
    }),
    Z.set(-1150, 0, 1050),
    ($ = 1),
    ce(),
    (A = IS_MOBILE_DEVICE ? 3 : 0),
    IS_MOBILE_DEVICE && (I = -Math.PI / 4),
    (L = "sling"),
    (C = !1),
    Re(),
    ne(5200),
    (O = Oe(!0)),
    (j = 0),
    (H = !1),
    je("");
  const o = De(),
    n = (function () {
      for (let e = 0; e < 500; e++) {
        const e = Math.random() * Math.PI * 2,
          o = 2350 + 1050 * Math.random(),
          n = Math.sin(e) * o,
          s = Math.cos(e) * o;
        if (
          !(
            Kt(n, s, 220) ||
            zt(n, s, 260) ||
            he(n, s) > 0.48 ||
            jt(new t.Vector3(n, te(n, s) + 4, s), 34)
          )
        )
          return { x: n, z: s };
      }
      return _t(qt.x, qt.z);
    })();
  Jt(n.x, n.z), (o.rotation.y = Math.atan2(-o.position.x, -o.position.z));
  if (IS_MOBILE_DEVICE) {
    B = o.rotation.y;
    I = -Math.PI / 4;
    mobileInput.movementYaw = B;
  }
  for (let t = 0; t < 10; t++) {
    const e = Se(t),
      o = mt.player.position.x - 80 + (t % 4) * 55,
      n = mt.player.position.z - 130 + 62 * Math.floor(t / 4);
    e.position.set(o, te(o, n) + 1, n);
  }
  const s = ["거친 돌", "둥근 돌", "좋은 돌", "큰 돌"];
  let a = 0,
    r = 0;
  for (; a < 90 && r++ < 700; ) {
    const e = 5400 * Math.random() - 2700,
      o = 5400 * Math.random() - 2700;
    Kt(e, o, 40) ||
      he(e, o) > 0.48 ||
      jt(new t.Vector3(e, te(e, o) + 5, o), 14) ||
      (be(s[a % 4], e, o), a++);
  }
  [
    [-900, 470],
    [-860, 540],
    [-790, 455],
    [-720, 600],
    [-620, 420],
    [1750, -900],
    [1820, -1040],
  ].forEach((t, e) => be(s[e % 4], t[0], t[1])),
    createSheepShop(),
    createSouthGateGuard(),
    $e(),
    e("#thirstHud").classList.add("show"),
    (e("#thirstBar").style.width = ut.thirst + "%"),
    (e("#thirstValue").textContent = Math.round(ut.thirst));
}
function Le() {
  (r.aspect = innerWidth / innerHeight),
    r.updateProjectionMatrix(),
    c.setSize(innerWidth, innerHeight),
    c.setPixelRatio(
      performanceState.currentPixelRatio || targetPixelRatio(false, false, false),
    );
}
function Ce(t) {
  return [
    ...t.querySelectorAll('button:not([disabled]),input[type="range"],a[href]'),
  ].filter((t) => null !== t.offsetParent);
}
function ke(t, e = 0) {
  const o = Ce(t);
  if (!o.length) return;
  (rt = (e + o.length) % o.length),
    o.forEach((t) => t.classList.remove("menu-focus"));
  const n = o[rt];
  n.classList.add("menu-focus"), n.focus({ preventScroll: !0 });
}
function Be(t) {
  const o = e("#cameraModeNotice");
  o &&
    ((o.textContent = t),
    o.classList.add("show"),
    clearTimeout(Be.timer),
    (Be.timer = setTimeout(() => o.classList.remove("show"), 1500)));
}
function Ie() {
  resetMobileMovement();
  mobileInput.running = false;
  const pauseSound = e("#pauseSoundEnabled");
  const pauseVolume = e("#pauseVolumeRange");
  const pauseVolumeValue = e("#pauseVolumeValue");
  if (pauseSound) pauseSound.checked = y;
  if (pauseVolume) pauseVolume.value = String(Math.round(v * 100));
  if (pauseVolumeValue) pauseVolumeValue.textContent = String(Math.round(v * 100));
  (b = !0),
    pauseAllGameAudio(),
    e("#pause").classList.remove("hidden"),
    document.exitPointerLock?.(),
    setTimeout(() => ke(e("#pause"), 0), 0);
}
function Ee() {
  const t = e("#cheatConsole");
  t.classList.toggle("hidden"),
    t.classList.contains("hidden")
      ? ((b = !1), n || c.domElement.requestPointerLock?.())
      : ((b = !0), document.exitPointerLock?.(), e("#cheatInput").focus());
}
function Re() {
  const t = e("#weaponIcon");
  t &&
    (t.classList.toggle("sling", "sling" === L),
    t.classList.toggle("staff", "staff" === L),
    t.setAttribute("aria-label", "sling" === L ? "회전식 돌팔매" : "지팡이"));
  const mobileAttack = e("#mobileAttackBtn");
  const mobileWeaponIcon = e("#mobileWeaponIcon");
  if (mobileAttack) {
    mobileAttack.classList.toggle("sling", "sling" === L);
    mobileAttack.classList.toggle("staff", "staff" === L);
    mobileAttack.setAttribute(
      "aria-label",
      "sling" === L ? "돌팔매 던지기" : "지팡이 사용",
    );
  }
  if (mobileWeaponIcon) {
    mobileWeaponIcon.classList.toggle("sling", "sling" === L);
    mobileWeaponIcon.classList.toggle("staff", "staff" === L);
  }
}
function triggerCombatFeedback(kind) {
  const now = performance.now();
  if (kind === "damage" && now - combatFeedback.lastDamagePulseAt < 420) return;
  const duration = kind === "damage" ? 240 : 145;
  combatFeedback.shakeUntil = now + duration;
  combatFeedback.shakeDuration = duration;
  combatFeedback.shakeStrength = kind === "damage" ? 4.2 : 2.15;
  if (kind === "damage") {
    combatFeedback.lastDamagePulseAt = now;
    const overlay = e("#damageEdge");
    if (overlay) {
      overlay.classList.remove("pulse");
      overlay.offsetWidth;
      overlay.classList.add("pulse");
    }
  }
}
function Ve(t) {
  kt("mission"),
    Ut(440, 0.2, 0.085, "sine", 180),
    setTimeout(() => Ut(660, 0.22, 0.04, "sine", 210), 180);
  const o = e("#missionResult");
  (o.querySelector("strong").textContent = "미션 성공!"),
    (o.querySelector("span").textContent = "존중 +" + t + " 상승 · 셰켈 +15"),
    o.classList.remove("show"),
    o.offsetWidth,
    o.classList.add("show"),
    clearTimeout(Ve.timer),
    (Ve.timer = setTimeout(() => o.classList.remove("show"), 4200));
}
function Ue(t) {
  if (t && !(t.userData.hp > 0)) {
    t.visible = !1;
    const rewardAllowed = mt.sheep.length >= 5;
    if (rewardAllowed) ut.money = Math.min(1e7, ut.money + 15);
    const rewardText = rewardAllowed
      ? "+15 셰켈"
      : "남은 양이 5마리 미만이어서 셰켈 보상 없음";
    if ("wolf" === t.userData.type) {
      if (
        mt.enemies.some(
          (e) =>
            e !== t &&
            "wolf" === e.userData.type &&
            e.userData.packId === t.userData.packId &&
            e.userData.hp > 0,
        )
      ) {
        eo("늑대 한 마리를 물리쳤습니다. " + rewardText);
        return;
      }
      ut.respect = Math.min(100, ut.respect + 10);
      eo("늑대 떼를 모두 물리쳤습니다. 존중 +10 · " + rewardText);
    } else {
      ut.respect = Math.min(100, ut.respect + 5);
      eo(t.userData.label + "을 물리쳤습니다. 존중 +5 · " + rewardText);
    }
    j = 300;
    (function (t = !1) {
      (O = Oe(t)), (H = !1), je("");
    })(!1);
  }
}


const JERUSALEM_SHEEP_PICKUP = { x: -80, z: 3225, radius: 285 };
function findJerusalemSheepHoldSlot(index) {
  const columns = 5;
  const preferredColumn = index % columns;
  const preferredRow = Math.floor(index / columns);
  const candidates = [];
  for (let ring = 0; ring <= 8; ring++) {
    for (let column = 0; column < columns; column++) {
      const orderedColumn = (preferredColumn + column) % columns;
      const x =
        JERUSALEM_SHEEP_PICKUP.x +
        (orderedColumn - (columns - 1) / 2) * 39 +
        (preferredRow % 2) * 12;
      const z =
        JERUSALEM_SHEEP_PICKUP.z +
        preferredRow * 42 +
        ring * 36;
      candidates.push({ x, z });
      if (ring > 0) candidates.push({ x, z: z - ring * 72 });
    }
  }
  for (const candidate of candidates) {
    if (!isSheepBlockedAt(candidate, 28)) return candidate;
  }
  // Fixed last-resort strip south-west of the shop. It is deliberately outside
  // Jerusalem and beyond both the shop and Siloam collision radii.
  return {
    x: -145 - (index % 4) * 38,
    z: 3290 + Math.floor(index / 4) * 42,
  };
}
function parkSheepAtJerusalemHold(sheep, index) {
  let slot = sheep.userData.jerusalemHoldSlot;
  if (!slot || isSheepBlockedAt(slot, 28)) {
    slot = findJerusalemSheepHoldSlot(index);
    sheep.userData.jerusalemHoldSlot = slot;
  }
  sheep.userData.safeHold = !0;
  sheep.userData.cityGateHold = !0;
  sheep.userData.target.set(slot.x, 0, slot.z);
  sheep.userData.cityPath = null;
  sheep.userData.cityPathIndex = 0;
  sheep.userData.cityPathGoal = null;
  sheep.userData.stuckTime = 0;
  sheep.userData.lostSince = 0;
  sheep.position.set(slot.x, te(slot.x, slot.z) + 1, slot.z);
  sheep.userData.lastPos.copy(sheep.position);
}
function updateJerusalemSheepHold() {
  const player = mt.player;
  if (!player) return;
  const insideJerusalem = Yt(player.position.x, player.position.z, -55);
  // The night camp lock takes priority over Jerusalem's usual gate hold.
  if (nightWatch.active) {
    playerWasInsideJerusalem = insideJerusalem;
    return;
  }
  if (insideJerusalem && !playerWasInsideJerusalem) {
    citySheepWaitingForPickup = !0;
    mt.sheep.forEach((sheep) => {
      sheep.userData.jerusalemHoldSlot = null;
    });
    eo("양들은 남문 밖 양 상점 곁의 안전한 대기장에서 기다립니다.");
  }
  playerWasInsideJerusalem = insideJerusalem;

  const reachedPickup =
    citySheepWaitingForPickup &&
    !insideJerusalem &&
    Math.hypot(
      player.position.x - JERUSALEM_SHEEP_PICKUP.x,
      player.position.z - JERUSALEM_SHEEP_PICKUP.z,
    ) <= JERUSALEM_SHEEP_PICKUP.radius;
  if (reachedPickup) {
    citySheepWaitingForPickup = !1;
    mt.sheep.forEach((sheep) => {
      sheep.userData.safeHold = !1;
      sheep.userData.cityGateHold = !1;
      sheep.userData.jerusalemHoldSlot = null;
      sheep.userData.target.set(0, 0, 0);
      sheep.userData.recallUntil = performance.now() + 12000;
    });
    kt("sheep");
    eo("남문 밖 대기장에서 양 떼와 다시 합류했습니다.");
  }

  mt.sheep.forEach((sheep, index) => {
    if (citySheepWaitingForPickup) parkSheepAtJerusalemHold(sheep, index);
  });
}
function moveNightFlockToSouthGate() {
  citySheepWaitingForPickup = !0;
  mt.sheep.forEach((sheep, index) => {
    sheep.userData.nightCampPosition = null;
    sheep.userData.jerusalemHoldSlot = null;
    parkSheepAtJerusalemHold(sheep, index);
  });
}
function releaseNightFlockAtCamp() {
  // Dawn ends only the night-watch lock. The flock must remain at the camp
  // where the player guarded it; teleporting it to Jerusalem made every sheep
  // appear to vanish at once.
  citySheepWaitingForPickup = !1;
  mt.sheep.forEach((sheep) => {
    sheep.userData.nightCampPosition = null;
    sheep.userData.safeHold = !1;
    sheep.userData.cityGateHold = !1;
    sheep.userData.jerusalemHoldSlot = null;
    sheep.userData.target?.set?.(0, 0, 0);
    sheep.userData.recallUntil = performance.now() + 15000;
    sheep.userData.urgeUntil = 0;
    sheep.userData.lastPos?.copy?.(sheep.position);
  });
}
function damageSheep(sheep, attacker) {
  if (!sheep || !mt.sheep.includes(sheep) || sheep.userData.safeHold) return false;
  const type = attacker?.userData?.type || "fox";
  const damage = { fox: 8, wolf: 11, lion: 15 }[type] || 8;
  sheep.userData.hp = Math.max(0, (sheep.userData.hp ?? 100) - damage);
  kt("sheep");
  if (sheep.userData.hp <= 0) return removeSheepFromFlock(sheep, attacker);
  if (sheep.userData.hp <= 35 && !sheep.userData.lowHpWarned) {
    sheep.userData.lowHpWarned = true;
    eo("양 한 마리가 위험합니다. 맹수를 빨리 막으십시오.");
  }
  return false;
}
function createSheepShop() {
  if (mt.sheepShop) return mt.sheepShop;
  const shop = new t.Group();
  shop.position.set(230, te(230, 3190) + 1, 3190);
  const mat = ge(11776947), dark = ge(6049085);
  const canopy = new t.Mesh(new t.ConeGeometry(92, 48, 4), mat);
  canopy.position.y = 92; canopy.rotation.y = Math.PI / 4; shop.add(canopy);
  for (const x of [-58,58]) for (const zc of [-48,48]) {
    const post = new t.Mesh(new t.CylinderGeometry(4,5,92,6), dark);
    post.position.set(x,44,zc); shop.add(post);
  }
  const pen = new t.Mesh(new t.BoxGeometry(150,5,120), dark);
  pen.position.y=3; shop.add(pen);
  // Replace the temporary white marker with two small copies of the supplied
  // sheep graphic. Geometry and materials are shared with the flock model.
  loadSheepModel().then((template) => {
    if (!shop.parent) return;
    for (const [index, localX] of [-34, 34].entries()) {
      const sheepDisplay = cloneSkinnedModel(template);
      sheepDisplay.name = `SouthGateSheepShopDisplay${index + 1}`;
      sheepDisplay.rotation.y = Math.PI / 4 + (index ? -0.24 : 0.24);
      sheepDisplay.updateMatrixWorld(true);
      let bounds = new t.Box3().setFromObject(sheepDisplay);
      const size = bounds.getSize(new t.Vector3());
      const displayHeight = 48;
      const scale = displayHeight / Math.max(size.y, 0.001);
      sheepDisplay.scale.setScalar(scale);
      sheepDisplay.updateMatrixWorld(true);
      bounds = new t.Box3().setFromObject(sheepDisplay);
      const center = bounds.getCenter(new t.Vector3());
      sheepDisplay.position.set(
        localX - center.x,
        5 - bounds.min.y,
        -center.z,
      );
      sheepDisplay.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.frustumCulled = true;
      });
      shop.add(sheepDisplay);
    }
  }).catch(() => null);
  shop.userData = { sheepShop:true, price:100 };
  i.add(shop); mt.sheepShop=shop; return shop;
}
function tryBuySheep() {
  const shop = mt.sheepShop;
  if (!shop || !mt.player || mt.player.position.distanceTo(shop.position) > 185) return false;
  if (ut.money < 100) { eo("양 한 마리는 100셰켈입니다. 셰켈이 부족합니다."); return true; }
  ut.money -= 100;
  const sheep = Se(mt.sheep.length);
  const angle = Math.random()*Math.PI*2;
  sheep.position.set(shop.position.x + Math.sin(angle)*105, te(shop.position.x + Math.sin(angle)*105, shop.position.z + Math.cos(angle)*105)+1, shop.position.z + Math.cos(angle)*105);
  sheep.userData.recallUntil = performance.now()+15000;
  eo("양 한 마리를 100셰켈에 샀습니다. 현재 " + mt.sheep.length + "마리");
  $e();
  return true;
}
function updateRockRespawns(now) {
  if (!mt.player || now < (ut.nextRockSpawnAt || 0)) return;
  ut.nextRockSpawnAt = now + 10000 + Math.random()*9000;
  const visible = mt.rocks.filter(r => r?.visible).length;
  if (visible >= 95) return;
  const qualities=["거친 돌","둥근 돌","좋은 돌","큰 돌"];
  let made=0;
  for (let tries=0; tries<100 && made<4; tries++) {
    const angle=Math.random()*Math.PI*2, dist=850+Math.random()*1800;
    const x=mt.player.position.x+Math.sin(angle)*dist, zc=mt.player.position.z+Math.cos(angle)*dist;
    if (Math.abs(x)>3300 || Math.abs(zc)>3300 || jt(new t.Vector3(x,te(x,zc)+4,zc),16) || he(x,zc)>0.5) continue;
    be(qualities[Math.floor(Math.random()*qualities.length)],x,zc); made++;
  }
}

function removeSheepFromFlock(sheep, attacker) {
  if (!sheep || !mt.sheep.includes(sheep) || sheep.userData.safeHold) return !1;
  const index = mt.sheep.indexOf(sheep);
  if (index < 0) return !1;
  mt.sheep.splice(index, 1);
  i.remove(sheep);
  kt("sheep");
  Ae(sheep.position, "enemy");
  if (attacker?.userData) {
    attacker.userData.targetEntity = null;
    attacker.userData.nextTargetAt = 0;
    attacker.userData.nextSheepAttackAt = performance.now() + 1300;
  }
  const remaining = mt.sheep.length;
  if (remaining > 0) {
    eo("맹수가 양 한 마리를 공격했습니다. 남은 양 " + remaining + "마리");
  }
  return !0;
}

function triggerFlockGameOver() {
  if (ut.flockLost) return;
  ut.flockLost = !0;
  ut.money = 0;
  ut.respect = 0;
  ut.skill = 0;
  ut.stones = 0;
  ut.missionDone = !1;
  ut.cheatUsed = !1;
  clearStoredGameSave();
  $e();
  b = !0;
  e("#gameOver").classList.remove("mission-fail");
  e("#gameOverTitle").textContent = "모든 양을 잃었습니다";
  e("#gameOverText").textContent =
    "양 떼를 모두 잃어 셰켈과 존중을 포함한 모든 진행 상황이 초기화되었습니다. 처음부터 다시 시작하십시오.";
  e("#gameOver").classList.remove("hidden");
  document.exitPointerLock?.();
  setTimeout(() => ke(e("#gameOver"), 0), 0);
}
function Ae(e, o = "ground") {
  const n = new t.Group();
  n.position.copy(e);
  const s = "target" === o ? 16766298 : "enemy" === o ? 16730930 : 14205851,
    a = new t.MeshBasicMaterial({
      color: s,
      transparent: !0,
      opacity: 0.95,
      depthWrite: !1,
    }),
    r = new t.Mesh(new t.SphereGeometry("target" === o ? 12 : 8, 10, 7), a);
  n.add(r);
  const c = new t.MeshBasicMaterial({
      color: s,
      transparent: !0,
      opacity: 0.9,
      side: t.DoubleSide,
      depthWrite: !1,
    }),
    l = new t.Mesh(new t.RingGeometry(4, 7, 24), c);
  (l.rotation.x = -Math.PI / 2), n.add(l);
  for (let e = 0; e < 10; e++) {
    const o = new t.Mesh(
        new t.DodecahedronGeometry(1.2 + (e % 3) * 0.5, 0),
        new t.MeshBasicMaterial({ color: s, transparent: !0, opacity: 0.9 }),
      ),
      a = (e / 10) * Math.PI * 2,
      i = 28 + (e % 4) * 8;
    o.position.set(0, 2, 0),
      (o.userData.vel = new t.Vector3(
        Math.cos(a) * i,
        18 + (e % 3) * 9,
        Math.sin(a) * i,
      )),
      n.add(o);
  }
  (n.userData = { life: 0.46, maxLife: 0.46, flash: r, ring: l }),
    i.add(n),
    mt.effects.push(n),
    kt("target" === o ? "pickup" : "staff");
}
function canTriggerSpecialSlingAttack() {
  const player = mt.player;
  return !!(
    player &&
    !at.active &&
    player.userData.specialSlingReady &&
    !Yt(player.position.x, player.position.z, 0)
  );
}
function findSpecialSlingAnimalTarget() {
  if (!canTriggerSpecialSlingAttack()) return null;
  const cameraDirection = new t.Vector3();
  r.getWorldDirection(cameraDirection).normalize();
  let best = null;
  let bestScore = -Infinity;
  for (const enemy of mt.enemies) {
    if (enemy.userData.hp <= 0 || enemy.userData.type === "bandit") continue;
    const aimPoint = enemy.position.clone().add(new t.Vector3(0, 28, 0));
    const offset = aimPoint.sub(r.position);
    const distance = offset.length();
    if (distance < 70 || distance > 1200) continue;
    const alignment = offset.normalize().dot(cameraDirection);
    if (alignment < 0.48) continue;
    const score = alignment * 2.2 - distance / 1500;
    if (score > bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  return best;
}
function playSpecialSlingChargeAudio() {
  if (!y) return;
  Rt();
  if (!m || !M) return;
  const now = m.currentTime;
  const voiceGain = m.createGain();
  const voiceFilter = m.createBiquadFilter();
  voiceFilter.type = "lowpass";
  voiceFilter.frequency.setValueAtTime(1250, now);
  voiceGain.gain.setValueAtTime(0.0001, now);
  voiceGain.gain.exponentialRampToValueAtTime(0.12 * v, now + 0.18);
  voiceGain.gain.setValueAtTime(0.105 * v, now + 2.18);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.82);
  voiceGain.connect(voiceFilter).connect(M);
  for (const [frequency, volume] of [
    [118, 0.8],
    [236, 0.31],
    [354, 0.12],
  ]) {
    const oscillator = m.createOscillator();
    const gain = m.createGain();
    oscillator.type = frequency === 118 ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.linearRampToValueAtTime(frequency * 1.22, now + 2.72);
    gain.gain.value = volume;
    oscillator.connect(gain).connect(voiceGain);
    oscillator.start(now);
    oscillator.stop(now + 2.86);
  }
  const energyOscillator = m.createOscillator();
  const energyGain = m.createGain();
  const energyFilter = m.createBiquadFilter();
  energyOscillator.type = "sine";
  energyOscillator.frequency.setValueAtTime(72, now);
  energyOscillator.frequency.exponentialRampToValueAtTime(690, now + 2.8);
  energyFilter.type = "bandpass";
  energyFilter.frequency.setValueAtTime(620, now);
  energyFilter.frequency.exponentialRampToValueAtTime(2100, now + 2.8);
  energyFilter.Q.value = 5;
  energyGain.gain.setValueAtTime(0.0001, now);
  energyGain.gain.exponentialRampToValueAtTime(0.105 * v, now + 0.22);
  energyGain.gain.setValueAtTime(0.09 * v, now + 2.18);
  energyGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.86);
  energyOscillator.connect(energyFilter).connect(energyGain).connect(M);
  energyOscillator.start(now);
  energyOscillator.stop(now + 2.9);
}
function showSpecialAttackAnnouncement() {
  const announcement = e("#specialAttackAnnouncement");
  if (!announcement) return;
  announcement.textContent =
    window.ShepherdI18n?.tr?.("필살기가 발동되었습니다!") ||
    "필살기가 발동되었습니다!";
  announcement.classList.remove("show");
  // Restart the entrance animation even when two activations happen close
  // together without adding another timer to the combat loop.
  void announcement.offsetWidth;
  announcement.classList.add("show");
}
function createSpecialSlingEnergy() {
  const player = mt.player;
  if (!player) return;
  const group = new t.Group();
  group.name = "DavidSpecialSlingBlueEnergy";
  group.position.y = 68;
  const shell = new t.Mesh(
    new t.SphereGeometry(76, 16, 11),
    new t.MeshBasicMaterial({
      color: 0x218fff,
      transparent: true,
      opacity: 0.12,
      wireframe: true,
      depthWrite: false,
      blending: t.AdditiveBlending,
    }),
  );
  shell.name = "SpecialEnergyShell";
  group.add(shell);
  const ringMaterial = new t.MeshBasicMaterial({
    color: 0x51b9ff,
    transparent: true,
    opacity: 0.62,
    side: t.DoubleSide,
    depthWrite: false,
    blending: t.AdditiveBlending,
  });
  const ringA = new t.Mesh(new t.RingGeometry(57, 61, 36), ringMaterial);
  ringA.rotation.x = Math.PI / 2;
  ringA.name = "SpecialEnergyRingA";
  const ringB = new t.Mesh(new t.RingGeometry(70, 73, 36), ringMaterial.clone());
  ringB.rotation.set(Math.PI / 2, 0.45, 0.7);
  ringB.name = "SpecialEnergyRingB";
  group.add(ringA, ringB);
  const particlePositions = new Float32Array(42 * 3);
  for (let index = 0; index < 42; index++) {
    const angle = index * 2.399963229728653;
    const radius = 42 + (index % 8) * 5.2;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = -58 + ((index * 31) % 117);
    particlePositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const particleGeometry = new t.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new t.BufferAttribute(particlePositions, 3),
  );
  const particles = new t.Points(
    particleGeometry,
    new t.PointsMaterial({
      color: 0x7dd7ff,
      size: 7,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: t.AdditiveBlending,
    }),
  );
  particles.name = "SpecialEnergyParticles";
  group.add(particles);
  const glow = new t.PointLight(0x258dff, 5.4, 390, 1.6);
  glow.name = "SpecialEnergyGlow";
  group.add(glow);
  player.add(group);
  specialSlingAttack.energyGroup = group;

  const rightHand = player.userData.importedAvatar?.getObjectByName("R_Hand");
  if (rightHand) {
    const heldStone = new t.Mesh(
      new t.DodecahedronGeometry(0.034, 1),
      new t.MeshStandardMaterial({
        color: 0x746c5d,
        roughness: 0.9,
        metalness: 0,
      }),
    );
    heldStone.name = "SpecialSlingHeldStone";
    heldStone.position.set(0.012, 0.065, 0.018);
    heldStone.scale.set(1.1, 0.86, 0.94);
    rightHand.add(heldStone);
    specialSlingAttack.heldStone = heldStone;
  }
}
function disposeSpecialSlingVisuals() {
  const group = specialSlingAttack.energyGroup;
  if (group) {
    group.parent?.remove(group);
    group.traverse((object) => {
      object.geometry?.dispose?.();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material?.dispose?.());
    });
  }
  specialSlingAttack.energyGroup = null;
  const heldStone = specialSlingAttack.heldStone;
  if (heldStone) {
    heldStone.parent?.remove(heldStone);
    heldStone.geometry?.dispose?.();
    heldStone.material?.dispose?.();
  }
  specialSlingAttack.heldStone = null;
}
function launchSpecialSlingStone() {
  const target = specialSlingAttack.target;
  const player = mt.player;
  if (!player) return;
  const hasTarget = !!(
    specialSlingAttack.targetLocked &&
    target?.userData.hp > 0 &&
    target.userData.type !== "bandit" &&
    mt.enemies.includes(target)
  );
  player.userData.releaseSpecialSlingAnimation?.();
  const origin = new t.Vector3();
  if (specialSlingAttack.heldStone)
    specialSlingAttack.heldStone.getWorldPosition(origin);
  else origin.copy(player.position).add(new t.Vector3(0, 78, 0));
  const direction = hasTarget
    ? target.position
        .clone()
        .add(new t.Vector3(0, 28, 0))
        .sub(origin)
        .normalize()
    : specialSlingAttack.aimDirection.clone().normalize();
  if (direction.lengthSq() < 0.001)
    direction.set(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
  const stone = new t.Mesh(
    new t.DodecahedronGeometry("큰 돌" === ut.quality ? 7 : 5.5, 1),
    new t.MeshStandardMaterial({
      color: 0x7c7362,
      emissive: 0x0d55b8,
      emissiveIntensity: 1.25,
      roughness: 0.75,
    }),
  );
  stone.position.copy(origin);
  stone.castShadow = true;
  stone.userData = {
    velocity: direction.multiplyScalar(1580),
    life: hasTarget ? 2.6 : 4,
    damage: hasTarget
      ? Math.max(180, (target.userData.maxHp || target.userData.hp) * 2)
      : 180,
    previous: origin.clone(),
    special: true,
    specialTarget: hasTarget ? target : null,
  };
  const trailGeometry = new t.BufferGeometry();
  const trailPositions = new Float32Array(30);
  for (let index = 0; index < 10; index++) {
    trailPositions[index * 3] = origin.x;
    trailPositions[index * 3 + 1] = origin.y;
    trailPositions[index * 3 + 2] = origin.z;
  }
  trailGeometry.setAttribute(
    "position",
    new t.BufferAttribute(trailPositions, 3),
  );
  const trail = new t.Line(
    trailGeometry,
    new t.LineBasicMaterial({
      color: 0x58c4ff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: t.AdditiveBlending,
    }),
  );
  stone.userData.trail = trail;
  i.add(trail, stone);
  mt.projectiles.push(stone);
  specialSlingAttack.projectile = stone;
  specialSlingAttack.released = true;
  if (specialSlingAttack.heldStone)
    specialSlingAttack.heldStone.visible = false;
  const overlay = e("#specialAttackOverlay");
  overlay?.classList.add("release");
  Ut(92, 0.24, 0.12, "sawtooth", -45);
  setTimeout(() => Ut(310, 0.22, 0.08, "sine", 720), 45);
}
function applySpecialSlingImpact(stone, target) {
  if (
    !stone?.userData.special ||
    stone.userData.specialImpactApplied ||
    !target ||
    target.userData.hp <= 0
  )
    return false;
  stone.userData.specialImpactApplied = true;
  stone.userData.life = 0;
  target.userData.hp -= stone.userData.damage;
  ut.skill = Math.min(50, ut.skill + 2);
  Ae(stone.position, "enemy");
  triggerCombatFeedback("hit");
  const now = performance.now();
  combatFeedback.shakeUntil = now + 390;
  combatFeedback.shakeDuration = 390;
  combatFeedback.shakeStrength = 7.2;
  eo(target.userData.label + "에게 필살기 명중!");
  Ut(58, 0.32, 0.13, "triangle", -24);
  target.userData.hp <= 0 && Ue(target);
  return true;
}
function finishSpecialSlingAttack() {
  if (!specialSlingAttack.active) return;
  specialSlingAttack.active = false;
  specialSlingAttack.target = null;
  specialSlingAttack.targetLocked = false;
  specialSlingAttack.released = false;
  specialSlingAttack.projectile = null;
  mt.player?.userData.stopSpecialSlingAnimation?.();
  disposeSpecialSlingVisuals();
  const overlay = e("#specialAttackOverlay");
  overlay?.classList.remove("active", "release");
  e("#specialAttackAnnouncement")?.classList.remove("show");
  if (r) {
    r.fov = specialSlingAttack.previousFov || F[A].fov;
    r.updateProjectionMatrix();
  }
}
function startSpecialSlingAttack(target, charge, aimDirection) {
  const player = mt.player;
  if (!player || !canTriggerSpecialSlingAttack()) return false;
  const validTarget = !!(
    target?.userData.hp > 0 &&
    target.userData.type !== "bandit" &&
    mt.enemies.includes(target)
  );
  const shotDirection = validTarget
    ? target.position
        .clone()
        .add(new t.Vector3(0, 28, 0))
        .sub(player.position)
        .normalize()
    : aimDirection?.clone?.().normalize() || new t.Vector3(0, 0, 1);
  if (shotDirection.lengthSq() < 0.001)
    shotDirection.set(
      Math.sin(player.rotation.y),
      0,
      Math.cos(player.rotation.y),
    );
  specialSlingAttack.active = true;
  specialSlingAttack.target = validTarget ? target : null;
  specialSlingAttack.targetLocked = validTarget;
  specialSlingAttack.aimDirection.copy(shotDirection).normalize();
  specialSlingAttack.startedAt = performance.now();
  specialSlingAttack.charge = charge;
  specialSlingAttack.released = false;
  specialSlingAttack.projectile = null;
  specialSlingAttack.cameraStart.copy(r.position);
  specialSlingAttack.previousFov = r.fov;
  G = false;
  P = false;
  N = false;
  for (const code of ["KeyW", "KeyA", "KeyS", "KeyD", "Space"])
    K[code] = false;
  mobileInput.active = false;
  mobileInput.forward = 0;
  mobileInput.strafe = 0;
  mobileInput.magnitude = 0;
  mobileInput.running = false;
  e("#crosshair").style.display = "none";
  e("#charge").style.display = "none";
  const direction = validTarget
    ? target.position.clone().sub(player.position)
    : specialSlingAttack.aimDirection.clone();
  direction.y = 0;
  if (direction.lengthSq() > 0.001)
    player.rotation.y = Math.atan2(direction.x, direction.z);
  player.userData.playSpecialSlingAnimation?.();
  createSpecialSlingEnergy();
  e("#specialAttackOverlay")?.classList.add("active");
  showSpecialAttackAnnouncement();
  playSpecialSlingChargeAudio();
  return true;
}
function updateSpecialSlingAttack(delta, now) {
  if (!specialSlingAttack.active) return;
  const player = mt.player;
  let target = specialSlingAttack.target;
  if (!player) return finishSpecialSlingAttack();
  if (
    specialSlingAttack.targetLocked &&
    (!target || target.userData.hp <= 0 || !mt.enemies.includes(target))
  ) {
    target = findSpecialSlingAnimalTarget();
    specialSlingAttack.target = target;
    specialSlingAttack.targetLocked = !!target;
  }
  const elapsed = now - specialSlingAttack.startedAt;
  const targetPoint = target
    ? target.position.clone().add(new t.Vector3(0, 30, 0))
    : player.position
        .clone()
        .add(new t.Vector3(0, 78, 0))
        .addScaledVector(specialSlingAttack.aimDirection, 900);
  const forward = target
    ? target.position.clone().sub(player.position)
    : specialSlingAttack.aimDirection.clone();
  forward.y = 0;
  if (forward.lengthSq() < 0.001) forward.set(0, 0, 1);
  forward.normalize();
  const right = new t.Vector3(forward.z, 0, -forward.x);
  player.rotation.y = Math.atan2(forward.x, forward.z);
  player.visible = true;
  if (mt.aimRig) mt.aimRig.visible = false;

  const energy = specialSlingAttack.energyGroup;
  if (energy) {
    const pulse = 1 + 0.08 * Math.sin(elapsed * 0.021);
    const fade = elapsed > specialSlingAttack.releaseAt
      ? Math.max(0.22, 1 - (elapsed - specialSlingAttack.releaseAt) / 1250)
      : 1;
    energy.scale.setScalar(pulse * fade);
    const shell = energy.getObjectByName("SpecialEnergyShell");
    const ringA = energy.getObjectByName("SpecialEnergyRingA");
    const ringB = energy.getObjectByName("SpecialEnergyRingB");
    const particles = energy.getObjectByName("SpecialEnergyParticles");
    if (shell) shell.rotation.y += delta * 2.6;
    if (ringA) ringA.rotation.z += delta * 4.8;
    if (ringB) ringB.rotation.y -= delta * 3.6;
    if (particles) particles.rotation.y += delta * 2.1;
  }

  const frontWideCamera = player.position
    .clone()
    .addScaledVector(forward, 222)
    .addScaledVector(right, -16)
    .add(new t.Vector3(0, 105, 0));
  const frontCloseCamera = player.position
    .clone()
    .addScaledVector(forward, 118)
    .addScaledVector(right, -8)
    .add(new t.Vector3(0, 92, 0));
  const backCamera = player.position
    .clone()
    .addScaledVector(forward, -196)
    .addScaledVector(right, 24)
    .add(new t.Vector3(0, 116, 0));
  const chargeZoom = t.MathUtils.smoothstep(
    elapsed,
    340,
    specialSlingAttack.cameraSwitchAt,
  );
  const chargingCamera = frontWideCamera
    .clone()
    .lerp(frontCloseCamera, chargeZoom);
  if (elapsed < specialSlingAttack.cameraSwitchAt) {
    const fadeIn = t.MathUtils.smoothstep(elapsed, 0, 430);
    r.position.lerpVectors(
      specialSlingAttack.cameraStart,
      chargingCamera,
      fadeIn,
    );
    r.lookAt(player.position.clone().add(new t.Vector3(0, 73, 0)));
    const chargingFov = t.MathUtils.lerp(49, 36, chargeZoom);
    r.fov = t.MathUtils.lerp(
      specialSlingAttack.previousFov,
      chargingFov,
      fadeIn,
    );
  } else {
    const switchAmount = t.MathUtils.smoothstep(
      elapsed,
      specialSlingAttack.cameraSwitchAt,
      specialSlingAttack.releaseAt,
    );
    r.position.lerpVectors(frontCloseCamera, backCamera, switchAmount);
    const lookPoint = player.position
      .clone()
      .add(new t.Vector3(0, 73, 0))
      .lerp(targetPoint, switchAmount);
    r.lookAt(lookPoint);
    r.fov = t.MathUtils.lerp(36, 53, switchAmount);
  }
  r.updateProjectionMatrix();
  r.updateMatrixWorld();
  if (!specialSlingAttack.released && elapsed >= specialSlingAttack.releaseAt)
    launchSpecialSlingStone();
  if (elapsed >= specialSlingAttack.endAt) finishSpecialSlingAttack();
}
document.addEventListener(
  "pointerdown",
  () => {
    Et();
  },
  { passive: !0 },
),
  window.addEventListener(
    "keydown",
    (t) => {
      S &&
        !b &&
        t.ctrlKey &&
        "KeyW" === t.code &&
        (t.preventDefault(),
        t.stopImmediatePropagation(),
        (K.KeyW = !1),
        (ct = !0));
    },
    { capture: !0 },
  ),
  document.addEventListener("keydown", (t) => {
    if (distributionAdPauseActive) {
      t.preventDefault();
      return;
    }
    if (
      (Et(),
      !(function (t) {
        const e = (function () {
          for (const t of [
            "practicePrompt",
            "keyGuidePanel",
            "settingsPanel",
            "pause",
            "gameOver",
          ]) {
            const e = document.getElementById(t);
            if (e && !e.classList.contains("hidden")) return e;
          }
          return null;
        })();
        if (!b || !e) return !1;
        const o = Ce(e);
        if (!o.length) return !1;
        const n = Math.max(0, o.indexOf(document.activeElement));
        if ("Tab" === t.key || "ArrowDown" === t.key || "ArrowRight" === t.key)
          return (
            t.preventDefault(),
            "range" === document.activeElement?.type && "ArrowRight" === t.key
              ? (document.activeElement.stepUp(),
                document.activeElement.dispatchEvent(
                  new Event("input", { bubbles: !0 }),
                ))
              : ke(e, n + (t.shiftKey ? -1 : 1)),
            !0
          );
        if ("ArrowUp" === t.key || "ArrowLeft" === t.key)
          return (
            t.preventDefault(),
            "range" === document.activeElement?.type && "ArrowLeft" === t.key
              ? (document.activeElement.stepDown(),
                document.activeElement.dispatchEvent(
                  new Event("input", { bubbles: !0 }),
                ))
              : ke(e, n - 1),
            !0
          );
        if ("Enter" === t.key) {
          t.preventDefault();
          const e = document.activeElement;
          return "range" === e?.type || e?.click(), !0;
        }
        return !1;
      })(t))
    ) {
      if (
        ((K[t.code] = !specialSlingAttack.active),
        S &&
          !b &&
          !n &&
          document.pointerLockElement !== c?.domElement &&
          ["KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(t.code) &&
          c?.domElement.requestPointerLock?.().catch?.(() => {}),
        "KeyV" !== t.code ||
          !S ||
          b ||
          n ||
          specialSlingAttack.active ||
          t.repeat ||
          ((A = (A + 1) % F.length), Be(F[A].name)),
        "Tab" === t.code &&
          S &&
          !b &&
          !specialSlingAttack.active &&
          (t.preventDefault(),
          (L = "sling" === L ? "staff" : "sling"),
          (G = !1),
          (P = !1),
          (e("#crosshair").style.display = "none"),
          (e("#charge").style.display = "none"),
          Re(),
          eo(
            "sling" === L
              ? "회전식 돌팔매를 들었습니다."
              : "지팡이를 들었습니다.",
          )),
        ("ShiftLeft" !== t.code && "ShiftRight" !== t.code) ||
          t.repeat ||
          (N = !0),
        "KeyZ" === t.code && S && !b && !t.repeat)
      ) {
        const t = performance.now();
        mt.sheep.forEach((e, o) => {
          const n = (o / mt.sheep.length) * Math.PI * 2;
          e.userData.target.set(
            mt.player.position.x + 90 * Math.sin(n),
            0,
            mt.player.position.z + 90 * Math.cos(n),
          ),
            (e.userData.recallUntil = t + 18e3),
            (e.userData.stuckTime = 0);
        }),
          kt("sheep"),
          eo("양 떼 전체를 불러 모았습니다.");
      }
      ("ControlLeft" !== t.code &&
        "ControlRight" !== t.code &&
        "KeyE" !== t.code) ||
        !S ||
        b ||
        t.repeat ||
        (t.preventDefault(),
        (ct = !0),
        t.code.startsWith("Control") && (K.KeyW = !1)),
        t.ctrlKey && "KeyW" === t.code && (t.preventDefault(), (K.KeyW = !1)),
        "Enter" === t.code && S && (Ee(), t.preventDefault()),
        "Escape" === t.code &&
        S &&
        !e("#keyGuidePanel").classList.contains("hidden")
          ? closeKeyGuide()
          : "Escape" === t.code &&
            S &&
            !e("#settingsPanel").classList.contains("hidden")
          ? Tt()
          : "Escape" === t.code &&
            S &&
            (b
              ? ((b = !1),
                Bt(),
                e("#pause").classList.add("hidden"),
                (n || c.domElement.requestPointerLock?.()))
              : Ie());
    }
  }),
  document.addEventListener("keyup", (t) => (K[t.code] = !1)),
  document.addEventListener("mousemove", (e) => {
    document.pointerLockElement !== c?.domElement ||
      b ||
      specialSlingAttack.active ||
      ((B -= e.movementX * E),
      (I -= e.movementY * E * 0.42),
      (I = t.MathUtils.clamp(I, -1.3, 1.1)));
  }),
  a.addEventListener("click", () => {
    !n &&
      S &&
      !b &&
      document.pointerLockElement !== c?.domElement &&
      c?.domElement.requestPointerLock?.();
  }),
  document.addEventListener("pointerlockchange", () => {
    const t = document.pointerLockElement === c?.domElement;
    e("#reconnectHint")?.classList.toggle("show", S && !b && !t);
    // Losing pointer lock must never pause or stop the simulation. Browsers can
    // release pointer lock when a notification/overlay is updated, which used
    // to call Ie() and freeze David and the camera exactly as the night-watch
    // mission began. WASD now keeps working; clicking the game restores mouse
    // look. Explicit Escape still opens the real pause menu.
  }),
  window.addEventListener("focus", () => {
    !n && S && !b && c?.domElement.requestPointerLock?.().catch?.(() => {});
  }),
  a.addEventListener("mouseenter", () => {
    !n && S && !b && c?.domElement.requestPointerLock?.().catch?.(() => {});
  }),
  document.addEventListener("contextmenu", (t) => t.preventDefault()),
  document.addEventListener("mousedown", (o) => {
    S &&
      !b &&
      !specialSlingAttack.active &&
      (2 === o.button &&
        "sling" === L &&
        ((G = !0), (e("#crosshair").style.display = "block")),
      0 === o.button && "staff" === L
        ? (function () {
            const o = mt.player;
            if (!o || k > 0) return;
            (k = 0.55), (o.userData.staffSwing = 0.36);
            const n = e("#weaponIcon");
            n?.classList.remove("swing"), n?.classList.add("swing");
            let s = !1;
            const a = new t.Vector3(
              Math.sin(o.rotation.y),
              0,
              Math.cos(o.rotation.y),
            );
            for (const t of mt.enemies) {
              if (t.userData.hp <= 0) continue;
              const e = t.position.clone().sub(o.position);
              e.y = 0;
              const n = e.length();
              n < 155 &&
                n > 0 &&
                e.normalize().dot(a) > -0.18 &&
                ((t.userData.hp -= 38),
                t.position.addScaledVector(a, 48),
                (s = !0),
                triggerCombatFeedback("hit"),
                t.userData.hp <= 0 && Ue(t));
            }
            const guard = mt.southGateGuard;
            if (guard) {
              const offset = guard.position.clone().sub(o.position);
              offset.y = 0;
              const guardDistance = offset.length();
              guardDistance < 155 &&
                guardDistance > 0 &&
                offset.normalize().dot(a) > -0.18 &&
                (hitSouthGateGuard(), (s = !0), triggerCombatFeedback("hit"));
            }
            for (const citizen of mt.cityCitizens) {
              if (!citizen.userData.entryActive || !citizen.visible) continue;
              const offset = citizen.position.clone().sub(o.position);
              offset.y = 0;
              const citizenDistance = offset.length();
              if (
                citizenDistance < 145 &&
                citizenDistance > 0 &&
                offset.normalize().dot(a) > -0.05
              ) {
                hitCityCitizen(citizen);
                s = true;
                triggerCombatFeedback("hit");
                break;
              }
            }
            const hitEnemy = s;
            o.userData.urgedSheep = !1;
            // The staff has two deliberately separate contexts: close defence
            // when an enemy is in reach, otherwise quiet flock guidance.
            for (const e of hitEnemy ? [] : mt.sheep) {
              const n = e.position.clone().sub(o.position);
              n.y = 0;
              const i = n.length();
              i < 155 &&
                i > 0 &&
                n.normalize().dot(a) > 0.05 &&
                ((e.userData.urgeUntil = performance.now() + 5500),
                (e.userData.recallUntil = performance.now() + 5500),
                e.userData.target.set(
                  o.position.x + 230 * a.x,
                  0,
                  o.position.z + 230 * a.z,
                ),
                (e.userData.stuckTime = 0),
                (o.userData.urgedSheep = !0),
                (s = !0));
            }
            (function (t) {
              t && kt("staff"),
                (function (t = 0.12, e = 0.04, o = 900) {
                  if (!y) return;
                  if ((Rt(), !m || !M)) return;
                  const n = Math.max(1, Math.floor(m.sampleRate * t)),
                    s = m.createBuffer(1, n, m.sampleRate),
                    a = s.getChannelData(0);
                  for (let t = 0; t < n; t++)
                    a[t] = (2 * Math.random() - 1) * (1 - t / n);
                  const i = m.createBufferSource(),
                    r = m.createBiquadFilter(),
                    c = m.createGain();
                  (i.buffer = s),
                    (r.type = "lowpass"),
                    (r.frequency.value = o),
                    (c.gain.value = e),
                    i.connect(r).connect(c).connect(M),
                    i.start();
                })(0.12, t ? 0.07 : 0.035, t ? 700 : 1100);
            })(s),
              o.userData.urgedSheep
                ? eo("지팡이로 양들을 재촉했습니다.")
                : s && eo("지팡이로 상대를 밀쳐냈습니다.");
          })()
        : 0 === o.button &&
          G &&
          ut.stones > 0 &&
          ((P = !0), (T = 0), (e("#charge").style.display = "block")));
  }),
  document.addEventListener("mouseup", (o) => {
    2 === o.button &&
      ((G = !1),
      (P = !1),
      (e("#crosshair").style.display = "none"),
      (e("#charge").style.display = "none")),
      0 === o.button &&
        P &&
        ((mt.aimRig &&
          ((mt.aimRig.userData.slingReleaseStartedAt = performance.now()),
          (mt.aimRig.userData.slingReleaseCharge = T))),
        (function () {
          if (ut.stones <= 0)
            return (
              (L = "staff"),
              Re(),
              void eo("돌이 없어 지팡이로 자동 전환했습니다.")
            );
          ut.stones--,
            at.active && (at.shotsLeft = Math.max(0, at.shotsLeft - 1));
          const e = new t.Vector3();
          r.getWorldPosition(e);
          const o = new t.Vector3();
          r.getWorldDirection(o).normalize();
          const specialTarget = findSpecialSlingAnimalTarget();
          if (
            canTriggerSpecialSlingAttack() &&
            Math.random() < SPECIAL_SLING_CHANCE &&
            startSpecialSlingAttack(specialTarget, T, o)
          ) {
            $e();
            return;
          }
          const n = (0.024 + 0.035 * T) * (1 - 0.008 * ut.skill);
          (o.x += (Math.random() - 0.5) * n),
            (o.y += (Math.random() - 0.5) * n),
            (o.z += (Math.random() - 0.5) * n),
            o.normalize();
          const s = new t.Mesh(
            new t.DodecahedronGeometry("큰 돌" === ut.quality ? 5 : 3.5, 0),
            ge(4998203),
          );
          s.position.copy(e).addScaledVector(o, 20),
            (s.castShadow = !0),
            (s.userData = {
              velocity: o.multiplyScalar(340 + 360 * T),
              life: 4,
              damage: ("큰 돌" === ut.quality ? 55 : 35) * (0.55 + 0.75 * T),
              previous: s.position.clone(),
            });
          const a = new t.BufferGeometry(),
            c = new Float32Array(30);
          for (let t = 0; t < 10; t++)
            (c[3 * t] = s.position.x),
              (c[3 * t + 1] = s.position.y),
              (c[3 * t + 2] = s.position.z);
          a.setAttribute("position", new t.BufferAttribute(c, 3));
          const l = new t.Line(
            a,
            new t.LineBasicMaterial({
              color: 16110218,
              transparent: !0,
              opacity: 0.72,
              depthWrite: !1,
            }),
          );
          i.add(l),
            (s.userData.trail = l),
            i.add(s),
            mt.projectiles.push(s),
            $e();
        })(),
        (P = !1),
        (e("#charge").style.display = "none"));
  }),
  (e("#resumeBtn").onclick = () => {
    (b = !1),
      Bt(),
      e("#pause").classList.add("hidden"),
      document
        .querySelectorAll(".menu-focus")
        .forEach((t) => t.classList.remove("menu-focus")),
      (n || c.domElement.requestPointerLock?.());
  }),
  (e("#practiceYesBtn").onclick = () =>
    (function () {
      e("#practicePrompt").classList.add("hidden"),
        (b = !1),
        (at = {
          active: !0,
          shotsLeft: 5,
          hit: !1,
          target: null,
          previousCameraMode: A,
        });
      const o = (function () {
        ae();
        const e = new t.Group(),
          o =
            (ze(e, 4, 5, 115, [0, 55, 0], 6242344, 7),
            new t.Mesh(
              new t.CircleGeometry(58, 24),
              new t.MeshToonMaterial({ color: 14270606, side: t.DoubleSide }),
            ));
        o.position.set(0, 108, 0),
          e.add(o),
          [
            [43, 8273711],
            [29, 14798749],
            [15, 9252393],
          ].forEach(([o, n], s) => {
            const a = new t.Mesh(
              new t.RingGeometry(s ? 0 : o - 8, o, 24),
              new t.MeshBasicMaterial({ color: n, side: t.DoubleSide }),
            );
            a.position.set(0, 108, -0.7 - 0.15 * s),
              e.add(a);
          });
        const n = Math.atan2(
            mt.player.position.x - Z.x,
            mt.player.position.z - Z.z,
          ),
          s = mt.player.position.x - 210 * Math.sin(n),
          a = mt.player.position.z - 210 * Math.cos(n);
        return (
          e.position.set(s, te(s, a), a),
          e.lookAt(
            mt.player.position.x,
            e.position.y + 105,
            mt.player.position.z,
          ),
          (e.userData.staticTarget = !0),
          (e.userData.hitRadius = 67),
          i.add(e),
          (mt.practiceTarget = e),
          e
        );
      })();
      (at.target = o), (L = "sling"), Re(), (G = !0), (P = !1);
      const n = o.position.x - mt.player.position.x,
        s = o.position.z - mt.player.position.z;
      (B = Math.atan2(n, s)),
        (I = -0.04),
        (A = 1),
        (e("#crosshair").style.display = "block"),
        (n || c.domElement.requestPointerLock?.()),
        eo("과녁을 향해 돌팔매를 5번 연습하십시오.");
    })()),
  (e("#practiceNoBtn").onclick = () => {
    e("#practicePrompt").classList.add("hidden"),
      (b = !1),
      (n || c?.domElement.requestPointerLock?.()),
      ie();
  }),
  (e("#saveBtn").onclick = () => oo(!1)),
  (e("#quitBtn").onclick = () => {
    oo(!0);
    location.reload();
  }),
  (e("#restartBtn").onclick = () => {
    if (ut.flockLost) {
      clearStoredGameSave();
      Te();
    } else {
      no() || Te();
    }
    ut.thirstFailed = !1;
    ut.flockLost = !1;
    e("#gameOver").classList.add("hidden");
    e("#gameOver").classList.remove("mission-fail");
    b = !1;
    n || c?.domElement.requestPointerLock?.();
  }),
  e("#cheatInput").addEventListener("keydown", (t) => {
    if ("Enter" === t.key) {
      const e = t.target.value.trim().toLowerCase();
      if (((t.target.value = ""), !e)) return Ee(), void t.stopPropagation();
      let o = !1,
        n = !0;
      "gavriel" === e
        ? ((ut.invincible = !ut.invincible), (n = ut.invincible), (o = !0))
        : "parnasa" === e
          ? ((ut.money = Math.min(1e7, ut.money + 1e3)), (o = !0))
          : "rafael" === e && ((ut.hp = 100), (o = !0)),
        o &&
          ((ut.cheatUsed = !0),
          eo(n ? "치트키가 입력되었습니다." : "치트키가 해제되었습니다."),
          $e()),
        Ee(),
        t.stopPropagation();
      }
  });
function updateMobileCharge(value = 0) {
  const button = e("#mobileAttackBtn");
  if (!button) return;
  const charge = t.MathUtils.clamp(Number(value) || 0, 0, 1);
  button.style.setProperty("--charge", String(charge));
  button.classList.toggle("charging", charge > 0 || P);
}
function dispatchMobileKey(code, type = "keydown") {
  const keyByCode = { Tab: "Tab", KeyE: "e", Space: " ", KeyZ: "z" };
  document.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: keyByCode[code] || code,
      bubbles: true,
      cancelable: true,
    }),
  );
}
function resetMobileMovement() {
  mobileInput.active = false;
  mobileInput.forward = 0;
  mobileInput.strafe = 0;
  mobileInput.targetForward = 0;
  mobileInput.targetStrafe = 0;
  mobileInput.magnitude = 0;
  mobileInput.joystickPointerId = null;
  const knob = e("#mobileJoystickKnob");
  if (knob) knob.style.transform = "translate(-50%,-50%)";
}
function setupMobileControls() {
  if (!n) return;
  const joystick = e("#mobileJoystick"),
    knob = e("#mobileJoystickKnob"),
    pauseButton = e("#mobilePauseBtn"),
    weaponButton = e("#mobileWeaponBtn"),
    collectButton = e("#mobileCollectBtn"),
    runButton = e("#mobileRunBtn"),
    callButton = e("#mobileCallBtn"),
    attackButton = e("#mobileAttackBtn");
  if (!joystick || !knob || !attackButton) return;

  const updateJoystick = (event) => {
    if (mobileInput.joystickPointerId !== event.pointerId) return;
    const rect = joystick.getBoundingClientRect();
    const radius = Math.max(34, rect.width * 0.34);
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const rawLength = Math.hypot(dx, dy);
    if (rawLength > radius) {
      dx = (dx / rawLength) * radius;
      dy = (dy / rawLength) * radius;
    }
    const normalizedX = dx / radius;
    const normalizedY = dy / radius;
    const magnitude = Math.min(1, Math.hypot(normalizedX, normalizedY));
    const deadZone = 0.16;
    mobileInput.active = magnitude > deadZone;
    mobileInput.magnitude = mobileInput.active
      ? Math.pow((magnitude - deadZone) / (1 - deadZone), 1.28)
      : 0;
    mobileInput.targetForward = mobileInput.active
      ? -normalizedY * mobileInput.magnitude / Math.max(magnitude, 0.001)
      : 0;
    mobileInput.targetStrafe = mobileInput.active
      ? normalizedX * mobileInput.magnitude / Math.max(magnitude, 0.001)
      : 0;
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  };
  joystick.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    mobileInput.joystickPointerId = event.pointerId;
    mobileInput.movementYaw = B;
    joystick.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
  });
  joystick.addEventListener("pointermove", updateJoystick);
  const finishJoystick = (event) => {
    if (mobileInput.joystickPointerId !== event.pointerId) return;
    event.preventDefault();
    resetMobileMovement();
  };
  joystick.addEventListener("pointerup", finishJoystick);
  joystick.addEventListener("pointercancel", finishJoystick);
  joystick.addEventListener("lostpointercapture", finishJoystick);

  pauseButton?.addEventListener("click", (event) => {
    event.preventDefault();
    if (S && !b) Ie();
  });
  weaponButton?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!S || b || specialSlingAttack.active) return;
    dispatchMobileKey("Tab");
    dispatchMobileKey("Tab", "keyup");
  });
  collectButton?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!S || b || specialSlingAttack.active) return;
    dispatchMobileKey("KeyE");
    dispatchMobileKey("KeyE", "keyup");
  });
  callButton?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!S || b || specialSlingAttack.active) return;
    dispatchMobileKey("KeyZ");
    dispatchMobileKey("KeyZ", "keyup");
  });
  const finishRun = (event) => {
    if (event) event.preventDefault();
    mobileInput.running = false;
    runButton?.classList.remove("pressed");
  };
  runButton?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!S || b || specialSlingAttack.active) return;
    runButton.setPointerCapture?.(event.pointerId);
    mobileInput.running = true;
    runButton.classList.add("pressed");
  });
  runButton?.addEventListener("pointerup", finishRun);
  runButton?.addEventListener("pointercancel", finishRun);
  runButton?.addEventListener("lostpointercapture", finishRun);

  let attackPointerId = null;
  const finishAttack = (event) => {
    if (attackPointerId === null) return;
    if (event && event.pointerId !== attackPointerId) return;
    event?.preventDefault?.();
    if ("sling" === L) {
      document.dispatchEvent(
        new MouseEvent("mouseup", { button: 0, bubbles: true, cancelable: true }),
      );
      document.dispatchEvent(
        new MouseEvent("mouseup", { button: 2, bubbles: true, cancelable: true }),
      );
    }
    attackPointerId = null;
    attackButton.classList.remove("pressed");
    updateMobileCharge(0);
  };
  attackButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!S || b || specialSlingAttack.active || attackPointerId !== null) return;
    attackPointerId = event.pointerId;
    attackButton.setPointerCapture?.(event.pointerId);
    attackButton.classList.add("pressed");
    if ("staff" === L) {
      document.dispatchEvent(
        new MouseEvent("mousedown", { button: 0, bubbles: true, cancelable: true }),
      );
      return;
    }
    document.dispatchEvent(
      new MouseEvent("mousedown", { button: 2, bubbles: true, cancelable: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mousedown", { button: 0, bubbles: true, cancelable: true }),
    );
    updateMobileCharge(0.001);
  });
  attackButton.addEventListener("pointerup", finishAttack);
  attackButton.addEventListener("pointercancel", finishAttack);
  attackButton.addEventListener("lostpointercapture", finishAttack);
  addEventListener("blur", () => {
    resetMobileMovement();
    finishRun();
    finishAttack();
  });
}
setupMobileControls();
let Fe = null,
  We = new t.Vector3();
function qe(e, o) {
  const n = o.x - e.x,
    s = o.z - e.z;
  return Math.abs(n) > Math.abs(s)
    ? new t.Vector3(e.x + Math.sign(n) * ((e.wallRX || e.wallR) + 120), 0, e.z)
    : new t.Vector3(e.x, 0, e.z + Math.sign(s) * ((e.wallRZ || e.wallR) + 120));
}
function Ne() {
  const e = mt.player?.position;
  if (!e || Yt(e.x, e.z, -55) || citySheepWaitingForPickup) {
    nt = !1;
    return;
  }
  if (
    !mt.sheep.some(
      (t) => Math.hypot(t.position.x - e.x, t.position.z - e.z) > W,
    )
  )
    return;
  const t = performance.now();
  t < ot || ((ot = t + 15e3), (nt = !0), eo("잃어버린 양을 찾아주십시오"));
}
function Oe(t = !1) {
  const e = mt.player?.position,
    o = !!e && Yt(e.x, e.z, -80),
    n = Ze(ut.worldTime).name;
  let s = o ? (t ? 240 : 360) : t ? 190 : 285,
    a = o ? (t ? 480 : 720) : t ? 390 : 560;
  if (!o && "밤" === n) {
    // Night watch is the most dangerous period. Encounters are deliberately
    // much more frequent than during travel in daylight.
    s = nightWatch.active ? 38 : 55;
    a = nightWatch.active ? 68 : 95;
  }
  o || "저녁" !== n || ((s *= 0.62), (a *= 0.66));
  const routeFactor = o ? 1 : routeChoice.spawnMultiplier || 1;
  return (s + Math.random() * (a - s)) / routeFactor;
}
function je(t, o = 4200) {
  const n = e("#dangerNotice");
  const localized = window.ShepherdI18n?.tr?.(t) || t;
  (n.textContent = localized),
    clearTimeout(je.timer),
    t &&
      (je.timer = setTimeout(() => {
        n.textContent === localized && (n.textContent = "");
      }, o));
}
let He = !1;
function Ke() {
  (ut.respect = Math.min(100, ut.respect + 2 + routeChoice.rewardRespect)),
    (ut.money = Math.min(1e7, ut.money + 15)),
    (ut.thirst = 100),
    ut.hp < 100 && (ut.hp = Math.min(100, ut.hp + 14)),
    e("#thirstHud").classList.add("show"),
    (e("#mission").style.display = "none"),
    Ve(2 + routeChoice.rewardRespect),
    $e();
  const o = !(
    at.active ||
    Math.random() > 0.1 ||
    ((b = !0),
    document.exitPointerLock?.(),
    e("#practicePrompt").classList.remove("hidden"),
    setTimeout(() => ke(e("#practicePrompt"), 0), 0),
    0)
  );
  !(function () {
    const e = mt.player?.position || Z,
      o = Z.clone();
    let n = null,
      s = -1 / 0;
    for (let a = 0; a < 1200; a++) {
      const i = Math.random() * Math.PI * 2,
        r = 1550 + 1650 * Math.random(),
        c = t.MathUtils.clamp(e.x + Math.sin(i) * r, -3200, 3200),
        l = t.MathUtils.clamp(e.z + Math.cos(i) * r, -3200, 3200);
      if (!le(c, l)) continue;
      const h = Math.hypot(c - o.x, l - o.z);
      if (h < 1450) continue;
      if (!st.every((t) => Math.hypot(c - t.x, l - t.z) > 900)) continue;
      const d = r + 0.35 * h + 180 * Math.random();
      if ((d > s && ((s = d), (n = new t.Vector3(c, 0, l))), a > 260 && n))
        break;
    }
    if (!n) {
      const o = [
        [-2500, 1900],
        [-2450, -1900],
        [2100, 1900],
        [2100, -1950],
        [-2500, 250],
      ]
        .filter(([t, e]) => le(t, e))
        .sort(
          (t, o) =>
            Math.hypot(o[0] - e.x, o[1] - e.z) -
            Math.hypot(t[0] - e.x, t[1] - e.z),
        )[0];
      n = new t.Vector3(
        ...(o || [-2200, 1500]).flatMap((t, e) => (0 === e ? [t, 0] : [t])),
      );
    }
    st.push({ x: o.x, z: o.z }),
      st.length > 5 && st.shift(),
      Z.set(n.x, 0, n.z),
      ($ += 1),
      ce();
  })(),
    (routeChoice.id = ""),
    (routeChoice.name = ""),
    (routeChoice.spawnMultiplier = 1),
    (routeChoice.rewardRespect = 0),
    oo(!0),
    o ||
      setTimeout(async () => {
        if (
          n &&
          (window.GameDistributionBridge?.isTestMode?.() ||
            Math.random() < CAMP_SUCCESS_AD_CHANCE)
        )
          await requestMobileInterstitial("camp-success");
        ie();
      }, 4300);
}
const Xe = [
  { name: "새벽", start: 0, end: 0.1 },
  { name: "아침", start: 0.1, end: 0.28 },
  { name: "점심", start: 0.28, end: 0.43 },
  { name: "오후", start: 0.43, end: 0.64 },
  { name: "저녁", start: 0.64, end: 0.78 },
  { name: "밤", start: 0.78, end: 1 },
];
function Ze(t) {
  return Xe.find((e) => t >= e.start && t < e.end) || Xe[0];
}
function updateRouteChoice(now) {
  const player = mt.player?.position;
  if (!player || Yt(player.x, player.z, -60) || nightWatch.active) return;
  let next = null;
  // The lower Kidron/wadi route is the shortest direct crossing, but exposes
  // the flock to far more predators. The olive ridge is longer and safer.
  if (player.x > 720 && player.x < 1420)
    next = {
      id: "wadi",
      name: "짧고 위험한 와디 길",
      spawnMultiplier: 1.8,
      rewardRespect: 2,
      notice: "짧은 와디 길: 맹수가 자주 나타나지만 도착 시 존중 보너스를 받습니다.",
    };
  else if (player.x >= 1420 && player.x < 3100)
    next = {
      id: "ridge",
      name: "길고 안전한 올리브산 능선길",
      spawnMultiplier: 0.58,
      rewardRespect: 0,
      notice: "올리브산 능선길: 더 멀지만 맹수 출현이 적습니다.",
    };
  else if (
    Math.hypot(player.x - ft.x, player.z - ft.z) < ft.r + 360 ||
    Math.hypot(player.x - 1035, player.z - 2380) < 520
  )
    next = {
      id: "water",
      name: "물이 있는 샘길",
      spawnMultiplier: 0.9,
      rewardRespect: 0,
      notice: "샘길: 기혼 샘이나 쉴로악흐에서 양 떼의 갈증을 채울 수 있습니다.",
    };
  if (!next || routeChoice.id === next.id) return;
  Object.assign(routeChoice, next);
  // Route effects remain active, but entering a road no longer interrupts play
  // with a feature-description notice.
}
function updateAdaptiveRendering(now) {
  if (!c || !mt.player || now < performanceState.nextAdaptiveQualityAt) return;
  performanceState.nextAdaptiveQualityAt = now + 900;
  const player = mt.player.position;
  const onOliveMount = player.x > 1050 && player.x < 3300;
  const insideCity = Yt(player.x, player.z, -70);
  performanceState.onOliveMount = onOliveMount;
  const consistentlySlow = performanceState.slowFrameFor > 1.4;
  const targetRatio = targetPixelRatio(consistentlySlow, onOliveMount, insideCity);
  if (Math.abs(targetRatio - performanceState.currentPixelRatio) > 0.01) {
    performanceState.currentPixelRatio = targetRatio;
    c.setPixelRatio(targetRatio);
  }
  // More haze is used only when the frame rate remains low. This masks the
  // shorter detail range and softens distant flock/background silhouettes at
  // almost no GPU cost.
  // A cheap photographic-focus effect: David and the nearby road remain
  // crisp, while distant scenery loses contrast before it reaches the culling
  // range. This avoids the large heat cost of a depth-of-field post-process.
  const focusedBaseFog = n
    ? insideCity
      ? 0.00052
      : onOliveMount
        ? 0.0005
        : 0.00048
    : performanceState.distantFogDensity;
  const targetFogDensity = consistentlySlow
    ? n
      ? onOliveMount
        ? 0.00062
        : insideCity
          ? 0.0006
          : 0.00057
      : onOliveMount
        ? 0.00059
        : insideCity
          ? 0.00056
          : 0.00054
    : focusedBaseFog;
  if (i.fog)
    i.fog.density = t.MathUtils.lerp(i.fog.density, targetFogDensity, 0.45);
  const targetFar = n
    ? consistentlySlow
      ? 6300
      : 7700
    : consistentlySlow
      ? 7600
      : 9000;
  if (r.far !== targetFar) {
    r.far = targetFar;
    r.updateProjectionMatrix();
  }
  // Spatially merged city cells disappear only after they are already deep in
  // the distance haze. Nearby streets keep the exact same geometry/materials.
  // This is real draw-call culling, not a post-processing blur.
  const cityBatchRange = n
    ? insideCity
      ? consistentlySlow
        ? 1900
        : 2400
      : consistentlySlow
        ? 2900
        : 3500
    : insideCity
      ? consistentlySlow
        ? 2350
        : 2900
      : consistentlySlow
        ? 3600
        : 4300;
  for (const batch of performanceState.cityStaticBatches) {
    if (!batch?.parent) continue;
    const dx = player.x - batch.userData.batchCenterX;
    const dz = player.z - batch.userData.batchCenterZ;
    const radius = Math.min(520, batch.userData.batchRadius || 0);
    const distanceHidden =
      dx * dx + dz * dz > (cityBatchRange + radius) ** 2;
    batch.userData.distanceHidden = distanceHidden;
    if (!batch.userData.cameraHidden) batch.visible = !distanceHidden;
  }
  if (mt.goalSite && mt.campStoneFar && mt.campStoneNear) {
    const campDistance = Math.hypot(
      player.x - mt.goalSite.position.x,
      player.z - mt.goalSite.position.z,
    );
    if (!performanceState.campStoneNear && campDistance < 760)
      performanceState.campStoneNear = true;
    else if (performanceState.campStoneNear && campDistance > 920)
      performanceState.campStoneNear = false;
    mt.campStoneNear.visible = performanceState.campStoneNear;
    mt.campStoneFar.visible = !performanceState.campStoneNear;
  }
  // Nearby olive batches retain the optimized authored tree. Distant batches
  // switch to a tiny two-draw silhouette and are softened by fog, so the grove
  // remains visible from Jerusalem without submitting every detailed leaf.
  if (mt.oliveGrove) {
    mt.oliveGrove.children.forEach((batch) => {
      const detailed = batch.userData?.detailedInstances;
      const farGroup = batch.userData?.farGroup;
      if (!detailed || !farGroup) {
        batch.visible = true;
        return;
      }
      const dx = player.x - (batch.userData.centerX || 0);
      const dz = player.z - (batch.userData.centerZ || 0);
      const distanceSq = dx * dx + dz * dz;
      if (!n) {
        detailed.visible = true;
        farGroup.visible = false;
        batch.visible = true;
        return;
      }
      const nearRange = consistentlySlow ? 1000 : onOliveMount ? 1300 : 1150;
      const farRange = consistentlySlow ? 3150 : 3900;
      const showDetailed = distanceSq < nearRange * nearRange;
      const showFar = !showDetailed && distanceSq < farRange * farRange;
      detailed.visible = showDetailed;
      farGroup.visible = showFar;
      batch.visible = showDetailed || showFar;
    });
  }
  if (mt.datePalmGrove) {
    mt.datePalmGrove.children.forEach((batch) => {
      batch.frustumCulled = true;
      if (!batch.boundingSphere) batch.computeBoundingSphere?.();
      const sphere = batch.boundingSphere;
      if (!sphere) return;
      const dx = player.x - sphere.center.x;
      const dz = player.z - sphere.center.z;
      batch.visible =
        dx * dx + dz * dz <
        Math.pow((n ? 1450 : 1750) + Math.min(n ? 380 : 500, sphere.radius || 0), 2);
    });
  }
  // Loose pickup stones are useful only near David. Ninety separate meshes no
  // longer remain in the draw list across the whole map.
  for (const rock of mt.rocks) {
    if (!rock?.parent) continue;
    const dx = player.x - rock.position.x;
    const dz = player.z - rock.position.z;
    const rockRange = n ? 1250 : 1650;
    rock.visible = dx * dx + dz * dz < rockRange * rockRange;
  }
  // Flock AI remains active at every distance, but sheep too deep in the haze
  // no longer submit their skinned mesh until David approaches again.
  for (const sheep of mt.sheep) {
    const dx = player.x - sheep.position.x;
    const dz = player.z - sheep.position.z;
    const distanceSq = dx * dx + dz * dz;
    if (sheep.userData.importedSheepModel)
      sheep.userData.importedSheepModel.visible = distanceSq < (n ? 1250 * 1250 : 1750 * 1750);
  }
  // Enemies continue their gameplay logic, but actors deep in the haze do not
  // submit rigged meshes. Spawns already occur inside this range, so danger is
  // always visible before it can reach David or the flock.
  for (const enemy of mt.enemies) {
    if (!enemy?.parent || enemy.userData.hp <= 0) continue;
    const dx = player.x - enemy.position.x;
    const dz = player.z - enemy.position.z;
    enemy.visible = !n || dx * dx + dz * dz < 1750 * 1750;
  }
}
function Ye(e, o, n) {
  return new t.Color(e).lerp(new t.Color(o), n);
}
function _e(o, n) {
  const frameNow = n * 1000;
  const frameMs = Math.min(
    80,
    Math.max(4, performanceState.lastObservedFrameMs || o * 1000),
  );
  performanceState.smoothedFrameMs +=
    (frameMs - performanceState.smoothedFrameMs) * 0.035;
  performanceState.slowFrameFor = Math.max(
    0,
    performanceState.slowFrameFor +
      (performanceState.smoothedFrameMs > (window.document.body.classList.contains("mobile-device") ? 41 : 24)
        ? o
        : -o * 1.6),
  );
  updateAdaptiveRendering(frameNow);
  updateRouteChoice(frameNow);
  if (frameNow >= performanceState.nextAutoSaveAt) {
    performanceState.nextAutoSaveAt = frameNow + 45000;
    oo(!0);
  }
  (function () {
    if (!ct || lt) return;
    ct = !1;
    const t = performance.now();
    if (!(t - ht < 350)) {
      (ht = t), (lt = !0);
      try {
        !(function () {
          if (!S || b || !mt.player || !Array.isArray(mt.rocks)) return;
          if (tryBuySheep()) return;
          if ((Number.isFinite(ut.stones) || (ut.stones = 0), ut.stones >= 25))
            return void eo("돌은 최대 25개까지 지닐 수 있습니다.");
          const t = mt.player.position?.x,
            e = mt.player.position?.z;
          if (!Number.isFinite(t) || !Number.isFinite(e)) return;
          let o = null,
            n = 13225;
          for (const s of [...mt.rocks]) {
            if (!s || !s.visible || !s.position) continue;
            const a = s.position.x - t,
              i = s.position.z - e,
              r = a * a + i * i;
            Number.isFinite(r) && r < n && ((n = r), (o = s));
          }
          if (o) {
            i.remove(o),
              mt.rocks.splice(mt.rocks.indexOf(o), 1),
              (ut.stones = Math.min(25, ut.stones + 1)),
              (ut.quality = o.userData?.quality || "거친 돌");
            try {
              kt("pickup"), Ut(740, 0.1, 0.065, "sine", 250);
            } catch (t) {
              console.warn("돌 줍기 효과음 오류:", t);
            }
            eo(ut.quality + "을 주웠습니다. (" + ut.stones + "/25)");
            try {
              $e();
            } catch (t) {
              console.warn("돌 줍기 HUD 오류:", t);
            }
          } else eo("가까운 곳에 적합한 돌이 없습니다.");
        })();
      } catch (t) {
        console.error("돌 줍기 처리 오류:", t),
          eo("돌을 줍는 중 오류가 발생했습니다. 다시 시도해 주세요.");
      } finally {
        lt = !1;
      }
    }
  })(),
    P &&
      ((T = Math.min(1, T + 0.55 * o)),
      (e("#charge i").style.width = 100 * T + "%"),
      updateMobileCharge(T)),
    (function (o, n) {
      Number.isFinite(ut.worldTime) || (ut.worldTime = 0.29),
        // One full in-game day now takes 22 real minutes instead of 24.
        // The 9% increase is noticeable without making dusk or night rush by.
        (ut.worldTime = (ut.worldTime + o / 1320) % 1);
      const s = ut.worldTime,
        a = Ze(s);
      const phaseLabel = e("#timePhaseLabel");
      if (phaseLabel)
        phaseLabel.textContent =
          window.ShepherdI18n?.tr?.(a.name) || a.name;
      const lightingNow = n * 1000;
      if (
        document.body.classList.contains("mobile-device") &&
        lightingNow < performanceState.nextLightingAt
      ) return;
      performanceState.nextLightingAt =
        lightingNow + (document.body.classList.contains("mobile-device") ? 100 : 0);
      const l = Math.max(
          0,
          Math.sin(Math.PI * t.MathUtils.clamp((s - 0.03) / 0.76, 0, 1)),
        ),
        f = Math.max(0, 1 - Math.abs(s - 0.08) / 0.11),
        M = Math.max(0, 1 - Math.abs(s - 0.7) / 0.12),
        v = Math.max(f, M),
        z = t.MathUtils.clamp((0.34 - l) / 0.34, 0, 1);
      const torchUpdateDue = n * 1000 >= lightingPerformance.nextTorchUpdateAt;
      if (torchUpdateDue) {
        lightingPerformance.nextTorchUpdateAt = n * 1000 + (window.document.body.classList.contains("mobile-device") ? 180 : 100);
        const playerPosition = mt.player?.position;
        const torchCandidates = [];
        for (const torch of mt.cityTorches || []) {
          if (!torch?.userData) continue;
          if (torch.userData.disabledByRoadValidation) {
            torch.visible = false;
            continue;
          }
          torch.getWorldPosition(wt);
          const distanceSq = playerPosition
            ? (wt.x - playerPosition.x) ** 2 + (wt.z - playerPosition.z) ** 2
            : Infinity;
          torch.userData.distanceSq = distanceSq;
          if (distanceSq <= lightingPerformance.torchLightDistance ** 2)
            torchCandidates.push(torch);
        }
        torchCandidates.sort(
          (left, right) => left.userData.distanceSq - right.userData.distanceSq,
        );
        const localLights = new Set(
          torchCandidates.slice(0, lightingPerformance.maxLocalPointLights),
        );
        for (const t of mt.cityTorches || []) {
          if (!t?.userData) continue;
          if (t.userData.disabledByRoadValidation) {
            t.visible = false;
            continue;
          }
        const e =
            0.84 +
            0.16 * Math.sin(13 * n + t.userData.phase) +
            0.07 * Math.sin(27 * n + 2 * t.userData.phase),
          o = t.userData.campTorch
            ? "저녁" === a.name
              ? Math.max(0.62, z)
              : "밤" === a.name
                ? Math.max(0.9, z)
                : 0
            : z;
        const showVisual =
          t.userData.campTorch ||
          t.userData.distanceSq <= lightingPerformance.torchVisualDistance ** 2;
        const useRealLight = o > 0.025 && localLights.has(t);
        t.userData.glow.visible = useRealLight;
        (t.userData.glow.intensity =
          useRealLight ? o * (t.userData.campTorch ? 4.5 : 3.8) * e : 0),
          (t.userData.flame.material.opacity = o * (0.78 + 0.18 * e)),
          (t.userData.flame.scale.y = 0.88 + 0.18 * e),
          (t.visible = o > 0.025 && showVisual);
        }
      }
      if (mt.staffNightLight?.userData) {
        const t = mt.staffNightLight,
          e =
            0.88 +
            0.12 * Math.sin(15 * n + t.userData.phase) +
            0.06 * Math.sin(31 * n),
          o = ["저녁", "밤", "새벽"].includes(a.name) ? Math.max(0.78, z) : 0;
        (t.userData.glow.intensity = 6.2 * o * e),
          (t.userData.flame.material.opacity = o * (0.84 + 0.12 * e)),
          (t.userData.flame.scale.y = 0.92 + 0.18 * e),
          (t.visible = o > 0.02);
      }
      if (mt.templeNightLight) {
        const playerPosition = mt.player?.position;
        const nearTemple =
          !!playerPosition &&
          Math.hypot(playerPosition.x + 100, playerPosition.z + 2050) < 1180;
        const templeDarkness =
          ["저녁", "밤", "새벽"].includes(a.name) ? z : 0;
        mt.templeNightLight.visible =
          nearTemple && templeDarkness > 0.025;
        mt.templeNightLight.intensity = mt.templeNightLight.visible
          ? 2.75 * templeDarkness
          : 0;
      }
      // Strong blue daylight sky.  The distant mountain meshes use their own
      // fog-free materials, so their authored colours remain untouched.
      const D = Ye(1516347, 4034513, l).lerp(new t.Color(4886441), 0.18 * v),
        S = Ye(3687517, 7715304, l).lerp(new t.Color(9432036), 0.26 * v),
        b = Ye(4936551, 13032941, l).lerp(new t.Color(14542066), 0.34 * v);
      if (
        (p &&
          (p.uniforms.top.value.copy(D),
          p.uniforms.middle.value.copy(S),
          p.uniforms.bottom.value.copy(b)),
        i.background.copy(D.clone().lerp(S, 0.5)),
        i.fog.color.copy(b.clone().lerp(S, 0.35)),
        h)
      ) {
        const e = (s - 0.25) * Math.PI * 2;
        h.position.set(
          1500 * Math.cos(e),
          Math.max(-250, 1250 * Math.sin(e)),
          850 * Math.sin(e),
        ),
          (h.intensity = 0.34 + 2.72 * l),
          h.color.copy(
            Ye(10200776, 16769187, l).lerp(new t.Color(16756088), 0.5 * v),
          );
        const needsSunShadow =
          l > 0.16 && performanceState.slowFrameFor <= 1.4;
        if (lightingPerformance.sunShadowEnabled !== needsSunShadow) {
          lightingPerformance.sunShadowEnabled = needsSunShadow;
          h.castShadow = needsSunShadow;
          c.shadowMap.needsUpdate = needsSunShadow;
          lightingPerformance.nextSunShadowUpdateAt = 0;
        }
        if (
          needsSunShadow &&
          n * 1000 >= lightingPerformance.nextSunShadowUpdateAt
        ) {
          const playerInsideCity = !!mt.player &&
            Yt(mt.player.position.x, mt.player.position.z, -70);
          lightingPerformance.nextSunShadowUpdateAt =
            n * 1000 + (playerInsideCity ? 520 : 360);
          c.shadowMap.needsUpdate = true;
        }
      }
      if (mt.stars?.material?.uniforms) {
        let starAmount = 0;
        if (s >= 0.64 && s < 0.78)
          starAmount = t.MathUtils.smoothstep(s, 0.64, 0.78);
        else if (s >= 0.78) starAmount = 1;
        else if (s < 0.1)
          starAmount = 1 - t.MathUtils.smoothstep(s, 0.015, 0.1);
        mt.stars.material.uniforms.revealLimit.value = starAmount;
        mt.stars.material.uniforms.starOpacity.value =
          t.MathUtils.smoothstep(starAmount, 0.015, 0.24);
        mt.stars.visible = starAmount > 0.006;
      }
      if (mt.eastPanorama?.material) {
        const panoramaLight = 0.16 + 0.84 * l;
        mt.eastPanorama.material.color.setRGB(
          panoramaLight * (1 - 0.08 * v),
          panoramaLight * (1 - 0.12 * v),
          panoramaLight * (1 - 0.18 * v),
        );
        mt.eastPanorama.material.opacity = 0.82 + 0.16 * l;
      }
      if (
        (d &&
          ((d.intensity = 0.66 + 1.56 * l),
          d.color.copy(Ye(5400719, 13098736, l)),
          d.groundColor.copy(Ye(3813680, 6243373, l))),
        u)
      ) {
        const t = (s - 0.25) * Math.PI * 2;
        u.position.set(
          3e3 * Math.cos(t),
          1800 * Math.sin(t),
          -2300 * Math.sin(t),
        ),
          (u.visible = l > 0.04),
          (u.material.opacity = 0.35 + 0.45 * l),
          u.lookAt(r.position);
      }
      m &&
        w &&
        w.gain.linearRampToValueAtTime(
          y ? 0.07 + 0.06 * (1 - l) : 0,
          m.currentTime + 0.2,
        ),
        y &&
          m &&
          (l > 0.38 &&
            n > x &&
            (Ut(1250, 0.1, 0.055, "sine", 420),
            setTimeout(() => Ut(1570, 0.07, 0.018, "sine", -260), 90),
            (x = n + 8 + 18 * Math.random())),
          l < 0.14 &&
            n > g &&
            (Ut(3400, 0.045, 0.028, "square", 120),
            setTimeout(() => Ut(3150, 0.03, 0.009, "square", 80), 75),
            (g = n + 0.8 + 2.4 * Math.random())));
    })(o, n),
    frameNow >= performanceState.nextAmbientAudioAt &&
      ((performanceState.nextAmbientAudioAt =
        frameNow + (IS_MOBILE_DEVICE ? 500 : 220)),
      It()),
    (function () {
      const t = mt.player?.position;
      if (!t) return;
      if (frameNow < performanceState.nextRegionUiAt) return;
      performanceState.nextRegionUiAt =
        frameNow + (IS_MOBILE_DEVICE ? 260 : 120);
      const o = Ht(Ft[0], t.x, t.z, -70) < 1,
        n = e("#jerusalemLandmark");
      n && n.classList.toggle("show", o),
        zt(t.x, t.z, 135)
          ? Qt("성전산")
          : o
            ? Qt("예루샬라임 성내")
            : t.x > 520
              ? Qt("키드론 골짜기")
              : Qt("예루샬라임 주변 광야");
    })(),
    (function () {
      const e = mt.player;
      if (
        !e ||
        !mt.jerusalem ||
        !mt.jerusalem.visible ||
        A === 2 ||
        frameNow < performanceState.nextOcclusionAt
      )
        return;
      const playerInsideCity = Yt(e.position.x, e.position.z, -70);
      performanceState.nextOcclusionAt =
        frameNow + (window.document.body.classList.contains("mobile-device")
          ? playerInsideCity
            ? performanceState.slowFrameFor > 1.4
              ? 380
              : 280
            : 220
          : playerInsideCity
            ? performanceState.slowFrameFor > 1.4
              ? 260
              : 180
            : 120);
      for (const mesh of performanceState.hiddenCameraMeshes) {
        mesh.visible = !mesh.userData.distanceHidden;
        mesh.userData.cameraHidden = !1;
      }
      performanceState.hiddenCameraMeshes.length = 0;
      const o = e.position.clone().sub(r.position),
        n = o.length(),
        raycaster = performanceState.occlusionRaycaster;
      raycaster.set(r.position, o.normalize()),
        (raycaster.near = 0),
        (raycaster.far = Math.max(0, n - 28));
      const s = raycaster.intersectObjects(mt.jerusalem.children, !0);
      for (const t of s) {
        const e = t.object;
        e?.isMesh &&
          !e.userData.distanceHidden &&
          !e.userData.neverOcclude &&
          t.distance > 45 &&
          t.distance < n - 25 &&
          e.geometry?.parameters?.height < 260 &&
          ((e.visible = !1),
          (e.userData.cameraHidden = !0),
          performanceState.hiddenCameraMeshes.push(e));
      }
    })(),
    (function (e) {
      const o = mt.player;
      if (!o) return;
      if (((k = Math.max(0, k - e)), o.userData.staff))
        if (o.userData.staffSwing > 0) {
          o.userData.staffSwing = Math.max(0, o.userData.staffSwing - e);
          const swingProgress = 1 - o.userData.staffSwing / 0.36;
          const swingAmount = Math.sin(swingProgress * Math.PI);
          const staff = o.userData.staff;
          if (staff.userData.baseQuaternion) {
            staff.quaternion
              .copy(staff.userData.baseQuaternion)
              .multiply(
                new t.Quaternion().setFromEuler(
                  new t.Euler(
                    0.35 * swingAmount,
                    0,
                    1.45 * swingAmount,
                    "XYZ",
                  ),
                ),
              );
          } else {
            (staff.rotation.z = 1.45 * swingAmount - 0.45),
              (staff.rotation.x = 0.35 * swingAmount);
          }
        } else {
          const staff = o.userData.staff;
          if (staff.userData.baseQuaternion) {
            staff.quaternion.slerp(
              staff.userData.baseQuaternion,
              Math.min(1, 12 * e),
            );
          } else {
            (staff.rotation.z = t.MathUtils.lerp(
              staff.rotation.z,
              -0.025,
              Math.min(1, 10 * e),
            )),
              (staff.rotation.x *= Math.max(0, 1 - 10 * e));
          }
        }
      if (IS_MOBILE_DEVICE) {
        // Low-pass the stick vector itself. Tiny finger movements no longer
        // become instant ninety/one-eighty degree commands, while a deliberate
        // full deflection still reaches full speed quickly.
        const stickResponse = 1 - Math.exp(-7.2 * e);
        mobileInput.forward = t.MathUtils.lerp(
          mobileInput.forward,
          mobileInput.targetForward,
          stickResponse,
        );
        mobileInput.strafe = t.MathUtils.lerp(
          mobileInput.strafe,
          mobileInput.targetStrafe,
          stickResponse,
        );
      }
      const forwardInput = t.MathUtils.clamp(
          (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0) + mobileInput.forward,
          -1,
          1,
        ),
        strafeInput = t.MathUtils.clamp(
          (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + mobileInput.strafe,
          -1,
          1,
        ),
        movementYaw = IS_MOBILE_DEVICE && mobileInput.active ? mobileInput.movementYaw : B,
        a = new t.Vector3(Math.sin(movementYaw), 0, Math.cos(movementYaw)).normalize(),
        i = new t.Vector3(-Math.cos(movementYaw), 0, Math.sin(movementYaw)).normalize(),
        c = (o.position.clone(), new t.Vector3());
      const running = !!K.Space || mobileInput.running;
      const movementMagnitude = mobileInput.active
        ? t.MathUtils.clamp(Math.hypot(forwardInput, strafeInput), 0, 1)
        : 1;
      const hasMovementInput =
        !specialSlingAttack.active &&
        c
          .addScaledVector(a, forwardInput)
          .addScaledVector(i, strafeInput)
          .lengthSq() > 0;
      o.userData.updateLocomotionAnimation?.(
        e,
        hasMovementInput,
        hasMovementInput && running,
      );
      if (hasMovementInput) {
        c.normalize();
        const moveSpeed =
            (running ? 310 : 145) *
            (G ? 0.55 : 1) *
            Math.max(0.18, movementMagnitude),
          moveStep = c.clone().multiplyScalar(moveSpeed * e);
        movePlayerWithSweptCollision(o, moveStep);
        const r = Math.atan2(c.x, c.z);
        let l =
          t.MathUtils.euclideanModulo(r - o.rotation.y + Math.PI, 2 * Math.PI) -
          Math.PI;
        (o.rotation.y += IS_MOBILE_DEVICE
          ? t.MathUtils.clamp(
              l * Math.min(1, 7.5 * e),
              -(2.15 + 1.35 * movementMagnitude) * e,
              (2.15 + 1.35 * movementMagnitude) * e,
            )
          : l * Math.min(1, 12 * e)),
          (o.userData.walkPhase += e * (running ? 17.2 : 9));
        const h = running,
          d = Math.sin(o.userData.walkPhase) * (h ? 0.8 : 0.38),
          p = o.userData.bodyRoot || o;
        (p.rotation.x = t.MathUtils.lerp(
          p.rotation.x,
          h ? 0.19 : 0,
          Math.min(1, 8 * e),
        )),
          (p.rotation.z = t.MathUtils.lerp(
            p.rotation.z,
            0,
            Math.min(1, 10 * e),
          ));
        const u = o.userData.limbs;
        u &&
          ((u.leftLeg.rotation.x = d),
          (u.rightLeg.rotation.x = -d),
          (u.leftArm.rotation.x = 0.72 * -d),
          (u.rightArm.rotation.x = 0.72 * d));
        o.userData.tzitzit?.forEach((corner, index) => {
          const direction = index % 2 ? -1 : 1;
          corner.rotation.x = 0.08 * Math.sin(o.userData.walkPhase + index);
          corner.rotation.z =
            direction * 0.035 * Math.sin(o.userData.walkPhase * 0.72 + index);
        });
        const importedAvatar = o.userData.importedAvatar;
        if (importedAvatar && !o.userData.animationMixer) {
          const baseY = o.userData.importedAvatarBaseY || 0;
          importedAvatar.position.y =
            baseY + Math.abs(Math.sin(o.userData.walkPhase)) * (h ? 2.4 : 1.35);
          importedAvatar.rotation.z =
            Math.sin(o.userData.walkPhase) * (h ? 0.035 : 0.018);
        }
      } else {
        const n = o.userData.bodyRoot || o;
        (n.rotation.x = t.MathUtils.lerp(n.rotation.x, 0, Math.min(1, 8 * e))),
          (n.rotation.z = t.MathUtils.lerp(
            n.rotation.z,
            0,
            Math.min(1, 10 * e),
          ));
        const s = o.userData.limbs;
        if (s)
          for (const t of Object.values(s))
            t.rotation.x *= Math.max(0, 1 - 10 * e);
        o.userData.tzitzit?.forEach((corner) => {
          corner.rotation.x *= Math.max(0, 1 - 7 * e);
          corner.rotation.z *= Math.max(0, 1 - 7 * e);
        });
        const importedAvatar = o.userData.importedAvatar;
        if (importedAvatar) {
          const baseY = o.userData.importedAvatarBaseY || 0;
          importedAvatar.position.y = t.MathUtils.lerp(
            importedAvatar.position.y,
            baseY,
            Math.min(1, 10 * e),
          );
          importedAvatar.rotation.z = t.MathUtils.lerp(
            importedAvatar.rotation.z,
            0,
            Math.min(1, 10 * e),
          );
        }
      }
      const l = samplePlayerSurface(o.position.x, o.position.z, o.position.y) + pt,
        h = o.userData.bodyRoot || o;
      // Entering the actual Temple courtyard restores David's energy once per
      // visit. Leaving the court rearms the blessing for a later damaged visit.
      if (dt) {
        const insideTempleCourt =
          o.position.x >= dt.courtXMin &&
          o.position.x <= dt.courtXMax &&
          o.position.z >= dt.courtZMin &&
          o.position.z <= dt.courtZMax;
        if (
          insideTempleCourt &&
          templeRecoveryArmed &&
          ut.hp > 0 &&
          ut.hp < 100
        ) {
          ut.hp = 100;
          templeRecoveryArmed = !1;
          eo("성전 뜰에서 에너지가 회복되었습니다.");
          $e();
        } else if (!insideTempleCourt) {
          templeRecoveryArmed = !0;
        }
      }
      // Altar fail-safe: when crossing the scanned model's rim, never allow the
      // player to drop into its hollow visual shell.  The stair remains the normal
      // approach, while any position still inside the square footprint resolves
      // to the real, reinforced top surface.
      if (dt) {
        const insideAltar =
          Math.abs(o.position.x - dt.altarX) <= dt.altarHalfX - 2 &&
          Math.abs(o.position.z - dt.altarZ) <= dt.altarHalfZ - 2;
        const altarStandingY = dt.altarTopY + pt;
        if (
          insideAltar &&
          o.position.y < altarStandingY - 8 &&
          o.position.y > dt.courtSurfaceY + pt - 12
        ) {
          o.position.y = altarStandingY;
          o.userData.verticalVelocity = 0;
          o.userData.grounded = true;
        }
      }
      !specialSlingAttack.active &&
        N &&
        o.userData.grounded &&
        ((o.userData.verticalVelocity = 245), (o.userData.grounded = !1)),
        (N = !1),
        o.userData.grounded
          ? ((o.position.y = l),
            (h.position.y = t.MathUtils.lerp(
              h.position.y,
              0,
              Math.min(1, 12 * e),
            )))
          : ((o.userData.verticalVelocity -= 455 * e),
            (o.position.y += o.userData.verticalVelocity * e),
            (h.position.y = t.MathUtils.lerp(
              h.position.y,
              5,
              Math.min(1, 10 * e),
            )),
            (h.rotation.x = t.MathUtils.lerp(
              h.rotation.x,
              -0.1,
              Math.min(1, 8 * e),
            )),
            o.position.y <= l &&
              ((o.position.y = l),
              (o.userData.verticalVelocity = 0),
              (o.userData.grounded = !0))),
        o.position.x,
        o.position.z,
        (o.position.x = t.MathUtils.clamp(o.position.x, -3720, 3720)),
        (o.position.z = t.MathUtils.clamp(o.position.z, -3720, 3720)),
        o.userData.lastSafePosition?.copy(o.position),
        o.position.x > 3300 && (o.position.x = 3300);
      if (IS_MOBILE_DEVICE) {
        A = 3;
        I = t.MathUtils.lerp(I, -Math.PI / 4, Math.min(1, 7 * e));
        if (hasMovementInput) {
          const cameraTurn =
            t.MathUtils.euclideanModulo(o.rotation.y - B + Math.PI, 2 * Math.PI) -
            Math.PI;
          const insideCitySteering = Yt(o.position.x, o.position.z, -55);
          const maximumCameraTurn = (insideCitySteering ? 1.55 : 1.9) * e;
          const weightedCameraTurn = cameraTurn * (1 - Math.exp(-3.4 * e));
          B += t.MathUtils.clamp(
            weightedCameraTurn,
            -maximumCameraTurn,
            maximumCameraTurn,
          );
          B = t.MathUtils.euclideanModulo(B + Math.PI, Math.PI * 2) - Math.PI;
        }
      }
      const d = F[A],
        p = G && !IS_MOBILE_DEVICE ? 92 : IS_MOBILE_DEVICE ? 340 : d.distance,
        u = G && !IS_MOBILE_DEVICE ? 78 : IS_MOBILE_DEVICE ? 340 : d.height,
        m = G && !IS_MOBILE_DEVICE ? 43 : IS_MOBILE_DEVICE ? 59 : d.fov,
        f = 1 - Math.pow(0.0015, e);
      (R = t.MathUtils.lerp(R, p, f)),
        (V = t.MathUtils.lerp(V, u, f)),
        (U = t.MathUtils.lerp(U, m, f)),
        Math.abs(r.fov - U) > 0.02 && ((r.fov = U), r.updateProjectionMatrix());
      const w = Math.cos(I),
        M = Math.sin(I),
        y = new t.Vector3(Math.sin(B) * w, M, Math.cos(B) * w).normalize(),
        x = new t.Vector3(o.position.x, o.position.y + 58, o.position.z),
        g = G && !IS_MOBILE_DEVICE ? i.clone().multiplyScalar(20) : new t.Vector3();
      x.add(g);
      const mobileFollowView = IS_MOBILE_DEVICE,
        v = !mobileFollowView && !G && F[A].firstPerson,
        z = new t.Vector3(
          o.position.x,
          o.position.y + (v ? 74 : G ? 55 : 68),
          o.position.z,
        ).add(g);
      let D;
      if (mobileFollowView) {
        const flatForward = new t.Vector3(Math.sin(B), 0, Math.cos(B));
        D = new t.Vector3(
          o.position.x - flatForward.x * R,
          o.position.y + V,
          o.position.z - flatForward.z * R,
        );
      } else if (v) {
        D = z.clone().addScaledVector(y, 9);
      } else {
        D = z.clone().addScaledVector(y, -R);
        D.y += G ? 8 : 3 === A ? 34 : 24;
      }
      const S = te(D.x, D.z) + 18;
      D.y < S && (D.y = S),
        [o.position.x, o.position.y, o.position.z, D.x, D.y, D.z].every(
          Number.isFinite,
        ) ||
          (o.position.set(-950, te(-950, 500) + pt, 500),
          (o.userData.verticalVelocity = 0),
          (o.userData.grounded = !0),
          D.set(o.position.x, o.position.y + V, o.position.z + R)),
        r.position.lerp(D, f);
      const b = mobileFollowView
        ? new t.Vector3(
            o.position.x + Math.sin(B) * 150,
            o.position.y + 58,
            o.position.z + Math.cos(B) * 150,
          )
        : z.clone().addScaledVector(y, 520);
      if (
        (r.lookAt(b),
        (() => {
          const remaining = combatFeedback.shakeUntil - performance.now();
          if (remaining <= 0 || combatFeedback.shakeDuration <= 0) return;
          const fade = remaining / combatFeedback.shakeDuration;
          const strength = combatFeedback.shakeStrength * fade;
          r.position.x += (Math.random() - 0.5) * strength;
          r.position.y += (Math.random() - 0.5) * strength * 0.72;
          r.position.z += (Math.random() - 0.5) * strength;
          r.lookAt(b);
        })(),
        r.updateMatrixWorld(),
        (o.visible = mobileFollowView || !(G || (!G && F[A].firstPerson))),
        mt.aimRig)
      ) {
        mt.aimRig.visible = G && !mobileFollowView;
        const t = mt.aimRig.userData.sling;
        const shoulder = mt.aimRig.userData.rightShoulder;
        const elbow = mt.aimRig.userData.rightElbow;
        const spinAxis = mt.aimRig.userData.slingSpinAxis;
        const spinning = G && P;
        const phase = performance.now() * 0.014;
        const releaseStartedAt = mt.aimRig.userData.slingReleaseStartedAt || 0;
        const releaseAge = performance.now() - releaseStartedAt;
        const releasing = G && releaseAge >= 0 && releaseAge < 300;
        const releaseT = releasing
          ? Math.max(0, Math.min(1, releaseAge / 300))
          : 0;
        // Fast forward cast for the first half, then a softer return.  This is
        // deliberately separate from the backward preparation orbit: the hand
        // does not continuously circle with the sling.
        const castEnvelope = releasing
          ? releaseT < 0.46
            ? Math.sin((releaseT / 0.46) * Math.PI * 0.5)
            : Math.cos(((releaseT - 0.46) / 0.54) * Math.PI * 0.5)
          : 0;
        if (t) {
          // Clockwise on-screen motion (left side rising, top moving right)
          // is the player's backward preparation rotation in this right-hand
          // first-person view.  The slightly tilted, mostly camera-facing
          // axis makes the full pouch orbit legible instead of collapsing to
          // a thin depth-line.  Release remains a separate forward cast.
          const orbitAngle = spinning
            ? -phase
            : releasing
              ? -castEnvelope * 0.92
              : 0;
          if (spinAxis) t.quaternion.setFromAxisAngle(spinAxis, orbitAngle);
        }
        if (shoulder) {
          shoulder.rotation.z = -0.1 - castEnvelope * 0.05;
          shoulder.rotation.x = -0.05 + castEnvelope * 0.2;
          shoulder.rotation.y = -0.06 - castEnvelope * 0.07;
        }
        if (elbow) {
          elbow.rotation.z = -0.04 + castEnvelope * 0.06;
          elbow.rotation.x = castEnvelope * 0.2;
        }
        const loadedStone = mt.aimRig.userData.slingStone;
        if (loadedStone)
          loadedStone.visible = G && ut.stones > 0 && !(releasing && releaseAge < 175);
          (mt.aimRig.rotation.z = 0);
      }
      updateSpecialSlingAttack(e, performance.now());
    })(o),
    (function (e, o) {
      updateJerusalemBuildingLOD();
      updateJerusalemSheepHold(),
        updateSouthGateGuard(e),
        y && !K.KeyZ && Math.random() < 0.012 * e && kt("sheep");
      if (IS_MOBILE_DEVICE) {
        // Flock navigation performs collision sweeps and pair separation. Run
        // it on two of every three 30 FPS frames and compensate the elapsed
        // time, reducing its CPU/heat cost by roughly one third without
        // changing travel speed or the visible animation rate.
        performanceState.sheepUpdatePhase =
          (performanceState.sheepUpdatePhase + 1) % 3;
        if (performanceState.sheepUpdatePhase === 0) return;
        e *= 1.5;
      }
      const n = mt.player;
      const activePredators = mt.enemies.filter(
        (enemy) => enemy.userData.hp > 0 && enemy.userData.type !== "bandit",
      );
      if (
        (mt.sheep.forEach((s, a) => {
          let i = s.userData.target;
          const now = performance.now();
          if (nightWatch.active) {
            if (!s.userData.nightCampPosition)
              s.userData.nightCampPosition = s.position.clone();
            s.position.x = s.userData.nightCampPosition.x;
            s.position.z = s.userData.nightCampPosition.z;
            s.position.y = te(s.position.x, s.position.z) + 1;
            s.userData.target?.set?.(0, 0, 0);
            s.userData.recallUntil = 0;
            s.userData.urgeUntil = 0;
            s.userData.stuckTime = 0;
            s.userData.lostSince = 0;
            if (s.userData.legs)
              for (const leg of s.userData.legs)
                leg.rotation.z *= Math.max(0, 1 - 8 * e);
            updateRiggedAnimalAnimation(s, false, 0, false);
            return;
          } else if (s.userData.nightCampPosition) {
            s.userData.nightCampPosition = null;
          }
          // While Z remains held, keep each running slot centred on David.
          // Updating the target here lets the flock follow a moving/running
          // player without retriggering either the notice or the bleat.
          if (K.KeyZ && !s.userData.safeHold) {
            const recallAngle =
              (a / Math.max(1, mt.sheep.length)) * Math.PI * 2;
            s.userData.target.set(
              n.position.x + 90 * Math.sin(recallAngle),
              0,
              n.position.z + 90 * Math.cos(recallAngle),
            );
            s.userData.recallUntil = now + 250;
            s.userData.stuckTime = 0;
          }
          let nearestPredator = null;
          let nearestPredatorDistance = Infinity;
          if (!s.userData.safeHold) {
            for (const enemy of activePredators) {
              const distance = Math.hypot(
                enemy.position.x - s.position.x,
                enemy.position.z - s.position.z,
              );
              if (distance < nearestPredatorDistance) {
                nearestPredatorDistance = distance;
                nearestPredator = enemy;
              }
            }
          }
          const playerDistance = Math.hypot(
            n.position.x - s.position.x,
            n.position.z - s.position.z,
          );
          // Repair sheep already embedded in the wall (including positions
          // loaded from an older save) before any steering or flock separation.
          if (
            !s.userData.safeHold &&
            isNearJerusalemWall(s.position) &&
            Yt(s.position.x, s.position.z, 90)
          ) {
            const escape = findSheepWallEscape(s.position, 38);
            if (escape) {
              s.position.set(escape.x, te(escape.x, escape.z) + 1, escape.z);
              s.userData.lastPos.copy(s.position);
              s.userData.cityPath = null;
              s.userData.stuckTime = 0;
              s.userData.rescueAttempts = 0;
            }
          }
          // Resolve flock overlap once per pair. Sheep keep their own physical
          // footprint instead of oscillating into the same point while idle or
          // gathering around David.
          for (let otherIndex = a + 1; otherIndex < mt.sheep.length; otherIndex++) {
            const other = mt.sheep[otherIndex];
            if (!other || other.userData.safeHold !== s.userData.safeHold) continue;
            let separationX = other.position.x - s.position.x;
            let separationZ = other.position.z - s.position.z;
            let separationDistance = Math.hypot(separationX, separationZ);
            const minimumSpacing = 64;
            if (separationDistance >= minimumSpacing) continue;
            if (separationDistance < 0.001) {
              const angle = (a * 2.399963 + otherIndex * 0.71) % (Math.PI * 2);
              separationX = Math.cos(angle);
              separationZ = Math.sin(angle);
              separationDistance = 1;
            }
            const correction =
              Math.min(7, (minimumSpacing - separationDistance) * 0.5);
            const normalX = separationX / separationDistance;
            const normalZ = separationZ / separationDistance;
            const sCandidate = Mt.set(
              s.position.x - normalX * correction,
              te(
                s.position.x - normalX * correction,
                s.position.z - normalZ * correction,
              ) + 5,
              s.position.z - normalZ * correction,
            );
            if (!isSheepBlockedAt(sCandidate, isNearJerusalemWall(s) ? 34 : 18)) {
              s.position.x = sCandidate.x;
              s.position.z = sCandidate.z;
            }
            const otherCandidate = wt.set(
              other.position.x + normalX * correction,
              te(
                other.position.x + normalX * correction,
                other.position.z + normalZ * correction,
              ) + 5,
              other.position.z + normalZ * correction,
            );
            if (
              !isSheepBlockedAt(
                otherCandidate,
                isNearJerusalemWall(other) ? 34 : 18,
              )
            ) {
              other.position.x = otherCandidate.x;
              other.position.z = otherCandidate.z;
            }
          }
          if (nearestPredator && nearestPredatorDistance < 430) {
            const proximity = 1 - nearestPredatorDistance / 430;
            s.userData.fear = Math.min(
              1,
              (s.userData.fear || 0) + e * (0.42 + proximity * 1.9),
            );
            const awayX = s.position.x - nearestPredator.position.x;
            const awayZ = s.position.z - nearestPredator.position.z;
            const length = Math.max(1, Math.hypot(awayX, awayZ));
            const angle = Math.atan2(awayZ / length, awayX / length) + s.userData.fearJitter;
            s.userData.fearDirection.set(Math.cos(angle), 0, Math.sin(angle));
          } else {
            const calmingRate = playerDistance < 260 ? 0.56 : 0.18;
            s.userData.fear = Math.max(0, (s.userData.fear || 0) - e * calmingRate);
          }
          if ((s.userData.fear || 0) > 0.18 && !s.userData.safeHold) {
            const panicDistance = 150 + 210 * s.userData.fear;
            i = wt.set(
              s.position.x + s.userData.fearDirection.x * panicDistance,
              0,
              s.position.z + s.userData.fearDirection.z * panicDistance,
            );
            s.userData.recallUntil = Math.max(s.userData.recallUntil || 0, now + 900);
          } else if (
            !s.userData.safeHold &&
            !s.userData.target.lengthSq() &&
            mt.sheep.length > 1
          ) {
            let centerX = 0;
            let centerZ = 0;
            let nearbyCount = 0;
            for (const other of mt.sheep) {
              if (other === s || other.userData.safeHold) continue;
              const distance = Math.hypot(
                other.position.x - s.position.x,
                other.position.z - s.position.z,
              );
              if (distance > 520) continue;
              centerX += other.position.x;
              centerZ += other.position.z;
              nearbyCount++;
            }
            if (nearbyCount && playerDistance > 125) {
              centerX /= nearbyCount;
              centerZ /= nearbyCount;
              i = wt.set(
                centerX * 0.46 + (n.position.x - 105) * 0.54,
                0,
                centerZ * 0.46 + (n.position.z - 105) * 0.54,
              );
            }
          }
          if (0 === i.lengthSq()) {
            const t = (a / mt.sheep.length) * Math.PI * 2 + s.userData.phase;
            i = wt.set(
              n.position.x - 110 + 110 * Math.sin(t),
              0,
              n.position.z - 110 + 110 * Math.cos(t),
            );
          }
          const baseGoalX = i.x;
          const baseGoalZ = i.z;
          const followsCityRoad =
            !s.userData.safeHold &&
            (Kt(s.position.x, s.position.z, -55) ||
              Kt(n.position.x, n.position.z, -55));
          if (followsCityRoad) {
            if (jt(s.position, 22)) {
              const clearRoadPoint = nearestClearCityRoadPoint(
                s.position.x,
                s.position.z,
                28,
              );
              if (clearRoadPoint) {
                s.position.x = clearRoadPoint.x;
                s.position.z = clearRoadPoint.z;
                s.position.y = te(clearRoadPoint.x, clearRoadPoint.z) + 1;
                s.userData.cityPath = null;
              }
            }
            const goalMoved =
              !s.userData.cityPathGoal ||
              Math.hypot(
                baseGoalX - s.userData.cityPathGoal.x,
                baseGoalZ - s.userData.cityPathGoal.z,
              ) > 80;
            if (
              !s.userData.cityPath?.length ||
              goalMoved ||
              performance.now() > (s.userData.cityPathRefreshAt || 0)
            ) {
              s.userData.cityPath = makeCitySheepPath(
                s.position.x,
                s.position.z,
                baseGoalX,
                baseGoalZ,
              );
              s.userData.cityPathIndex = 0;
              s.userData.cityPathGoal = { x: baseGoalX, z: baseGoalZ };
              s.userData.cityPathRefreshAt = performance.now() + 1100;
            }
            while (
              s.userData.cityPathIndex <
                Math.max(0, s.userData.cityPath.length - 1) &&
              Math.hypot(
                s.position.x -
                  s.userData.cityPath[s.userData.cityPathIndex].x,
                s.position.z -
                  s.userData.cityPath[s.userData.cityPathIndex].z,
              ) < 34
            ) {
              s.userData.cityPathIndex++;
            }
            i =
              s.userData.cityPath[s.userData.cityPathIndex] ||
              closestPointOnCityRoad(baseGoalX, baseGoalZ) ||
              i;
          } else {
            s.userData.cityPath = null;
            s.userData.cityPathIndex = 0;
            s.userData.cityPathGoal = null;
          }
          const r = i,
            c = r.x - s.position.x,
            l = r.z - s.position.z,
            h = Math.hypot(c, l),
            d = (s.userData.recallUntil || 0) > performance.now();
          if (h > 18) {
            const flockRunning = !!K.KeyZ;
            const o =
              (s.userData.fear || 0) > 0.18
                ? 98 + 52 * s.userData.fear
                :
              (s.userData.urgeUntil || 0) > performance.now()
                ? 112
                : flockRunning
                  ? 310
                : d
                  ? 82
                  : 58;
            let moveX = s.position.x;
            let moveZ = s.position.z;
            const desiredAngle = Math.atan2(l, c);
            const turnOrder = followsCityRoad
              ? [0, 0.28, -0.28, 0.52, -0.52, 0.82, -0.82, 1.2, -1.2]
              : [0, 0.48, -0.48, 0.9, -0.9, 1.45, -1.45];
            const clearance = isNearJerusalemWall(s)
              ? 38
              : followsCityRoad
                ? 28
                : 16;
            const openMountain =
              performanceState.onOliveMount && !followsCityRoad;
            const shouldRefreshSteering =
              !openMountain ||
              now >= (s.userData.nextOpenGroundSteerAt || 0);
            let selectedTurn = openMountain
              ? s.userData.cachedOpenGroundTurn || 0
              : 0;
            const turnsToCheck = shouldRefreshSteering
              ? openMountain
                ? turnOrder.slice(0, 5)
                : turnOrder
              : [selectedTurn];
            for (const turn of turnsToCheck) {
              const angle = desiredAngle + turn;
              const fullStepX = Math.cos(angle) * o * e;
              const fullStepZ = Math.sin(angle) * o * e;
              const sweepSteps = Math.max(
                1,
                Math.min(8, Math.ceil(Math.hypot(fullStepX, fullStepZ) / 4)),
              );
              let sweptX = s.position.x;
              let sweptZ = s.position.z;
              let sweptClear = true;
              for (let sweep = 1; sweep <= sweepSteps; sweep++) {
                const candidateX =
                  s.position.x + (fullStepX * sweep) / sweepSteps;
                const candidateZ =
                  s.position.z + (fullStepZ * sweep) / sweepSteps;
                const candidate = Mt.set(
                  candidateX,
                  te(candidateX, candidateZ) + 5,
                  candidateZ,
                );
                if (isSheepBlockedAt(candidate, clearance)) {
                  sweptClear = false;
                  break;
                }
                sweptX = candidateX;
                sweptZ = candidateZ;
              }
              if (sweptClear) {
                moveX = sweptX;
                moveZ = sweptZ;
                selectedTurn = turn;
                break;
              }
            }
            if (openMountain && shouldRefreshSteering) {
              s.userData.cachedOpenGroundTurn = selectedTurn;
              s.userData.nextOpenGroundSteerAt =
                now + 95 + (a % 4) * 17;
            }
            s.position.x = moveX;
            s.position.z = moveZ;
            const u = Math.atan2(-l, c);
            let m =
              t.MathUtils.euclideanModulo(
                u - s.rotation.y + Math.PI,
                2 * Math.PI,
              ) - Math.PI;
            s.rotation.y += m * Math.min(1, 9 * e);
            const f = s.position.distanceTo(s.userData.lastPos || s.position);
            if (
              ((s.userData.stuckTime =
                f < 0.25 ? (s.userData.stuckTime || 0) + e : 0),
              f > 0.8 && (s.userData.rescueAttempts = 0),
              s.userData.stuckTime > (d ? 2.2 : 4.5))
            ) {
              (s.userData.rescueAttempts =
                (s.userData.rescueAttempts || 0) + 1),
                (s.userData.lostSince =
                  s.userData.lostSince || performance.now()),
                Ne();
              const t = (a / Math.max(1, mt.sheep.length)) * Math.PI * 2,
                cityRescue = followsCityRoad
                  ? nearestClearCityRoadPoint(
                      s.position.x,
                      s.position.z,
                      26,
                    )
                  : null,
                e =
                  cityRescue ||
                  _t(
                    n.position.x + 92 * Math.sin(t),
                    n.position.z + 92 * Math.cos(t),
                  );
              s.userData.target.set(e.x, 0, e.z),
                ((followsCityRoad &&
                  s.userData.stuckTime > 1.1 &&
                  s.userData.rescueAttempts >= 2) ||
                  (performance.now() - s.userData.lostSince > 3e4 &&
                    s.userData.rescueAttempts >= 6)) &&
                  (s.position.set(e.x, te(e.x, e.z) + 1, e.z),
                  s.userData.lastPos.copy(s.position),
                  (s.userData.cityPath = null),
                  (s.userData.rescueAttempts = 0),
                  (s.userData.lostSince = 0)),
                (s.userData.stuckTime = 0);
            }
            s.userData.lastPos.copy(s.position);
          } else
            s.userData.target.lengthSq() > 0 &&
              !s.userData.safeHold &&
              (s.userData.target.set(0, 0, 0), (s.userData.recallUntil = 0));
          const p = h > 18;
          updateRiggedAnimalAnimation(
            s,
            p,
            K.KeyZ ? 1 : (s.userData.fear || 0) > 0.18 ? 0.82 : d ? 0.62 : 0.32,
            false,
          );
          if (p && s.userData.legs) {
            const panicking = (s.userData.fear || 0) > 0.18;
            const flockRunning = !!K.KeyZ;
            s.userData.runPhase +=
              e * (flockRunning ? 17.2 : panicking ? 14 : d ? 12 : 8);
            const o =
              Math.sin(s.userData.runPhase) *
              (flockRunning ? 0.72 : panicking ? 0.62 : d ? 0.55 : 0.34);
            (s.userData.legs[0].rotation.z = o),
              (s.userData.legs[3].rotation.z = o),
              (s.userData.legs[1].rotation.z = -o),
              (s.userData.legs[2].rotation.z = -o),
              (s.rotation.z = t.MathUtils.lerp(
                s.rotation.z,
                flockRunning ? -0.08 : panicking ? -0.07 : d ? -0.055 : 0,
                Math.min(1, 7 * e),
              ));
          } else if (s.userData.legs) {
            for (const t of s.userData.legs)
              t.rotation.z *= Math.max(0, 1 - 8 * e);
            s.rotation.z *= Math.max(0, 1 - 8 * e);
          }
          const u = p
            ? Math.abs(Math.sin(2 * (s.userData.runPhase || 0))) *
              (K.KeyZ ? 2.45 : d ? 2.1 : 1.15)
            : 0;
          s.position.y = te(s.position.x, s.position.z) + 1 + u;
        }),
        mt.sheep.some(
          (t) =>
            t.position.distanceTo(n.position) > 680 ||
            (t.userData.stuckTime || 0) > 3.5 ||
            (t.userData.lostSince &&
              performance.now() - t.userData.lostSince > 1800),
        ))
      )
        Ne();
      else {
        nt = !1;
        for (const t of mt.sheep)
          t.position.distanceTo(n.position) < 420 && (t.userData.lostSince = 0);
      }
    })(o, n),
    updateKohen(o),
    updateCityCitizens(o),
    (function (t) {
      j > 0 && (j -= t);
      const e = Yt(mt.player.position.x, mt.player.position.z, -80);
      for (const t of mt.enemies)
        e &&
          "bandit" !== t.userData.type &&
          ((t.userData.hp = 0), Ge(t), i.remove(t));
      const playerInTempleCourt =
        e && isInsideTempleCourt(mt.player.position.x, mt.player.position.z);
      if (playerInTempleCourt && O <= 0) {
        O = Oe(true);
        H = false;
        je("");
      }
      0 === mt.enemies.length &&
        ((O -= t),
        O <= 18 &&
          O > 0 &&
          !H &&
          !playerInTempleCourt &&
          ((H = !0),
          kt("danger"),
          Ut(118, 0.42, 0.055, "sawtooth", -35),
          je(
            e
              ? "성 안에서 강도의 기척이 느껴집니다."
              : "멀리서 맹수의 기척이 느껴집니다.",
            5200,
          )),
        O <= 0 &&
          j <= 0 &&
          !(e && isInsideTempleCourt(mt.player.position.x, mt.player.position.z)) &&
          ((function () {
            const t = mt.player.position,
              e = Yt(t.x, t.z, -80),
              o = Math.random(),
              n = e
                ? "bandit"
                : o < 0.24
                  ? "lion"
                  : o < 0.7
                    ? "wolf"
                    : "fox",
              s =
                "밤" === Ze(ut.worldTime).name
                  ? "wolf" === n
                    ? 3
                    : "fox" === n
                      ? 2
                      : 1
                  : "wolf" === n
                    ? 2
                    : 1,
              a = "wolf" === n ? ++it : 0;
            for (let o = 0; o < s; o++) {
              let s, i, foundStreet = false;
              for (let n = 0; n < 80; n++) {
                const n = Math.random() * Math.PI * 2,
                  a = e
                    ? 360 + 260 * Math.random()
                    : 720 + 420 * Math.random() + 50 * o;
                (s = t.x + Math.sin(n) * a), (i = t.z + Math.cos(n) * a);
                const r = Yt(s, i, -90);
                if (e && r && isBanditStreetPointClear(s, i, 38)) {
                  foundStreet = true;
                  break;
                }
                if (!e && !r) break;
              }
              // Do not create a robber inside geometry when no street point
              // can be resolved around the player in this frame.
              if (e && !foundStreet) continue;
              const r = Pe(n);
              (r.userData.packId = a), r.position.set(s, te(s, i) + 1, i);
            }
            // A city robbery cancels the guard's wanted-star state. Robbers
            // and the guard never share one pursuit state.
            if (e && getActiveCityBandits().length)
              beginCityBanditEmergency();
            kt("danger"),
              Ut(145, 0.65, 0.1, "sawtooth", -45),
              setTimeout(() => Ut(110, 0.7, 0.045, "sawtooth", -25), 180),
              je(
                e
                  ? "성 안에 강도가 나타났습니다."
                  : "성 밖에 야생 동물이 나타났습니다.",
                5200,
              );
          })(),
          (O = 1 / 0)));
      const availableSheep = mt.sheep.filter((sheep) => !sheep.userData.safeHold);
      for (const e of mt.enemies) {
        e.userData.mixer?.update(t);
        if (e.userData.hp <= 0) continue;
        if (
          ("bandit" === e.userData.type) !==
          Yt(e.position.x, e.position.z, -70)
        ) {
          (e.userData.hp = 0), Ge(e), i.remove(e);
          continue;
        }
        if (
          e.userData.type === "bandit" &&
          isInsideTempleCourt(e.position.x, e.position.z, 12)
        ) {
          e.userData.hp = 0;
          Ge(e);
          i.remove(e);
          continue;
        }
        const now = frameNow;
        let o = e.userData.targetEntity;
        const isAnimal = e.userData.type !== "bandit";
        const validSheep = availableSheep;
        const targetInvalid =
          !o ||
          (o !== mt.player && !mt.sheep.includes(o)) ||
          (o !== mt.player && o.userData.safeHold);
        if (targetInvalid || now >= (e.userData.nextTargetAt || 0)) {
          if (isAnimal && validSheep.length && Math.random() < 0.58) {
            o = validSheep[Math.floor(Math.random() * validSheep.length)];
          } else {
            o = mt.player;
          }
          e.userData.targetEntity = o;
          e.userData.nextTargetAt = now + 2500 + Math.random() * 3000;
        }
        if (!o) o = mt.player;
        const banditBlockedByTemple =
          e.userData.type === "bandit" &&
          o === mt.player &&
          isInsideTempleCourt(mt.player.position.x, mt.player.position.z);
        const s = o.position.x - e.position.x,
          a = o.position.z - e.position.z,
          r = Math.hypot(s, a);
        if (e.userData.walkAction)
          e.userData.walkAction.paused = r <= 42 || banditBlockedByTemple;
        if (isAnimal)
          updateRiggedAnimalAnimation(
            e,
            r > 42,
            r > 42 ? Math.min(1, e.userData.speed / 88) : 0,
            r <= 42,
          );
        if (r > 42 && !banditBlockedByTemple) {
          if (e.userData.type === "bandit") {
            moveBanditAlongStreets(e, o, t);
          } else {
            const stepX = (s / r) * e.userData.speed * t;
            const stepZ = (a / r) * e.userData.speed * t;
            const fullX = e.position.x + stepX;
            const fullZ = e.position.z + stepZ;
            if (!jt({ x: fullX, z: fullZ }, 12)) {
              e.position.x = fullX;
              e.position.z = fullZ;
            }
            e.rotation.y = Math.atan2(s, a);
          }
        } else if (o === mt.player) {
          if (!ut.invincible) {
            ut.hp -= 8.5 * t;
            triggerCombatFeedback("damage");
          }
        } else if (isAnimal && now >= (e.userData.nextSheepAttackAt || 0)) {
          damageSheep(o, e);
          e.userData.nextSheepAttackAt = now + 2000;
        }
        e.position.y = te(e.position.x, e.position.z) + 1;
        if (e.userData.type === "bandit" && e.userData.banditRig) {
          const rig = e.userData.banditRig;
          const moving = r > 42 && !banditBlockedByTemple;
          const phase = (e.userData.importedModelPhase +=
            t * (moving ? 8.5 : 2.25));
          Object.values(rig).forEach((entry) => {
            entry.bone.rotation.copy(entry.base);
          });
          const apply = (name, axis, amount) => {
            const entry = rig[name];
            if (entry) entry.bone.rotation[axis] = entry.base[axis] + amount;
          };
          if (moving) {
            const stride = Math.sin(phase) * 0.48;
            apply("L_Thigh", "x", stride);
            apply("R_Thigh", "x", -stride);
            apply("L_Calf", "x", Math.max(0, -stride) * 0.45);
            apply("R_Calf", "x", Math.max(0, stride) * 0.45);
            apply("L_Upperarm", "x", -stride * 0.62);
            apply("R_Upperarm", "x", stride * 0.62);
            apply("Spine01", "z", Math.sin(phase * 0.5) * 0.035);
          } else {
            const threat = Math.sin(phase * 2.1);
            apply("L_Upperarm", "z", -0.42 - threat * 0.16);
            apply("R_Upperarm", "z", 0.42 + threat * 0.16);
            apply("L_Forearm", "x", -0.35 + threat * 0.12);
            apply("R_Forearm", "x", -0.35 - threat * 0.12);
            apply("Spine02", "x", 0.08 + Math.abs(threat) * 0.05);
            apply("Head", "y", threat * 0.08);
          }
        }
      }
    })(o),
    (function (e) {
      for (const o of mt.projectiles) {
        const previousProjectilePosition = o.position.clone();
        if (
          o.userData.specialTarget &&
          (o.userData.specialTarget.userData.hp <= 0 ||
            !mt.enemies.includes(o.userData.specialTarget))
        )
          o.userData.specialTarget = null;
        if (
          o.userData.special &&
          o.userData.specialTarget?.userData.hp > 0
        ) {
          const targetPoint = o.userData.specialTarget.position
            .clone()
            .add(new t.Vector3(0, 28, 0));
          const homingVelocity = targetPoint
            .sub(o.position)
            .normalize()
            .multiplyScalar(1580);
          o.userData.velocity.lerp(homingVelocity, Math.min(1, 18 * e));
        } else {
          o.userData.velocity.y -= 120 * e;
        }
        if (
          (o.position.addScaledVector(o.userData.velocity, e),
          (o.userData.life -= e),
          o.userData.trail)
        ) {
          const t = o.userData.trail.geometry.attributes.position.array;
          for (let e = 9; e > 0; e--)
            (t[3 * e] = t[3 * (e - 1)]),
              (t[3 * e + 1] = t[3 * (e - 1) + 1]),
              (t[3 * e + 2] = t[3 * (e - 1) + 2]);
          (t[0] = o.position.x),
            (t[1] = o.position.y),
            (t[2] = o.position.z),
            (o.userData.trail.geometry.attributes.position.needsUpdate = !0),
            (o.userData.trail.material.opacity = Math.min(
              0.72,
              0.5 * o.userData.life,
            ));
        }
        let n = !1;
        if (o.userData.special) {
          const specialTarget = o.userData.specialTarget;
          if (specialTarget?.userData.hp > 0) {
            const targetPoint = specialTarget.position
              .clone()
              .add(new t.Vector3(0, 28, 0));
            if (o.position.distanceTo(targetPoint) < 65 || o.userData.life <= 0) {
              o.position.copy(targetPoint);
              n = applySpecialSlingImpact(o, specialTarget);
            }
          }
        }
        if (o.userData.special && !o.userData.specialTarget) {
          const travelled = o.position.clone().sub(previousProjectilePosition);
          const travelledLengthSq = travelled.lengthSq();
          for (const animal of mt.enemies) {
            const animalPoint = animal.position
              .clone()
              .add(new t.Vector3(0, 28, 0));
            const closestAmount = travelledLengthSq
              ? t.MathUtils.clamp(
                  animalPoint
                    .clone()
                    .sub(previousProjectilePosition)
                    .dot(travelled) / travelledLengthSq,
                  0,
                  1,
                )
              : 0;
            const closestPoint = previousProjectilePosition
              .clone()
              .addScaledVector(travelled, closestAmount);
            if (
              animal.userData.hp > 0 &&
              animal.userData.type !== "bandit" &&
              closestPoint.distanceTo(animalPoint) < 48
            ) {
              n = applySpecialSlingImpact(o, animal);
              break;
            }
          }
        }
        if (
          (!o.userData.special &&
            at.active &&
            mt.practiceTarget &&
            o.position.distanceTo(
              mt.practiceTarget.position.clone().add(new t.Vector3(0, 108, 0)),
            ) < mt.practiceTarget.userData.hitRadius &&
            ((o.userData.life = 0),
            (at.hit = !0),
            Ae(o.position, "target"),
            eo("과녁 명중!"),
            (n = !0),
            setTimeout(() => re(!0), 240)),
          !n && !o.userData.special)
        )
          for (const t of mt.enemies)
            if (t.userData.hp > 0 && o.position.distanceTo(t.position) < 35) {
              (t.userData.hp -= o.userData.damage),
                (o.userData.life = 0),
                (ut.skill = Math.min(50, ut.skill + 1)),
                Ae(o.position, "enemy"),
                triggerCombatFeedback("hit"),
                eo(t.userData.label + " 명중!"),
                (n = !0),
                t.userData.hp <= 0 && Ue(t);
              break;
            }
        if (!n && !o.userData.special) {
          const guard = mt.southGateGuard;
          if (
            guard &&
            o.position.distanceTo(
              guard.position.clone().add(new t.Vector3(0, 92, 0)),
            ) < guard.userData.hitRadius
          ) {
            o.userData.life = 0;
            hitSouthGateGuard();
            Ae(o.position, "enemy");
            triggerCombatFeedback("hit");
            n = true;
          }
        }
        if (!n && !o.userData.special) {
          for (const citizen of mt.cityCitizens) {
            if (!citizen.userData.entryActive || !citizen.visible) continue;
            const target = citizen.position.clone().add(
              new t.Vector3(0, citizen.userData.bodyHeight * 0.52, 0),
            );
            if (o.position.distanceTo(target) < citizen.userData.hitRadius) {
              o.userData.life = 0;
              hitCityCitizen(citizen);
              Ae(o.position, "enemy");
              triggerCombatFeedback("hit");
              n = true;
              break;
            }
          }
        }
        if (!n && (!o.userData.special || !o.userData.specialTarget)) {
          // Sample the whole travelled segment so fast stones cannot tunnel
          // through thin house fronts or walls between two frames.
          const segmentDistance = previousProjectilePosition.distanceTo(o.position);
          const samples = Math.max(1, Math.ceil(segmentDistance / 16));
          for (let sample = 1; sample <= samples && !n; sample++) {
            const point = previousProjectilePosition.clone().lerp(o.position, sample / samples);
            for (const collider of z) {
              if (
                southernJerusalemUpgrade.projectileColliders.has(collider.type) &&
                colliderBlocksPoint(collider, point, 3)
              ) {
                o.position.copy(point);
                o.userData.life = 0;
                Ae(o.position, "ground");
                n = true;
                break;
              }
            }
          }
        }
        const s = te(o.position.x, o.position.z);
        !n &&
          (!o.userData.special || !o.userData.specialTarget) &&
          o.position.y < s &&
          ((o.position.y = s + 2),
          (o.userData.life = 0),
          Ae(o.position, "ground"));
      }
      (mt.projectiles = mt.projectiles.filter(
        (t) =>
          !(
            t.userData.life <= 0 &&
            (t.userData.trail && i.remove(t.userData.trail), i.remove(t), 1)
          ),
      )),
        (mt.enemies = mt.enemies.filter(
          (t) => !(t.userData.hp <= 0 && (Ge(t), 1)),
        )),
        at.active &&
          !at.hit &&
          at.shotsLeft <= 0 &&
          0 === mt.projectiles.length &&
          setTimeout(() => {
            at.active && re(!1);
          }, 180);
    })(o),
    (function (t) {
      for (const e of mt.effects) {
        e.userData.life -= t;
        const o = 1 - e.userData.life / e.userData.maxLife;
        e.userData.flash.scale.setScalar(1 + 2.5 * o),
          (e.userData.flash.material.opacity = Math.max(0, 1 - 1.35 * o)),
          e.userData.ring.scale.setScalar(1 + 5.5 * o),
          (e.userData.ring.material.opacity = Math.max(0, 0.9 - 1.2 * o));
        for (const n of e.children)
          n.userData.vel &&
            (n.position.addScaledVector(n.userData.vel, t),
            (n.userData.vel.y -= 70 * t),
            (n.material.opacity = Math.max(0, 1 - o)));
      }
      mt.effects = mt.effects.filter(
        (t) => !(t.userData.life <= 0 && (i.remove(t), 1)),
      );
    })(o),
    (function () {
      const t = mt.player;
      if (t)
        for (const e of mt.enemies) {
          const o = e.userData.healthUI;
          if (!o) continue;
          const n = e.position.distanceTo(t.position);
          if (!(e.userData.hp > 0 && n < 520)) {
            o.wrap.style.display = "none";
            continue;
          }
          const s = e.position.clone();
          if (((s.y += 75), s.project(r), s.z < -1 || s.z > 1)) {
            o.wrap.style.display = "none";
            continue;
          }
          const i = (0.5 * s.x + 0.5) * a.clientWidth,
            c = (0.5 * -s.y + 0.5) * a.clientHeight;
          (o.wrap.style.left = i + "px"),
            (o.wrap.style.top = c + "px"),
            (o.wrap.style.display = "block"),
            (o.fill.style.width =
              Math.max(0, (e.userData.hp / e.userData.maxHp) * 100) + "%");
        }
    })(),
    (function (o) {
      if (
        ((function () {
          const t = mt.player?.position;
          if (!t) return;
          const e = q.find((t) => "쉴로악흐" === t.name);
          let o = null;
          Math.hypot(t.x - ft.x, t.z - ft.z) < ft.r + 90
            ? (o = "기혼 샘")
            : e &&
              Math.hypot(t.x - e.x, t.z - e.z) < e.r + 80 &&
              (o = "쉴로악흐"),
            o && vt !== o ? ((vt = o), eo(o)) : o || (vt = null);
        })(),
        Number.isFinite(ut.thirst) || (ut.thirst = 100),
        ut.thirstFailed)
      )
        return;
      const n = mt.player?.position,
        s = n && Kt(n.x, n.z, -40),
        a = mt.sheep.some(
          (t) => Math.hypot(t.position.x - ft.x, t.position.z - ft.z) < ft.r,
        ),
        i = mt.sheep.some((t) =>
          q.some(
            (e) => Math.hypot(t.position.x - e.x, t.position.z - e.z) < e.r,
          ),
        );
      if (s || i)
        return (
          (ut.thirst = 100),
          (ut.lowThirstWarned = !1),
          e("#thirstHud").classList.add("show"),
          void (
            i &&
            !ut.gihonNoticeShown &&
            ((ut.gihonNoticeShown = !0),
            eo(
              a
                ? "양 떼가 기혼 샘의 물을 마셔 갈증을 해소했습니다."
                : "양 떼가 쉴로악흐의 물을 마셔 갈증을 해소했습니다.",
            ))
          )
        );
      i || (ut.gihonNoticeShown = !1),
        (ut.thirst = t.MathUtils.clamp(ut.thirst - o * (100 / 720), 0, 100));
      const r = e("#thirstHud"),
        c = e("#thirstBar"),
        l = e("#thirstValue");
      r.classList.add("show"),
        (c.style.width = ut.thirst + "%"),
        (l.textContent = Math.round(ut.thirst)),
        ut.thirst < 30 &&
          !ut.lowThirstWarned &&
          ((ut.lowThirstWarned = !0),
          eo("양 떼가 심하게 목말라합니다. 다음 물구유를 서둘러 찾으십시오.")),
        ut.thirst > 45 && (ut.lowThirstWarned = !1),
        ut.thirst <= 0 &&
          (ut.thirstFailed ||
            ((ut.thirstFailed = !0),
            (b = !0),
            e("#gameOver").classList.add("mission-fail"),
            (e("#gameOverTitle").textContent = "미션 실패!"),
            (e("#gameOverText").textContent =
              "양 떼가 물을 마시지 못했습니다. 마지막 저장 지점에서 다시 시작하시겠습니까?"),
            e("#gameOver").classList.remove("hidden"),
            document.exitPointerLock?.(),
            setTimeout(() => ke(e("#gameOver"), 0), 0)));
    })(o),
    (function (t, e) {
      mt.templeSmoke &&
        ((mt.templeSmoke.position.x =
          mt.templeSmoke.userData.baseX + 3.5 * Math.sin(0.23 * e)),
        (mt.templeSmoke.position.z =
          mt.templeSmoke.userData.baseZ + 2.8 * Math.cos(0.19 * e)),
        (mt.templeSmoke.scale.x = 1 + 0.055 * Math.sin(0.31 * e)),
        (mt.templeSmoke.scale.z = 1 + 0.045 * Math.cos(0.27 * e)),
        (mt.templeSmoke.material.opacity =
          0.105 + 0.015 * Math.sin(0.21 * e))),
        mt.templeEmber &&
          (mt.templeEmber.material.color.setHSL(
            0.055 + 0.012 * Math.sin(5 * e),
            1,
            0.52,
          ),
          (mt.templeEmber.scale.y = 0.8 + 0.18 * Math.sin(6 * e))),
        mt.templeFlames &&
          mt.templeFlames.children.forEach((t, o) => {
            const n = 5 * e + t.userData.phase;
            (t.scale.y = 0.75 + 0.28 * Math.sin(n)),
              (t.scale.x = 0.9 + 0.12 * Math.cos(0.8 * n)),
            (t.position.y = t.userData.baseY + 2.4 * Math.sin(n)),
              (t.material.opacity = 0.72 + 0.16 * Math.sin(0.7 * n));
          }),
        mt.birds &&
          ((mt.birds.position.x += 10 * t),
          (mt.birds.position.z += 3 * t),
          (mt.birds.position.y = 720 + 28 * Math.sin(0.35 * e)),
          mt.birds.position.x > 1600 && (mt.birds.position.x = -1500));
    })(o, n),
    (function () {
      if (ut.missionDone || ut.thirstFailed || at.active) return;
      const phase = Ze(ut.worldTime).name;
      if (nightWatch.active) {
        const mission = e("#mission");
        if (mission) {
          mission.textContent =
            "이 야영지에 머물며 밤이 끝날 때까지 양 떼를 지키십시오.";
          mission.style.display = "block";
        }
        // The camp marker and goal remain fixed throughout the whole night.
        Z.copy(nightWatch.camp);
        if (phase !== "밤" && nightWatch.lastPhase === "밤") {
          nightWatch.active = !1;
          nightWatch.sheepLocked = !1;
          releaseNightFlockAtCamp();
          nightWatch.lastPhase = phase;
          ut.missionDone = !0;
          eo("새벽이 되었습니다. 양 떼가 야영지에서 다시 이동을 시작합니다.");
          Ke();
        } else {
          nightWatch.lastPhase = phase;
          const playerDistance = Math.hypot(
            mt.player.position.x - nightWatch.camp.x,
            mt.player.position.z - nightWatch.camp.z,
          );
          if (
            playerDistance > 620 &&
            performance.now() - nightWatch.startedAt > 6000
          ) {
            je("야영지에서 너무 멀리 벗어났습니다. 양 떼 곁으로 돌아가십시오.", 3200);
            nightWatch.startedAt = performance.now();
          }
        }
        return;
      }
      let sheepAtCampCount = 0;
      const campCenter = mt.goalSite?.position || Z;
      for (let sheepIndex = 0; sheepIndex < mt.sheep.length; sheepIndex++) {
        const sheep = mt.sheep[sheepIndex];
        if (
          !Number.isFinite(sheep.position.x) ||
          !Number.isFinite(sheep.position.z)
        ) {
          const angle =
            (sheepIndex / Math.max(1, mt.sheep.length)) * Math.PI * 2;
          const repairX = campCenter.x + Math.sin(angle) * 180;
          const repairZ = campCenter.z + Math.cos(angle) * 180;
          sheep.position.set(repairX, te(repairX, repairZ) + 1, repairZ);
          sheep.userData.lastPos.copy(sheep.position);
        }
        const campDistance = Math.hypot(
          sheep.position.x - campCenter.x,
          sheep.position.z - campCenter.z,
        );
        if (campDistance <= 405) sheep.userData.campArrivalCycle = $;
        else if (campDistance > 540) sheep.userData.campArrivalCycle = -1;
        if (sheep.userData.campArrivalCycle === $) sheepAtCampCount++;
      }
      const o = Math.max(1, mt.sheep.length);
      sheepAtCampCount < o && sheepAtCampCount >= Math.max(1, o - 3)
        ? ((et += 1 / 60), et > 2.2 && (Ne(), (et = 0)))
        : (et = 0),
        sheepAtCampCount >= o &&
          ("밤" === phase
            ? ((nightWatch.active = !0),
              nightWatch.camp.copy(Z),
              (nightWatch.startedAt = performance.now()),
              (nightWatch.lastPhase = "밤"),
              (nightWatch.sheepLocked = !0),
              mt.sheep.forEach((sheep) => {
                sheep.userData.nightCampPosition = sheep.position.clone();
                sheep.userData.target?.set?.(0, 0, 0);
                sheep.userData.recallUntil = 0;
                sheep.userData.urgeUntil = 0;
              }),
              // Starting the watch changes only flock state. David, camera,
              // pointer lock and pause state are deliberately untouched.
              (O = Math.min(O, Oe(!0))),
              ne(7e3),
              eo("야영지에 도착했습니다. 이곳에서 밤이 끝날 때까지 양 떼를 지키십시오."))
            : ((ut.missionDone = !0), Ke()));
    })(),
    updateRockRespawns(frameNow),
    mt.sheep.length <= 0 && !ut.flockLost && triggerFlockGameOver(),
    ut.hp <= 0 && !ut.flockLost &&
      ((ut.hp = 0),
      e("#gameOver").classList.remove("mission-fail"),
      (e("#gameOverTitle").textContent = "쓰러졌습니다"),
      (e("#gameOverText").textContent =
        "마지막 저장 지점에서 다시 시작하시겠습니까?"),
      C ||
        ((ut.money = Math.max(0, ut.money - 5)),
        (C = !0),
        eo("맹수에게 패배해 셰켈 5를 빼앗겼습니다.")),
      (b = !0),
      e("#gameOver").classList.remove("hidden"),
      document.exitPointerLock?.(),
      setTimeout(() => ke(e("#gameOver"), 0), 0)),
    frameNow >= performanceState.nextHudAt &&
      ((performanceState.nextHudAt = frameNow + (window.document.body.classList.contains("mobile-device") ? 160 : 100)), $e()),
    (function () {
      const o = e("#crosshair");
      if (!o || frameNow < performanceState.nextTargetLockAt) return;
      performanceState.nextTargetLockAt = frameNow + (window.document.body.classList.contains("mobile-device") ? 110 : 66);
      let n = !1;
      if (G && ut.skill >= 50 && mt.enemies.some((t) => t.userData.hp > 0)) {
        const raycaster = performanceState.targetRaycaster;
        raycaster.setFromCamera(performanceState.targetCenter, r),
          (n = raycaster
            .intersectObjects(mt.enemies, !0)
            .some((t) => t.distance < 1100));
      }
      o.classList.toggle("target-lock", n);
    })(),
    (function () {
      if (frameNow < performanceState.nextMinimapAt) return;
      performanceState.nextMinimapAt = frameNow + (window.document.body.classList.contains("mobile-device") ? 240 : 150);
      const mapWidth = 180,
        mapHeight = 232,
        e = 90,
        mapCenterY = 116,
        mapHalfX = 76,
        mapHalfY = 103;
      s.clearRect(0, 0, mapWidth, mapHeight),
        s.save(),
        s.beginPath(),
        typeof s.roundRect === "function"
          ? s.roundRect(3, 2, mapWidth - 6, mapHeight - 4, 8)
          : s.rect(3, 2, mapWidth - 6, mapHeight - 4),
        s.clip(),
        (s.fillStyle = (() => {
          const parchment = s.createLinearGradient(0, 0, mapWidth, mapHeight);
          parchment.addColorStop(0, "#ead7a5");
          parchment.addColorStop(0.48, "#c6a46b");
          parchment.addColorStop(1, "#e0c58d");
          return parchment;
        })()),
        s.fillRect(0, 0, mapWidth, mapHeight);
      s.save();
      s.globalAlpha = 0.13;
      s.strokeStyle = "#6e4c26";
      s.lineWidth = 0.7;
      for (let fiber = 12; fiber < mapHeight; fiber += 17) {
        s.beginPath();
        s.moveTo(8, fiber + 1.4 * Math.sin(fiber));
        s.bezierCurveTo(
          48,
          fiber - 2,
          124,
          fiber + 2,
          mapWidth - 8,
          fiber - 1,
        );
        s.stroke();
      }
      s.restore();
      const o = mt.player.position,
        n = Math.cos(B),
        a = Math.sin(B),
        i = (t) => {
          const s = t.x - o.x,
            i = t.z - o.z,
            r = s * -n + i * a,
            c = -(s * a + i * n);
          return {
            x: e + (r / W) * mapHalfX,
            z: mapCenterY + (c / W) * mapHalfY,
            dx: s,
            dz: i,
            rx: r,
            rz: c,
          };
        };
      s.fillStyle = "#eee2bc";
      for (const t of mt.sheep) {
        const e = i(t.position);
        Math.hypot(e.dx, e.dz) <= W && s.fillRect(e.x - 1.5, e.z - 1.5, 3, 3);
      }
      s.fillStyle = "#b6302b";
      for (const t of mt.enemies) {
        const e = i(t.position);
        Math.hypot(e.dx, e.dz) <= W && s.fillRect(e.x - 2, e.z - 2, 4, 4);
      }
      s.font = "bold 9px sans-serif";
      for (const t of Ft) {
        const e = i(t),
          o = Math.hypot(e.dx, e.dz);
        // Jerusalem is a permanent landmark: draw its correctly georeferenced
        // wall as soon as any part of the city can enter the minimap radius,
        // even before David crosses a gate.
        const cityReach = Math.max(t.wallRX || t.wallR, t.wallRZ || t.wallR);
        if (o > W + cityReach) continue;
        (s.strokeStyle = "#6a5137"), (s.lineWidth = 2.4), s.beginPath();
        for (let e = 0; e <= 64; e++) {
          const o = (e / 64) * Math.PI * 2,
            n = 1 + 0.045 * Math.sin(3 * o) - 0.025 * Math.cos(5 * o),
            a = i({
              x: t.x + Math.sin(o) * (t.wallRX || t.wallR) * n,
              z: t.z + Math.cos(o) * (t.wallRZ || t.wallR) * n,
            });
          0 === e ? s.moveTo(a.x, a.z) : s.lineTo(a.x, a.z);
        }
        s.closePath(),
          s.stroke(),
          (s.strokeStyle = "#f0dfb7"),
          (s.lineWidth = 3),
          (s.lineCap = "round"),
          (s.lineJoin = "round");
        for (const [e, o, roadWidth] of getCachedMinimapRoads(t)) {
          const n = i({ x: t.x + e[0], z: t.z + e[1] }),
            a = i({ x: t.x + o[0], z: t.z + o[1] });
          s.lineWidth = Math.max(1.5, Math.min(4.8, (roadWidth / W) * 84));
          s.beginPath(), s.moveTo(n.x, n.z), s.lineTo(a.x, a.z), s.stroke();
        }
        // The residential layer and minimap share these exact lot positions.
        // Drawing compact footprints makes the new street blocks legible
        // without turning the minimap into a dense texture.
        if (t.name === "예루샬라임" && southernJerusalemUpgrade.houses.length) {
          s.fillStyle = "#9c7a4f";
          for (const house of southernJerusalemUpgrade.houses) {
            const marker = i({ x: house.x, z: house.z });
            if (Math.hypot(marker.dx, marker.dz) > W) continue;
            s.fillRect(marker.x - 1.4, marker.z - 1.4, 2.8, 2.8);
          }
        }
        const n = [
          [0, t.wallRZ],
          [0, -t.wallRZ],
          [t.wallRX, -120],
        ];
        s.fillStyle = "#7a5a38";
        for (const [e, o] of n) {
          const n = i({ x: t.x + e, z: t.z + o });
          s.fillRect(n.x - 3, n.z - 3, 6, 6);
        }
        o < 1482 &&
          ((s.fillStyle = "#5d4530"), s.fillText(window.ShepherdI18n?.tr(t.name) || t.name, e.x + 5, e.z - 8));
      }
      const r = i({ x: 70, z: yt });
      if (Math.hypot(r.dx, r.dz) <= 2420) {
        (s.strokeStyle = "#8a6a3f"), (s.lineWidth = 3);
        const t = [
          [-650, -520],
          [650, -520],
          [650, 520],
          [-650, 520],
        ];
        s.beginPath(),
          t.forEach(([t, e], o) => {
            const n = i({ x: 70 + t, z: yt + e });
            0 === o ? s.moveTo(n.x, n.z) : s.lineTo(n.x, n.z);
          }),
          s.closePath(),
          s.stroke(),
          dt?.points &&
            ((s.strokeStyle = "#f0dfb7"),
            (s.lineWidth = 4),
            s.beginPath(),
            dt.points.forEach((t, e) => {
              const o = i(t);
              0 === e ? s.moveTo(o.x, o.z) : s.lineTo(o.x, o.z);
            }),
            s.stroke());
      }
      const c = i(Z),
        l = Math.max(1, Math.hypot(c.dx, c.dz)),
        edgeScale = Math.max(1, Math.abs(c.rx) / W, Math.abs(c.rz) / W),
        p = e + (c.rx / W / edgeScale) * mapHalfX,
        u = mapCenterY + (c.rz / W / edgeScale) * mapHalfY,
        d = Math.atan2(u - mapCenterY, p - e);
      (s.strokeStyle = "#f2d35b"),
        (s.lineWidth = 3),
        s.beginPath(),
        s.arc(p, u, 7, 0, 2 * Math.PI),
        s.stroke(),
        l > W &&
          ((s.fillStyle = "#f2d35b"),
          s.beginPath(),
          s.moveTo(p + 8 * Math.cos(d), u + 8 * Math.sin(d)),
          s.lineTo(p + 8 * Math.cos(d + 2.45), u + 8 * Math.sin(d + 2.45)),
          s.lineTo(p + 8 * Math.cos(d - 2.45), u + 8 * Math.sin(d - 2.45)),
          s.closePath(),
          s.fill()),
        (s.fillStyle = "#203b67"),
        s.beginPath(),
        s.moveTo(e, mapCenterY - 17),
        s.lineTo(e - 7, mapCenterY + 8),
        s.lineTo(e + 7, mapCenterY + 8),
        s.closePath(),
        s.fill();
      const m = i({ x: o.x, z: o.z - 100 }),
        f = Math.hypot(m.rx, m.rz) || 1,
        w = m.rx / f,
        M = m.rz / f;
      (s.fillStyle = "#2d241b"),
        (s.font = "bold 12px sans-serif"),
        s.fillText(
          window.ShepherdI18n?.tr("N") || "N",
          e + (mapHalfX - 9) * w - 4,
          mapCenterY + (mapHalfY - 11) * M + 4,
        ),
        s.restore();
    })();
}
function Je(e, o, n) {
  for (let s = 2; s <= 8; s++) {
    const a = s / 10,
      i = e.x + t.MathUtils.lerp(o[0], n[0], a),
      r = e.z + t.MathUtils.lerp(o[1], n[1], a);
    if (jt(new t.Vector3(i, te(i, r) + 4, r), 8) || he(i, r) > 0.72) return !1;
  }
  return !0;
}
function getCachedMinimapRoads(city) {
  if (performanceState.minimapRoadCacheRevision !== collisionRevision) {
    performanceState.minimapVisibleRoads = Xt.filter(([start, end]) =>
      Je(city, start, end),
    );
    performanceState.minimapRoadCacheRevision = collisionRevision;
  }
  return performanceState.minimapVisibleRoads;
}
function Qe() {
  if (!S || b) return;
  const now = performance.now();
  if (n && now - performanceState.lastMobileRenderAt < 30) return;
  performanceState.lastMobileRenderAt = now;
  const rawDelta = l.getDelta();
  performanceState.lastObservedFrameMs = rawDelta * 1000;
  _e(Math.min(0.045, rawDelta), now / 1e3);
  c.render(i, r);
}
function $e() {
  (ut.stones = t.MathUtils.clamp(ut.stones, 0, 25)),
    (ut.respect = t.MathUtils.clamp(ut.respect, 0, 100)),
    (ut.money = t.MathUtils.clamp(ut.money, 0, 1e7)),
    (e("#hpBar").style.width = t.MathUtils.clamp(ut.hp, 0, 100) + "%"),
    (e("#stoneCount").textContent = "돌 " + ut.stones + "/25"),
    (e("#respect").textContent = "존중 " + ut.respect + "/100"),
    (e("#money").textContent =
      ut.money.toLocaleString(
        window.ShepherdI18n?.getLanguage?.() === "he"
          ? "he-IL"
          : window.ShepherdI18n?.getLanguage?.() === "ko"
            ? "ko-KR"
            : "en-US",
      ) + " 셰켈"),
    (function () {
      const e = mt.player;
      if (!e) return;
      let o = e.userData.wealthRobe;
      if (!o) {
        o = new t.Group();
        const n = ge(5973087),
          s = (ge(4069183), ge(13081147)),
          a = new t.Mesh(new t.CylinderGeometry(30, 35, 104, 18, 6), n);
        (a.scale.z = 0.72), (a.position.y = -10), (a.castShadow = !0), o.add(a);
        const i = new t.Mesh(new t.TorusGeometry(17, 3.2, 7, 24), s);
        (i.rotation.x = Math.PI / 2), (i.position.y = 38), o.add(i);
        const r = new t.Mesh(new t.TorusGeometry(34, 2.6, 7, 24), s);
        (r.rotation.x = Math.PI / 2),
          (r.scale.z = 0.72),
          (r.position.y = -62),
          o.add(r);
        const c = new t.Mesh(new t.BoxGeometry(5, 96, 2.4), s);
        c.position.set(0, -12, 25),
          o.add(c),
          (o.visible = !1),
          e.add(o),
          (e.userData.wealthRobe = o);
      }
      o.visible = ut.money >= 5e5;
    })(),
    Re();
}
let to;
function eo(t) {
  const localized = window.ShepherdI18n?.tr?.(t) || t;
  (e("#notice").innerText = localized),
    clearTimeout(to),
    (to = setTimeout(() => (e("#notice").innerText = ""), 2800));
}
function isUsableSaveRecord(record) {
  if (!record || typeof record !== "object") return !1;
  if (record.schemaVersion && record.schemaVersion > SAVE_SCHEMA_VERSION) return !1;
  const player = record.player;
  return !!(
    record.state &&
    typeof record.state === "object" &&
    player &&
    Number.isFinite(Number(player.x)) &&
    Number.isFinite(Number(player.z))
  );
}
function openSaveDatabase() {
  if (saveDatabasePromise) return saveDatabasePromise;
  if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB unavailable"));
  saveDatabasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(SAVE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SAVE_DB_STORE))
        database.createObjectStore(SAVE_DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
    request.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
  return saveDatabasePromise;
}
async function readIndexedGameSave() {
  const database = await openSaveDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SAVE_DB_STORE, "readonly");
    const request = transaction.objectStore(SAVE_DB_STORE).get(SAVE_DB_SLOT);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("IndexedDB read failed"));
  });
}
async function writeIndexedGameSave(record) {
  const database = await openSaveDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SAVE_DB_STORE, "readwrite");
    transaction.objectStore(SAVE_DB_STORE).put(record, SAVE_DB_SLOT);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB write failed"));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB write aborted"));
  });
}
async function deleteIndexedGameSave() {
  try {
    const database = await openSaveDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(SAVE_DB_STORE, "readwrite");
      transaction.objectStore(SAVE_DB_STORE).delete(SAVE_DB_SLOT);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB delete failed"));
    });
  } catch (error) {
    console.warn("Indexed save deletion skipped:", error);
  }
}
const saveStorageReadyPromise = (async () => {
  try {
    const record = await readIndexedGameSave();
    if (isUsableSaveRecord(record)) indexedSaveCache = record;
  } catch (error) {
    console.info("Indexed save fallback unavailable:", error);
  } finally {
    refreshContinueAvailability();
  }
})();
async function ensureSaveStorageReady() {
  await saveStorageReadyPromise;
}
function readStoredGameSave() {
  for (const key of [SAVE_PRIMARY_KEY, SAVE_BACKUP_KEY]) {
    try {
      const encoded = localStorage.getItem(key);
      if (!encoded) continue;
      const record = JSON.parse(encoded);
      if (isUsableSaveRecord(record)) return record;
    } catch (error) {
      console.warn(`저장 데이터 읽기 실패 (${key}):`, error);
    }
  }
  return isUsableSaveRecord(indexedSaveCache) ? indexedSaveCache : null;
}
function refreshContinueAvailability() {
  const button = e("#continueBtn");
  if (!button) return;
  const available = !!readStoredGameSave();
  button.disabled = !available;
  button.setAttribute("aria-disabled", String(!available));
}
function clearStoredGameSave() {
  try {
    localStorage.removeItem(SAVE_PRIMARY_KEY);
    localStorage.removeItem(SAVE_BACKUP_KEY);
  } catch (error) {
    console.warn("저장 데이터 삭제 실패:", error);
  }
  indexedSaveCache = null;
  deleteIndexedGameSave();
  refreshContinueAvailability();
}
function buildSaveRecord() {
  const state = {
    hp: ut.hp,
    stones: ut.stones,
    quality: ut.quality,
    money: ut.money,
    respect: ut.respect,
    invincible: !!ut.invincible,
    skill: ut.skill,
    missionDone: !!ut.missionDone,
    cheatUsed: !!ut.cheatUsed,
    thirst: ut.thirst,
    worldTime: ut.worldTime,
  };
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    version: Wt,
    savedAt: Date.now(),
    language: window.ShepherdI18n?.getLanguage?.() || "en",
    state,
    weapon: L,
    cameraMode: A,
    view: { yaw: B, pitch: I },
    missionCycle: $,
    goal: { x: Z.x, z: Z.z },
    player: {
      x: mt.player.position.x,
      z: mt.player.position.z,
      rotationY: mt.player.rotation.y,
    },
    sheep: mt.sheep.map((sheep) => ({
      x: sheep.position.x,
      z: sheep.position.z,
      hp: Number.isFinite(sheep.userData.hp) ? sheep.userData.hp : 100,
    })),
    route: {
      id: routeChoice.id,
      name: routeChoice.name,
      spawnMultiplier: routeChoice.spawnMultiplier,
      rewardRespect: routeChoice.rewardRespect,
    },
  };
}
let saveStatusTimer = 0;
function showPauseSaveStatus(message, failed = !1) {
  const status = e("#saveStatus");
  if (!status) return;
  status.textContent = window.ShepherdI18n?.tr?.(message) || message;
  status.classList.toggle("error", failed);
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => {
    status.textContent = "";
    status.classList.remove("error");
  }, 2600);
}
function oo(silent = !1) {
  if (!S || !mt.player || ut.flockLost) return !1;
  try {
    const record = buildSaveRecord();
    const encoded = JSON.stringify(record);
    let localSaveSucceeded = false;
    try {
      localStorage.setItem(SAVE_BACKUP_KEY, encoded);
      localStorage.setItem(SAVE_PRIMARY_KEY, encoded);
      if (localStorage.getItem(SAVE_PRIMARY_KEY) !== encoded)
        throw new Error("저장소 확인값이 일치하지 않습니다.");
      localSaveSucceeded = true;
    } catch (localError) {
      console.warn("Local save unavailable; using IndexedDB fallback:", localError);
    }
    indexedSaveCache = record;
    if ("indexedDB" in window)
      writeIndexedGameSave(record).catch((error) =>
        console.warn("Indexed save backup failed:", error),
      );
    if (!localSaveSucceeded && !("indexedDB" in window))
      throw new Error("사용 가능한 브라우저 저장소가 없습니다.");
    refreshContinueAvailability();
    if (!silent) {
      eo("저장되었습니다.");
      showPauseSaveStatus("저장 완료");
    }
    return !0;
  } catch (error) {
    console.error("게임 저장 실패:", error);
    if (!silent) {
      eo("저장하지 못했습니다. 브라우저의 사이트 데이터 허용 여부를 확인해 주세요.");
      showPauseSaveStatus("저장 실패", !0);
    }
    return !1;
  }
}
function restoreSavedSheep(savedSheep, playerPosition) {
  if (!Array.isArray(savedSheep)) return;
  const entries = savedSheep
    .filter((sheep) => sheep && Number.isFinite(Number(sheep.x)) && Number.isFinite(Number(sheep.z)))
    .slice(0, 50);
  while (mt.sheep.length > entries.length) {
    const sheep = mt.sheep.pop();
    sheep?.parent?.remove(sheep);
  }
  while (mt.sheep.length < entries.length) Se(mt.sheep.length);
  entries.forEach((saved, index) => {
    const fallbackX = playerPosition.x + (index % 4) * 55;
    const fallbackZ = playerPosition.z - 120 + 62 * Math.floor(index / 4);
    const savedX = Number(saved.x);
    const savedZ = Number(saved.z);
    const safe = _t(
      Number.isFinite(savedX) ? savedX : fallbackX,
      Number.isFinite(savedZ) ? savedZ : fallbackZ,
    );
    const sheep = mt.sheep[index];
    sheep.position.set(safe.x, te(safe.x, safe.z) + 22, safe.z);
    const savedHp = Number(saved.hp);
    sheep.userData.hp = t.MathUtils.clamp(Number.isFinite(savedHp) ? savedHp : 100, 1, 100);
    sheep.userData.lastPos.copy(sheep.position);
  });
}
function savedNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function no() {
  const saved = readStoredGameSave();
  if (!saved) return refreshContinueAvailability(), !1;
  try {
    const state = saved.state || {};
    ut.hp = t.MathUtils.clamp(savedNumber(state.hp, 100), 1, 100);
    ut.stones = t.MathUtils.clamp(savedNumber(state.stones, 0), 0, 25);
    ut.quality = ["거친 돌", "둥근 돌", "좋은 돌", "큰 돌"].includes(state.quality)
      ? state.quality
      : "좋은 돌";
    ut.money = t.MathUtils.clamp(savedNumber(state.money, 0), 0, 1e7);
    ut.respect = t.MathUtils.clamp(savedNumber(state.respect, 0), 0, 100);
    ut.invincible = !!state.invincible;
    ut.skill = t.MathUtils.clamp(savedNumber(state.skill, 0), 0, 50);
    ut.missionDone = !!state.missionDone;
    ut.cheatUsed = !!state.cheatUsed;
    ut.thirst = t.MathUtils.clamp(savedNumber(state.thirst, 100), 0, 100);
    ut.worldTime = Number.isFinite(Number(state.worldTime))
      ? ((Number(state.worldTime) % 1) + 1) % 1
      : 0.29;
    ut.thirstFailed = !1;
    ut.flockLost = !1;
    L = ["sling", "staff"].includes(saved.weapon) ? saved.weapon : "sling";
    A = IS_MOBILE_DEVICE
      ? 3
      : Number.isInteger(saved.cameraMode)
        ? t.MathUtils.clamp(saved.cameraMode, 0, 3)
        : 0;
    $ = t.MathUtils.clamp(Math.floor(savedNumber(saved.missionCycle, 1)), 1, 1e6);
    if (saved.goal && Number.isFinite(Number(saved.goal.x)) && Number.isFinite(Number(saved.goal.z))) {
      Z.set(Number(saved.goal.x), 0, Number(saved.goal.z));
      if (
        Ft.some((city) => Math.hypot(Z.x - city.x, Z.z - city.z) < city.r + 300) ||
        he(Z.x, Z.z) > 0.65
      )
        Z.set(-1150, 0, 1050);
      ce();
    }
    const player = saved.player || qt;
    const placedPlayer = Jt(Number(player.x), Number(player.z));
    if (Number.isFinite(Number(player.rotationY))) mt.player.rotation.y = Number(player.rotationY);
    if (saved.view) {
      if (Number.isFinite(Number(saved.view.yaw))) B = Number(saved.view.yaw);
      if (Number.isFinite(Number(saved.view.pitch))) I = t.MathUtils.clamp(Number(saved.view.pitch), -1.25, 0.62);
    }
    if (IS_MOBILE_DEVICE) {
      I = -Math.PI / 4;
      B = Number.isFinite(Number(player.rotationY)) ? Number(player.rotationY) : B;
      mobileInput.movementYaw = B;
    }
    restoreSavedSheep(saved.sheep, placedPlayer);
    if (saved.route && typeof saved.route === "object") {
      routeChoice.id = typeof saved.route.id === "string" ? saved.route.id : "";
      routeChoice.name = typeof saved.route.name === "string" ? saved.route.name : "";
      routeChoice.spawnMultiplier = t.MathUtils.clamp(savedNumber(saved.route.spawnMultiplier, 1), 0.5, 3);
      routeChoice.rewardRespect = t.MathUtils.clamp(savedNumber(saved.route.rewardRespect, 0), 0, 10);
    }
    $e();
    Re();
    oo(!0);
    return !0;
  } catch (error) {
    console.error("게임 불러오기 실패:", error);
    return !1;
  }
}
refreshContinueAvailability();
window.addEventListener("gamedistribution:pause", () => {
  if (distributionAdPauseActive) return;
  distributionAdPauseActive = true;
  distributionWasPausedBeforeAd = b;
  b = true;
  Object.keys(K).forEach((key) => (K[key] = false));
  resetMobileMovement();
  mobileInput.running = false;
  G = false;
  P = false;
  updateMobileCharge(0);
  pauseAllGameAudio();
  document.exitPointerLock?.();
});
window.addEventListener("gamedistribution:resume", () => {
  if (!distributionAdPauseActive) return;
  distributionAdPauseActive = false;
  if (!distributionWasPausedBeforeAd && (!n || innerWidth >= innerHeight)) {
    b = false;
    Bt();
  }
  updateOrientationGate();
});
addEventListener("pagehide", () => oo(!0));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") oo(!0);
});
addEventListener("shepherd:before-language-change", () => oo(!0));
