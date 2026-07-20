import * as t from "./three.module.js";
import { FBXLoader } from "./FBXLoader.js";
import { clone as cloneSkinnedModel } from "./SkeletonUtils.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { JERUSALEM_DATA } from "./jerusalemData.js";
let jerusalemMapReady = false;
let jerusalemMapBaseY = 0;
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
  return jerusalemMapBaseY + (localY - JERUSALEM_DATA.minY) * JERUSALEM_SCALE;
}

function loadJerusalemMap() {
  if (!i || mt.jerusalemMap) return;
  const loader = new GLTFLoader();
  loader.load(
    "./assets/models/jerusalem_optimized.glb",
    (gltf) => {
      const model = gltf.scene;
      const box = new t.Box3().setFromObject(model);
      const center = box.getCenter(new t.Vector3());
      jerusalemMapBaseY = $t(0, 0) - 8;
      model.scale.setScalar(JERUSALEM_SCALE);
      model.position.set(-center.x * JERUSALEM_SCALE, jerusalemMapBaseY - box.min.y * JERUSALEM_SCALE, -center.z * JERUSALEM_SCALE);
      model.rotation.y = 0;
      model.name = "OptimizedJerusalemFirstTempleMap";
      model.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.castShadow = false;
        obj.receiveShadow = true;
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map) m.map.anisotropy = Math.min(4, c.capabilities.getMaxAnisotropy());
            m.roughness = Math.max(0.72, m.roughness ?? 0.72);
          });
        }
      });
      if (mt.jerusalem) mt.jerusalem.visible = false;
      i.add(model);
      mt.jerusalemMap = model;
      // 기존 고해상도 성전 모델은 새 도시의 성전산 위치에 색감 보강용으로 유지합니다.
      if (mt.importedTemple) {
        i.attach(mt.importedTemple);
        mt.importedTemple.visible = true;
        mt.importedTemple.position.set(-1020, jerusalemMapBaseY + 255, 760);
        mt.importedTemple.scale.setScalar(1.5);
        mt.importedTemple.rotation.y = 0;
      }
      // 기존 절차형 도시 충돌을 지우고 새 지도에서 추출한 건물/성벽 충돌을 등록합니다.
      for (let idx = z.length - 1; idx >= 0; idx--) {
        if (["building", "wall", "temple", "temple-wall"].includes(z[idx].type)) z.splice(idx, 1);
      }
      for (const rect of JERUSALEM_DATA.rects) {
        Ot(rect[0] * JERUSALEM_SCALE, rect[1] * JERUSALEM_SCALE, Math.max(22, rect[2] * JERUSALEM_SCALE), Math.max(22, rect[3] * JERUSALEM_SCALE), 0, "jerusalem-map");
      }
      jerusalemMapReady = true;
      eo("제1성전 시대 예루샬라임 3D 지도가 적용되었습니다.");
    },
    undefined,
    (error) => {
      console.error("예루샬라임 3D 지도 로드 실패:", error);
      jerusalemMapReady = false;
      if (mt.jerusalem) mt.jerusalem.visible = true;
      eo("3D 지도 로드에 실패하여 기존 예루샬라임 지도를 사용합니다.");
    },
  );
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
  lionModelPromise = null,
  lionModelTemplate = null,
  foxModelPromise = null,
  foxModelTemplate = null,
  wolfModelPromise = null,
  wolfModelTemplate = null,
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
  dt = null;
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
  ],
};
let currentSheepBleatAudio = null;
function Ct() {
  const t = y ? v : 0;
  (Lt.wind.volume = 0.45 * t),
    (Lt.birds.volume = 0.55 * t),
    (Lt.night.volume = 0.45 * t),
    (Lt.pickup.volume = 0.8 * t),
    (Lt.mission.volume = 0.85 * t),
    (Lt.danger.volume = 0.85 * t),
    (Lt.staff.volume = 0.7 * t),
    Lt.sheep.forEach((e) => (e.volume = 0.55 * t));
}
function kt(t) {
  if (!y) return;
  if ("sheep" === t) {
    try {
      currentSheepBleatAudio &&
        (currentSheepBleatAudio.pause(),
        (currentSheepBleatAudio.currentTime = 0));
      const t = Lt.sheep[Math.floor(Math.random() * Lt.sheep.length)];
      (currentSheepBleatAudio = t),
        (t.currentTime = 0),
        t.play().catch(() => {});
    } catch {}
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
    templeObjText
      ? Promise.resolve()
      : (templeObjPromise ||
          (templeObjPromise = fetch("./assets/models/temple_holyplace.obj")
            .then((response) => {
              if (!response.ok)
                throw new Error(`Temple OBJ ${response.status}`);
              return response.text();
            })
            .then((text) => {
              templeObjText = text;
            })
            .catch((error) => {
              console.error("성전 OBJ 로드 실패:", error);
              templeObjText = "";
            })),
        templeObjPromise),
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
          c.setPixelRatio(Math.min(devicePixelRatio, 1.6)),
          c.setSize(innerWidth, innerHeight),
          (c.shadowMap.enabled = !0),
          (c.shadowMap.type = t.PCFSoftShadowMap),
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
          e.shadow.mapSize.set(2048, 2048),
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
                  L = 300 + 32 * Math.sin(3 * i),
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
                  for (let attempt = 0; attempt < 260 && placed < 58; attempt++) {
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
                    altarX: n + a + 205,
                    altarZ: s + i,
                    altarHalfX: 85,
                    altarHalfZ: 85,
                    altarTopY: d + 107,
                    altarRampXMin: n + a + 125,
                    altarRampXMax: n + a + 285,
                    altarRampZMin: s + i + 90,
                    altarRampZMax: s + i + 250,
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
                  // East wall is split into shorter southern and northern sections. The
                  // middle gate remains wide, and the north-east projection is removed.
                  // Keep only the south-east enclosure section. The former north-east
                  // projection stuck outside Jerusalem's city wall and blocked the approach.
                  for (const [wallZ, wallDepth] of [[330, 260]]) {
                    const n = new t.Mesh(new t.BoxGeometry(f, m, wallDepth), o[1]);
                    n.position.set(c, d + 85, wallZ), r.add(n);
                  }
                  const M = new t.Mesh(new t.BoxGeometry(60, 54, w), o[2]);
                  M.position.set(c, d + m - 27, 0), r.add(M);
                  const templeEntryLip = new t.Mesh(
                    new t.BoxGeometry(30, 4, w - 40),
                    templeMarble,
                  );
                  templeEntryLip.position.set(c - 20, d + 2, 0),
                    (templeEntryLip.receiveShadow = !0),
                    r.add(templeEntryLip),
                    de(r, 1080, d + m, 0, -460, 0, o[2], 34, -20),
                    de(r, 1080, d + m, 0, l, 0, o[2], 34, 20),
                    de(r, 920, d + m, -540, 0, Math.PI / 2, o[2], 34, -20),
                    Ot(n + a, s + i - l, 1048, f, 0, "temple-wall"),
                    Ot(n + a, s + i + l, 1288, f, 0, "temple-wall"),
                    Ot(n + a - c, s + i + 250, f, 348, 0, "temple-wall"),
                    Ot(n + a + c, s + i + 330, f, 248, 0, "temple-wall");
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
                    Ot(n + a + y - 105, s + i, 420, 320, 0, "temple"),
                    Ot(n + a + y + 175, s + i, 124, 410, 0, "temple");
                  const importedTempleApplied = addImportedTempleModel(r, d);
                  if (importedTempleApplied) {
                    x.visible = false;
                    g.visible = false;
                    v.visible = false;
                    S.visible = false;
                    r.children.forEach((child) => {
                      if (
                        child !== mt.importedTemple &&
                        child.geometry?.type === "CylinderGeometry" &&
                        child.position.x === 35
                      )
                        child.visible = false;
                    });
                  }
                  const b = 205,
                    G = 170,
                    P = ge(9332808),
                    T = d + 2 + 105,
                    L = new t.Mesh(new t.BoxGeometry(170, 105, G), P);
                  L.position.set(b, d + 2 + 52.5, 0),
                    (L.castShadow = !0),
                    (L.receiveShadow = !0),
                    r.add(L);
                  for (const e of [-1, 1])
                    for (const o of [-1, 1]) {
                      const n = new t.Mesh(
                        new t.CylinderGeometry(7, 12, 32, 6),
                        P,
                      );
                      n.position.set(b + 72 * e, T + 16, 0 + 72 * o),
                        (n.castShadow = !0),
                        r.add(n);
                    }
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
                  const E = new t.Mesh(
                    new t.CylinderGeometry(61, 69, 10, 12),
                    ge(4274740),
                  );
                  E.position.set(b, T + 6, 0), r.add(E);
                  const R = new t.Mesh(
                    new t.CylinderGeometry(47, 54, 7, 10),
                    new t.MeshBasicMaterial({ color: 16742948 }),
                  );
                  R.position.set(b, T + 12, 0), r.add(R), (mt.templeEmber = R);
                  const V = new t.Group();
                  for (let e = 0; e < 8; e++) {
                    const o = new t.MeshBasicMaterial({
                        color: e % 2 ? 16757051 : 16735008,
                        transparent: !0,
                        opacity: 0.86,
                      }),
                      n = new t.Mesh(
                        new t.ConeGeometry(
                          8 + (e % 3) * 3,
                          32 + (e % 4) * 8,
                          7,
                        ),
                        o,
                      );
                    n.position.set(
                      b + 11 * (e - 3.5),
                      T + 34 + (e % 2) * 5,
                      0 + 11 * ((e % 3) - 1),
                    ),
                      (n.userData.phase = 0.73 * e),
                      V.add(n);
                  }
                  r.add(V), (mt.templeFlames = V);
                  const U = new t.MeshBasicMaterial({
                      color: 14209733,
                      transparent: !0,
                      opacity: 0.18,
                      depthWrite: !1,
                    }),
                    A = new t.Mesh(
                      new t.CylinderGeometry(11, 50, 11e3, 14, 4, !0),
                      U,
                    );
                  A.position.set(b, T + 18 + 5500, 0),
                    r.add(A),
                    (mt.templeSmoke = A);
                  const F = 365,
                    W = 350,
                    q = new t.Mesh(new t.CylinderGeometry(84, 59, 60, 14), z);
                  q.position.set(F, d + 32, W), (q.castShadow = !0), r.add(q);
                  const N = new t.Mesh(
                    new t.CylinderGeometry(67, 67, 4, 18),
                    new t.MeshBasicMaterial({
                      color: 7317421,
                      transparent: !0,
                      opacity: 0.82,
                    }),
                  );
                  N.position.set(F, d + 63, W), r.add(N);
                  for (let e = 0; e < 12; e++) {
                    const o = (e / 12) * Math.PI * 2,
                      n = F + 63 * Math.cos(o),
                      s = W + 63 * Math.sin(o),
                      a = new t.Mesh(new t.BoxGeometry(24, 30, 38), z);
                    a.position.set(n, d + 2, s), (a.rotation.y = -o), r.add(a);
                  }
                  for (let e = 0; e < 6; e++) {
                    const o = new t.Mesh(
                      new t.CylinderGeometry(18, 13, 18, 10),
                      z,
                    );
                    o.position.set(250 + 48 * e, d + 10, 325), r.add(o);
                  }
                  Nt(n + a + F, s + i + W, 78, "bronze-sea"), e.add(r);
                })(r, c, o, n);
              const m = ge(13086339),
                f = [
                  [[s - 135, 120], [330, -320], 84],
                  [[330, -320], [260, -1030], 92],
                ];
              for (const [t, e, s] of f) me(r, t, e, s, o, n, m);
              (function (e, o, n) {
                const s = [];
                for (let t = -1650; t <= 1550; t += 310)
                  s.push([-86, t], [86, t]);
                for (let t = -730; t <= 730; t += 290)
                  s.push([t, 1260], [t, -540]);
                for (let t = 0; t < 7; t++) {
                  const e = t / 6;
                  s.push([820 - 560 * e, 120 - 930 * e]);
                }
                for (const [a, i] of s)
                  Kt(o + a, n + i, -130) &&
                    !jt(new t.Vector3(o + a, 0, n + i), 12) &&
                    fe(e, o, n, a, i);
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
                for (let t = 0; t < 96; t++) {
                  const e = (t % 32) * 135 - 2050;
                  Me(
                    2520 + 300 * Math.floor(t / 32) + (t % 4) * 34,
                    e,
                    0.48 + (t % 6) * 0.05,
                  );
                }
              })(),
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
                (c.castShadow = !0),
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
                const e = 2860,
                  o = new t.Group(),
                  n = ge(10849385),
                  s = ge(7889999),
                  a = new t.MeshToonMaterial({
                    color: 5212048,
                    transparent: !0,
                    opacity: 0.92,
                    side: t.DoubleSide,
                  }),
                  r = te(330, e),
                  c = 18,
                  l = new t.Mesh(new t.BoxGeometry(88, 18, 8), s);
                (l.position.y = -72), (l.receiveShadow = !0), o.add(l);
                const h = new t.Mesh(new t.PlaneGeometry(250, 170), a);
                (h.rotation.x = -Math.PI / 2), (h.position.y = -48), o.add(h);
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
                o.position.set(330, r + 28.35, e),
                  i.add(o),
                  (mt.siloam = o),
                  q.push({ x: 330, z: e, r: 205, name: "쉴로악흐" });
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
                const a = new t.Group(),
                  r = ge(6964524),
                  c = ge(6450509),
                  l = new t.Mesh(new t.CylinderGeometry(6.2, 8.8, 82, 8), r);
                (l.position.y = 41),
                  (l.castShadow = !0),
                  (l.receiveShadow = !0),
                  a.add(l),
                  [
                    [0, 92, 0],
                    [28, 88, 5],
                    [-27, 87, -4],
                    [8, 99, -22],
                    [-6, 96, 22],
                  ].forEach(([e, o, n], s) => {
                    const i = new t.Mesh(
                      new t.IcosahedronGeometry(28 - 1.8 * s, 1),
                      c,
                    );
                    i.scale.set(1.25, 0.43, 1),
                      i.position.set(e, o, n),
                      (i.castShadow = !0),
                      (i.receiveShadow = !0),
                      a.add(i);
                  });
                const h = new t.Mesh(
                  new t.CircleGeometry(88, 24),
                  new t.MeshBasicMaterial({
                    color: 3683367,
                    transparent: !0,
                    opacity: 0.19,
                    depthWrite: !1,
                  }),
                );
                (h.rotation.x = -Math.PI / 2),
                  (h.position.y = 0.8),
                  (h.scale.y = 0.58),
                  a.add(h),
                  a.position.set(292, 0, 18),
                  e.add(a),
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
    // v1.0: imported museum GLB disabled; Jerusalem is rebuilt as the playable world itself.
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
  Wt = 232,
  qt = { x: -1180, z: 1650 };
function Nt(t, e, o, n = "solid") {
  z.push({ shape: "circle", x: t, z: e, r: o, type: n });
}
function Ot(t, e, o, n, s = 0, a = "building") {
  z.push({ shape: "rect", x: t, z: e, w: o, d: n, rotation: s, type: a });
}
function jt(t, e = 18) {
  if (Math.abs(t.x) > 4050 || Math.abs(t.z) > 4050) return !0;
  for (const o of z)
    if ("rect" === o.shape) {
      const n = t.x - o.x,
        s = t.z - o.z,
        a = Math.cos(-o.rotation),
        i = Math.sin(-o.rotation),
        r = n * a - s * i,
        c = n * i + s * a;
      if (Math.abs(r) < o.w / 2 + e && Math.abs(c) < o.d / 2 + e) return !0;
    } else if (Math.hypot(t.x - o.x, t.z - o.z) < o.r + e) return !0;
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
];
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
  o &&
    ((o.textContent = t),
    o.classList.add("show"),
    clearTimeout(Qt.timer),
    (Qt.timer = setTimeout(() => o.classList.remove("show"), 2800)));
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
  n -= 52 * Math.exp(-((e - 180) ** 2 + (o - 1640) ** 2) / 170000);

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
  const s = new t.Group(),
    a = ze(s, 3.2 * n, 5 * n, 35 * n, [0, 17 * n, 0], 7227696, 7);
  (a.rotation.z = 0.08), (a.castShadow = !0), (a.receiveShadow = !0);
  const r = ge(6713426);
  [
    [0, 40, 0],
    [12, 38, 3],
    [-13, 37, -2],
    [4, 43, -10],
  ].forEach(([e, o, a], i) => {
    const c = new t.Mesh(new t.IcosahedronGeometry((13 - i) * n, 0), r);
    (c.scale.y = 0.45),
      c.position.set(e * n, o * n, a * n),
      (c.castShadow = !0),
      (c.receiveShadow = !0),
      s.add(c);
  });
  const c = new t.Mesh(
    new t.CircleGeometry(34 * n, 18),
    new t.MeshBasicMaterial({
      color: 4143915,
      transparent: !0,
      opacity: 0.16,
      depthWrite: !1,
    }),
  );
  return (
    (c.rotation.x = -Math.PI / 2),
    (c.position.y = 0.7),
    (c.scale.y = 0.62),
    s.add(c),
    s.position.set(e, te(e, o), o),
    i.add(s),
    Nt(e, o, 8.5 * n, "acacia"),
    s
  );
}
function ne(t = 4300) {
  const o = e("#mission");
  o &&
    ((o.textContent = "양을 다음 구유가 있는 야영지까지 보호하십시오."),
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
    eo("멀리 새로운 목동 야영지가 정해졌습니다.");
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
    c = te(o + s, n + a) + i;
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
  })();
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
    }),
    i.add(o),
    mt.sheep.push(o),
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
    obj.castShadow = true;
    obj.receiveShadow = true;
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
  if ("bandit" === o)
    ze(n, 9, 14, 52, [0, 40, 0], a.body, 7),
      ze(n, 9, 9, 16, [0, 76, 0], a.head, 8),
      ve(n, [8, 48, 8], [-18, 38, 0], a.body),
      ve(n, [8, 48, 8], [18, 38, 0], a.body),
      ve(n, [7, 46, 7], [-8, 4, 0], 5060908),
      ve(n, [7, 46, 7], [8, 4, 0], 5060908),
      (ve(n, [8, 54, 8], [27, 38, 0], 5978916).rotation.z = -0.35);
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
    }),
    n.scale.setScalar(a.scale),
    i.add(n),
    "lion" === o && applyLionModel(n, lionFallback),
    ("wolf" === o || "fox" === o) && applyImportedPredatorModel(n, o),
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
    c.setPixelRatio(Math.min(devicePixelRatio, 1.6));
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


function isTempleMountRestricted(x, z) {
  return z < -1280 && Math.abs(x) < 920;
}
function updateTempleSheepHold() {
  const player = mt.player;
  if (!player) return;
  const waiting = isTempleMountRestricted(player.position.x, player.position.z);
  mt.sheep.forEach((sheep, index) => {
    if (waiting) {
      const row = Math.floor(index / 5), col = index % 5;
      sheep.userData.safeHold = true;
      sheep.userData.target.set(610 + (col - 2) * 34, 0, -1170 + row * 38);
    } else if (sheep.userData.safeHold) {
      sheep.userData.safeHold = false;
      sheep.userData.target.set(0, 0, 0);
      sheep.userData.recallUntil = performance.now() + 12000;
    }
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
  const mat = ge(11776947), dark = ge(6049085), wool = ge(15985899);
  const canopy = new t.Mesh(new t.ConeGeometry(92, 48, 4), mat);
  canopy.position.y = 92; canopy.rotation.y = Math.PI / 4; shop.add(canopy);
  for (const x of [-58,58]) for (const zc of [-48,48]) {
    const post = new t.Mesh(new t.CylinderGeometry(4,5,92,6), dark);
    post.position.set(x,44,zc); shop.add(post);
  }
  const pen = new t.Mesh(new t.BoxGeometry(150,5,120), dark);
  pen.position.y=3; shop.add(pen);
  const sheepIcon = new t.Mesh(new t.IcosahedronGeometry(25,1), wool);
  sheepIcon.scale.set(1.35,0.9,0.9); sheepIcon.position.set(0,36,0); shop.add(sheepIcon);
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
    e("#reconnectHint")?.classList.toggle("show", S && !b && !t),
      e("#settingsPanel").classList.contains("hidden") &&
        S &&
        !b &&
        !t &&
        e("#cheatConsole").classList.contains("hidden") &&
        e("#gameOver").classList.contains("hidden") &&
        Ie();
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
              n < 125 &&
                n > 0 &&
                e.normalize().dot(a) > 0.15 &&
                ((t.userData.hp -= 34),
                t.position.addScaledVector(a, 42),
                (s = !0),
                t.userData.hp <= 0 && Ue(t));
            }
            o.userData.urgedSheep = !1;
            for (const e of mt.sheep) {
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
  if (
    !e ||
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
  return (
    o || "저녁" !== n || ((s *= 0.62), (a *= 0.66)), s + Math.random() * (a - s)
  );
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
  (ut.respect = Math.min(100, ut.respect + 2)),
    (ut.money = Math.min(1e7, ut.money + 15)),
    (ut.thirst = 100),
    ut.hp < 100 && (ut.hp = Math.min(100, ut.hp + 14)),
    e("#thirstHud").classList.add("show"),
    (e("#mission").style.display = "none"),
    Ve(2),
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
function Ye(e, o, n) {
  return new t.Color(e).lerp(new t.Color(o), n);
}
function _e(o, n) {
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
        (t.userData.glow.intensity =
          o * (t.userData.campTorch ? 5.2 : 4.4) * e),
          (t.userData.flame.material.opacity = o * (0.78 + 0.18 * e)),
          (t.userData.flame.scale.y = 0.88 + 0.18 * e),
          (t.visible = o > 0.025);
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
      if (!e || !mt.jerusalem) return;
      mt.jerusalem.traverse((t) => {
        t.isMesh &&
          t.userData.cameraHidden &&
          ((t.visible = !0), (t.userData.cameraHidden = !1));
      });
      const o = e.position.clone().sub(r.position),
        n = o.length(),
        s = new t.Raycaster(
          r.position,
          o.normalize(),
          0,
          Math.max(0, n - 28),
        ).intersectObjects(mt.jerusalem.children, !0);
      for (const t of s) {
        const e = t.object;
        e?.isMesh &&
          !e.userData.neverOcclude &&
          t.distance > 45 &&
          t.distance < n - 25 &&
          e.geometry?.parameters?.height < 260 &&
          ((e.visible = !1), (e.userData.cameraHidden = !0));
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
          s = c.clone().multiplyScalar(n * e),
          a = o.position.clone();
        (a.x += s.x),
          (a.y = te(a.x, a.z) + pt),
          jt(a, 15) || (o.position.x = a.x);
        const i = o.position.clone();
        (i.z += s.z),
          (i.y = te(i.x, i.z) + pt),
          jt(i, 15) || (o.position.z = i.z);
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
      }
      const l = te(o.position.x, o.position.z) + pt,
        h = o.userData.bodyRoot || o;
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
      updateTempleSheepHold(),
        y && Math.random() < 0.012 * e && kt("sheep");
      const n = mt.player;
      if (
        (mt.sheep.forEach((s, a) => {
          let i = s.userData.target;
          if (0 === i.lengthSq()) {
            const t = (a / mt.sheep.length) * Math.PI * 2 + s.userData.phase;
            i = wt.set(
              n.position.x - 110 + 110 * Math.sin(t),
              0,
              n.position.z - 110 + 110 * Math.cos(t),
            );
          }
          const r = i,
            c = r.x - s.position.x,
            l = r.z - s.position.z,
            h = Math.hypot(c, l),
            d = (s.userData.recallUntil || 0) > performance.now();
          if (h > 18) {
            const o =
              (s.userData.urgeUntil || 0) > performance.now()
                ? 112
                : d
                  ? 82
                  : 58;
            let i = s.position.x + (c / h) * o * e,
              r = s.position.z + (l / h) * o * e,
              p = new t.Vector3(i, te(i, r) + 5, r);
            if (jt(p, 10)) {
              const t = a % 2 ? 1 : -1,
                n = (-l / h) * t,
                d = (c / h) * t;
              (i = s.position.x + n * o * 0.82 * e),
                (r = s.position.z + d * o * 0.82 * e),
                p.set(i, te(i, r) + 5, r);
            }
            jt(p, 10) || ((s.position.x = i), (s.position.z = r));
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
                e = _t(
                  n.position.x + 92 * Math.sin(t),
                  n.position.z + 92 * Math.cos(t),
                );
              s.userData.target.set(e.x, 0, e.z),
                performance.now() - s.userData.lostSince > 3e4 &&
                  s.userData.rescueAttempts >= 6 &&
                  (s.position.set(e.x, te(e.x, e.z) + 1, e.z),
                  s.userData.lastPos.copy(s.position),
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
            s.userData.runPhase += e * (d ? 12 : 8);
            const o = Math.sin(s.userData.runPhase) * (d ? 0.55 : 0.34);
            (s.userData.legs[0].rotation.z = o),
              (s.userData.legs[3].rotation.z = o),
              (s.userData.legs[1].rotation.z = -o),
              (s.userData.legs[2].rotation.z = -o),
              (s.rotation.z = t.MathUtils.lerp(
                s.rotation.z,
                d ? -0.055 : 0,
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
        !e &&
          O <= 18 &&
          O > 0 &&
          !H &&
          ((H = !0), je("멀리서 맹수의 기척이 느껴집니다.", 5200)),
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
              s = "wolf" === n ? 2 : 1,
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
        const now = performance.now();
        updateRockRespawns(now);
        let o = e.userData.targetEntity;
        const isAnimal = e.userData.type !== "bandit";
        const validSheep = mt.sheep.filter((sheep) => !sheep.userData.safeHold);
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
            (moving ? Math.abs(Math.sin(e.userData.importedModelPhase)) * 2.2 : Math.sin(e.userData.importedModelPhase) * 0.45);
          e.userData.importedModel.rotation.z = moving
            ? Math.sin(e.userData.importedModelPhase) * 0.025
            : 0;
        }
        if (r > 42) {
          e.position.x += (s / r) * e.userData.speed * t;
          e.position.z += (a / r) * e.userData.speed * t;
          e.rotation.y = Math.atan2(s, a);
        } else if (o === mt.player) {
          if (!ut.invincible) ut.hp -= 8.5 * t;
        } else if (isAnimal && now >= (e.userData.nextSheepAttackAt || 0)) {
          damageSheep(o, e);
          e.userData.nextSheepAttackAt = now + 2000;
        }
        e.position.y = te(e.position.x, e.position.z) + 1;
      }
    })(o),
    (function (e) {
      for (const o of mt.projectiles) {
        if (
          (o.position.clone(),
          (o.userData.velocity.y -= 120 * e),
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
                eo(t.userData.label + " 명중!"),
                (n = !0),
                t.userData.hp <= 0 && Ue(t);
              break;
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
        ((mt.templeSmoke.material.opacity = 0.17 + 0.035 * Math.sin(0.7 * e)),
        (mt.templeSmoke.scale.x = 1 + 0.12 * Math.sin(0.45 * e)),
        (mt.templeSmoke.scale.z = 1 + 0.1 * Math.cos(0.4 * e))),
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
              (t.position.y += 0.035 * Math.sin(n)),
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
      let e = 0;
      for (const t of mt.sheep)
        Math.hypot(t.position.x - Z.x, t.position.z - Z.z) < 365 && e++;
      const o = Math.max(1, mt.sheep.length);
      e < o && e >= Math.max(1, o - 3)
        ? ((et += 1 / 60), et > 2.2 && (Ne(), (et = 0)))
        : (et = 0),
        e >= o &&
          ((ut.missionDone = !0),
          "밤" === Ze(ut.worldTime).name
            ? (function (e) {
                if (He) return void e();
                He = !0;
                const o = mt.player,
                  n = o?.userData?.bodyRoot || o,
                  s = mt.sheep.reduce(
                    (t, e) =>
                      !t ||
                      e.position.distanceTo(o.position) <
                        t.position.distanceTo(o.position)
                        ? e
                        : t,
                    null,
                  ),
                  a = n?.rotation.x || 0,
                  i = n?.position.y || 0;
                if ((n && ((n.rotation.x = 0.42), (n.position.y = i - 7)), s)) {
                  const e = new t.Vector3().subVectors(s.position, o.position);
                  (e.y = 0),
                    e.lengthSq() > 0 &&
                      (e.normalize(),
                      s.position.copy(o.position).addScaledVector(e, 45),
                      (s.position.y = te(s.position.x, s.position.z) + 22));
                }
                eo("양젖을 짜고 있습니다."),
                  setTimeout(() => {
                    n && ((n.rotation.x = a), (n.position.y = i)),
                      (He = !1),
                      e();
                  }, 2400);
              })(Ke)
            : Ke());
    })(),
    updateRockRespawns(performance.now()),
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
    $e(),
    (function () {
      const o = e("#crosshair");
      if (!o) return;
      let n = !1;
      if (G && ut.skill >= 50 && mt.enemies.some((t) => t.userData.hp > 0)) {
        const e = new t.Raycaster();
        e.setFromCamera(new t.Vector2(0, 0), r),
          (n = e
            .intersectObjects(mt.enemies, !0)
            .some((t) => t.distance < 1100));
      }
      o.classList.toggle("target-lock", n);
    })(),
    (function () {
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
