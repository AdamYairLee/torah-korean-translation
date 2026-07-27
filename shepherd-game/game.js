import * as t from "./three.module.js";
import { FBXLoader } from "./FBXLoader.js";
import { clone as cloneSkinnedModel } from "./SkeletonUtils.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { JERUSALEM_DATA } from "./jerusalemData.js";
import { createDavidModel } from "./davidModel.js";
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
  n =
    /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) && Math.min(screen.width, screen.height) < 1e3;
e("#mobileBlock").classList.toggle("hidden", !n);
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
  currentPixelRatio: 0,
  hiddenCameraMeshes: [],
  occlusionRaycaster: new t.Raycaster(),
  targetRaycaster: new t.Raycaster(),
  targetCenter: new t.Vector2(0, 0),
  onOliveMount: false,
};
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
let Z = new t.Vector3(-1150, 0, 1050),
  Y = "",
  templeObjText = "",
  templeObjPromise = null,
  templeAltarPromise = null,
  firstTempleModelPromise = null,
  firstTempleModelTemplate = null,
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
  oliveTreeModelPromise = null,
  oliveTreeModelTemplate = null,
  datePalmModelPromise = null,
  datePalmModelTemplate = null,
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
  playerWasInsideJerusalem = !1;
const nightWatch = {
  active: !1,
  camp: new t.Vector3(),
  startedAt: 0,
  lastPhase: "",
  sheepLocked: !1,
};
const lightingPerformance = {
  nextTorchUpdateAt: 0,
  maxLocalPointLights: 3,
  torchLightDistance: 760,
  torchVisualDistance: 2100,
  sunShadowEnabled: true,
};
const combatFeedback = {
  shakeUntil: 0,
  shakeDuration: 0,
  shakeStrength: 0,
  lastDamagePulseAt: 0,
};
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
    aimRig: null,
    jordan: null,
    deadSea: null,
    gihon: null,
    practiceTarget: null,
    cityTorches: [],
    staffNightLight: null,
    templeNightLight: null,
    stars: null,
    datePalmGrove: null,
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
(e("#startBtn").onclick = () => {
  Dt("characterScreen");
}),
  (e("#continueBtn").onclick = () => {
    At(!0);
  }),
  (e("#playBtn").onclick = () => {
    At(!1);
  }),
  (e("#davidCard").onclick = () => {
    At(!1);
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
    e("#settingsPanel").classList.remove("hidden"),
    S && ((b = !0), document.exitPointerLock?.()),
    setTimeout(() => ke(e("#settingsPanel"), 0), 0);
}
function Tt() {
  e("#settingsPanel").classList.add("hidden");
  const t = "1" === e("#settingsPanel").dataset.fromPause;
  S &&
    (t
      ? (e("#pause").classList.remove("hidden"), (b = !0))
      : ((b = !1), c?.domElement.requestPointerLock?.()));
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
    new Audio("./assets/audio/sheep5.mp3"),
    new Audio("./assets/audio/sheep6.mp3"),
    new Audio("./assets/audio/sheep7.mp3"),
    new Audio("./assets/audio/sheep8.mp3"),
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
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d", { alpha: false });
  const image = ctx.createImageData(512, 512);
  let seed = 18437;
  const rnd = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const large =
        0.5 +
        0.22 * Math.sin(x * 0.032 + y * 0.018) +
        0.16 * Math.cos(x * 0.014 - y * 0.027);
      const fine = rnd() - 0.5;
      const gravel = rnd() > 0.965 ? -34 - 28 * rnd() : 0;
      const pale = rnd() > 0.982 ? 28 + 22 * rnd() : 0;
      const shade = 0.56 * large + 0.44 * fine;
      const i = 4 * (y * 512 + x);
      image.data[i] = Math.max(
        68,
        Math.min(196, 142 + 31 * shade + gravel + pale),
      );
      image.data[i + 1] = Math.max(
        58,
        Math.min(171, 116 + 24 * shade + gravel * 0.72 + pale * 0.7),
      );
      image.data[i + 2] = Math.max(
        44,
        Math.min(142, 78 + 18 * shade + gravel * 0.48 + pale * 0.48),
      );
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 1350; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 0.45 + rnd() * 2.2;
    const v = 72 + Math.floor(rnd() * 92);
    ctx.fillStyle = `rgb(${v + 18},${v + 2},${Math.max(42, v - 28)})`;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      r * (1.2 + rnd()),
      r * (0.45 + rnd() * 0.45),
      rnd() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const texture = new t.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = t.RepeatWrapping;
  texture.repeat.set(42, 42);
  texture.colorSpace = t.SRGBColorSpace;
  texture.anisotropy = Math.min(8, c?.capabilities?.getMaxAnisotropy?.() || 1);
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
function addPreparedTempleAltar(parent, courtY, fallbackAltar, fallbackRamp) {
  if (templeAltarPromise) return templeAltarPromise;
  templeAltarPromise = new GLTFLoader()
    .loadAsync("./assets/models/temple_altar_square.glb")
    .then((gltf) => {
      const altar = gltf.scene;
      altar.name = "PreparedSquareTempleAltar";
      // The cleaned source altar body is 0.60 x 0.794 units. Scale each
      // horizontal axis independently so the actual body is 170 x 170 in-game,
      // then turn its stair run toward the existing southern approach.
      altar.scale.set(283.3, 466.7, 214.1);
      altar.rotation.y = -Math.PI / 2;
      altar.position.set(205, courtY + 2, 34);
      altar.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;
        child.userData.neverOcclude = true;
        if (child.material) {
          child.material.roughness = Math.max(child.material.roughness ?? 0.8, 0.72);
          child.material.metalness = Math.min(child.material.metalness ?? 0, 0.08);
        }
      });
      // The former full-size closure box produced a huge exposed brown wall,
      // and projecting the scanned material onto that box corrupted its UVs.
      // Never use a second full altar body as a visual repair layer.
      fallbackAltar.visible = false;
      parent.add(altar);
      mt.templeAltarModel = altar;
      fallbackRamp.visible = false;

      // Repair only the two genuinely open parts of the scan.  Use one continuous
      // masonry surface instead of rows of plain temporary-looking boxes.
      const brickCanvas = document.createElement("canvas");
      brickCanvas.width = 512;
      brickCanvas.height = 512;
      const brickContext = brickCanvas.getContext("2d");
      brickContext.fillStyle = "#b99d70";
      brickContext.fillRect(0, 0, 512, 512);
      const rows = 8;
      const rowHeight = 512 / rows;
      const brickWidth = 128;
      for (let row = 0; row < rows; row++) {
        const y = row * rowHeight;
        const offset = row % 2 ? -brickWidth / 2 : 0;
        for (let x = offset; x < 512; x += brickWidth) {
          const shade = 166 + ((row * 19 + Math.round(x)) % 23);
          brickContext.fillStyle = `rgb(${shade + 19},${shade + 1},${shade - 31})`;
          brickContext.fillRect(x + 3, y + 3, brickWidth - 6, rowHeight - 6);
          brickContext.strokeStyle = "rgba(92,70,43,0.38)";
          brickContext.lineWidth = 3;
          brickContext.strokeRect(x + 3, y + 3, brickWidth - 6, rowHeight - 6);
          brickContext.fillStyle = "rgba(255,239,201,0.14)";
          brickContext.fillRect(x + 7, y + 7, brickWidth - 14, 5);
        }
      }
      const brickTexture = new t.CanvasTexture(brickCanvas);
      brickTexture.colorSpace = t.SRGBColorSpace;
      brickTexture.wrapS = t.RepeatWrapping;
      brickTexture.wrapT = t.RepeatWrapping;
      brickTexture.repeat.set(2.25, 1.25);
      brickTexture.anisotropy = 4;
      const repairMaterial = new t.MeshToonMaterial({
        color: 0xffffff,
        map: brickTexture,
      });
      const repairGroup = new t.Group();
      repairGroup.name = "AltarLocalStoneRepairs";
      repairGroup.userData.neverOcclude = true;

      // Solid walkable centre below the fire: closes the empty-looking upper well.
      const topInfill = new t.Mesh(
        new t.BoxGeometry(132, 8, 122),
        repairMaterial,
      );
      topInfill.position.set(205, courtY + 105, -2);
      topInfill.castShadow = true;
      topInfill.receiveShadow = true;
      topInfill.userData.neverOcclude = true;
      repairGroup.add(topInfill);

      // One complete rear wall face fills the scan opening edge-to-edge.  It stays
      // inset inside the altar footprint and cannot protrude across the court.
      const rearWall = new t.Mesh(
        new t.BoxGeometry(150, 88, 6),
        repairMaterial,
      );
      rearWall.position.set(205, courtY + 48, -78);
      rearWall.castShadow = true;
      rearWall.receiveShadow = true;
      rearWall.userData.neverOcclude = true;
      repairGroup.add(rearWall);
      parent.add(repairGroup);
      mt.templeAltarRepairs = repairGroup;
      return altar;
    })
    .catch((error) => {
      console.error("정리된 성전 제단 모델 적용 실패:", error);
      return null;
    });
  return templeAltarPromise;
}

async function At(e) {
  await Promise.all([
    Y
      ? Promise.resolve()
      : (_ ||
          (_ = fetch("./assets/models/david_lowpoly.obj")
            .then((t) => {
              if (!t.ok) throw new Error(`David OBJ ${t.status}`);
              return t.text();
            })
            .then((t) => {
              Y = t;
            })
            .catch((t) => {
              console.error("다비드 OBJ 로드 실패:", t), (Y = "");
            })),
        _),
    loadFirstTempleModel().catch(() => null),
    // Decode the larger predator assets on the loading screen. Loading and
    // parsing them only when an enemy first appears causes a noticeable
    // one-time hitch during active play.
    loadLionModel().catch(() => null),
    loadFoxModel().catch(() => null),
    loadWolfModel().catch(() => null),
    loadSheepModel().catch(() => null),
    loadBanditModel().catch(() => null),
    loadOliveTreeModel().catch(() => null),
    loadDatePalmModel().catch(() => null),
  ]),
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
    c ||
      (function () {
        (i = new t.Scene()),
          (i.background = new t.Color(12175815)),
          (i.fog = new t.FogExp2(13154717, 34e-5)),
          (r = new t.PerspectiveCamera(
            58,
            innerWidth / innerHeight,
            0.1,
            15e3,
          )),
          (c = new t.WebGLRenderer({
            antialias: !0,
            powerPreference: "high-performance",
          })),
          c.setPixelRatio(Math.min(devicePixelRatio, 1.05)),
          c.setSize(innerWidth, innerHeight),
          (c.shadowMap.enabled = !0),
          (c.shadowMap.type = t.BasicShadowMap),
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
          (e.castShadow = !0),
          e.shadow.mapSize.set(1024, 1024),
          (e.shadow.camera.left = -1300),
          (e.shadow.camera.right = 1300),
          (e.shadow.camera.top = 1300),
          (e.shadow.camera.bottom = -1300),
          i.add(e),
          (function () {
            const e = new t.SphereGeometry(5200, 32, 18),
              o = new t.ShaderMaterial({
                side: t.BackSide,
                depthWrite: !1,
                uniforms: {
                  top: { value: new t.Color(9416376) },
                  middle: { value: new t.Color(14207406) },
                  bottom: { value: new t.Color(15258797) },
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
            const starCount = 520,
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
              s = new t.Color(11047023),
              a = new t.Color(13219988),
              r = new t.Color(10982774),
              c = new t.Color(9008734),
              l = new t.Color(9598812),
              h = new t.Color(14208432),
              d = new t.Color(7299668),
              p = new t.Color(14668211),
              u = new t.Color(9069128);
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
            const f = new t.MeshToonMaterial({
                vertexColors: !0,
                flatShading: !0,
                map: m,
                gradientMap: xe(),
                roughness: 1,
              }),
              w = new t.Mesh(e, f);
            (w.receiveShadow = !0),
              i.add(w),
              (mt.terrain = w),
              (function () {
                const e = ee(210041),
                  o = [ge(9269845), ge(11111269), ge(12624501), ge(7495500)];
                for (let n = 0; n < 1250; n++) {
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
                  e.add(a), Ot(n + i, s + r, 468, 259.2, 0, "palace");
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
                    // Authored altar/fire-volume coordinates after the purchased
                    // model is rotated to face east.
                    altarX: n + a + 255,
                    altarZ: s + i - 265,
                    altarHalfX: 92,
                    altarHalfZ: 92,
                    altarTopY: d + 107,
                    altarRampXMin: n + a + 163,
                    altarRampXMax: n + a + 347,
                    altarRampZMin: s + i - 173,
                    altarRampZMax: s + i - 70,
                    templeStageXMin: n + a - 20,
                    templeStageXMax: n + a + 290,
                    templeStageZMin: s + i - 210,
                    templeStageZMax: s + i + 150,
                    templeStageTopY: d + 55,
                    templeStageRampXMin: n + a + 290,
                    templeStageRampXMax: n + a + 410,
                    templeStageRampZMin: s + i - 145,
                    templeStageRampZMax: s + i + 85,
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
                  const m = 170,
                    f = 40,
                    w = 196;
                  // Temple enclosure walls leave broad circulation lanes at the north-west
                  // and north-east corners. This keeps the Jerusalem north gate connected
                  // to both sides of the Temple Mount instead of trapping the player.
                  for (const [e, n, s, a] of [
                    [0, -520, 1060, f],
                    [0, l, 1300, f],
                    // Shortened western wall: leaves a broad north-west alley from
                    // Jerusalem's north gate into the Temple Mount circulation area.
                    [-650, 250, f, 360],
                  ]) {
                    const i = new t.Mesh(new t.BoxGeometry(s, m, a), o[1]);
                    i.position.set(e, d + 85, n), (i.castShadow = !0), r.add(i);
                  }
                  // Complete eastern enclosure wall, split only at the gate opening.
                  for (const [wallZ, wallDepth] of [[330, 260], [-330, 260]]) {
                    const n = new t.Mesh(new t.BoxGeometry(f, m, wallDepth), o[1]);
                    n.position.set(c, d + 85, wallZ), r.add(n);
                  }
                  // Close the two gaps that used to remain between the gate piers
                  // and the eastern enclosure wall.  Together these pieces leave
                  // only the actual doorway opening at the centre.
                  for (const wallZ of [-149, 149]) {
                    const n = new t.Mesh(new t.BoxGeometry(f, m, 102), o[1]);
                    n.position.set(c, d + 85, wallZ);
                    n.castShadow = true;
                    n.receiveShadow = true;
                    r.add(n);
                  }
                  const M = new t.Mesh(new t.BoxGeometry(60, 72, w), o[2]);
                  M.position.set(c, d + m + 10, 0), r.add(M);
                  for (const gateZ of [-76, 76]) {
                    const pier = new t.Mesh(new t.BoxGeometry(60, m, 44), o[1]);
                    pier.position.set(c, d + m / 2, gateZ);
                    pier.castShadow = true;
                    pier.receiveShadow = true;
                    r.add(pier);
                  }
                  const templeEntryLip = new t.Mesh(
                    new t.BoxGeometry(30, 4, w - 40),
                    templeMarble,
                  );
                  templeEntryLip.position.set(c - 20, d + 2, 0),
                    (templeEntryLip.receiveShadow = !0),
                    r.add(templeEntryLip),
                    de(r, 1080, d + m, 0, -460, 0, o[2], 34, -20),
                    de(r, 1080, d + m, 0, l, 0, o[2], 34, 20),
                    de(r, 920, d + m, -540, 0, Math.PI / 2, o[2], 34, -20);
                    // The former court-enclosure collision is intentionally gone.
                    // The purchased model is used without its obsolete perimeter wall,
                    // leaving the Temple Mount open on every side. Only the sanctuary
                    // body and altar below register collision.
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
                  // Height-aware side collision prevents entering the altar body from
                  // ground level while allowing David to stand and move on its top.
                  Ot(n + a + b - 92, s + i + altarLocalZ, 12, 184, 0, "temple", d + 2, T);
                  Ot(n + a + b + 92, s + i + altarLocalZ, 12, 184, 0, "temple", d + 2, T);
                  Ot(n + a + b, s + i + altarLocalZ - 92, 184, 12, 0, "temple", d + 2, T);
                  // Close the rear corners as well. The opening is only on the
                  // southern stair side; no ground-level pocket remains behind
                  // the altar where the player can become trapped.
                  Ot(n + a + b - 76, s + i + altarLocalZ - 99, 32, 28, 0, "temple", d + 2, T);
                  Ot(n + a + b + 76, s + i + altarLocalZ - 99, 32, 28, 0, "temple", d + 2, T);
                  // Stair flanks are blocked, while the full southern stair face stays open.
                  Ot(n + a + b - 92, s + i + altarLocalZ + 137, 12, 90, 0, "temple", d + 2, T);
                  Ot(n + a + b + 92, s + i + altarLocalZ + 137, 12, 90, 0, "temple", d + 2, T);
                  // Replace every hidden procedural visual with the purchased model
                  // before creating live effects. Fire, smoke and the laver are added
                  // afterwards so loading the temple can never hide them again.
                  addPurchasedFirstTemple(r, d, n + a, s + i);
                  const V = new t.Group();
                  // Flame spread is derived from the current altar footprint, so it
                  // remains centred and proportionate if the court is resized again.
                  const flameSpreadX = dt.altarHalfX * 0.46;
                  const flameSpreadZ = dt.altarHalfZ * 0.28;
                  const altarFireY = d + 82;
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
                for (let n = 0; n < 18; n++) {
                  const s = (n / 18) * Math.PI * 2;
                  if (Math.abs(Math.sin(s)) < 0.2 && Math.cos(s) < 0) continue;
                  const a = new t.Mesh(new t.BoxGeometry(38, 22, 18), o);
                  a.position.set(155 * Math.sin(s), 11, 120 * Math.cos(s)),
                    (a.rotation.y = s),
                    (a.castShadow = !0),
                    e.add(a);
                }
                const s = new t.Mesh(new t.ConeGeometry(72, 68, 4), n);
                (s.rotation.y = Math.PI / 4),
                  s.position.set(205, 34, 35),
                  (s.castShadow = !0),
                  e.add(s),
                  ze(e, 2.6, 3.5, 78, [205, 39, 35], 6833192, 6);
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
                const M = new t.Group();
                ve(M, [94, 12, 10], [0, 6, -25], 10324329),
                  ve(M, [94, 12, 10], [0, 6, 25], 10324329),
                  ve(M, [10, 12, 50], [-42, 6, 0], 10324329),
                  ve(M, [10, 12, 50], [42, 6, 0], 10324329);
                const y = new t.Mesh(
                  new t.PlaneGeometry(74, 38),
                  new t.MeshToonMaterial({
                    color: 7314849,
                    transparent: !0,
                    opacity: 0.88,
                    side: t.DoubleSide,
                  }),
                );
                (y.rotation.x = -Math.PI / 2),
                  (y.position.y = 9),
                  M.add(y),
                  M.position.set(-220, 0, 62),
                  e.add(M);
                const x = new t.Group();
                ve(x, [92, 9, 9], [0, 11, -22], 7491631),
                  ve(x, [92, 9, 9], [0, 11, 22], 7491631),
                  ve(x, [8, 24, 8], [-38, 0, -18], 6833192),
                  ve(x, [8, 24, 8], [38, 0, -18], 6833192),
                  ve(x, [8, 24, 8], [-38, 0, 18], 6833192),
                  ve(x, [8, 24, 8], [38, 0, 18], 6833192);
                const g = new t.Mesh(new t.BoxGeometry(72, 8, 31), ge(7897939));
                (g.position.y = 12),
                  x.add(g),
                  x.position.set(-220, 0, -55),
                  e.add(x);
                for (let n = 0; n < 4; n++) {
                  const s = new t.Mesh(
                    new t.DodecahedronGeometry(18 - 3 * n, 0),
                    o,
                  );
                  s.position.set(0, 14 + 18 * n, -155),
                    (s.castShadow = !0),
                    e.add(s);
                }
                i.add(e), (mt.goalSite = e), ce();
              })(),
              ce();
          })(),
          (function () {
            mt.aimRig && r.remove(mt.aimRig);
            const e = new t.Group(),
              o = ge(10983027),
              n = ge(12089427),
              s = ge(5914409),
              a = new t.LineBasicMaterial({ color: 7754293 }),
              i = new t.Mesh(new t.CylinderGeometry(4.2, 5.2, 34, 7), o);
            (i.rotation.z = Math.PI / 2),
              i.position.set(11, -16, -43),
              (i.visible = !1),
              e.add(i);
            const c = new t.Mesh(new t.SphereGeometry(5.3, 7, 5), n);
            c.position.set(29, -16, -43), (c.visible = !1), e.add(c);
            const l = new t.Group();
            l.position.set(31, -15, -45);
            const h = new t.Line(
                new t.BufferGeometry().setFromPoints([
                  new t.Vector3(0, 0, 0),
                  new t.Vector3(20, 0, -22),
                ]),
                a,
              ),
              d = new t.Mesh(new t.BoxGeometry(14, 5, 8), s);
            d.position.set(24, 0, -27);
            const p = new t.Line(
              new t.BufferGeometry().setFromPoints([
                new t.Vector3(28, 0, -31),
                new t.Vector3(8, 0, -48),
              ]),
              a,
            );
            l.add(h, d, p),
              e.add(l),
              (e.userData.sling = l),
              e.position.set(0, 0, -10),
              (e.visible = !1),
              r.add(e),
              (mt.aimRig = e);
          })(),
          i.add(r),
          addEventListener("resize", Le),
          c.setAnimationLoop(Qe);
      })(),
    Te(),
    e && no(),
    (S = !0),
    (b = !1),
    l?.start(),
    l?.getDelta(),
    document.documentElement.requestFullscreen?.().catch(() => {}),
    c.domElement.requestPointerLock?.(),
    eo(
      `다비드의 도시 · 성전산 · 키드론 골짜기 · 올리브산
성문과 골목을 따라 성전산까지 올라갈 수 있습니다.`,
    ),
    // Build only the lightweight residential layer on the existing playable
    // Jerusalem surface. Never load the incompatible integrated GLB here.
    setTimeout(() => {
      if (!S || southernJerusalemUpgrade.created) return;
      try {
        createSouthernJerusalemUpgrade();
      } catch (error) {
        console.error("예루샬라임 주택·골목 생성 실패:", error);
      }
    }, 250);
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
  Wt = 234,
  qt = { x: -1180, z: 1650 };
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
  for (const collider of z) {
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
function shortestCityRoadNodePath(startIndex, goalIndex) {
  const { nodes } = buildCitySheepRoadGraph();
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
    if (current === goalIndex) break;
    visited[current] = true;
    for (const edge of nodes[current].edges) {
      const nextDistance = distances[current] + edge.distance;
      if (nextDistance < distances[edge.to]) {
        distances[edge.to] = nextDistance;
        previous[edge.to] = current;
      }
    }
  }
  if (!Number.isFinite(distances[goalIndex])) return null;
  const path = [];
  for (let at = goalIndex; at >= 0; at = previous[at]) {
    path.push(at);
    if (at === startIndex) break;
  }
  return { indices: path.reverse(), distance: distances[goalIndex] };
}
function makeCitySheepPath(startX, startZ, goalX, goalZ) {
  const startRoad = closestPointOnCityRoad(startX, startZ);
  const goalRoad = closestPointOnCityRoad(goalX, goalZ);
  if (!startRoad || !goalRoad) return [];
  if (startRoad.index === goalRoad.index) {
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
    for (const goalPoint of goalCandidates) {
      const startIndex = nodeFor(startPoint);
      const goalIndex = nodeFor(goalPoint);
      const route = shortestCityRoadNodePath(startIndex, goalIndex);
      if (!route) continue;
      const total =
        Math.hypot(startRoad.x - startPoint[0], startRoad.z - startPoint[1]) +
        route.distance +
        Math.hypot(goalRoad.x - goalPoint[0], goalRoad.z - goalPoint[1]);
      if (!best || total < best.total) best = { total, route };
    }
  }
  if (!best) return [{ x: goalRoad.x, z: goalRoad.z }];
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
      const rampProgress = t.MathUtils.clamp(
        (s.templeStageRampXMax - e) /
          Math.max(s.templeStageRampXMax - s.templeStageRampXMin, 1),
        0,
        1,
      );
      const easedRamp =
        rampProgress * rampProgress * (3 - 2 * rampProgress);
      return t.MathUtils.lerp(
        courtSurfaceY,
        s.templeStageTopY,
        easedRamp,
      );
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
      const rampProgress = t.MathUtils.clamp(
        (s.altarRampZMax - o) / Math.max(s.altarRampZMax - s.altarRampZMin, 1),
        0,
        1,
      );
      const easedRamp = rampProgress * rampProgress * (3 - 2 * rampProgress);
      return t.MathUtils.lerp(courtSurfaceY, s.altarTopY, easedRamp);
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
      (mt.goalSite.position.set(Z.x, te(Z.x, Z.z) + 1, Z.z),
      (mt.goalSite.rotation.y = Math.atan2(
        ((t = Z.z), 90 * Math.sin(8e-4 * t) - 120 - Z.x),
        420,
      )));
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
  southernJerusalemUpgrade.houses = houses;

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
    const selected = houses.filter((house) => house.material === materialIndex);
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
      houses.length,
    );
    const dummy = new t.Object3D();
    houses.forEach((house, index) => {
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
  const doors = new t.InstancedMesh(doorGeometry, doorMaterial, houses.length);
  const doorDummy = new t.Object3D();
  houses.forEach((house, index) => {
    const side = index % 4;
    const direction = house.rotation + side * Math.PI / 2;
    const alongX = Math.sin(direction);
    const alongZ = Math.cos(direction);
    const outward = side % 2 === 0 ? house.depth / 2 + 1.2 : house.width / 2 + 1.2;
    const ground = house.ground;
    doorDummy.position.set(house.x + alongX * outward, ground + 23, house.z + alongZ * outward);
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

  // The earlier earthen ramps, raised towers and extra wall walk are deliberately
  // removed. The original imported southern wall remains untouched at its native
  // height and silhouette.
  i.add(group);
  mt.southernJerusalemUpgrade = group;
  console.info(
    `[Jerusalem] visible-surface quarter rendered: ${houses.length} houses; visible stone roads removed`,
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
function loadLionModel() {
  if (lionModelPromise) return lionModelPromise;
  lionModelPromise = new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    loader.load(
      "./assets/models/lion_walk.fbx",
      (model) => {
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
      model.rotation.y = 0;
      enemy.add(model);
      fallbackModel.visible = false;
      const clips = template.animations || [];
      if (clips.length) {
        const mixer = new t.AnimationMixer(model);
        const walkClip = clips.find((clip) => /walk/i.test(clip.name)) || clips[0];
        const action = mixer.clipAction(walkClip);
        action.reset();
        action.setLoop(t.LoopRepeat, Infinity);
        action.play();
        enemy.userData.mixer = mixer;
        enemy.userData.walkAction = action;
      }
      enemy.userData.lion3D = model;
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
function loadFoxModel() {
  if (foxModelTemplate) return Promise.resolve(foxModelTemplate);
  if (foxModelPromise) return foxModelPromise;
  foxModelPromise = new Promise((resolve, reject) => {
    new FBXLoader().load(
      "./assets/models/fox_rigged.fbx",
      (model) => {
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
      "./assets/models/wolf_lowpoly.glb",
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
      "./assets/models/sheep_tripo_static.glb",
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
      const model = template.clone(true);
      model.name = "SheepTripoStaticModel";
      // The source sheep faces diagonally (+X/+Z). Align its nose with the
      // procedural flock's +X forward axis so turning remains correct from
      // the front, rear, left, and right.
      model.rotation.set(0, Math.PI / 4, 0);
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
      "./assets/models/bandit_tripo_static.glb",
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
function loadOliveTreeModel() {
  if (oliveTreeModelTemplate) return Promise.resolve(oliveTreeModelTemplate);
  if (oliveTreeModelPromise) return oliveTreeModelPromise;
  oliveTreeModelPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      "./assets/models/olive_tree_game.glb",
      (gltf) => {
        const scene = gltf.scene;
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
      "./assets/models/date_palm_game.glb",
      (gltf) => {
        const scene = gltf.scene;
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
      "./assets/models/first_temple_game.glb",
      (gltf) => {
        const scene = gltf.scene;
        scene.traverse((obj) => {
          if (!obj.isMesh) return;
          // The optimized temple is six material primitives in one mesh.
          // Receiving shadows keeps it grounded; casting a full-building
          // shadow would be disproportionately expensive.
          obj.castShadow = false;
          obj.receiveShadow = true;
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
function addPurchasedFirstTemple(parent, courtY, worldCenterX, worldCenterZ) {
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
  for (const child of [...parent.children]) {
    if (!child.isLight) parent.remove(child);
  }
  parent.add(model);
  // Collision follows the purchased outer wall footprint, split into broad
  // entrances on all four sides. No collider from the former enclosure remains.
  const wallHalfX = 590;
  const wallHalfZ = 465;
  const wallThickness = 22;
  const gateHalfWidth = 105;
  const horizontalWing = wallHalfX - gateHalfWidth;
  const verticalWing = wallHalfZ - gateHalfWidth;
  for (const z of [-wallHalfZ, wallHalfZ]) {
    Ot(worldCenterX - ((wallHalfX + gateHalfWidth) / 2), worldCenterZ + z, horizontalWing, wallThickness, 0, "temple-model-wall", courtY + 2, courtY + 205);
    Ot(worldCenterX + ((wallHalfX + gateHalfWidth) / 2), worldCenterZ + z, horizontalWing, wallThickness, 0, "temple-model-wall", courtY + 2, courtY + 205);
  }
  for (const x of [-wallHalfX, wallHalfX]) {
    Ot(worldCenterX + x, worldCenterZ - ((wallHalfZ + gateHalfWidth) / 2), wallThickness, verticalWing, 0, "temple-model-wall", courtY + 2, courtY + 205);
    Ot(worldCenterX + x, worldCenterZ + ((wallHalfZ + gateHalfWidth) / 2), wallThickness, verticalWing, 0, "temple-model-wall", courtY + 2, courtY + 205);
  }
  mt.purchasedFirstTemple = model;
  mt.importedTemple = model;
  return true;
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
function rebuildDatePalmInstances() {
  if (!i || !datePalmModelTemplate || !datePalmPlacements.length) return;
  let sourceMesh = null;
  datePalmModelTemplate.traverse((obj) => {
    if (!sourceMesh && obj.isMesh) sourceMesh = obj;
  });
  if (!sourceMesh) return;
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
    sourceMesh.geometry,
    sourceMesh.material,
    datePalmPlacements.length,
  );
  instances.castShadow = false;
  instances.receiveShadow = true;
  instances.frustumCulled = true;
  datePalmPlacements.forEach((palm, index) => {
    dummy.position.set(palm.x, palm.y, palm.z);
    dummy.rotation.set(0, palm.rotation, 0);
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
      let sourceMesh = null;
      template.traverse((obj) => {
        if (!sourceMesh && obj.isMesh) sourceMesh = obj;
      });
      if (!sourceMesh) return;
      const random = ee(118611);
      // Eight smaller instance batches allow whole sections behind the camera
      // or beyond the fog to be culled, instead of drawing all 88 detailed trees.
      const zones = Array.from({ length: 8 }, () => []);
      let attempts = 0;
      while (zones.reduce((sum, zone) => sum + zone.length, 0) < 88 && attempts++ < 1800) {
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
      for (const zone of zones) {
        if (!zone.length) continue;
        const instances = new t.InstancedMesh(
          sourceMesh.geometry,
          sourceMesh.material,
          zone.length,
        );
        instances.castShadow = false;
        instances.receiveShadow = true;
        instances.frustumCulled = true;
        zone.forEach((tree, index) => {
          dummy.position.set(tree.x, te(tree.x, tree.z), tree.z);
          dummy.rotation.set(0, tree.rotation, 0);
          dummy.scale.setScalar(tree.scale);
          dummy.updateMatrix();
          instances.setMatrixAt(index, dummy.matrix);
        });
        instances.instanceMatrix.needsUpdate = true;
        instances.computeBoundingSphere();
        instances.userData.groveBatch = true;
        grove.add(instances);
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
      const model = template.clone(true);
      model.name = "BanditTripoStaticModel";
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
      // Keep bandits visibly larger than David without making their hitbox or
      // movement behavior feel oversized.
      const scale = 190 / Math.max(size.y, 0.001);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);
      box = new t.Box3().setFromObject(model);
      const center = box.getCenter(new t.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      // The unified scan contains the weapon tip well below the man's feet.
      // Using box.min.y therefore plants the weapon on the terrain and leaves
      // the whole body floating. Measurements of this exact GLB put the real
      // sole plane 42.5% above the scan's minimum Y. Sink the attached lower
      // weapon remnant and align the man's soles with the enemy origin.
      const banditSoleY = box.min.y + box.getSize(new t.Vector3()).y * 0.425;
      model.position.y -= banditSoleY;
      enemy.add(model);
      if (fallback?.parent === enemy) {
        enemy.remove(fallback);
        fallback.clear();
      }
      enemy.userData.banditFallback = null;
      enemy.userData.importedModel = model;
      enemy.userData.importedModelBaseY = model.position.y;
      enemy.userData.importedModelPhase = Math.random() * Math.PI * 2;
    })
    .catch(() => {
      enemy.userData.banditModelAttachStarted = false;
      if (fallback && fallback.parent !== enemy) enemy.add(fallback);
      if (fallback) fallback.visible = true;
    });
}
function applyImportedPredatorModel(enemy, type) {
  const config = {
    fox: { load: loadFoxModel, targetLength: 138, rotationY: 0, rotationX: -Math.PI / 2, skinned: true },
    wolf: { load: loadWolfModel, targetLength: 122, rotationY: 0, rotationX: 0, skinned: false },
  }[type];
  if (!config) return;
  const fallbackChildren = [...enemy.children];
  config.load()
    .then((template) => {
      if (!enemy.parent || enemy.userData.type !== type) return;
      const model = config.skinned ? cloneSkinnedModel(template) : template.clone(true);
      model.name = type === "fox" ? "Fox3DModel" : "Wolf3DModel";
      model.updateMatrixWorld(true);
      const initialBox = new t.Box3().setFromObject(model);
      const initialSize = initialBox.getSize(new t.Vector3());
      const horizontalLength = Math.max(initialSize.x, initialSize.z, 0.001);
      const scale = config.targetLength / horizontalLength;
      model.scale.setScalar(scale);
      model.rotation.x = config.rotationX || 0;
      model.rotation.y = config.rotationY || 0;
      model.updateMatrixWorld(true);
      const box = new t.Box3().setFromObject(model);
      const center = box.getCenter(new t.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      enemy.add(model);
      fallbackChildren.forEach((child) => { child.visible = false; });
      const clips = template.animations || [];
      if (clips.length) {
        const mixer = new t.AnimationMixer(model);
        const clip = clips.find((item) => /walk|run|take/i.test(item.name)) || clips[0];
        const action = mixer.clipAction(clip);
        action.reset().setLoop(t.LoopRepeat, Infinity).play();
        enemy.userData.mixer = mixer;
        enemy.userData.walkAction = action;
      }
      enemy.userData.importedModel = model;
      enemy.userData.importedModelBaseY = model.position.y;
      enemy.userData.importedModelPhase = Math.random() * Math.PI * 2;
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
      bear: {
        hp: 145,
        speed: 48,
        body: 5719095,
        head: 4141096,
        scale: 1.38,
        label: "곰",
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
  } else if ("bear" === o) {
    const e = new t.Mesh(new t.IcosahedronGeometry(34, 1), ge(a.body));
    e.scale.set(1.35, 0.95, 0.85), e.position.set(-2, 34, 0), n.add(e);
    const o = new t.Mesh(new t.IcosahedronGeometry(22, 1), ge(a.head));
    o.scale.set(1, 0.95, 0.9), o.position.set(43, 43, 0), n.add(o);
    for (const e of [-12, 12]) {
      const o = new t.Mesh(new t.SphereGeometry(6, 8, 6), ge(a.head));
      o.position.set(42, 61, e), n.add(o);
    }
    const s = new t.Mesh(new t.BoxGeometry(17, 12, 17), ge(8086864));
    s.position.set(59, 38, 0), n.add(s);
    for (const t of [-13, 13])
      ve(n, [11, 35, 12], [-23, 10, t], a.body),
        ve(n, [11, 35, 12], [25, 10, t], a.body);
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
function Te() {
  [mt.player, mt.sheepShop, ...mt.sheep, ...mt.rocks, ...mt.enemies, ...mt.projectiles]
    .filter(Boolean)
    .forEach((t) => i.remove(t)),
    (mt.sheep = []),
    (mt.sheepShop = null),
    (mt.rocks = []),
    (mt.enemies = []),
    (mt.projectiles = []),
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
    (A = 0),
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
  for (let t = 0; t < 12; t++) {
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
    $e(),
    e("#thirstHud").classList.add("show"),
    (e("#thirstBar").style.width = ut.thirst + "%"),
    (e("#thirstValue").textContent = Math.round(ut.thirst));
}
function Le() {
  (r.aspect = innerWidth / innerHeight),
    r.updateProjectionMatrix(),
    c.setSize(innerWidth, innerHeight),
    c.setPixelRatio(Math.min(devicePixelRatio, 1.05));
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
  (b = !0),
    (function () {
      for (const t of Object.values(Lt))
        try {
          t.pause();
        } catch {}
      m && "running" === m.state && m.suspend().catch(() => {});
    })(),
    e("#pause").classList.remove("hidden"),
    document.exitPointerLock?.(),
    setTimeout(() => ke(e("#pause"), 0), 0);
}
function Ee() {
  const t = e("#cheatConsole");
  t.classList.toggle("hidden"),
    t.classList.contains("hidden")
      ? ((b = !1), c.domElement.requestPointerLock?.())
      : ((b = !0), document.exitPointerLock?.(), e("#cheatInput").focus());
}
function Re() {
  const t = e("#weaponIcon");
  t &&
    (t.classList.toggle("sling", "sling" === L),
    t.classList.toggle("staff", "staff" === L),
    t.setAttribute("aria-label", "sling" === L ? "회전식 돌팔매" : "지팡이"));
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
function damageSheep(sheep, attacker) {
  if (!sheep || !mt.sheep.includes(sheep) || sheep.userData.safeHold) return false;
  const type = attacker?.userData?.type || "fox";
  const damage = { fox: 8, wolf: 11, lion: 15, bear: 18 }[type] || 8;
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
      const sheepDisplay = template.clone(true);
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
  localStorage.removeItem("shepherdGame3DSave");
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
        ((K[t.code] = !0),
        S &&
          !b &&
          document.pointerLockElement !== c?.domElement &&
          ["KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(t.code) &&
          c?.domElement.requestPointerLock?.().catch?.(() => {}),
        "KeyV" !== t.code ||
          !S ||
          b ||
          t.repeat ||
          ((A = (A + 1) % F.length), Be(F[A].name)),
        "Tab" === t.code &&
          S &&
          !b &&
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
        "KeyZ" === t.code && S && !b)
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
                c.domElement.requestPointerLock?.())
              : Ie());
    }
  }),
  document.addEventListener("keyup", (t) => (K[t.code] = !1)),
  document.addEventListener("mousemove", (e) => {
    document.pointerLockElement !== c?.domElement ||
      b ||
      ((B -= e.movementX * E),
      (I -= e.movementY * E * 0.42),
      (I = t.MathUtils.clamp(I, -1.3, 1.1)));
  }),
  a.addEventListener("click", () => {
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
    S && !b && c?.domElement.requestPointerLock?.().catch?.(() => {});
  }),
  a.addEventListener("mouseenter", () => {
    S && !b && c?.domElement.requestPointerLock?.().catch?.(() => {});
  }),
  document.addEventListener("contextmenu", (t) => t.preventDefault()),
  document.addEventListener("mousedown", (o) => {
    S &&
      !b &&
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
        ((function () {
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
          r.getWorldDirection(o);
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
      c.domElement.requestPointerLock?.();
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
        c.domElement.requestPointerLock?.(),
        eo("과녁을 향해 돌팔매를 5번 연습하십시오.");
    })()),
  (e("#practiceNoBtn").onclick = () => {
    e("#practicePrompt").classList.add("hidden"),
      (b = !1),
      c?.domElement.requestPointerLock?.(),
      ie();
  }),
  (e("#saveBtn").onclick = oo),
  (e("#quitBtn").onclick = () => location.reload()),
  (e("#restartBtn").onclick = () => {
    if (ut.flockLost) {
      localStorage.removeItem("shepherdGame3DSave");
      Te();
    } else {
      no() || Te();
    }
    ut.thirstFailed = !1;
    ut.flockLost = !1;
    e("#gameOver").classList.add("hidden");
    e("#gameOver").classList.remove("mission-fail");
    b = !1;
    c?.domElement.requestPointerLock?.();
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
  (n.textContent = t),
    clearTimeout(je.timer),
    t &&
      (je.timer = setTimeout(() => {
        n.textContent === t && (n.textContent = "");
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
    o || setTimeout(ie, 4300);
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
  performanceState.onOliveMount = onOliveMount;
  const targetRatio = Math.min(devicePixelRatio, onOliveMount ? 0.85 : 1.05);
  if (Math.abs(targetRatio - performanceState.currentPixelRatio) > 0.01) {
    performanceState.currentPixelRatio = targetRatio;
    c.setPixelRatio(targetRatio);
  }
  // Keep the full grove visible, but let fog and eight spatial batches discard
  // expensive tree geometry that is not relevant to the current view.
  if (mt.oliveGrove) {
    mt.oliveGrove.children.forEach((batch) => {
      if (!batch.boundingSphere) batch.computeBoundingSphere?.();
      batch.frustumCulled = true;
      const sphere = batch.boundingSphere;
      if (sphere) {
        const dx = player.x - sphere.center.x;
        const dz = player.z - sphere.center.z;
        batch.visible =
          !onOliveMount ||
          dx * dx + dz * dz <
            Math.pow(1850 + Math.min(650, sphere.radius || 0), 2);
      }
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
        Math.pow(1750 + Math.min(500, sphere.radius || 0), 2);
    });
  }
}
function Ye(e, o, n) {
  return new t.Color(e).lerp(new t.Color(o), n);
}
function _e(o, n) {
  const frameNow = n * 1000;
  updateAdaptiveRendering(frameNow);
  updateRouteChoice(frameNow);
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
      (e("#charge i").style.width = 100 * T + "%")),
    (function (o, n) {
      Number.isFinite(ut.worldTime) || (ut.worldTime = 0.29),
        (ut.worldTime = (ut.worldTime + o / 1440) % 1);
      const s = ut.worldTime,
        a = Ze(s);
      e("#timePhaseLabel").textContent = a.name;
      const c = Math.floor(24 * s * 60);
      e("#timeClock").textContent =
        String(Math.floor(c / 60)).padStart(2, "0") +
        ":" +
        String(c % 60).padStart(2, "0");
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
        lightingPerformance.nextTorchUpdateAt = n * 1000 + 80;
        const playerPosition = mt.player?.position;
        const torchCandidates = [];
        for (const torch of mt.cityTorches || []) {
          if (!torch?.userData) continue;
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
      const D = Ye(1516347, 9547706, l).lerp(new t.Color(12026997), 0.32 * v),
        S = Ye(3687517, 14207406, l).lerp(new t.Color(14787709), 0.42 * v),
        b = Ye(4936551, 15258797, l).lerp(new t.Color(15775879), 0.46 * v);
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
        const needsSunShadow = l > 0.16;
        if (lightingPerformance.sunShadowEnabled !== needsSunShadow) {
          lightingPerformance.sunShadowEnabled = needsSunShadow;
          h.castShadow = needsSunShadow;
          h.shadow.needsUpdate = needsSunShadow;
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
    It(),
    (function () {
      const t = mt.player?.position;
      if (!t) return;
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
        frameNow < performanceState.nextOcclusionAt
      )
        return;
      performanceState.nextOcclusionAt = frameNow + 100;
      for (const mesh of performanceState.hiddenCameraMeshes) {
        mesh.visible = !0;
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
          const t = 1 - o.userData.staffSwing / 0.36;
          (o.userData.staff.rotation.z = 1.45 * Math.sin(t * Math.PI) - 0.45),
            (o.userData.staff.rotation.x = 0.35 * Math.sin(t * Math.PI));
        } else
          (o.userData.staff.rotation.z = t.MathUtils.lerp(
            o.userData.staff.rotation.z,
            -0.025,
            Math.min(1, 10 * e),
          )),
            (o.userData.staff.rotation.x *= Math.max(0, 1 - 10 * e));
      const n = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0),
        s = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0),
        a = new t.Vector3(Math.sin(B), 0, Math.cos(B)).normalize(),
        i = new t.Vector3(-Math.cos(B), 0, Math.sin(B)).normalize(),
        c = (o.position.clone(), new t.Vector3());
      if ((c.addScaledVector(a, n).addScaledVector(i, s), c.lengthSq() > 0)) {
        c.normalize();
        const n = (K.Space ? 310 : 145) * (G ? 0.55 : 1),
          s = c.clone().multiplyScalar(n * e);
        movePlayerWithSweptCollision(o, s);
        const r = Math.atan2(c.x, c.z);
        let l =
          t.MathUtils.euclideanModulo(r - o.rotation.y + Math.PI, 2 * Math.PI) -
          Math.PI;
        (o.rotation.y += l * Math.min(1, 12 * e)),
          (o.userData.walkPhase += e * (K.Space ? 17.2 : 9));
        const h = !!K.Space,
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
        if (importedAvatar) {
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
      const d = F[A],
        p = G ? 92 : d.distance,
        u = G ? 78 : d.height,
        m = G ? 43 : d.fov,
        f = 1 - Math.pow(0.0015, e);
      (R = t.MathUtils.lerp(R, p, f)),
        (V = t.MathUtils.lerp(V, u, f)),
        (U = t.MathUtils.lerp(U, m, f)),
        Math.abs(r.fov - U) > 0.02 && ((r.fov = U), r.updateProjectionMatrix());
      const w = Math.cos(I),
        M = Math.sin(I),
        y = new t.Vector3(Math.sin(B) * w, M, Math.cos(B) * w).normalize(),
        x = new t.Vector3(o.position.x, o.position.y + 58, o.position.z),
        g = G ? i.clone().multiplyScalar(20) : new t.Vector3();
      x.add(g);
      const v = !G && F[A].firstPerson,
        z = new t.Vector3(
          o.position.x,
          o.position.y + (v ? 74 : G ? 55 : 68),
          o.position.z,
        ).add(g);
      let D;
      v
        ? (D = z.clone().addScaledVector(y, 9))
        : ((D = z.clone().addScaledVector(y, -R)),
          (D.y += G ? 8 : 3 === A ? 34 : 24));
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
      const b = z.clone().addScaledVector(y, 520);
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
        (o.visible = !(G || (!G && F[A].firstPerson))),
        mt.aimRig)
      ) {
        mt.aimRig.visible = G;
        const t = mt.aimRig.userData.sling;
        t &&
          ((t.rotation.z = P ? 0.018 * performance.now() : 0),
          (t.rotation.x = P ? 0.18 : 0)),
          (mt.aimRig.rotation.z = 0);
      }
    })(o),
    (function (e, o) {
      updateJerusalemSheepHold(),
        y && Math.random() < 0.012 * e && kt("sheep");
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
            return;
          } else if (s.userData.nightCampPosition) {
            s.userData.nightCampPosition = null;
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
            const o =
              (s.userData.fear || 0) > 0.18
                ? 98 + 52 * s.userData.fear
                :
              (s.userData.urgeUntil || 0) > performance.now()
                ? 112
                : d
                  ? 82
                  : 58;
            let moveX = s.position.x;
            let moveZ = s.position.z;
            const desiredAngle = Math.atan2(l, c);
            const turnOrder = followsCityRoad
              ? [0, 0.28, -0.28, 0.52, -0.52, 0.82, -0.82, 1.2, -1.2]
              : [0, 0.48, -0.48, 0.9, -0.9, 1.45, -1.45];
            const clearance = followsCityRoad ? 24 : 12;
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
              const candidateX =
                s.position.x + Math.cos(angle) * o * e;
              const candidateZ =
                s.position.z + Math.sin(angle) * o * e;
              const candidate = Mt.set(
                candidateX,
                te(candidateX, candidateZ) + 5,
                candidateZ,
              );
              if (!isSheepBlockedAt(candidate, clearance)) {
                moveX = candidateX;
                moveZ = candidateZ;
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
          if (p && s.userData.legs) {
            const panicking = (s.userData.fear || 0) > 0.18;
            s.userData.runPhase += e * (panicking ? 14 : d ? 12 : 8);
            const o = Math.sin(s.userData.runPhase) * (panicking ? 0.62 : d ? 0.55 : 0.34);
            (s.userData.legs[0].rotation.z = o),
              (s.userData.legs[3].rotation.z = o),
              (s.userData.legs[1].rotation.z = -o),
              (s.userData.legs[2].rotation.z = -o),
              (s.rotation.z = t.MathUtils.lerp(
                s.rotation.z,
                panicking ? -0.07 : d ? -0.055 : 0,
                Math.min(1, 7 * e),
              ));
          } else if (s.userData.legs) {
            for (const t of s.userData.legs)
              t.rotation.z *= Math.max(0, 1 - 8 * e);
            s.rotation.z *= Math.max(0, 1 - 8 * e);
          }
          const u = p
            ? Math.abs(Math.sin(2 * (s.userData.runPhase || 0))) *
              (d ? 2.1 : 1.15)
            : 0.35 * Math.sin(2 * o + s.userData.phase);
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
    (function (t) {
      j > 0 && (j -= t);
      const e = Yt(mt.player.position.x, mt.player.position.z, -80);
      for (const t of mt.enemies)
        e &&
          "bandit" !== t.userData.type &&
          ((t.userData.hp = 0), Ge(t), i.remove(t));
      0 === mt.enemies.length &&
        ((O -= t),
        O <= 18 &&
          O > 0 &&
          !H &&
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
          ((function () {
            const t = mt.player.position,
              e = Yt(t.x, t.z, -80),
              o = Math.random(),
              n = e
                ? "bandit"
                : o < 0.08
                  ? "bear"
                  : o < 0.3
                    ? "lion"
                    : o < 0.74
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
              let s, i;
              for (let n = 0; n < 40; n++) {
                const n = Math.random() * Math.PI * 2,
                  a = e
                    ? 360 + 260 * Math.random()
                    : 720 + 420 * Math.random() + 50 * o;
                (s = t.x + Math.sin(n) * a), (i = t.z + Math.cos(n) * a);
                const r = Yt(s, i, -90);
                if ((e && r) || (!e && !r)) break;
              }
              const r = Pe(n);
              (r.userData.packId = a), r.position.set(s, te(s, i) + 1, i);
            }
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
        const s = o.position.x - e.position.x,
          a = o.position.z - e.position.z,
          r = Math.hypot(s, a);
        if (e.userData.walkAction) e.userData.walkAction.paused = r <= 42;
        if (e.userData.importedModel && !e.userData.mixer) {
          e.userData.importedModelPhase += t * (r > 42 ? 9 : 2.2);
          const moving = r > 42;
          e.userData.importedModel.position.y =
            e.userData.importedModelBaseY +
            // Keep both soles planted. A side-to-side lean communicates motion
            // without lifting the entire static scan off the terrain.
            (moving ? 0 : Math.sin(e.userData.importedModelPhase) * 0.12);
          e.userData.importedModel.rotation.z = moving
            ? Math.sin(e.userData.importedModelPhase) * 0.025
            : 0;
        }
        if (r > 42) {
          e.position.x += (s / r) * e.userData.speed * t;
          e.position.z += (a / r) * e.userData.speed * t;
          e.rotation.y = Math.atan2(s, a);
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
      }
    })(o),
    (function (e) {
      for (const o of mt.projectiles) {
        const previousProjectilePosition = o.position.clone();
        if (
          ((o.userData.velocity.y -= 120 * e),
          o.position.addScaledVector(o.userData.velocity, e),
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
        if (
          (at.active &&
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
          !n)
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
        if (!n) {
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
          moveNightFlockToSouthGate();
          nightWatch.lastPhase = phase;
          ut.missionDone = !0;
          eo("새벽이 되었습니다. 양 떼가 예루샬라임 남문 대기장에 모였습니다.");
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
      for (const sheep of mt.sheep)
        Math.hypot(sheep.position.x - Z.x, sheep.position.z - Z.z) < 365 &&
          sheepAtCampCount++;
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
      ((performanceState.nextHudAt = frameNow + 100), $e()),
    (function () {
      const o = e("#crosshair");
      if (!o || frameNow < performanceState.nextTargetLockAt) return;
      performanceState.nextTargetLockAt = frameNow + 66;
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
      performanceState.nextMinimapAt = frameNow + 150;
      const t = 190,
        e = 95;
      s.clearRect(0, 0, t, t),
        s.save(),
        s.beginPath(),
        s.arc(e, e, 92, 0, 2 * Math.PI),
        s.clip(),
        (s.fillStyle = "#bca271"),
        s.fillRect(0, 0, t, t);
      const o = mt.player.position,
        n = Math.cos(B),
        a = Math.sin(B),
        i = (t) => {
          const s = t.x - o.x,
            i = t.z - o.z,
            r = s * -n + i * a,
            c = -(s * a + i * n);
          return {
            x: e + (r / W) * 84,
            z: e + (c / W) * 84,
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
        if (o > W) continue;
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
        for (const [e, o] of Xt) {
          if (!Je(t, e, o)) continue;
          const n = i({ x: t.x + e[0], z: t.z + e[1] }),
            a = i({ x: t.x + o[0], z: t.z + o[1] });
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
        h = Math.min(76, (l / W) * 84),
        d = Math.atan2(c.rz, c.rx),
        p = e + Math.cos(d) * h,
        u = e + Math.sin(d) * h;
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
        s.moveTo(e, 79),
        s.lineTo(88, 103),
        s.lineTo(102, 103),
        s.closePath(),
        s.fill();
      const m = i({ x: o.x, z: o.z - 100 }),
        f = Math.hypot(m.rx, m.rz) || 1,
        w = m.rx / f,
        M = m.rz / f;
      (s.fillStyle = "#2d241b"),
        (s.font = "bold 12px sans-serif"),
        s.fillText("N", e + 75 * w - 4, e + 75 * M + 4),
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
function Qe() {
  S &&
    !b &&
    (_e(Math.min(0.033, l.getDelta()), performance.now() / 1e3),
    c.render(i, r));
}
function $e() {
  (ut.stones = t.MathUtils.clamp(ut.stones, 0, 25)),
    (ut.respect = t.MathUtils.clamp(ut.respect, 0, 100)),
    (ut.money = t.MathUtils.clamp(ut.money, 0, 1e7)),
    (e("#hpBar").style.width = t.MathUtils.clamp(ut.hp, 0, 100) + "%"),
    (e("#stoneCount").textContent = "돌 " + ut.stones + "/25"),
    (e("#respect").textContent = "존중 " + ut.respect + "/100"),
    (e("#money").textContent = ut.money.toLocaleString("ko-KR") + " 셰켈"),
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
  (e("#notice").innerText = t),
    clearTimeout(to),
    (to = setTimeout(() => (e("#notice").innerText = ""), 2800));
}
function oo(t = !1) {
  if (!mt.player) return;
  const e = {
    version: Wt,
    state: ut,
    weapon: L,
    cameraMode: A,
    missionCycle: $,
    goal: { x: Z.x, z: Z.z },
    player: { x: mt.player.position.x, z: mt.player.position.z },
    sheep: mt.sheep.map((t) => ({ x: t.position.x, z: t.position.z })),
  };
  localStorage.setItem("shepherdGame3DSave", JSON.stringify(e)),
    t || eo("저장되었습니다.");
}
function no() {
  try {
    const e = JSON.parse(localStorage.getItem("shepherdGame3DSave"));
    if (!e) return !1;
    if (e.version !== Wt)
      return localStorage.removeItem("shepherdGame3DSave"), !1;
    Object.assign(ut, e.state || {}),
      Number.isFinite(ut.thirst) || (ut.thirst = 100),
      (ut.stones = t.MathUtils.clamp(ut.stones || 0, 0, 25)),
      (ut.respect = t.MathUtils.clamp(ut.respect || 0, 0, 100)),
      (ut.money = t.MathUtils.clamp(ut.money || 0, 0, 1e7)),
      (L = e.weapon || "sling"),
      (A = Number.isInteger(e.cameraMode)
        ? t.MathUtils.clamp(e.cameraMode, 0, 3)
        : 0),
      (ut.thirstFailed = !1),
      (ut.flockLost = !1),
      ($ = e.missionCycle || 1),
      e.goal &&
        (Z.set(e.goal.x, 0, e.goal.z),
        (Ft.some((t) => Math.hypot(Z.x - t.x, Z.z - t.z) < t.r + 300) ||
          he(Z.x, Z.z) > 0.65) &&
          Z.set(-1150, 0, 1050),
        ce());
    const o = e.player || qt,
      n = Jt(o.x, o.z);
    return (
      Array.isArray(e.sheep) &&
        e.sheep.forEach((t, e) => {
          if (!mt.sheep[e]) return;
          const o = _t(
            Number.isFinite(t.x) ? t.x : n.x + (e % 4) * 55,
            Number.isFinite(t.z) ? t.z : n.z - 120 + 62 * Math.floor(e / 4),
          );
          mt.sheep[e].position.set(o.x, te(o.x, o.z) + 22, o.z);
        }),
      $e(),
      !0
    );
  } catch {
    return localStorage.removeItem("shepherdGame3DSave"), !1;
  }
}
