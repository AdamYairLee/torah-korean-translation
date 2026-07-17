import * as THREE from './three.module.js';

const $ = s => document.querySelector(s);
const screens = [...document.querySelectorAll('.screen')];
const mobileUA = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isMobile = mobileUA && Math.min(screen.width, screen.height) < 1000;
$('#mobileBlock').classList.toggle('hidden', !isMobile);

const mini = $('#minimap');
const mctx = mini.getContext('2d');
const host = $('#rendererHost');
let scene, camera, renderer, clock;
let sunLight=null, hemiLight=null, skyMaterial=null, sunDiscMesh=null;
let audioCtx=null, windSource=null, windGain=null, masterGain=null, soundEnabled=localStorage.getItem('shepherdSoundEnabled')!=='0';
let nextBirdSound=0, nextNightSound=0;
let masterVolume=Number(localStorage.getItem('shepherdVolume')??55)/100;
const worldColliders=[];
let activeRegion='';
let running = false, paused = false, aiming = false, charging = false, charge = 0;
let currentWeapon='sling', gameOverPenaltyApplied=false, staffAttackCooldown=0;
let yaw = Math.PI, pitch = -0.10, pointerSensitivity = Number(localStorage.getItem('shepherdMouseSensitivity')) || 0.0060;
let currentCamDistance = 190, currentCamHeight = 135, currentFov = 58;
let cameraMode = 0;
const CAMERA_MODES = [
  {name:'기본 시점',distance:190,height:135,fov:58},
  {name:'사람 확대 시점',distance:95,height:105,fov:52},
  {name:'눈 시점',distance:0,height:77,fov:64,firstPerson:true},
  {name:'원거리 시점',distance:335,height:205,fov:61}
];
const EAST_CLIFF_X = 3300;
const MINI_RANGE = 1900;
const CITY_WATER_ZONES = [];
let jumpPressed = false;
let enemySpawnTimer = 0;
let enemyCooldown = 0;
let dangerWarningShown = false;
const keys = {};
const WORLD = 7600;
let goal = new THREE.Vector3(-1150, 0, 1050);
let davidObjText='';
let davidAssetPromise=null;
let missionCycle = 1;
let activeWolfPackId = 0;
let menuFocusIndex = 0;

const state = {
  hp: 100, stones: 15, quality: '좋은 돌', money: 0, respect: 0,
  invincible: false, skill: 0, missionDone: false, cheatUsed: false, thirst: 100, thirstFailed: false, worldTime: 0.29
};
const objects = { player:null, sheep:[], rocks:[], enemies:[], projectiles:[], npcs:[], terrain:null, goal:null, goalSite:null, aimRig:null, jordan:null, deadSea:null, gihon:null };
const GIHON_SPRING={x:1065,z:300,r:145};
const tempV = new THREE.Vector3();
const tempV2 = new THREE.Vector3();

function showScreen(id){ screens.forEach(s=>s.classList.toggle('active', s.id===id)); }
$('#startBtn').onclick = () => showScreen('characterScreen');
$('#continueBtn').onclick = () => { initGame(true); };
$('#playBtn').onclick = () => { initGame(false); };
$('#davidCard').onclick = () => { if(!running) initGame(false); };
$('#settingsBtn').onclick = () => openSettings(false);
const soundToggle=$('#soundEnabled');soundToggle.checked=soundEnabled;
const volumeRange=$('#volumeRange'),volumeValue=$('#volumeValue');
volumeRange.value=Math.round(masterVolume*100);volumeValue.textContent=volumeRange.value;


function sensitivityToSlider(value){ return Math.round(THREE.MathUtils.clamp(value / 0.0001, 10, 100)); }
function sliderToSensitivity(value){ return Number(value) * 0.0001; }
function openSettings(fromPause=true){
  const slider=$('#sensitivityRange');
  slider.value=String(sensitivityToSlider(pointerSensitivity));
  $('#sensitivityValue').textContent=slider.value;
  $('#settingsPanel').dataset.fromPause=fromPause?'1':'0';
  $('#settingsPanel').classList.remove('hidden');
  if(running){ paused=true; document.exitPointerLock?.(); }
  setTimeout(()=>focusMenuItem($('#settingsPanel'),0),0);
}
function closeSettings(){
  $('#settingsPanel').classList.add('hidden');
  const fromPause=$('#settingsPanel').dataset.fromPause==='1';
  if(running){
    if(fromPause){ $('#pause').classList.remove('hidden'); paused=true; }
    else { paused=false; renderer?.domElement.requestPointerLock?.(); }
  }
}
$('#sensitivityRange').addEventListener('input',e=>{
  pointerSensitivity=sliderToSensitivity(e.target.value);
  $('#sensitivityValue').textContent=e.target.value;
  localStorage.setItem('shepherdMouseSensitivity',String(pointerSensitivity));
});
$('#settingsCloseBtn').onclick=closeSettings;
soundToggle.addEventListener('change',()=>{soundEnabled=soundToggle.checked;localStorage.setItem('shepherdSoundEnabled',soundEnabled?'1':'0');ensureAudio();audioCtx?.resume?.();setMasterSound(soundEnabled);applyFileAudioVolume();if(soundEnabled)setTimeout(()=>tone(620,.12,.07,'sine',180),80);});
volumeRange.addEventListener('input',()=>{masterVolume=Number(volumeRange.value)/100;volumeValue.textContent=volumeRange.value;localStorage.setItem('shepherdVolume',String(volumeRange.value));ensureAudio();audioCtx?.resume?.();setMasterSound(soundEnabled);applyFileAudioVolume();if(soundEnabled)tone(520,.05,.025,'sine',60);});
$('#pauseSettingsBtn').onclick=()=>{ $('#pause').classList.add('hidden'); openSettings(true); };




const FILE_AUDIO={
  wind:new Audio('./assets/audio/wind.wav'),
  birds:new Audio('./assets/audio/day_birds.wav'),
  night:new Audio('./assets/audio/night_insects.wav'),
  pickup:new Audio('./assets/audio/pickup.wav'),
  mission:new Audio('./assets/audio/mission.wav'),
  danger:new Audio('./assets/audio/danger.wav'),
  staff:new Audio('./assets/audio/staff.wav'),
  sheep:new Audio('./assets/audio/sheep_bleat.wav')
};
FILE_AUDIO.wind.loop=true;FILE_AUDIO.birds.loop=true;FILE_AUDIO.night.loop=true;
function applyFileAudioVolume(){
  const v=soundEnabled?masterVolume:0;
  FILE_AUDIO.wind.volume=v*.45;FILE_AUDIO.birds.volume=v*.55;FILE_AUDIO.night.volume=v*.45;
  FILE_AUDIO.pickup.volume=v*.8;FILE_AUDIO.mission.volume=v*.85;FILE_AUDIO.danger.volume=v*.85;FILE_AUDIO.staff.volume=v*.7;FILE_AUDIO.sheep.volume=v*.55;
}
async function startFileAudio(){
  applyFileAudioVolume();
  if(!soundEnabled)return;
  try{await FILE_AUDIO.wind.play();}catch{}
}
function playFileSound(name){
  if(!soundEnabled)return;
  const a=FILE_AUDIO[name];if(!a)return;
  try{a.currentTime=0;a.play();}catch{}
}
function pauseAllGameAudio(){
  for(const a of Object.values(FILE_AUDIO)){try{a.pause();}catch{}}
  if(audioCtx&&audioCtx.state==='running')audioCtx.suspend().catch(()=>{});
}
function resumeGameAudio(){
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  if(soundEnabled)updateFileAmbience();
}

function updateFileAmbience(){
  if(!soundEnabled){FILE_AUDIO.wind.pause();FILE_AUDIO.birds.pause();FILE_AUDIO.night.pause();return;}
  if(FILE_AUDIO.wind.paused)FILE_AUDIO.wind.play().catch(()=>{});
  const phase=phaseFor(state.worldTime).name;
  if(['아침','점심','오후'].includes(phase)){
    FILE_AUDIO.night.pause();
    if(FILE_AUDIO.birds.paused)FILE_AUDIO.birds.play().catch(()=>{});
  }else if(phase==='밤'){
    FILE_AUDIO.birds.pause();
    if(FILE_AUDIO.night.paused)FILE_AUDIO.night.play().catch(()=>{});
  }else{
    FILE_AUDIO.birds.pause();FILE_AUDIO.night.pause();
  }
}

async function unlockAudio(){
  ensureAudio();
  if(!audioCtx)return;
  try{
    if(audioCtx.state!=='running')await audioCtx.resume();
    setMasterSound(soundEnabled);
  }catch{}
}

function ensureAudio(){
  if(audioCtx)return;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  audioCtx=new AC();
  masterGain=audioCtx.createGain();
  masterGain.gain.value=soundEnabled?Math.max(.12,masterVolume):0;
  masterGain.connect(audioCtx.destination);

  const length=audioCtx.sampleRate*2;
  const buffer=audioCtx.createBuffer(1,length,audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(.65-Math.min(.55,i/length*.25));
  windSource=audioCtx.createBufferSource();windSource.buffer=buffer;windSource.loop=true;
  const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;filter.Q.value=.25;
  windGain=audioCtx.createGain();windGain.gain.value=.22;
  windSource.connect(filter).connect(windGain).connect(masterGain);windSource.start();
}
function setMasterSound(enabled){
  if(!audioCtx||!masterGain)return;
  masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(enabled?Math.max(.12,masterVolume):0,audioCtx.currentTime+.15);
}
function tone(freq=440,duration=.12,volume=.05,type='sine',slide=0){
  if(!soundEnabled)return;
  ensureAudio();if(!audioCtx||!masterGain)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),audioCtx.currentTime+duration);
  g.gain.setValueAtTime(.0001,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(volume,audioCtx.currentTime+.015);
  g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
  o.connect(g).connect(masterGain);o.start();o.stop(audioCtx.currentTime+duration+.02);
}
function noiseBurst(duration=.12,volume=.04,cutoff=900){
  if(!soundEnabled)return;
  ensureAudio();if(!audioCtx||!masterGain)return;
  const length=Math.max(1,Math.floor(audioCtx.sampleRate*duration));
  const b=audioCtx.createBuffer(1,length,audioCtx.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<length;i++)d[i]=(Math.random()*2-1)*(1-i/length);
  const s=audioCtx.createBufferSource(),f=audioCtx.createBiquadFilter(),g=audioCtx.createGain();
  s.buffer=b;f.type='lowpass';f.frequency.value=cutoff;g.gain.value=volume;
  s.connect(f).connect(g).connect(masterGain);s.start();
}
function playBird(){
  tone(1250,.10,.055,'sine',420);setTimeout(()=>tone(1570,.07,.018,'sine',-260),90);
}
function playNightInsect(){
  tone(3400,.045,.028,'square',120);setTimeout(()=>tone(3150,.03,.009,'square',80),75);
}
function playDangerSound(){playFileSound('danger');tone(145,.65,.10,'sawtooth',-45);setTimeout(()=>tone(110,.7,.045,'sawtooth',-25),180);}
function playPickupSound(){playFileSound('pickup');tone(740,.10,.065,'sine',250);}
function playMissionSound(){playFileSound('mission');tone(440,.20,.085,'sine',180);setTimeout(()=>tone(660,.22,.04,'sine',210),180);}
function playStaffSound(hit){if(hit)playFileSound('staff');noiseBurst(.12,hit?.07:.035,hit?700:1100);}

async function initGame(load){
  await ensureDavidAsset();
  startFileAudio();
  unlockAudio().then(()=>{if(soundEnabled)tone(520,.12,.08,'sine',160);});
  showScreen('gameScreen');
  if (!renderer) buildScene();
  resetWorld();
  if (load) loadGame();
  running = true; paused = false;
  clock?.start();
  clock?.getDelta();
  document.documentElement.requestFullscreen?.().catch(()=>{});
  renderer.domElement.requestPointerLock?.();
  notice('예루샬라임과 주변 광야\n성 안에서는 강도를, 성 밖에서는 야생 동물을 경계하십시오.');
}

function buildScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb9c9c7);
  scene.fog = new THREE.FogExp2(0xc8b99d, 0.00034);
  camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, 0.1, 15000);
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  clock = new THREE.Clock();

  hemiLight=new THREE.HemisphereLight(0xc7def0, 0x5f442d, 2.2);scene.add(hemiLight);
  const sun = new THREE.DirectionalLight(0xffe2aa, 3.0);sunLight=sun;
  sun.position.set(-700, 1200, 500); sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-1300;sun.shadow.camera.right=1300;sun.shadow.camera.top=1300;sun.shadow.camera.bottom=-1300;
  scene.add(sun);
  createPastelSky();

  createTerrain();
  createScenery();
  createGoal();
  createAimRig();
  scene.add(camera);
  addEventListener('resize', onResize);
  renderer.setAnimationLoop(loop);
}


function createPastelSky(){
  const skyGeo=new THREE.SphereGeometry(5200,32,18);
  const skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide,
    depthWrite:false,
    uniforms:{top:{value:new THREE.Color(0x8faeb8)},middle:{value:new THREE.Color(0xd8c9ae)},bottom:{value:new THREE.Color(0xe8d4ad)}},
    vertexShader:`varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec3 vPos; uniform vec3 top; uniform vec3 middle; uniform vec3 bottom; void main(){float h=normalize(vPos).y; vec3 c=h>0.15?mix(middle,top,smoothstep(0.15,0.9,h)):mix(bottom,middle,smoothstep(-0.25,0.15,h)); gl_FragColor=vec4(c,1.0);}`
  });
  skyMaterial=skyMat;const sky=new THREE.Mesh(skyGeo,skyMat);scene.add(sky);
  const sunDisc=new THREE.Mesh(new THREE.CircleGeometry(95,32),new THREE.MeshBasicMaterial({color:0xffe8b2,transparent:true,opacity:.75,depthWrite:false}));
  sunDisc.position.set(-1300,1150,-2500);sunDisc.lookAt(0,300,0);scene.add(sunDisc);sunDiscMesh=sunDisc;
}


const CITY_DEFS=[
  {name:'예루샬라임',x:0,z:0,r:1750,size:'capital',wallR:1600,wallRX:980,wallRZ:1600}
];
const ABRAHAM_ROUTE=[[-1450,1050],[-1050,720],[-620,420],[-200,180],[260,-40],[720,-360],[1180,-760]];
const KIDRON_ROUTE=[[820,-1450],[920,-900],[960,-300],[900,380],[760,1050]];
const SAVE_VERSION=209;
const DEFAULT_START={x:-1500,z:1120};
function ridgeCenterX(z){ return -120 + Math.sin(z*.0008)*90; }
function centralRidgeHeight(z){
  return 175 + 55*Math.exp(-((z+150)**2)/1900000) + 18*Math.sin(z*.0018);
}
function addCircleCollider(x,z,r,type='solid'){worldColliders.push({shape:'circle',x,z,r,type})}
function addRectCollider(x,z,w,d,rotation=0,type='building'){worldColliders.push({shape:'rect',x,z,w,d,rotation,type})}
function collidesWorld(pos,radius=18){
  if(Math.abs(pos.x)>WORLD/2-80||Math.abs(pos.z)>WORLD/2-80)return true;
  for(const c of worldColliders){
    if(c.shape==='rect'){
      const dx=pos.x-c.x,dz=pos.z-c.z,cs=Math.cos(-c.rotation),sn=Math.sin(-c.rotation);
      const lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;
      if(Math.abs(lx)<c.w/2+radius&&Math.abs(lz)<c.d/2+radius)return true;
    }else if(Math.hypot(pos.x-c.x,pos.z-c.z)<c.r+radius)return true;
  }
  return false;
}
function cityEllipseValue(city,x,z,margin=0){const rx=(city.wallRX||city.wallR)+margin,rz=(city.wallRZ||city.wallR)+margin;return ((x-city.x)*(x-city.x))/(rx*rx)+((z-city.z)*(z-city.z))/(rz*rz);}
function isInsideJerusalem(x,z,margin=0){return cityEllipseValue(CITY_DEFS[0],x,z,margin)<1;}
function distanceToSegment2D(px,pz,ax,az,bx,bz){const vx=bx-ax,vz=bz-az,wx=px-ax,wz=pz-az;const c1=vx*wx+vz*wz;if(c1<=0)return Math.hypot(px-ax,pz-az);const c2=vx*vx+vz*vz;if(c2<=c1)return Math.hypot(px-bx,pz-bz);const t=c1/c2;return Math.hypot(px-(ax+t*vx),pz-(az+t*vz));}
function isReservedAlley(x,z,clearance=95){
  const paths=[[[0,1450],[0,-1300]],[[-690,700],[690,700]],[[-820,120],[820,120]],[[-650,-520],[650,-520]],[[0,430],[780,240]],[[0,-300],[-620,-650]],[[760,240],[930,250]],[[650,-520],[760,-900]]];
  return paths.some(([a,b])=>distanceToSegment2D(x,z,a[0],a[1],b[0],b[1])<clearance);
}
function isInsideCityCore(x,z,margin=0){return CITY_DEFS.some(c=>cityEllipseValue(c,x,z,margin)<1)}
function findSafeWorldPosition(preferredX,preferredZ){
  const candidates=[[preferredX,preferredZ]];
  for(let ring=1;ring<=24;ring++){
    const radius=ring*95;
    for(let i=0;i<20;i++){
      const a=i/20*Math.PI*2;
      candidates.push([preferredX+Math.sin(a)*radius,preferredZ+Math.cos(a)*radius]);
    }
  }
  for(const [x,z] of candidates){
    if(Math.abs(x)>WORLD/2-180||Math.abs(z)>WORLD/2-180)continue;
    if(localSlope(x,z)>.68)continue;
    const probe=new THREE.Vector3(x,terrainHeight(x,z)+4,z);
    if(collidesWorld(probe,28))continue;
    return {x,z};
  }
  return {x:DEFAULT_START.x,z:DEFAULT_START.z};
}
function placePlayerSafely(x,z){
  const safe=findSafeWorldPosition(x,z);
  objects.player.position.set(safe.x,terrainHeight(safe.x,safe.z)+83,safe.z);
  return safe;
}
function setRegionLabel(name){if(activeRegion===name)return;activeRegion=name;const el=$('#worldRegionLabel');if(!el)return;el.textContent=name;el.classList.add('show');clearTimeout(setRegionLabel.timer);setRegionLabel.timer=setTimeout(()=>el.classList.remove('show'),2800)}
function updateRegionLabel(){const p=objects.player?.position;if(!p)return;const city=CITY_DEFS[0],inside=cityEllipseValue(city,p.x,p.z,-70)<1;const landmark=$('#jerusalemLandmark');if(landmark)landmark.classList.toggle('show',inside);if(inside)setRegionLabel('예루샬라임 성내');else if(p.x>520)setRegionLabel('키드론 골짜기');else setRegionLabel('예루샬라임 주변 광야');}

function terrainHeight(x,z){
  // Long southeastern ridge: lower City of David in the south, royal/administrative
  // terrace above it, and the sacred hill at the northern high end.
  let h=70;
  const city=CITY_DEFS[0];
  const ev=cityEllipseValue(city,x,z,0);
  if(ev<1.55){
    const edge=1-THREE.MathUtils.smoothstep(ev,.72,1.55);
    const northRise=THREE.MathUtils.clamp((1120-z)/2350,0,1);
    const spine=Math.exp(-((x+70)**2)/250000);
    h += edge*(105+165*northRise+72*spine);
    // stepped inhabited ridge rather than a single flat slab
    h += edge*(14*Math.sin((z+1100)*.006)+9*Math.sin((x-z)*.008));
  }
  // Upper royal terrace and Temple Mount, rising successively northward.
  h += 72*Math.exp(-((x+40)**2)/310000-((z+510)**2)/180000);
  h += 148*Math.exp(-((x-10)**2)/390000-((z+1030)**2)/230000);
  // Kidron Valley: a continuous, visibly separate ravine east of the City of David ridge.
  const kidronX=1030+70*Math.sin((z+180)*.00125);
  h -= 300*Math.exp(-((x-kidronX)**2)/90000);
  h -= 95*Math.exp(-((x-kidronX-150)**2)/165000);
  // Mount of Olives begins beyond the ravine as a long north-south ridge, not rounded boulders.
  const olivesCore=Math.exp(-((x-1880)**2)/430000);
  const olivesLength=Math.exp(-((z+150)**2)/5200000);
  h += 165*olivesCore*olivesLength;
  // Shallower western valley.
  h -= 82*Math.exp(-((x+820)**2)/120000);
  // Southern outlet and the lower Siloam basin.
  h -= 88*Math.exp(-((x-80)**2+(z-1505)**2)/230000);
  if(x>2850)h-=THREE.MathUtils.smoothstep(x,2850,5200)*130;
  h += 10*Math.sin(x*.0042)+8*Math.cos(z*.0047)+5*Math.sin((x+z)*.006);
  return h;
}

function createTerrain(){
  const g=new THREE.PlaneGeometry(WORLD,WORLD,220,220);
  g.rotateX(-Math.PI/2);
  const pos=g.attributes.position,colors=[];
  const dry=new THREE.Color(0x9a866a),limestone=new THREE.Color(0xc2b08f);
  const grass=new THREE.Color(0x78805b),deepGrass=new THREE.Color(0x5f6849);
  const desert=new THREE.Color(0x7d6c58),salt=new THREE.Color(0xd2c9b2);
  const shadow=new THREE.Color(0x665d52),chalk=new THREE.Color(0xd8ccb0),iron=new THREE.Color(0x7d5844);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),y=terrainHeight(x,z);
    pos.setY(i,y);
    const north=THREE.MathUtils.smoothstep(z,-1700,1700);
    const east=THREE.MathUtils.smoothstep(x,650,2800);
    const shore=0;
    const fine=(Math.sin(x*.031+z*.017)+Math.cos(x*.019-z*.027)+2)/4;
    const coarse=(Math.sin(x*.0048)+Math.cos(z*.0056)+2)/4;
    const strata=(Math.sin((x+z)*.012)+1)/2;
    const variation=coarse*.58+fine*.28+strata*.14;
    let c=dry.clone().lerp(grass,north*.30*(1-east));
    if(z>2500)c.lerp(deepGrass,.10*(1-east));
    c.lerp(desert,east*.68);
    c.lerp(salt,shore*.82);
    c.lerp(limestone,.18+variation*.26);
    c.lerp(chalk,Math.max(0,.18-fine*.16));
    c.lerp(iron,Math.max(0,(coarse-.72)*.20));
    if(fine>.72)c.offsetHSL(0,-.025,.025);
    if(fine<.24)c.offsetHSL(0,.01,-.055);
    c.lerp(shadow,Math.min(.20,Math.max(0,y/1450)));
    colors.push(c.r,c.g,c.b);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.computeVertexNormals();
  const paperTex=new THREE.TextureLoader().load('./assets/painterly/paper_brush.png');
  paperTex.wrapS=paperTex.wrapT=THREE.RepeatWrapping;
  paperTex.repeat.set(96,96);
  paperTex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.MeshToonMaterial({vertexColors:true,flatShading:true,map:paperTex,gradientMap:painterGradient(),roughness:1});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;scene.add(mesh);objects.terrain=mesh;
  createDesertSurfaceDetails();
}


function createDesertSurfaceDetails(){
  const rnd=seededRandom(210041);
  const crustMats=[mat(0x8d7255),mat(0xa98b65),mat(0xc0a275),mat(0x725f4c)];
  // Broad fractured limestone plates; almost flush with the ground so they read as surface, not objects.
  for(let i=0;i<760;i++){
    const x=(rnd()-.5)*(WORLD-420),z=(rnd()-.5)*(WORLD-420);
    if(isInsideJerusalem(x,z,110)||localSlope(x,z)>.62)continue;
    const patch=new THREE.Mesh(new THREE.CircleGeometry(9+rnd()*31,5+Math.floor(rnd()*3)),crustMats[i%crustMats.length]);
    patch.rotation.x=-Math.PI/2;patch.rotation.z=rnd()*Math.PI;
    patch.scale.set(1.5+rnd()*3.5,.6+rnd()*.55,1);
    patch.position.set(x,terrainHeight(x,z)+.34,z);patch.receiveShadow=true;scene.add(patch);
  }
  const stoneMats=[mat(0x5f5041),mat(0x76614d),mat(0x92775a),mat(0xb09268)];
  // Angular surface stones in several scales, concentrated outside the city and away from paths.
  for(let i=0;i<640;i++){
    const x=(rnd()-.5)*(WORLD-500),z=(rnd()-.5)*(WORLD-500);
    if(isInsideJerusalem(x,z,90)||localSlope(x,z)>.74)continue;
    const size=2.2+rnd()*9.5;const detail=size>8?1:0;
    const pebble=new THREE.Mesh(new THREE.IcosahedronGeometry(size,detail),stoneMats[i%stoneMats.length]);
    pebble.scale.set(1+rnd()*2.2,.28+rnd()*.55,.65+rnd()*1.35);
    pebble.rotation.set((rnd()-.5)*.45,rnd()*Math.PI,(rnd()-.5)*.35);
    pebble.position.set(x,terrainHeight(x,z)+size*.23,z);pebble.castShadow=true;pebble.receiveShadow=true;scene.add(pebble);
  }
  // Sparse jagged limestone ribs make the wilderness look rough without becoming giant boulders.
  for(let i=0;i<115;i++){
    const x=(rnd()-.5)*(WORLD-900),z=(rnd()-.5)*(WORLD-900);
    if(isInsideJerusalem(x,z,220)||localSlope(x,z)>.55)continue;
    const g=new THREE.Group();
    const pieces=3+Math.floor(rnd()*5);
    for(let k=0;k<pieces;k++){
      const size=7+rnd()*14;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(size,0),stoneMats[(i+k)%stoneMats.length]);
      rock.scale.set(1.5+rnd()*1.6,.35+rnd()*.42,.65+rnd()*.8);
      rock.position.set((k-(pieces-1)/2)*(10+rnd()*7),size*.18,(rnd()-.5)*12);
      rock.rotation.set((rnd()-.5)*.3,rnd()*Math.PI,(rnd()-.5)*.22);g.add(rock);
    }
    g.position.set(x,terrainHeight(x,z)+.2,z);g.rotation.y=rnd()*Math.PI;scene.add(g);
  }
  // Sparse dry grass and low salt-tolerant shrubs, distributed in believable patches rather than an even carpet.
  const dryGrassMats=[mat(0x8f815c),mat(0xaa9364),mat(0x746d50)];
  const saltShrubMats=[mat(0x7c8060),mat(0x929477),mat(0x666b52)];
  for(let i=0;i<520;i++){
    const x=(rnd()-.5)*(WORLD-620),z=(rnd()-.5)*(WORLD-620);
    if(isInsideJerusalem(x,z,150)||localSlope(x,z)>.5)continue;
    const moisture=Math.exp(-((x-1030-70*Math.sin((z+180)*.00125))**2)/240000);
    const cluster=.35+.65*((Math.sin(x*.006+z*.003)+1)/2);
    if(rnd()>cluster*(.34+moisture*.30))continue;
    const tuft=new THREE.Group();
    const blades=3+Math.floor(rnd()*5);
    for(let k=0;k<blades;k++){
      const h=5+rnd()*12;const blade=new THREE.Mesh(new THREE.ConeGeometry(.6+rnd()*.8,h,4),dryGrassMats[(i+k)%dryGrassMats.length]);
      blade.position.set((rnd()-.5)*7,h*.5,(rnd()-.5)*7);blade.rotation.z=(rnd()-.5)*.48;blade.rotation.x=(rnd()-.5)*.20;tuft.add(blade);
    }
    tuft.position.set(x,terrainHeight(x,z)+.15,z);tuft.rotation.y=rnd()*Math.PI;tuft.scale.setScalar(.75+rnd()*.75);scene.add(tuft);
  }
  for(let i=0;i<190;i++){
    const x=(rnd()-.5)*(WORLD-700),z=(rnd()-.5)*(WORLD-700);
    if(isInsideJerusalem(x,z,180)||localSlope(x,z)>.42)continue;
    const low=new THREE.Group();const lobes=4+Math.floor(rnd()*5);
    for(let k=0;k<lobes;k++){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(3.2+rnd()*4.8,1),saltShrubMats[(i+k)%saltShrubMats.length]);m.scale.set(1.4+rnd()*.7,.35+rnd()*.25,1+rnd()*.5);m.position.set((rnd()-.5)*18,1.5+rnd()*2,(rnd()-.5)*18);low.add(m);}
    low.position.set(x,terrainHeight(x,z)+.2,z);low.rotation.y=rnd()*Math.PI;scene.add(low);
  }
}
function seededRandom(seed){
  let t=seed>>>0;
  return ()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return ((r^r>>>14)>>>0)/4294967296;};
}

function createWadiRibbon(){
  const points=[];
  for(let i=0;i<=42;i++){
    const t=i/42;
    const x=-1500+t*3800;
    const z=850-1450*t+220*Math.sin(t*Math.PI*2.2);
    points.push(new THREE.Vector3(x,terrainHeight(x,z)+1.2,z));
  }
  const verts=[],inds=[];
  for(let i=0;i<points.length;i++){
    const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const tangent=next.clone().sub(prev).setY(0).normalize();
    const side=new THREE.Vector3(-tangent.z,0,tangent.x);
    const width=38+18*Math.sin(i*.75)**2;
    const left=points[i].clone().addScaledVector(side,width);
    const right=points[i].clone().addScaledVector(side,-width);
    verts.push(left.x,left.y,left.z,right.x,right.y,right.z);
    if(i<points.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;inds.push(a,c,b,c,d,b);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(inds);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:0xd4bd91,flatShading:true}));
  mesh.receiveShadow=true;scene.add(mesh);
}

function createMountainMass(x,z,sx,sy,sz,color,rot=0){
  const geo=new THREE.DodecahedronGeometry(1,1);
  const mesh=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color,flatShading:true}));
  mesh.scale.set(sx,sy,sz);mesh.rotation.y=rot;
  mesh.position.set(x,terrainHeight(x,z)+sy*.62,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  return mesh;
}

function createDistantRidges(){
  const rnd=seededRandom(9127);
  const colors=[0x8c765d,0x9c8466,0x796b59,0xa88f6c];
  const rings=[
    {r:2850,count:26,min:120,max:260},
    {r:3350,count:32,min:170,max:340}
  ];
  rings.forEach((ring,ri)=>{
    for(let i=0;i<ring.count;i++){
      const a=(i/ring.count)*Math.PI*2+(rnd()-.5)*.16;
      // Keep an eastern opening so the Dead Sea remains visible.
      if(Math.cos(a)>.78&&Math.abs(Math.sin(a))<.52)continue;
      const r=ring.r+(rnd()-.5)*240;
      const sx=ring.min+rnd()*(ring.max-ring.min);
      const sy=(ri?190:130)+rnd()*(ri?250:170);
      const sz=sx*(.55+rnd()*.55);
      createMountainMass(Math.sin(a)*r,Math.cos(a)*r,sx,sy,sz,colors[(i+ri)%colors.length],rnd()*Math.PI);
    }
  });
  // Characteristic stepped limestone cliffs to the east/southeast.
  for(let i=0;i<9;i++){
    const x=2050+i*180,z=-2050-i*65;
    createMountainMass(x,z,260,150+i*10,100,0x9f8869,.2+i*.1);
    createMountainMass(x+55,z+80,210,90+i*7,150,0xb29b78,-.2);
  }
}

function createDeadSeaVista(){
  const water=new THREE.Mesh(
    new THREE.PlaneGeometry(980,5200),
    new THREE.MeshToonMaterial({color:0x6e98a5,transparent:true,opacity:.9,side:THREE.DoubleSide})
  );
  water.rotation.x=-Math.PI/2;
  water.position.set(2550,-218,0);
  scene.add(water);objects.deadSea=water;

  const shoreMat=new THREE.MeshToonMaterial({color:0xd8c49a,flatShading:true});
  const westShore=new THREE.Mesh(new THREE.PlaneGeometry(180,5100),shoreMat);
  westShore.rotation.x=-Math.PI/2;westShore.position.set(1990,-211,0);scene.add(westShore);
  const eastShore=new THREE.Mesh(new THREE.PlaneGeometry(180,5100),shoreMat);
  eastShore.rotation.x=-Math.PI/2;eastShore.position.set(3110,-211,0);scene.add(eastShore);

  // Layered cliff face at the eastern edge of the Judean wilderness.
  const cliffMat=[mat(0x9b8262),mat(0xb29a76),mat(0x806d58)];
  for(let i=0;i<34;i++){
    const z=-3300+i*200;
    for(let layer=0;layer<4;layer++){
      const slab=new THREE.Mesh(
        new THREE.BoxGeometry(115+layer*38,48+layer*6,170),
        cliffMat[(i+layer)%cliffMat.length]
      );
      slab.position.set(1845+layer*48,-5-layer*55,z);
      slab.rotation.y=(i%3-1)*.025;
      slab.castShadow=true;slab.receiveShadow=true;scene.add(slab);
    }
  }

  // Jordan highland: visible across the Dead Sea at a comparable elevation.
  const jordan=new THREE.Group();
  const jordanColors=[0x8f765d,0xa58b68,0x766756];
  for(let i=0;i<19;i++){
    const z=-3000+i*335;
    const mesa=new THREE.Mesh(
      new THREE.DodecahedronGeometry(1,1),
      new THREE.MeshToonMaterial({color:jordanColors[i%jordanColors.length],flatShading:true})
    );
    mesa.scale.set(270+(i%4)*50,220+(i%5)*38,210+(i%3)*55);
    mesa.position.set(3400,80+(i%4)*18,z);
    mesa.rotation.y=(i%5)*.17;mesa.castShadow=true;mesa.receiveShadow=true;jordan.add(mesa);
  }
  scene.add(jordan);objects.jordan=jordan;
}

function createAcacia(x,z,scale=1){
  const g=new THREE.Group();
  const trunk=addCylinder(g,3.2*scale,5*scale,35*scale,[0,17*scale,0],0x6e4930,7);
  trunk.rotation.z=.08;
  const crownMat=mat(0x667052);
  [[0,40,0],[12,38,3],[-13,37,-2],[4,43,-10]].forEach(([cx,cy,cz],i)=>{
    const c=new THREE.Mesh(new THREE.IcosahedronGeometry((13-i)*scale,0),crownMat);c.scale.y=.45;c.position.set(cx*scale,cy*scale,cz*scale);c.castShadow=true;g.add(c);
  });
  g.position.set(x,terrainHeight(x,z),z);scene.add(g);
}

function createPasturePatches(){
  const green=mat(0x7f8d62),dry=mat(0x9f996f);
  const rnd=seededRandom(2718);
  for(let i=0;i<22;i++){
    const x=-1250+rnd()*3000,z=-1150+rnd()*2500;
    const y=terrainHeight(x,z)+1.4;
    if(y>75)continue;
    const patch=new THREE.Mesh(new THREE.CircleGeometry(45+rnd()*90,10),rnd()>.35?green:dry);
    patch.rotation.x=-Math.PI/2;patch.rotation.z=rnd()*Math.PI;patch.position.set(x,y,z);patch.scale.y=.45+rnd()*.4;scene.add(patch);
  }
}

function createShepherdDestination(){
  const g=new THREE.Group();
  const stone=mat(0xb6a27f),cloth=mat(0x7c5c45),wood=mat(0x684428);
  // Low dry-stone sheepfold around each wandering destination.
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2;
    if(Math.abs(Math.sin(a))<.2&&Math.cos(a)<0)continue;
    const b=new THREE.Mesh(new THREE.BoxGeometry(38,22,18),stone);
    b.position.set(Math.sin(a)*155,11,Math.cos(a)*120);b.rotation.y=a;b.castShadow=true;g.add(b);
  }
  const tent=new THREE.Mesh(new THREE.ConeGeometry(72,68,4),cloth);tent.rotation.y=Math.PI/4;tent.position.set(205,34,35);tent.castShadow=true;g.add(tent);
  addCylinder(g,2.6,3.5,78,[205,39,35],0x684428,6);
  const fire=new THREE.Mesh(new THREE.ConeGeometry(8,22,7),mat(0xd37a3c));fire.position.set(160,11,-35);g.add(fire);

  // Water trough: low stone basin with visible water.
  const waterTrough=new THREE.Group();
  addBox(waterTrough,[94,12,10],[0,6,-25],0x9d8969);
  addBox(waterTrough,[94,12,10],[0,6,25],0x9d8969);
  addBox(waterTrough,[10,12,50],[-42,6,0],0x9d8969);
  addBox(waterTrough,[10,12,50],[42,6,0],0x9d8969);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(74,38),new THREE.MeshToonMaterial({color:0x6f9da1,transparent:true,opacity:.88,side:THREE.DoubleSide}));
  water.rotation.x=-Math.PI/2;water.position.y=9;waterTrough.add(water);waterTrough.position.set(-220,0,62);g.add(waterTrough);

  // Feed trough: rough wood frame with visible green fodder.
  const feedTrough=new THREE.Group();
  addBox(feedTrough,[92,9,9],[0,11,-22],0x72502f);
  addBox(feedTrough,[92,9,9],[0,11,22],0x72502f);
  addBox(feedTrough,[8,24,8],[-38,0,-18],0x684428);addBox(feedTrough,[8,24,8],[38,0,-18],0x684428);
  addBox(feedTrough,[8,24,8],[-38,0,18],0x684428);addBox(feedTrough,[8,24,8],[38,0,18],0x684428);
  const fodder=new THREE.Mesh(new THREE.BoxGeometry(72,8,31),mat(0x788353));fodder.position.y=12;feedTrough.add(fodder);feedTrough.position.set(-220,0,-55);g.add(feedTrough);

  // A small stone cairn makes each destination readable from afar.
  for(let i=0;i<4;i++){const cairn=new THREE.Mesh(new THREE.DodecahedronGeometry(18-i*3,0),stone);cairn.position.set(0,14+i*18,-155);cairn.castShadow=true;g.add(cairn);}
  scene.add(g);objects.goalSite=g;moveGoalSite();
}

function moveGoalSite(){
  if(!isValidCampPosition(goal.x,goal.z)){
    const fixed=[[-1500,1500],[-1700,-1300],[1550,1500],[1450,-1500],[-2200,300]];
    const fallback=fixed.find(([x,z])=>isValidCampPosition(x,z))||[-1800,1200];
    goal.set(fallback[0],0,fallback[1]);
  }
  if(objects.goal){objects.goal.position.set(goal.x,terrainHeight(goal.x,goal.z)+3,goal.z);}
  if(objects.goalSite){objects.goalSite.position.set(goal.x,terrainHeight(goal.x,goal.z)+1,goal.z);objects.goalSite.rotation.y=Math.atan2(ridgeCenterX(goal.z)-goal.x,420);}
}

function isValidCampPosition(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(Math.abs(x)>WORLD/2-520||Math.abs(z)>WORLD/2-520)return false;
  if(isInsideJerusalem(x,z,480))return false;
  if(x>EAST_CLIFF_X-260)return false;
  const y=terrainHeight(x,z);
  if(!Number.isFinite(y)||y<-120||y>610||localSlope(x,z)>.34)return false;
  const probe=new THREE.Vector3(x,y+3,z);
  if(collidesWorld(probe,230))return false;
  return true;
}
function chooseNextGoal(){
  const origin=objects.player?.position||goal;
  let candidate=null;
  for(let attempt=0;attempt<900;attempt++){
    const angle=Math.random()*Math.PI*2,dist=900+Math.random()*1450;
    const x=THREE.MathUtils.clamp(origin.x+Math.sin(angle)*dist,-WORLD/2+600,WORLD/2-600);
    const z=THREE.MathUtils.clamp(origin.z+Math.cos(angle)*dist,-WORLD/2+600,WORLD/2-600);
    if(!isValidCampPosition(x,z))continue;
    candidate=new THREE.Vector3(x,0,z);break;
  }
  if(!candidate){
    const fixed=[[-1500,1500],[-1700,-1300],[1550,1500],[1450,-1500],[-2200,300]];
    const found=fixed.find(([x,z])=>isValidCampPosition(x,z));
    candidate=new THREE.Vector3(...(found||[-1800,1200]).flatMap((v,i)=>i===0?[v,0]:[v]));
  }
  goal.set(candidate.x,0,candidate.z);missionCycle+=1;moveGoalSite();
}


function createLimestoneTerraces(){
  const terraceMat=[mat(0xb6a07b),mat(0xa58d69),mat(0xc2ad87)];
  const locations=[[-1750,-1450,1.1],[1450,-1200,.9],[-2100,900,.8],[1850,1250,1.0]];
  locations.forEach(([x,z,s],idx)=>{
    const group=new THREE.Group();
    for(let level=0;level<7;level++){
      const slab=new THREE.Mesh(
        new THREE.BoxGeometry((480-level*42)*s,18+(level%2)*5,(145-level*8)*s),
        terraceMat[(idx+level)%terraceMat.length]
      );
      slab.position.set(level*24*s,level*28,level*18*s);
      slab.rotation.y=(idx%2?-.24:.20);
      slab.castShadow=true;slab.receiveShadow=true;group.add(slab);
    }
    group.position.set(x,terrainHeight(x,z)+5,z);scene.add(group);
  });
}
function createDryShrub(x,z,scale=1){
  const g=new THREE.Group(), branch=mat(0x705b3d), leaf=mat(0x7c8056);
  for(let i=0;i<7;i++){
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.7,1.7,18+Math.random()*14,5),branch);
    stem.position.y=8;stem.rotation.z=(i-3)*.13;stem.rotation.y=i*.92;g.add(stem);
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(5+Math.random()*4,0),leaf);
    crown.position.set(Math.sin(i*.92)*7,18+Math.random()*8,Math.cos(i*.92)*7);crown.scale.y=.55;g.add(crown);
  }
  g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(scale);scene.add(g);
}
function createDistantSettlement(){
  const g=new THREE.Group(), stone=mat(0xb9a27c), dark=mat(0x806b50);
  for(let i=0;i<18;i++){
    const w=45+(i%4)*12,h=35+(i%5)*10,d=42+(i%3)*9;
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),stone);
    b.position.set((i%6)*62, h/2, Math.floor(i/6)*58);
    b.rotation.y=((i%3)-1)*.04;b.castShadow=true;g.add(b);
    if(i%4===0){
      const lintel=new THREE.Mesh(new THREE.BoxGeometry(18,20,4),dark);
      lintel.position.set(b.position.x,b.position.y-5,b.position.z+d/2+2);g.add(lintel);
    }
  }
  g.position.set(-2850,terrainHeight(-2850,-2500),-2500);
  g.rotation.y=.28;g.scale.setScalar(1.35);scene.add(g);
}
function createBirdFlock(){
  const birdMat=new THREE.LineBasicMaterial({color:0x5b5147,transparent:true,opacity:.75});
  const flock=new THREE.Group();
  for(let i=0;i<13;i++){
    const shape=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8,0,0),new THREE.Vector3(0,4,0),new THREE.Vector3(8,0,0)
    ]);
    const bird=new THREE.Line(shape,birdMat);
    bird.position.set((i%5)*42,Math.floor(i/5)*25,(i%3)*28);bird.rotation.y=(i%4)*.25;flock.add(bird);
  }
  flock.position.set(500,720,-1900);flock.userData.drift=0;scene.add(flock);
  objects.birds=flock;
}


function createCliffLookoutDetails(){
  const stoneMats=[mat(0x9c8465),mat(0xb39b79),mat(0x736653)];
  for(let i=0;i<55;i++){
    const z=-3000+i*110;
    const x=1570+Math.sin(i*.7)*115;
    const rock=new THREE.Mesh(
      new THREE.DodecahedronGeometry(24+(i%6)*7,0),
      stoneMats[i%stoneMats.length]
    );
    rock.scale.set(1.4,.65,1.1);
    rock.position.set(x,terrainHeight(x,z)+12,z);
    rock.rotation.y=i*.43;rock.castShadow=true;scene.add(rock);
  }
}
function createWildernessLandmarks(){
  const stone=mat(0xb29c77),shadow=mat(0x796854);
  const locations=[[-1650,-560],[-1120,1480],[720,1640],[1320,720]];
  locations.forEach(([x,z],idx)=>{
    const g=new THREE.Group();
    for(let i=0;i<5;i++){
      const pillar=new THREE.Mesh(new THREE.BoxGeometry(24+i*4,75-i*7,22+i*2),i%2?stone:shadow);
      pillar.position.set(i*30,35-i*2,(i%2)*16);pillar.rotation.z=(i-2)*.035;pillar.castShadow=true;g.add(pillar);
    }
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(150,24,28),stone);
    lintel.position.set(60,82,7);lintel.rotation.z=(idx%2?-.04:.03);lintel.castShadow=true;g.add(lintel);
    g.position.set(x,terrainHeight(x,z),z);g.rotation.y=idx*.55;g.scale.setScalar(.72);scene.add(g);
  });
}



function localSlope(x,z,step=42){const h=terrainHeight(x,z);return Math.max(Math.abs(terrainHeight(x+step,z)-h),Math.abs(terrainHeight(x-step,z)-h),Math.abs(terrainHeight(x,z+step)-h),Math.abs(terrainHeight(x,z-step)-h))/step;}
function addBattlements(parent,length,baseY,centerX,centerZ,rotationY,material,spacing=34){
  const count=Math.max(2,Math.floor(length/spacing));
  const step=length/count;
  for(let i=0;i<count;i++){
    const offset=(i-(count-1)/2)*step;
    const merlon=new THREE.Mesh(new THREE.BoxGeometry(18,24,22),material);
    merlon.position.set(centerX+Math.cos(rotationY)*offset,baseY+12,centerZ-Math.sin(rotationY)*offset);
    merlon.rotation.y=rotationY;merlon.castShadow=true;parent.add(merlon);
  }
}
function createGatehouse(group,worldX,worldZ,gx,gz,gateWidth,wallMat,darkMat,rotationY=0,cityScale=1){
  const towerW=138*cityScale,towerH=345*cityScale,towerD=132*cityScale;
  const alongX=Math.cos(rotationY),alongZ=-Math.sin(rotationY);
  const perpX=Math.sin(rotationY),perpZ=Math.cos(rotationY);
  const sample=[];
  for(const along of [-gateWidth*.55,0,gateWidth*.55])for(const across of [-towerD*.55,0,towerD*.55]){
    sample.push(terrainHeight(worldX+gx+alongX*along+perpX*across,worldZ+gz+alongZ*along+perpZ*across));
  }
  const groundLow=Math.min(...sample),groundHigh=Math.max(...sample),towerBottom=groundLow-14;
  for(const side of [-1,1]){
    const offset=side*(gateWidth/2+towerW/2),tx=gx+alongX*offset,tz=gz+alongZ*offset;
    const localSamples=[];
    for(const sx of [-towerW*.5,0,towerW*.5])for(const sz of [-towerD*.5,0,towerD*.5])localSamples.push(terrainHeight(worldX+tx+alongX*sx+perpX*sz,worldZ+tz+alongZ*sx+perpZ*sz));
    const low=Math.min(...localSamples),high=Math.max(...localSamples),foundationH=high-low+42;
    const foundation=new THREE.Mesh(new THREE.BoxGeometry(towerW+16,foundationH,towerD+16),mat(0x9b8262));
    foundation.position.set(tx,low+foundationH/2-8,tz);foundation.rotation.y=rotationY;foundation.castShadow=true;foundation.receiveShadow=true;group.add(foundation);
    const tower=new THREE.Mesh(new THREE.BoxGeometry(towerW,towerH,towerD),wallMat);
    tower.position.set(tx,high-4+towerH/2,tz);tower.rotation.y=rotationY;tower.castShadow=true;tower.receiveShadow=true;group.add(tower);
    addBattlements(group,towerW,high-4+towerH,tx,tz,rotationY,wallMat,28);
    addRectCollider(worldX+tx,worldZ+tz,towerW*.9,towerD*.9,rotationY,'wall');
  }
  const lintelY=groundHigh+towerH-70*cityScale;
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(gateWidth,82*cityScale,86*cityScale),wallMat);
  lintel.position.set(gx,lintelY,gz);lintel.rotation.y=rotationY;lintel.castShadow=true;group.add(lintel);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(gateWidth+24,18,98),mat(0xd0b98f));cap.position.set(gx,lintelY+48,gz);cap.rotation.y=rotationY;group.add(cap);
  // The gate is permanently open: only a recessed stone passage, never a door mesh.
  for(const side of [-1,1]){
    const jamb=new THREE.Mesh(new THREE.BoxGeometry(24,groundHigh-groundLow+96,92),mat(0xa78e6c));
    const off=side*(gateWidth*.5-12);jamb.position.set(gx+alongX*off,groundLow+(groundHigh-groundLow+96)/2,gz+alongZ*off);jamb.rotation.y=rotationY;group.add(jamb);
  }
}
function createJerusalemHouse(group,x,z,w,d,h,material,worldX,worldZ,rot=0){
  const samples=[];
  for(const sx of [-w*.5,0,w*.5])for(const sz of [-d*.5,0,d*.5])samples.push(terrainHeight(worldX+x+sx,worldZ+z+sz));
  const low=Math.min(...samples),high=Math.max(...samples),floor=high-3;
  const foundationH=Math.max(20,floor-low+18);
  const foundation=new THREE.Mesh(new THREE.BoxGeometry(w+8,foundationH,d+8),mat(0x9c8566));
  foundation.position.set(x,low+foundationH/2-2,z);foundation.rotation.y=rot;foundation.castShadow=true;foundation.receiveShadow=true;group.add(foundation);
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);b.position.set(x,floor+h/2,z);b.rotation.y=rot;b.castShadow=true;b.receiveShadow=true;group.add(b);
  const parapet=new THREE.Mesh(new THREE.BoxGeometry(w+5,9,d+5),material);parapet.position.set(x,floor+h+4,z);parapet.rotation.y=rot;group.add(parapet);
  const door=new THREE.Mesh(new THREE.BoxGeometry(Math.max(14,w*.2),Math.min(52,h*.42),4),mat(0x544333));
  door.position.set(x,floor+Math.min(52,h*.42)/2,z+d*.5+2);door.rotation.y=rot;group.add(door);
  const roofLip=new THREE.Mesh(new THREE.BoxGeometry(w+9,7,d+9),mat(0xd7c39c));roofLip.position.set(x,floor+h+10,z);roofLip.rotation.y=rot;group.add(roofLip);
  for(const side of [-1,1]){const slit=new THREE.Mesh(new THREE.BoxGeometry(Math.max(9,w*.08),14,3),mat(0x4d4034));slit.position.set(x+side*w*.25,floor+h*.62,z+d*.5+2);slit.rotation.y=rot;group.add(slit);}
  addRectCollider(worldX+x,worldZ+z,w*.92,d*.92,rot,'building');
}

function createGroundRoad(group,a,b,width,worldX,worldZ,material){
  const steps=Math.max(8,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/55)),verts=[],inds=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=THREE.MathUtils.lerp(a[0],b[0],t),z=THREE.MathUtils.lerp(a[1],b[1],t);
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1,sx=-dz/len*width/2,sz=dx/len*width/2;
    for(const side of [-1,1]){
      const px=x+sx*side,pz=z+sz*side;verts.push(px,terrainHeight(worldX+px,worldZ+pz)+1.8,pz);
    }
    if(i<steps){const q=i*2;inds.push(q,q+2,q+1,q+2,q+3,q+1);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(inds);geo.computeVertexNormals();
  const road=new THREE.Mesh(geo,material);road.receiveShadow=true;group.add(road);return road;
}

function createAlleyNetwork(group,radius,ringCount,materials,cityScale,worldX,worldZ){
  const rnd=seededRandom(20260716),rx=875,rz=1390;
  // Deliberately spaced housing blocks. Reserved corridors remain collision-free and readable.
  for(let ring=1;ring<=7;ring++){
    const count=9+ring*6,fr=.15+ring*.105;
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+(ring%2)*.075;
      const jitterX=(rnd()-.5)*25,jitterZ=(rnd()-.5)*34;
      const x=Math.sin(a)*rx*fr+jitterX,z=Math.cos(a)*rz*fr+jitterZ;
      if(!isInsideJerusalem(worldX+x,worldZ+z,-130))continue;
      if(isReservedAlley(x,z,118))continue;
      if(z<-720&&Math.abs(x)<390)continue;
      const w=82+rnd()*55,d=72+rnd()*48,h=145+rnd()*105;
      createJerusalemHouse(group,x,z,w,d,h,materials[(i+ring)%materials.length],worldX,worldZ,-a+(rnd()-.5)*.08);
    }
  }
  // Stone paving makes traversable routes visually explicit.
  const roadMat=new THREE.MeshToonMaterial({color:0xcdb68f,flatShading:true});
  const roads=[[[0,1450],[0,-1300],96],[[-690,700],[690,700],78],[[-820,120],[820,120],76],[[-650,-520],[650,-520],72],[[0,430],[780,240],70],[[0,-300],[-620,-650],68],[[760,240],[930,250],62],[[650,-520],[760,-900],76]];
  for(const [a,b,width] of roads)createGroundRoad(group,a,b,width,worldX,worldZ,roadMat);
  // Stepped royal ascent: lower town -> palace terrace -> Temple Mount.
  const ascent=[[[0,850],[50,250],90],[[50,250],[20,-470],94],[[20,-470],[0,-980],108],[[720,240],[300,-300],88],[[300,-300],[80,-730],96]];
  for(const [a,b,width] of ascent)createGroundRoad(group,a,b,width,worldX,worldZ,mat(0xd7c39d));
}
function createTownNPC(){}
function updateTownNPCs(){}

function createDavidicPalace(group,wallMats,worldX,worldZ){
  const g=new THREE.Group(),px=-35,pz=-535,w=510,d=310;
  const corners=[[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2],[0,0]];
  const hs=corners.map(([cx,cz])=>terrainHeight(worldX+px+cx,worldZ+pz+cz));
  const low=Math.min(...hs),top=Math.max(...hs)+12,fh=top-low+35;
  const terrace=new THREE.Mesh(new THREE.BoxGeometry(w+95,fh,d+85),wallMats[0]);terrace.position.set(px,low+fh/2-5,pz);terrace.castShadow=true;terrace.receiveShadow=true;g.add(terrace);
  const court=new THREE.Mesh(new THREE.BoxGeometry(w,16,d),wallMats[2]);court.position.set(px,top+8,pz);court.receiveShadow=true;g.add(court);
  const blocks=[[-150,0,165,170,170],[55,-55,205,155,215],[120,80,120,105,150],[-50,90,115,90,145]];
  for(const [ox,oz,bw,bd,bh] of blocks){
    const m=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),wallMats[1]);m.position.set(px+ox,top+16+bh/2,pz+oz);m.castShadow=true;m.receiveShadow=true;g.add(m);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(bw+8,10,bd+8),wallMats[2]);cap.position.set(px+ox,top+21+bh,pz+oz);g.add(cap);
  }
  for(let i=-3;i<=3;i++){const col=new THREE.Mesh(new THREE.CylinderGeometry(9,11,105,8),mat(0xd9c8a8));col.position.set(px+i*42,top+68,pz+d*.46);col.castShadow=true;g.add(col);}
  group.add(g);addRectCollider(worldX+px,worldZ+pz,w*.78,d*.72,0,'palace');
}

function createTempleComplex(group,wallMats,worldX,worldZ){
  const temple=new THREE.Group();temple.position.set(0,0,-1010);temple.rotation.y=Math.PI/2;
  const tw=780,td=610,ths=[terrainHeight(worldX-tw/2,worldZ-1010-td/2),terrainHeight(worldX+tw/2,worldZ-1010-td/2),terrainHeight(worldX-tw/2,worldZ-1010+td/2),terrainHeight(worldX+tw/2,worldZ-1010+td/2),terrainHeight(worldX,worldZ-1010)];
  const templeLow=Math.min(...ths),base=Math.max(...ths)+6;
  const platformFoundation=new THREE.Mesh(new THREE.BoxGeometry(790,base-templeLow+60,630),wallMats[0]);platformFoundation.position.y=templeLow+(base-templeLow+60)/2-8;platformFoundation.castShadow=true;platformFoundation.receiveShadow=true;temple.add(platformFoundation);
  const platform=new THREE.Mesh(new THREE.BoxGeometry(760,54,600),wallMats[2]);platform.position.y=base+27;platform.receiveShadow=true;platform.castShadow=true;temple.add(platform);
  for(let i=0;i<7;i++){const step=new THREE.Mesh(new THREE.BoxGeometry(390+i*48,13,68),wallMats[1]);step.position.set(0,base+57+i*13,220-i*34);temple.add(step);}
  const body=new THREE.Mesh(new THREE.BoxGeometry(340,390,310),wallMats[2]);body.position.set(0,base+280,-45);body.castShadow=true;body.receiveShadow=true;temple.add(body);
  const porch=new THREE.Mesh(new THREE.BoxGeometry(455,445,98),wallMats[0]);porch.position.set(0,base+307,108);porch.castShadow=true;temple.add(porch);
  for(let i=-3;i<=3;i++){const col=new THREE.Mesh(new THREE.CylinderGeometry(19,24,325,10),mat(0xe0cfad));col.position.set(i*58,base+267,164);col.castShadow=true;temple.add(col);}
  const altar=new THREE.Mesh(new THREE.BoxGeometry(120,82,120),mat(0xb69b73));altar.position.set(0,base+95,305);altar.castShadow=true;temple.add(altar);
  const smokeMat=new THREE.MeshBasicMaterial({color:0xe1ddd4,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  const smokeHeight=10500;
  const smoke=new THREE.Mesh(new THREE.CylinderGeometry(8,34,smokeHeight,12,1,true),smokeMat);smoke.position.set(0,base+136+smokeHeight/2,305);temple.add(smoke);objects.templeSmoke=smoke;
  group.add(temple);addRectCollider(worldX,worldZ-1010,620,450,Math.PI/2,'temple');
}
function createCity(def){
  const {x,z}=def,wallRX=def.wallRX||def.wallR,wallRZ=def.wallRZ||def.wallR,g=new THREE.Group(),wallMats=[mat(0x9f8665),mat(0xb89e78),mat(0xd2bb91)],dark=mat(0x5c4d3d),wallMat=wallMats[1];
  g.position.set(x,0,z);
  const segments=148,gateWidth=245;
  const gates=[
    {name:'남문',x:0,z:wallRZ,rot:0},
    {name:'북문',x:0,z:-wallRZ,rot:0},
    {name:'동문',x:wallRX,z:120,rot:Math.PI/2},
    {name:'서문',x:-wallRX,z:260,rot:Math.PI/2}
  ];
  const outline=[];
  for(let i=0;i<segments;i++){
    const a=i/segments*Math.PI*2;
    const irregular=1+.035*Math.sin(a*3)-.018*Math.cos(a*5);
    outline.push({a,x:Math.sin(a)*wallRX*irregular,z:Math.cos(a)*wallRZ*irregular});
  }
  const inGateGap=(mx,mz)=>gates.some(gt=>Math.hypot(mx-gt.x,mz-gt.z)<gateWidth*.7);
  for(let i=0;i<segments;i++){
    const A=outline[i],B=outline[(i+1)%segments],a=A.a;
    const ax=A.x,az=A.z,bx=B.x,bz=B.z,mx=(ax+bx)/2,mz=(az+bz)/2,length=Math.hypot(bx-ax,bz-az)+15;
    if(inGateGap(mx,mz))continue;
    const dx=bx-ax,dz=bz-az,segLen=Math.hypot(dx,dz)||1,nx=-dz/segLen,nz=dx/segLen;
    const groundSamples=[];for(let q=0;q<=8;q++){const t=q/8,px=THREE.MathUtils.lerp(ax,bx,t),pz=THREE.MathUtils.lerp(az,bz,t);for(const off of [-52,-26,0,26,52])groundSamples.push(terrainHeight(x+px+nx*off,z+pz+nz*off));}
    const baseLow=Math.min(...groundSamples),baseHigh=Math.max(...groundSamples),tangentAngle=Math.atan2(-dz,dx);
    const height=300+32*Math.sin(a*3),wallBottom=baseLow-18,wallTop=baseHigh+height,wallHeight=wallTop-wallBottom;
    const foundation=new THREE.Mesh(new THREE.BoxGeometry(length+24,Math.max(70,baseHigh-baseLow+52),96),wallMats[0]);
    foundation.position.set(mx,baseLow+Math.max(70,baseHigh-baseLow+52)/2-15,mz);foundation.rotation.y=tangentAngle;foundation.castShadow=true;foundation.receiveShadow=true;g.add(foundation);
    const wall=new THREE.Mesh(new THREE.BoxGeometry(length+9,wallHeight,70),wallMat);wall.position.set(mx,wallBottom+wallHeight/2,mz);wall.rotation.y=tangentAngle;wall.castShadow=true;wall.receiveShadow=true;g.add(wall);
    for(let course=0;course<7;course++){const yy=wallBottom+38+course*(wallHeight-72)/6;const seam=new THREE.Mesh(new THREE.BoxGeometry(length+12,4,74),course%2?wallMats[0]:wallMats[2]);seam.position.set(mx,yy,mz);seam.rotation.y=tangentAngle;g.add(seam);}
    addBattlements(g,length,wallTop,mx,mz,tangentAngle,wallMat,28);
    addRectCollider(x+mx,z+mz,length*.86,62,tangentAngle,'wall');
    if(i%15===0){const th=height+105,tw=118,td=122;const tower=new THREE.Mesh(new THREE.BoxGeometry(tw,th+(baseHigh-baseLow),td),wallMats[2]);tower.position.set(mx,baseLow+(th+(baseHigh-baseLow))/2-12,mz);tower.rotation.y=tangentAngle;tower.castShadow=true;tower.receiveShadow=true;g.add(tower);addBattlements(g,tw,baseLow+th+(baseHigh-baseLow)-12,mx,mz,tangentAngle,wallMats[2],27);}
  }
  for(const gt of gates)createGatehouse(g,x,z,gt.x,gt.z,gateWidth,wallMat,dark,gt.rot,1);
  createAlleyNetwork(g,wallRZ,7,wallMats,1,x,z);
  createDavidicPalace(g,wallMats,x,z);
  createTempleComplex(g,wallMats,x,z);
  // Four grounded approach roads and the east royal ascent.
  const approachMat=mat(0xc7ae83);
  const approaches=[[[0,wallRZ+360],[0,wallRZ-120],110],[[0,-wallRZ-360],[0,-wallRZ+120],110],[[wallRX+420,120],[wallRX-120,120],100],[[-wallRX-420,260],[-wallRX+120,260],100],[[wallRX-120,120],[360,-360],88],[[360,-360],[80,-900],98]];
  for(const [a,b,w] of approaches)createGroundRoad(g,a,b,w,x,z,approachMat);
  scene.add(g);objects.jerusalem=g;
}
function createCentralCities(){createCity(CITY_DEFS[0]);}
function createMountainWalls(){}
function createJordanRiver(){}
function createPhotoBackdrop(){}

function createDryWadiNetwork(){
  const colors=[0x9d8466,0xa89070,0x7f6a54];
  const paths=[
    [[-420,-3000],[-250,-2500],[-470,-1900],[-300,-1200],[-520,-480]],
    [[2100,-2500],[2300,-1700],[2480,-900],[2650,-200],[2800,700]],
    [[450,900],[600,1500],[760,2200],[900,3000]]
  ];
  for(const points of paths){
    const pts=points.map(([x,z])=>new THREE.Vector3(x,terrainHeight(x,z)+1,z));
    const curve=new THREE.CatmullRomCurve3(pts);
    const bed=new THREE.Mesh(
      new THREE.TubeGeometry(curve,80,26,8,false),
      new THREE.MeshToonMaterial({color:colors[Math.floor(Math.random()*colors.length)],flatShading:true,transparent:true,opacity:.9})
    );
    bed.scale.y=.06;bed.receiveShadow=true;scene.add(bed);
  }
}
function createDryGrassFields(){
  const grassMats=[mat(0x9a8b5f),mat(0xaa9361),mat(0x7d7852)];
  const rnd=seededRandom(9127);
  for(let i=0;i<760;i++){
    const x=(rnd()-.5)*WORLD*.9,z=(rnd()-.5)*WORLD*.94;
    if(x>1250&&rnd()<.985)continue;
    if(CITY_DEFS.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+120))continue;
    const h=terrainHeight(x,z);
    if(localSlope(x,z)>.8)continue;
    const g=new THREE.Mesh(new THREE.ConeGeometry(1+rnd()*1.4,6+rnd()*11,4),grassMats[i%grassMats.length]);
    g.position.set(x,h+3,z);g.rotation.z=(rnd()-.5)*.35;g.rotation.y=rnd()*Math.PI;scene.add(g);
  }
}
function createSparseAcacias(){
  const defs=[
    [-980,-2750,.95],[-720,-1550,.8],[520,-1450,.85],[430,-100,.75],
    [-820,850,.8],[690,1820,.85],[-560,2520,.75]
  ];
  defs.forEach(v=>createAcacia(...v));
}


function makeRouteTube(points,color,width=22,opacity=.72){
  const pts=points.map(([x,z])=>new THREE.Vector3(x,terrainHeight(x,z)+2,z));
  const curve=new THREE.CatmullRomCurve3(pts);
  const mesh=new THREE.Mesh(
    new THREE.TubeGeometry(curve,220,width,8,false),
    new THREE.MeshToonMaterial({color,flatShading:true,transparent:true,opacity})
  );
  mesh.scale.y=.035;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function createAbrahamRoute(){
  makeRouteTube(ABRAHAM_ROUTE,0x9d8663,26,.78);
}
function createKidronRoute(){
  makeRouteTube(KIDRON_ROUTE,0x89735a,20,.84);
}
function createDeadSeaAndJordan(){
  const sea=new THREE.Mesh(
    new THREE.PlaneGeometry(1450,13800),
    new THREE.MeshToonMaterial({color:0x6f9aa5,transparent:true,opacity:.92,side:THREE.DoubleSide})
  );
  sea.rotation.x=-Math.PI/2;sea.position.set(5150,-455,0);scene.add(sea);objects.deadSea=sea;

  const salt=new THREE.Mesh(
    new THREE.PlaneGeometry(420,13800),
    new THREE.MeshToonMaterial({color:0xe5dfcc,flatShading:true})
  );
  salt.rotation.x=-Math.PI/2;salt.position.set(4310,-442,0);scene.add(salt);

  const jordanPts=[];
  for(let z=-500;z<7900;z+=180)jordanPts.push([8450+Math.sin(z*.0018)*110,z]);
  makeRouteTube(jordanPts,0x557f88,34,.92);
}
function createRegionalVegetation(){
  const rnd=seededRandom(6251);
  const dryMats=[mat(0x9a895c),mat(0xaa9561),mat(0x807a50)];
  const greenMats=[mat(0x778956),mat(0x647a49),mat(0x8b965f)];
  for(let i=0;i<1450;i++){
    const x=(rnd()-.5)*WORLD*.82,z=(rnd()-.5)*WORLD*.94;
    if(CITY_DEFS.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+180))continue;
    if(x>3500)continue;
    if(localSlope(x,z)>.88)continue;
    const north=THREE.MathUtils.smoothstep(z,-4300,3600);
    const east=THREE.MathUtils.smoothstep(x,900,3300);
    if(rnd()>(.20+north*.60)*(1-east*.92))continue;
    const mats=north>.42?greenMats:dryMats;
    const tuft=new THREE.Mesh(new THREE.ConeGeometry(1.3+rnd()*2.2,5+rnd()*12,4),mats[i%3]);
    tuft.position.set(x,terrainHeight(x,z)+3,z);tuft.rotation.z=(rnd()-.5)*.42;tuft.rotation.y=rnd()*Math.PI;scene.add(tuft);
  }
  const trees=[
    [-920,-5900,.8],[720,-4550,.9],[-620,-3200,.8],[680,-2500,.85],
    [-700,-350,.85],[720,900,.9],[-850,2600,.85],[760,4200,.9],[-700,5900,.8]
  ];
  trees.forEach(v=>createAcacia(...v));
}
function createTempleMountMass(){
  const g=new THREE.Group(),stone=mat(0xc7b38d),dark=mat(0x75634e);
  const platform=new THREE.Mesh(new THREE.BoxGeometry(900,120,620),stone);
  platform.position.set(0,60,0);platform.castShadow=true;platform.receiveShadow=true;g.add(platform);
  const southWall=new THREE.Mesh(new THREE.BoxGeometry(900,190,48),stone);
  southWall.position.set(0,95,310);southWall.castShadow=true;g.add(southWall);
  const cityDavid=new THREE.Mesh(new THREE.BoxGeometry(350,80,520),dark);
  cityDavid.position.set(70,-25,640);cityDavid.rotation.x=-.12;g.add(cityDavid);
  g.position.set(180,terrainHeight(180,-2050)+10,-2050);scene.add(g);
  addCircleCollider(180,-2050,360,'temple-mount');
}


function createMountOfOlives(){
  // Continuous terraced ridge east of the Kidron Valley. The terrainHeight function provides
  // the main landform; these shallow ledges only clarify its ancient agricultural profile.
  const terraceMat=mat(0x9a8263);
  for(let band=0;band<7;band++){
    const x=1540+band*105;
    const pts=[];
    for(let z=-1900;z<=1700;z+=180)pts.push([x+30*Math.sin((z+band*80)*.002),z]);
    makeRouteTube(pts,0x9a8263,12,.72);
  }
  for(let i=0;i<48;i++){
    const z=-1750+(i%24)*145;
    const x=1580+Math.floor(i/24)*330+(i%4)*28;
    createOliveTree(x,z,.50+(i%5)*.055);
  }
}
function createScenery(){
  createKidronRoute();
  createCentralCities();
  createMountOfOlives();
  createBirdFlock();
  createSparseAcacias();
  const rnd=seededRandom(4401),rockColors=[0x806d59,0x92785c,0xa58b68,0x6e6356];
  for(let i=0;i<300;i++){
    const x=(rnd()-.5)*WORLD*.9,z=(rnd()-.5)*WORLD*.9;
    if(isInsideCityCore(x,z,80))continue;
    const size=4+rnd()*16,rock=new THREE.Mesh(new THREE.DodecahedronGeometry(size,0),mat(rockColors[i%4]));
    rock.scale.set(.8+rnd()*.9,.45+rnd()*.55,.7+rnd()*1.1);rock.position.set(x,terrainHeight(x,z)+size*.35,z);rock.rotation.set(rnd(),rnd()*Math.PI,rnd());rock.castShadow=true;scene.add(rock);
    if(size>14)addCircleCollider(x,z,size*.55,'rock');
  }
  createAcacia(1550,900,1.05);createAcacia(1900,250,.9);createAcacia(-1750,850,.8);
  createOliveTree(-260,420,.8);createOliveTree(360,380,.75);createOliveTree(-520,-180,.7);
  createGihonSpring();
  createSiloamPool();
}
function createOliveTree(x,z,scale=1){const g=new THREE.Group();addCylinder(g,12,20,105,[0,52,0],0x6a4a31,8);for(let i=0;i<7;i++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(35+(i%3)*8,1),mat(i%2?0x68784e:0x7b865a));crown.scale.set(1.2,.65,1);crown.position.set((i%3-1)*32,105+(i%2)*22,(Math.floor(i/3)-1)*26);g.add(crown);}g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(scale);scene.add(g);}
function createWell(x,z){const g=new THREE.Group();for(let i=0;i<20;i++){const a=i/20*Math.PI*2,b=new THREE.Mesh(new THREE.BoxGeometry(22,18,34),mat(i%2?0x9a8464:0xb29b76));b.position.set(Math.sin(a)*70,16,Math.cos(a)*70);b.rotation.y=a;g.add(b);}const water=new THREE.Mesh(new THREE.CircleGeometry(52,24),new THREE.MeshToonMaterial({color:0x557f83}));water.rotation.x=-Math.PI/2;water.position.y=10;g.add(water);g.position.set(x,terrainHeight(x,z),z);scene.add(g);CITY_WATER_ZONES.push({x,z,r:120});addCircleCollider(x,z,58,'well');}
function createGihonSpring(){
  const {x,z,r}=GIHON_SPRING,g=new THREE.Group(),stone=[mat(0x8f7b61),mat(0xb09b78),mat(0x6f604e)];
  const samples=[];for(let ix=-2;ix<=2;ix++)for(let iz=-2;iz<=2;iz++)samples.push(terrainHeight(x+ix*55,z+iz*55));
  const low=Math.min(...samples),top=Math.max(...samples)+3,foundationH=top-low+38;
  const terrace=new THREE.Mesh(new THREE.CylinderGeometry(128,150,foundationH,20),stone[2]);terrace.position.set(0,-foundationH/2+8,0);terrace.castShadow=true;terrace.receiveShadow=true;g.add(terrace);
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2,rr=88+(i%3)*5;if(Math.cos(a)<-.35)continue;
    const b=new THREE.Mesh(new THREE.BoxGeometry(30,34+(i%2)*8,44),stone[i%3]);b.position.set(Math.sin(a)*rr,18,Math.cos(a)*rr);b.rotation.y=a;b.castShadow=true;g.add(b);
  }
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(64,72,20,20),stone[0]);basin.position.y=4;g.add(basin);
  const water=new THREE.Mesh(new THREE.CircleGeometry(56,24),new THREE.MeshToonMaterial({color:0x4f8790,transparent:true,opacity:.92}));water.rotation.x=-Math.PI/2;water.position.y=15;g.add(water);
  g.position.set(x,top,z);scene.add(g);objects.gihon=g;CITY_WATER_ZONES.push({x,z,r});
  // Ground-following route from the east gate down to the spring.
  const rg=new THREE.Group();
  createGroundRoad(rg,[860,120],[960,205],54,0,0,mat(0xbca078));
  createGroundRoad(rg,[960,205],[1065,300],48,0,0,mat(0xbca078));
  scene.add(rg);
}
function createSiloamPool(){
  // First-Temple-period water destination at the southern end of the City of David ridge.
  const x=120,z=1515,g=new THREE.Group(),stone=mat(0xa58c69),dark=mat(0x78644f);
  const base=terrainHeight(x,z);
  const basin=new THREE.Mesh(new THREE.BoxGeometry(210,34,145),dark);basin.position.y=8;basin.castShadow=true;basin.receiveShadow=true;g.add(basin);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(178,112),new THREE.MeshToonMaterial({color:0x4f8790,transparent:true,opacity:.9,side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;water.position.y=27;g.add(water);
  for(let i=0;i<5;i++){const step=new THREE.Mesh(new THREE.BoxGeometry(235-i*12,8,18),stone);step.position.set(0,31+i*6,72-i*13);g.add(step);}
  for(const side of [-1,1]){const wall=new THREE.Mesh(new THREE.BoxGeometry(18,62,165),stone);wall.position.set(side*112,29,0);g.add(wall);}
  g.position.set(x,base,z);scene.add(g);objects.siloam=g;CITY_WATER_ZONES.push({x,z,r:150,name:'쉴로악흐'});
}

let PAINTER_GRADIENT=null;
function painterGradient(){
  if(PAINTER_GRADIENT)return PAINTER_GRADIENT;
  const data=new Uint8Array([38,38,38,100,100,100,174,174,174,235,235,235]);
  const tex=new THREE.DataTexture(data,4,1,THREE.RedFormat);
  tex.minFilter=tex.magFilter=THREE.NearestFilter;tex.needsUpdate=true;
  PAINTER_GRADIENT=tex;return tex;
}

function mat(color){return new THREE.MeshToonMaterial({color,flatShading:true,gradientMap:painterGradient()});}
function addBox(group,size,pos,color){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function addCylinder(group,r1,r2,h,pos,color,seg=7){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat(color));m.position.set(...pos);m.castShadow=true;group.add(m);return m;}

function ensureDavidAsset(){
  if(davidObjText)return Promise.resolve();
  if(!davidAssetPromise){
    davidAssetPromise=fetch('./assets/models/david_lowpoly.obj').then(r=>{
      if(!r.ok)throw new Error(`David OBJ ${r.status}`);
      return r.text();
    }).then(t=>{davidObjText=t;}).catch(err=>{console.error('다비드 OBJ 로드 실패:',err);davidObjText='';});
  }
  return davidAssetPromise;
}
function davidMaterialFor(name){
  if(name.startsWith('white_'))return mat(0xe7e1d3);
  if(name.startsWith('blue_'))return mat(0x286f94);
  if(name.startsWith('linen_'))return mat(0xb59b70);
  if(name.startsWith('skin_'))return mat(0xb97851);
  if(name.startsWith('red_'))return mat(0xb54529);
  if(name.startsWith('dark_'))return mat(0x32241d);
  if(name.startsWith('leather_'))return mat(0x65462d);
  if(name.startsWith('wood_'))return mat(0x704b2b);
  return mat(0x9b8565);
}
function parseDavidOBJ(text){
  const vertices=[];const sections=[];let current=null;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    const p=line.split(/\s+/);
    if(p[0]==='v')vertices.push([Number(p[1]),Number(p[2]),Number(p[3])]);
    else if(p[0]==='o'){current={name:p.slice(1).join('_'),faces:[]};sections.push(current);}
    else if(p[0]==='f'&&current)current.faces.push(p.slice(1,4).map(v=>parseInt(v.split('/')[0],10)-1));
  }
  const root=new THREE.Group();
  const pivots={
    leftArm:{pos:[-25,52,0],names:['linen_leftArm','skin_leftHand']},
    rightArm:{pos:[25,52,0],names:['linen_rightArm','skin_rightHand']},
    leftLeg:{pos:[-12,-54,0],names:['dark_leftLeg']},
    rightLeg:{pos:[12,-54,0],names:['dark_rightLeg']},
    staff:{pos:[41,45,-6],names:['wood_staff']}
  };
  const pivotGroups={};
  Object.entries(pivots).forEach(([k,v])=>{const g=new THREE.Group();g.position.set(...v.pos);root.add(g);pivotGroups[k]=g;});
  for(const sec of sections){
    const pos=[];
    for(const f of sec.faces)for(const idx of f)pos.push(...vertices[idx]);
    if(!pos.length)continue;
    let parent=root,pivot=[0,0,0];
    for(const [k,v] of Object.entries(pivots))if(v.names.includes(sec.name)){parent=pivotGroups[k];pivot=v.pos;break;}
    for(let i=0;i<pos.length;i+=3){pos[i]-=pivot[0];pos[i+1]-=pivot[1];pos[i+2]-=pivot[2];}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,davidMaterialFor(sec.name));mesh.name=sec.name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  }
  root.userData.limbs={leftLeg:pivotGroups.leftLeg,rightLeg:pivotGroups.rightLeg,leftArm:pivotGroups.leftArm,rightArm:pivotGroups.rightArm};
  root.userData.staff=pivotGroups.staff;root.userData.staffSwing=0;
  // v2.0.6 high-detail silhouette pass: layered clothing, face, turban and equipment.
  const white=mat(0xeee8da),linen=mat(0xb79d73),skin=mat(0xb97851),hair=mat(0xb33c25),dark=mat(0x2b211c),leather=mat(0x68462e),blue=mat(0x28759a);
  const shoulderCloth=new THREE.Mesh(new THREE.BoxGeometry(62,9,34),white);shoulderCloth.position.set(0,43,0);shoulderCloth.castShadow=true;root.add(shoulderCloth);
  const frontPanel=new THREE.Mesh(new THREE.CylinderGeometry(31,27,74,8,1,false,0,Math.PI),white);frontPanel.rotation.y=Math.PI/2;frontPanel.position.set(0,5,14);frontPanel.scale.z=.22;root.add(frontPanel);
  const backPanel=frontPanel.clone();backPanel.rotation.y=-Math.PI/2;backPanel.position.z=-14;root.add(backPanel);
  const belt=new THREE.Mesh(new THREE.TorusGeometry(23.5,3.5,6,22),leather);belt.rotation.x=Math.PI/2;belt.position.y=-5;root.add(belt);
  const beltKnot=new THREE.Mesh(new THREE.DodecahedronGeometry(5,0),leather);beltKnot.position.set(16,-5,21);root.add(beltKnot);
  // Stronger head shape and visible features from front/side.
  const jaw=new THREE.Mesh(new THREE.DodecahedronGeometry(16,1),skin);jaw.scale.set(.92,1.08,.82);jaw.position.set(0,65,0);root.add(jaw);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(3.7,9,5),skin);nose.rotation.x=Math.PI/2;nose.position.set(0,65,15.5);root.add(nose);
  for(const side of [-1,1]){const eye=new THREE.Mesh(new THREE.BoxGeometry(8,2.6,2.3),dark);eye.position.set(side*7,69,15.2);eye.rotation.z=-side*.18;root.add(eye);const brow=new THREE.Mesh(new THREE.BoxGeometry(10,2.2,2),hair);brow.position.set(side*7,73,14.7);brow.rotation.z=-side*.22;root.add(brow);const ear=new THREE.Mesh(new THREE.DodecahedronGeometry(3.8,0),skin);ear.position.set(side*16,65,0);root.add(ear);}
  // More numerous irregular curls around the turban edge and nape.
  for(let i=0;i<30;i++){const a=i/30*Math.PI*2,c=new THREE.Mesh(new THREE.DodecahedronGeometry(4.2+(i%4)*.7,0),hair);c.position.set(Math.sin(a)*(16.5+(i%3)),75+(i%5)*1.1,Math.cos(a)*(15+(i%2)));c.scale.set(1,.85,1);root.add(c);}
  for(let i=0;i<6;i++){const band=new THREE.Mesh(new THREE.TorusGeometry(19-i*.45,2.7,5,20),linen);band.rotation.x=Math.PI/2;band.rotation.z=(i-2.5)*.09;band.position.y=79+i*2.7;root.add(band);}const turbanTop=new THREE.Mesh(new THREE.CylinderGeometry(13,18,8,10),linen);turbanTop.position.y=96;root.add(turbanTop);
  const sash=new THREE.Mesh(new THREE.BoxGeometry(7,24,5),linen);sash.position.set(-14,82,-16);sash.rotation.z=.18;root.add(sash);
  // Sandals and strapped club become readable from the rear camera.
  for(const side of [-1,1]){const sandal=new THREE.Mesh(new THREE.BoxGeometry(14,5,23),leather);sandal.position.set(side*11,-107,3);root.add(sandal);for(let k=0;k<2;k++){const strap=new THREE.Mesh(new THREE.TorusGeometry(6.2,1.2,4,10,Math.PI),leather);strap.rotation.x=Math.PI/2;strap.rotation.z=Math.PI/2;strap.position.set(side*11,-103,1+k*7);root.add(strap);}}
  const club=new THREE.Mesh(new THREE.CylinderGeometry(5.5,3.4,55,8),mat(0x744b2b));club.position.set(-31,-8,-6);club.rotation.z=-.16;root.add(club);
  // Four visible tzitzit bundles, each with one tekhelet strand.
  for(const [tx,tz] of [[-27,15],[27,15],[-27,-15],[27,-15]]){for(let k=0;k<4;k++){const cord=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,35,5),k===1?blue:white);cord.position.set(tx+(k-1.5)*1.7,-57,tz);root.add(cord);}}
  // v2.0.7 detail pass: layered sleeves, robe hem, hands, sandals, turban folds and sling pouch.
  for(const side of [-1,1]){
    const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(7.8,10.5,44,8),linen);sleeve.position.set(side*29,24,0);sleeve.rotation.z=side*.08;root.add(sleeve);
    const hand=new THREE.Mesh(new THREE.DodecahedronGeometry(6.2,1),skin);hand.position.set(side*31,0,0);root.add(hand);
    const cuff=new THREE.Mesh(new THREE.TorusGeometry(8.2,1.7,5,12),white);cuff.rotation.x=Math.PI/2;cuff.position.set(side*30,3,0);root.add(cuff);
  }
  const hem=new THREE.Mesh(new THREE.TorusGeometry(27.5,2.2,5,28),linen);hem.rotation.x=Math.PI/2;hem.position.y=-72;root.add(hem);
  const pouch=new THREE.Mesh(new THREE.DodecahedronGeometry(8,1),leather);pouch.scale.set(.72,1,.45);pouch.position.set(28,-13,-18);root.add(pouch);
  for(let i=0;i<7;i++){const fold=new THREE.Mesh(new THREE.TorusGeometry(18.5-i*.35,1.2,4,24,Math.PI*1.45),mat(i%2?0xc0aa82:0xa98f69));fold.rotation.x=Math.PI/2;fold.rotation.z=.22+i*.06;fold.position.set(0,83+i*2.1,1);root.add(fold);}
  // v2.0.8 proportion pass based on the approved turnaround: shorter torso, longer legs, broader head/shoulders.
  root.traverse(o=>{if(o.isMesh&&o.position.y<48&&o.position.y>-58)o.position.y*=.86;});
  pivotGroups.leftLeg.position.y=-47;pivotGroups.rightLeg.position.y=-47;
  pivotGroups.leftLeg.scale.y=1.18;pivotGroups.rightLeg.scale.y=1.18;
  shoulderCloth.scale.x=1.06;jaw.scale.multiply(new THREE.Vector3(1.03,.97,1.02));
  // Robe side seams, neck opening and small leather sling pouch.
  for(const side of [-1,1]){const seam=new THREE.Mesh(new THREE.BoxGeometry(2,56,2.2),mat(0x9e825f));seam.position.set(side*27,-29,12);root.add(seam);}
  const neckline=new THREE.Mesh(new THREE.TorusGeometry(8,1.5,5,16,Math.PI),linen);neckline.rotation.x=Math.PI/2;neckline.position.set(0,40,16);root.add(neckline);
  const slingPouch=new THREE.Mesh(new THREE.DodecahedronGeometry(6.8,1),leather);slingPouch.scale.set(1.1,.55,.42);slingPouch.position.set(28,-20,-18);root.add(slingPouch);
  // v2.0.9 approved cute-proportion pass: compact limbs, balanced torso and a more modeled face.
  for(const limb of [pivotGroups.leftArm,pivotGroups.rightArm]){limb.scale.y=.82;limb.position.y=49;}
  for(const limb of [pivotGroups.leftLeg,pivotGroups.rightLeg]){limb.scale.y=.86;limb.position.y=-43;}
  root.traverse(o=>{if(!o.isMesh)return; if(o.position.y<-78)o.position.y=-78+(o.position.y+78)*.76; if(Math.abs(o.position.x)>24&&o.position.y<55&&o.position.y>-60)o.position.x*=.91;});
  shoulderCloth.scale.x=1.10;frontPanel.scale.y=.94;backPanel.scale.y=.94;
  // Unified facial shell: one continuous low-poly surface replaces the former glued-on cheek pieces.
  const faceShell=new THREE.Mesh(new THREE.SphereGeometry(16.8,18,12),skin);
  faceShell.scale.set(.96,1.05,.82);faceShell.position.set(0,65.2,1.2);faceShell.castShadow=true;root.add(faceShell);
  const cheekPlane=new THREE.Mesh(new THREE.SphereGeometry(14.7,16,10),mat(0xc8845b));
  cheekPlane.scale.set(.92,.72,.16);cheekPlane.position.set(0,62.6,14.2);root.add(cheekPlane);
  const noseBridge=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.8,7.8,8),skin);noseBridge.rotation.x=Math.PI/2;noseBridge.position.set(0,67.5,14.7);root.add(noseBridge);
  const noseTip=new THREE.Mesh(new THREE.SphereGeometry(3.4,10,7),skin);noseTip.scale.set(.82,.68,.72);noseTip.position.set(0,64.4,16.5);root.add(noseTip);
  // v2.0.11 face refinement based on the approved heroic turnaround.
  const eyeOutlineMat=mat(0x241b18),irisMat=mat(0x4a3427),highlightMat=mat(0xf8f1df),lipMat=mat(0x754537);
  for(const side of [-1,1]){
    const eyeOutline=new THREE.Mesh(new THREE.SphereGeometry(4.7,16,9),eyeOutlineMat);
    eyeOutline.scale.set(1.48,.58,.20);eyeOutline.position.set(side*7.0,69.3,16.05);eyeOutline.rotation.z=-side*.14;root.add(eyeOutline);
    const sclera=new THREE.Mesh(new THREE.SphereGeometry(4.05,16,9),mat(0xf0e7d5));
    sclera.scale.set(1.40,.48,.19);sclera.position.set(side*7.0,69.15,16.30);sclera.rotation.z=-side*.14;root.add(sclera);
    const iris=new THREE.Mesh(new THREE.SphereGeometry(2.15,12,8),irisMat);iris.scale.set(.78,1,.22);iris.position.set(side*6.8,69.0,17.20);root.add(iris);
    const pupil2=new THREE.Mesh(new THREE.SphereGeometry(1.05,10,7),eyeOutlineMat);pupil2.scale.z=.28;pupil2.position.set(side*6.8,69.0,17.78);root.add(pupil2);
    const glint=new THREE.Mesh(new THREE.SphereGeometry(.38,7,5),highlightMat);glint.position.set(side*7.25,69.55,18.04);root.add(glint);
    const heroicBrow=new THREE.Mesh(new THREE.BoxGeometry(12.6,2.6,2.0),hair);heroicBrow.position.set(side*7.1,74.0,15.6);heroicBrow.rotation.z=-side*.30;root.add(heroicBrow);
    const lowerLid=new THREE.Mesh(new THREE.BoxGeometry(8.1,.85,1.15),skin);lowerLid.position.set(side*7.0,67.05,16.25);lowerLid.rotation.z=side*.05;root.add(lowerLid);
    const temple=new THREE.Mesh(new THREE.SphereGeometry(4.0,10,7),skin);temple.scale.set(.54,.88,.42);temple.position.set(side*14.7,65.4,3.5);root.add(temple);
  }
  const philtrum=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.0,1.1),skin);philtrum.position.set(0,61.2,16.05);root.add(philtrum);
  const upperLip=new THREE.Mesh(new THREE.BoxGeometry(8.0,1.15,1.35),lipMat);upperLip.position.set(0,59.5,16.45);root.add(upperLip);
  const lowerLip=new THREE.Mesh(new THREE.BoxGeometry(6.8,1.05,1.25),mat(0x9a604d));lowerLip.position.set(0,58.25,16.25);root.add(lowerLip);
  const chinPlane=new THREE.Mesh(new THREE.SphereGeometry(5.3,10,7),skin);chinPlane.scale.set(1,.52,.42);chinPlane.position.set(0,55.3,11.8);root.add(chinPlane);
  // Replace the fragmented vertical robe strips with two broad, continuous low-poly cloth surfaces.
  const robeFront=new THREE.Mesh(new THREE.CylinderGeometry(25.8,28.8,61,12,2,false,0,Math.PI),linen);
  robeFront.rotation.y=Math.PI/2;robeFront.scale.z=.38;robeFront.position.set(0,-35,10.8);root.add(robeFront);
  const robeBack=robeFront.clone();robeBack.rotation.y=-Math.PI/2;robeBack.position.z=-10.8;root.add(robeBack);
  const robeSideMat=mat(0xa98e69);
  for(const side of [-1,1]){const panel=new THREE.Mesh(new THREE.BoxGeometry(3.3,59,19),robeSideMat);panel.position.set(side*26.3,-35,0);root.add(panel);}
  // Broad continuous upper garment surfaces hide seams between the OBJ sections.
  const tunicCore=new THREE.Mesh(new THREE.CylinderGeometry(25.5,27.2,67,14,2),linen);tunicCore.position.set(0,-15,0);tunicCore.scale.z=.72;root.add(tunicCore);
  const tallitFront=new THREE.Mesh(new THREE.BoxGeometry(55,74,4.2),white);tallitFront.position.set(0,4,15.3);tallitFront.castShadow=true;root.add(tallitFront);
  const tallitBack=tallitFront.clone();tallitBack.position.z=-15.3;root.add(tallitBack);
  const shoulderBridge=new THREE.Mesh(new THREE.BoxGeometry(55,6.5,31),white);shoulderBridge.position.set(0,39,0);root.add(shoulderBridge);
  const collarCut=new THREE.Mesh(new THREE.TorusGeometry(7.5,1.25,7,20,Math.PI),linen);collarCut.rotation.x=Math.PI/2;collarCut.position.set(0,39,16.8);root.add(collarCut);
  // Put all visible model pieces under a dedicated pitch pivot so running lean never tilts sideways.
  const visualRoot=new THREE.Group();
  const existing=[...root.children];for(const child of existing)visualRoot.add(child);root.add(visualRoot);
  root.userData.bodyRoot=visualRoot;
  return root;
}

function createDavid(){
  if(!davidObjText)return createDavidLegacy();
  const g=parseDavidOBJ(davidObjText);
  g.userData.velocity=new THREE.Vector3();g.userData.verticalVelocity=0;g.userData.grounded=true;g.userData.walkPhase=0;g.userData.lastSafePosition=new THREE.Vector3();
  g.scale.setScalar(.90);scene.add(g);objects.player=g;return g;
}

function createDavidLegacy(){
  const g=new THREE.Group();g.userData.velocity=new THREE.Vector3();g.userData.verticalVelocity=0;g.userData.grounded=true;g.userData.walkPhase=0;
  const skin=0xb97952,linen=0xb39a72,white=0xe2ddcf,blue=0x276d91,leather=0x62452d,hair=0xb34d2e;
  const head=addCylinder(g,13,15,27,[0,64,0],skin,10);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,c=new THREE.Mesh(new THREE.DodecahedronGeometry(6,0),mat(hair));c.position.set(Math.sin(a)*14,74+(i%3)*3,Math.cos(a)*13);g.add(c);}
  // wrapped turban, not a cap
  for(let i=0;i<4;i++){const band=new THREE.Mesh(new THREE.TorusGeometry(17-i*.5,3.2,5,12),mat(linen));band.rotation.x=Math.PI/2;band.rotation.z=(i-1.5)*.12;band.position.y=78+i*3;g.add(band);}
  const nose=addBox(g,[4,7,5],[0,64,15],0xa96746);const eyeMat=mat(0x30251f);addBox(g,[8,2,2],[-7,69,15],0x30251f).rotation.z=.16;addBox(g,[8,2,2],[7,69,15],0x30251f).rotation.z=-.16;
  const torso=addBox(g,[38,52,25],[0,31,0],linen);const skirt=addCylinder(g,26,19,70,[0,-29,0],linen,8);
  const tallit=addBox(g,[52,70,29],[0,8,0],white);tallit.geometry.translate(0,-7,0);
  const belt=new THREE.Mesh(new THREE.TorusGeometry(22,3.3,5,16),mat(0x8a6845));belt.rotation.x=Math.PI/2;belt.position.y=-6;g.add(belt);
  const leftLeg=addBox(g,[8,48,9],[-12,-85,0],0x6b5138),rightLeg=addBox(g,[8,48,9],[12,-85,0],0x6b5138),leftArm=addBox(g,[9,48,9],[-25,30,0],linen),rightArm=addBox(g,[9,48,9],[25,30,0],linen);
  [leftLeg,rightLeg,leftArm,rightArm].forEach(m=>m.geometry.translate(0,-m.geometry.parameters.height/2,0));leftLeg.position.y=-56;rightLeg.position.y=-56;leftArm.position.y=52;rightArm.position.y=52;g.userData.limbs={leftLeg,rightLeg,leftArm,rightArm};
  const staff=addCylinder(g,4.2,7.2,165,[41,-5,-5],0x72502f,8);staff.rotation.z=-.025;g.userData.staff=staff;g.userData.staffSwing=0;addBox(g,[10,34,8],[-34,-2,-4],leather).rotation.z=.14;
  const tasselMat=mat(0xe8e2d4),blueMat=mat(blue);[[-24,-51,12],[-24,-51,-12],[24,-51,12],[24,-51,-12]].forEach(p=>{const tg=new THREE.Group();tg.position.set(...p);for(let k=0;k<4;k++){const a=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,34,5),tasselMat);a.position.set((k-1.5)*2,-17,0);tg.add(a);}const b=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,8,5),blueMat);b.position.y=-10;tg.add(b);g.add(tg);});
  g.scale.setScalar(.78);scene.add(g);objects.player=g;return g;
}

function createAimRig(){
  if(objects.aimRig) camera.remove(objects.aimRig);
  const rig=new THREE.Group();
  const sleeve=mat(0xa79673), skin=mat(0xb87853), leather=mat(0x5a3f29), cordMat=new THREE.LineBasicMaterial({color:0x765235});
  const forearm=new THREE.Mesh(new THREE.CylinderGeometry(4.2,5.2,34,7),sleeve);forearm.rotation.z=Math.PI/2;forearm.position.set(11,-16,-43);rig.add(forearm);
  const hand=new THREE.Mesh(new THREE.SphereGeometry(5.3,7,5),skin);hand.position.set(29,-16,-43);rig.add(hand);
  const sling=new THREE.Group();sling.position.set(31,-15,-45);
  const cordA=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(20,0,-22)]),cordMat);
  const pouch=new THREE.Mesh(new THREE.BoxGeometry(14,5,8),leather);pouch.position.set(24,0,-27);
  const cordB=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(28,0,-31),new THREE.Vector3(8,0,-48)]),cordMat);
  sling.add(cordA,pouch,cordB);rig.add(sling);
  rig.userData.sling=sling;rig.position.set(0,0,-10);rig.visible=false;camera.add(rig);objects.aimRig=rig;
}

function createSheep(i){
  const g=new THREE.Group();const coat=mat(i%4===0?0xc7b794:0xd7cbb0),skin=mat(i%3===0?0x6b5849:0x806c58),dark=mat(0x302a26),hoofMat=mat(0x27231f),muzzleMat=mat(0x5b4b40);
  const body=new THREE.Mesh(new THREE.IcosahedronGeometry(29,2),coat);body.scale.set(1.34,.72,.80);body.position.y=31;body.castShadow=true;g.add(body);
  for(let k=0;k<9;k++){const a=k/9*Math.PI*2,w=new THREE.Mesh(new THREE.DodecahedronGeometry(6.5+(k%3),0),coat);w.scale.set(1.28,.52,.75);w.position.set(Math.cos(a)*24,34+(k%2)*5,Math.sin(a)*16);g.add(w);}
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(7.5,10.5,28,9),skin);neck.rotation.z=-.50;neck.position.set(28,35,0);g.add(neck);
  // Narrow ovine head, sloped forehead and tapered muzzle; avoids the round koala silhouette.
  const skull=new THREE.Mesh(new THREE.SphereGeometry(12.8,14,9),skin);skull.scale.set(1.22,.90,.66);skull.position.set(43,40,0);skull.castShadow=true;g.add(skull);
  const forehead=new THREE.Mesh(new THREE.ConeGeometry(8.0,17,8),skin);forehead.rotation.z=-Math.PI/2;forehead.position.set(50,41,0);forehead.scale.set(1,.82,.72);g.add(forehead);
  const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(5.4,7.4,15,8),muzzleMat);muzzle.rotation.z=-Math.PI/2;muzzle.position.set(56,35.5,0);muzzle.scale.z=.72;g.add(muzzle);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(3.1,10,7),hoofMat);nose.scale.set(.62,.55,.78);nose.position.set(63.0,35.1,0);g.add(nose);
  const mouthLine=new THREE.Mesh(new THREE.BoxGeometry(5.5,.65,.9),dark);mouthLine.position.set(61,32.4,0);g.add(mouthLine);
  for(const side of [-1,1]){
    const ear=new THREE.Mesh(new THREE.ConeGeometry(3.8,14,7),skin);ear.rotation.z=side*Math.PI/2;ear.rotation.x=side*.18;ear.position.set(40.5,45.5,side*11.5);g.add(ear);
    const eyeRim=new THREE.Mesh(new THREE.SphereGeometry(2.45,10,7),dark);eyeRim.scale.set(1,.72,.55);eyeRim.position.set(49,42.3,side*8.4);g.add(eyeRim);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(1.55,9,6),mat(0xb89a62));eye.scale.z=.55;eye.position.set(49.8,42.35,side*9.15);g.add(eye);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(.72,8,5),dark);pupil.scale.set(.48,1,.42);pupil.position.set(50.5,42.35,side*9.55);g.add(pupil);
  }
  const legs=[];
  [[-17,-10],[-17,10],[19,-10],[19,10]].forEach(([x,z])=>{
    const pivot=new THREE.Group();pivot.position.set(x,27,z);g.add(pivot);
    const upper=new THREE.Mesh(new THREE.CylinderGeometry(3.3,4.1,22,7),skin);upper.position.y=-11;pivot.add(upper);
    const lower=new THREE.Mesh(new THREE.CylinderGeometry(2.6,3.0,16,7),skin);lower.position.y=-29;pivot.add(lower);
    const hoof=new THREE.Mesh(new THREE.BoxGeometry(6.2,4,8),hoofMat);hoof.position.set(2,-38,0);pivot.add(hoof);legs.push(pivot);
  });
  const tail=new THREE.Mesh(new THREE.ConeGeometry(5,13,7),coat);tail.rotation.z=-Math.PI/2;tail.position.set(-40,37,0);g.add(tail);
  g.userData={phase:i*.73,target:new THREE.Vector3(),thirst:100,recallUntil:0,stuckTime:0,lastPos:new THREE.Vector3(),lastBleat:0,legs,runPhase:i*.9};scene.add(g);objects.sheep.push(g);return g;
}
function createRockPickup(q,x,z){
  const color={ '거친 돌':0x6c5c49,'둥근 돌':0x888078,'좋은 돌':0xa38d6c,'큰 돌':0x554b40}[q];
  const r=new THREE.Mesh(new THREE.DodecahedronGeometry(q==='큰 돌'?9:6.2,0),mat(color));
  r.position.set(x,terrainHeight(x,z)+4,z);r.castShadow=true;r.userData={quality:q,pickup:true};scene.add(r);objects.rocks.push(r);
}


function createEnemyHealthUI(enemy){
  const wrap=document.createElement('div');
  wrap.className='enemy-health';
  const fill=document.createElement('i');
  const label=document.createElement('b');
  label.textContent=enemy.userData.label||'적';
  wrap.append(fill,label);
  $('#enemyHealthLayer').appendChild(wrap);
  enemy.userData.healthUI={wrap,fill,label};
}
function updateEnemyHealthUI(){
  const player=objects.player;
  if(!player)return;
  for(const en of objects.enemies){
    const ui=en.userData.healthUI;
    if(!ui)continue;
    const dist=en.position.distanceTo(player.position);
    const engaged=en.userData.hp>0&&dist<520;
    if(!engaged){ui.wrap.style.display='none';continue;}
    const pos=en.position.clone();pos.y+=75;
    pos.project(camera);
    if(pos.z<-1||pos.z>1){ui.wrap.style.display='none';continue;}
    const x=(pos.x*.5+.5)*host.clientWidth;
    const y=(-pos.y*.5+.5)*host.clientHeight;
    ui.wrap.style.left=x+'px';ui.wrap.style.top=y+'px';ui.wrap.style.display='block';
    ui.fill.style.width=Math.max(0,en.userData.hp/en.userData.maxHp*100)+'%';
  }
}
function removeEnemyHealthUI(enemy){
  enemy.userData.healthUI?.wrap?.remove();
  enemy.userData.healthUI=null;
}

function createPredator(type='lion'){
  const g=new THREE.Group();
  const specs={
    lion:{hp:105,speed:60,body:0xa06f35,head:0x7b4c25,scale:1.18,label:'사자'},
    bear:{hp:145,speed:48,body:0x5b493a,head:0x42352c,scale:1.38,label:'곰'},
    wolf:{hp:52,speed:78,body:0x77756d,head:0x55554f,scale:.62,label:'늑대'},
    fox:{hp:34,speed:88,body:0xb86e39,head:0x8f4e2d,scale:.48,label:'여우'},
    bandit:{hp:78,speed:62,body:0x6b4c37,head:0x9a6749,scale:.78,label:'강도'}
  };
  const s=specs[type]||specs.lion;
  if(type==='bandit'){addCylinder(g,9,14,52,[0,40,0],s.body,7);addCylinder(g,9,9,16,[0,76,0],s.head,8);addBox(g,[8,48,8],[-18,38,0],s.body);addBox(g,[8,48,8],[18,38,0],s.body);addBox(g,[7,46,7],[-8,4,0],0x4d392c);addBox(g,[7,46,7],[8,4,0],0x4d392c);addBox(g,[8,54,8],[27,38,0],0x5b3b24).rotation.z=-.35;}
  else {const body=addBox(g,[65,30,28],[0,24,0],s.body);body.scale.x=1.2;
  addBox(g,[28,29,28],[43,30,0],s.head);
  [[-24,0,-10],[-24,0,10],[28,0,-10],[28,0,10]].forEach(p=>addBox(g,[7,35,7],[p[0],8,p[2]],s.body));
  // Pastel low-poly silhouette details.
  if(type==='lion') addBox(g,[16,35,34],[35,31,0],0x6b4528);
  if(type==='fox'||type==='wolf') addBox(g,[37,8,8],[-48,29,0],s.body).rotation.z=.28;}
  g.userData={hp:s.hp,maxHp:s.hp,speed:s.speed,state:'hunt',type,label:s.label};g.scale.setScalar(s.scale);scene.add(g);objects.enemies.push(g);createEnemyHealthUI(g);return g;
}
function createLion(){return createPredator('lion');}

function createGoal(){
  const ring=new THREE.Mesh(new THREE.RingGeometry(130,150,48),new THREE.MeshBasicMaterial({color:0xe6c860,side:THREE.DoubleSide,transparent:true,opacity:.75}));
  ring.rotation.x=-Math.PI/2;scene.add(ring);objects.goal=ring;
  createShepherdDestination();
  moveGoalSite();
}

function resetWorld(){
  [objects.player,...objects.sheep,...objects.rocks,...objects.enemies,...objects.projectiles].filter(Boolean).forEach(o=>scene.remove(o));
  objects.sheep=[];objects.rocks=[];objects.enemies=[];objects.projectiles=[];
  Object.assign(state,{hp:100,stones:15,quality:'좋은 돌',money:0,respect:0,invincible:false,skill:0,missionDone:false,cheatUsed:false,thirst:100,thirstFailed:false,worldTime:.29});
  goal.set(-1150,0,1050);missionCycle=1;moveGoalSite();cameraMode=0;
  currentWeapon='sling';gameOverPenaltyApplied=false;updateWeaponHUD();$('#mission').style.display='block';
  enemySpawnTimer=randomSpawnDelay(true);enemyCooldown=0;dangerWarningShown=false;dangerNotice('');
  const p=createDavid();placePlayerSafely(DEFAULT_START.x,DEFAULT_START.z);p.rotation.y=0;
  for(let i=0;i<12;i++){const s=createSheep(i);const x=objects.player.position.x-80+(i%4)*55,z=objects.player.position.z-130+Math.floor(i/4)*62;s.position.set(x,terrainHeight(x,z)+1,z);}
  const qs=['거친 돌','둥근 돌','좋은 돌','큰 돌'];let madeRocks=0,rockTries=0;while(madeRocks<90&&rockTries++<700){const x=-2700+Math.random()*5400,z=-2700+Math.random()*5400;if(isInsideJerusalem(x,z,40)||localSlope(x,z)>.48)continue;const probe=new THREE.Vector3(x,terrainHeight(x,z)+5,z);if(collidesWorld(probe,14))continue;createRockPickup(qs[madeRocks%4],x,z);madeRocks++;}
  [[-900,470],[-860,540],[-790,455],[-720,600],[-620,420],[1750,-900],[1820,-1040]].forEach((p,i)=>createRockPickup(qs[i%4],p[0],p[1]));
  updateHUD();$('#thirstHud').classList.add('show');$('#thirstBar').style.width=state.thirst+'%';$('#thirstValue').textContent=Math.round(state.thirst);
}

function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));}


function getActiveMenu(){
  for(const id of ['settingsPanel','pause','gameOver']){
    const el=document.getElementById(id);
    if(el&&!el.classList.contains('hidden'))return el;
  }
  return null;
}
function menuItems(menu){
  return [...menu.querySelectorAll('button:not([disabled]),input[type="range"],a[href]')].filter(el=>el.offsetParent!==null);
}
function focusMenuItem(menu,index=0){
  const items=menuItems(menu);if(!items.length)return;
  menuFocusIndex=(index+items.length)%items.length;
  items.forEach(el=>el.classList.remove('menu-focus'));
  const item=items[menuFocusIndex];item.classList.add('menu-focus');item.focus({preventScroll:true});
}
function handleMenuKeyboard(e){
  const menu=getActiveMenu();if(!paused||!menu)return false;
  const items=menuItems(menu);if(!items.length)return false;
  const current=Math.max(0,items.indexOf(document.activeElement));
  if(e.key==='Tab'||e.key==='ArrowDown'||e.key==='ArrowRight'){
    e.preventDefault();
    if(document.activeElement?.type==='range'&&(e.key==='ArrowRight')){
      document.activeElement.stepUp();document.activeElement.dispatchEvent(new Event('input',{bubbles:true}));
    }else focusMenuItem(menu,current+(e.shiftKey?-1:1));
    return true;
  }
  if(e.key==='ArrowUp'||e.key==='ArrowLeft'){
    e.preventDefault();
    if(document.activeElement?.type==='range'&&(e.key==='ArrowLeft')){
      document.activeElement.stepDown();document.activeElement.dispatchEvent(new Event('input',{bubbles:true}));
    }else focusMenuItem(menu,current-1);
    return true;
  }
  if(e.key==='Enter'){
    e.preventDefault();
    const item=document.activeElement;
    if(item?.type==='range')return true;
    item?.click();return true;
  }
  return false;
}

function cameraModeMessage(text){
  const el=$('#cameraModeNotice');if(!el)return;
  el.textContent=text;el.classList.add('show');
  clearTimeout(cameraModeMessage.timer);
  cameraModeMessage.timer=setTimeout(()=>el.classList.remove('show'),1500);
}
function cycleCameraMode(){
  cameraMode=(cameraMode+1)%CAMERA_MODES.length;
  cameraModeMessage(CAMERA_MODES[cameraMode].name);
}

function openPauseMenu(){
  paused=true;pauseAllGameAudio();$('#pause').classList.remove('hidden');document.exitPointerLock?.();
  setTimeout(()=>focusMenuItem($('#pause'),0),0);
}

document.addEventListener('pointerdown',()=>{unlockAudio();},{passive:true});
document.addEventListener('keydown',e=>{unlockAudio();
  if(handleMenuKeyboard(e))return;
  keys[e.code]=true;
  if(running&&!paused&&document.pointerLockElement!==renderer?.domElement&&['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code)){renderer?.domElement.requestPointerLock?.().catch?.(()=>{});}
  if(e.code==='KeyV'&&running&&!paused&&!e.repeat){cycleCameraMode();}
  if(e.code==='Tab'&&running&&!paused){e.preventDefault();currentWeapon=currentWeapon==='sling'?'staff':'sling';aiming=false;charging=false;$('#crosshair').style.display='none';$('#charge').style.display='none';updateWeaponHUD();notice(currentWeapon==='sling'?'회전식 돌팔매를 들었습니다.':'지팡이를 들었습니다.');}
  if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&!e.repeat) jumpPressed=true;
  if(e.code==='KeyZ'&&running&&!paused){const now=performance.now();objects.sheep.forEach((s,i)=>{const a=i/objects.sheep.length*Math.PI*2;s.userData.target.set(objects.player.position.x+Math.sin(a)*90,0,objects.player.position.z+Math.cos(a)*90);s.userData.recallUntil=now+18000;s.userData.stuckTime=0;});playFileSound('sheep');notice('양 떼 전체를 불러 모았습니다.');}
  if((e.code==='ControlLeft'||e.code==='ControlRight'||e.code==='KeyE')&&running&&!paused)pickupRock();
  if(e.code==='Enter'&&running){toggleConsole();e.preventDefault();}
  if(e.code==='Escape'&&running&&!$('#settingsPanel').classList.contains('hidden')){closeSettings();}
  else if(e.code==='Escape'&&running){if(paused){paused=false;resumeGameAudio();$('#pause').classList.add('hidden');renderer.domElement.requestPointerLock?.();}else openPauseMenu();}
});
document.addEventListener('keyup',e=>keys[e.code]=false);
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement===renderer?.domElement&&!paused){
    yaw-=e.movementX*pointerSensitivity;
    pitch-=e.movementY*pointerSensitivity*0.42;
    pitch=THREE.MathUtils.clamp(pitch,-1.30,1.10);
  }
});
rendererLockOnClick();
function rendererLockOnClick(){
  host.addEventListener('click',()=>{
    if(running&&!paused&&document.pointerLockElement!==renderer?.domElement) renderer?.domElement.requestPointerLock?.();
  });
}

document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===renderer?.domElement;
  $('#reconnectHint')?.classList.toggle('show',running&&!paused&&!locked);
  // One Escape press exits pointer lock; treat that as the pause command.
  if(!$('#settingsPanel').classList.contains('hidden')) return;
  if(running&&!paused&&!locked&&$('#cheatConsole').classList.contains('hidden')&&$('#gameOver').classList.contains('hidden')){
    openPauseMenu();
  }
});
window.addEventListener('focus',()=>{if(running&&!paused)renderer?.domElement.requestPointerLock?.().catch?.(()=>{});});
host.addEventListener('mouseenter',()=>{if(running&&!paused)renderer?.domElement.requestPointerLock?.().catch?.(()=>{});});

document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousedown',e=>{
  if(!running||paused)return;
  if(e.button===2&&currentWeapon==='sling'){aiming=true;$('#crosshair').style.display='block';}
  if(e.button===0&&currentWeapon==='staff'){staffAttack();}
  else if(e.button===0&&aiming&&state.stones>0){charging=true;charge=0;$('#charge').style.display='block';}
});
document.addEventListener('mouseup',e=>{
  if(e.button===2){aiming=false;charging=false;$('#crosshair').style.display='none';$('#charge').style.display='none';}
  if(e.button===0&&charging){fire();charging=false;$('#charge').style.display='none';}
});
$('#resumeBtn').onclick=()=>{paused=false;resumeGameAudio();$('#pause').classList.add('hidden');document.querySelectorAll('.menu-focus').forEach(el=>el.classList.remove('menu-focus'));renderer.domElement.requestPointerLock?.();};
$('#saveBtn').onclick=saveGame;$('#quitBtn').onclick=()=>location.reload();$('#restartBtn').onclick=()=>{loadGame()||resetWorld();state.thirstFailed=false;$('#gameOver').classList.add('hidden');$('#gameOver').classList.remove('mission-fail');paused=false;renderer?.domElement.requestPointerLock?.();};

function toggleConsole(){const c=$('#cheatConsole');c.classList.toggle('hidden');if(!c.classList.contains('hidden')){paused=true;document.exitPointerLock?.();$('#cheatInput').focus();}else{paused=false;renderer.domElement.requestPointerLock?.();}}
$('#cheatInput').addEventListener('keydown',e=>{if(e.key==='Enter'){const v=e.target.value.trim().toLowerCase();e.target.value='';if(!v){toggleConsole();e.stopPropagation();return;}let applied=false,enabled=true;if(v==='gavriel'){state.invincible=!state.invincible;enabled=state.invincible;applied=true;}else if(v==='parnasa'){state.money=Math.min(1000000,state.money+1000);applied=true;}else if(v==='rafael'){state.hp=100;applied=true;}if(applied){state.cheatUsed=true;notice(enabled?'치트키가 입력되었습니다.':'치트키가 해제되었습니다.');updateHUD();}toggleConsole();e.stopPropagation();}});

function updateWeaponHUD(){
  const icon=$('#weaponIcon');if(!icon)return;
  icon.classList.toggle('sling',currentWeapon==='sling');
  icon.classList.toggle('staff',currentWeapon==='staff');
  icon.setAttribute('aria-label',currentWeapon==='sling'?'회전식 돌팔매':'지팡이');
}
function staffAttack(){
  const p=objects.player;if(!p||staffAttackCooldown>0)return;
  staffAttackCooldown=.55;
  p.userData.staffSwing=.36;
  const icon=$('#weaponIcon');icon?.classList.remove('swing');void icon?.offsetWidth;icon?.classList.add('swing');
  let hit=false;
  const forward=new THREE.Vector3(Math.sin(p.rotation.y),0,Math.cos(p.rotation.y));
  for(const en of objects.enemies){
    if(en.userData.hp<=0)continue;
    const delta=en.position.clone().sub(p.position);delta.y=0;const dist=delta.length();
    if(dist<125&&dist>0&&delta.normalize().dot(forward)>.15){
      en.userData.hp-=34;
      en.position.addScaledVector(forward,42);
      hit=true;
      if(en.userData.hp<=0)defeatEnemy(en);
    }
  }
  playStaffSound(hit);
  if(hit)notice('지팡이로 상대를 밀쳐냈습니다.');
}
function showMissionSuccess(respectGain){
  playMissionSound();
  const box=$('#missionResult');box.querySelector('strong').textContent='미션 성공!';box.querySelector('span').textContent='존중 +'+respectGain+' 상승';
  box.classList.remove('show');void box.offsetWidth;box.classList.add('show');
  clearTimeout(showMissionSuccess.timer);showMissionSuccess.timer=setTimeout(()=>box.classList.remove('show'),4200);
}
function defeatEnemy(en){
  if(!en||en.userData.hp>0)return;
  en.visible=false;state.money=Math.min(1000000,state.money+15);
  if(en.userData.type==='wolf'){
    const packRemaining=objects.enemies.some(other=>other!==en&&other.userData.type==='wolf'&&other.userData.packId===en.userData.packId&&other.userData.hp>0);
    if(packRemaining){notice('늑대 한 마리를 물리쳤습니다. +15 셰켈');return;}
    state.respect=Math.min(100,state.respect+10);notice('늑대 떼를 모두 물리쳤습니다. 존중 +10 · +15 셰켈');
  }else{
    state.respect=Math.min(100,state.respect+5);notice(en.userData.label+'을 물리쳤습니다. 존중 +5 · +15 셰켈');
  }
  enemyCooldown=300;scheduleNextEnemy(false);
}

function pickupRock(){
  if(state.stones>=25){notice('돌은 최대 25개까지 지닐 수 있습니다.');return;}
  let best=null,bd=115;
  for(const r of objects.rocks){
    if(!r.visible)continue;
    const d=r.position.distanceTo(objects.player.position);
    if(d<bd){bd=d;best=r;}
  }
  if(best){
    best.visible=false;
    state.stones=Math.min(25,state.stones+1);
    state.quality=best.userData.quality;
    playPickupSound();notice(state.quality+'을 주웠습니다. ('+state.stones+'/25)');
    updateHUD();
  }else notice('가까운 곳에 적합한 돌이 없습니다.');
}

function fire(){
  if(state.stones<=0){currentWeapon='staff';updateWeaponHUD();notice('돌이 없어 지팡이로 자동 전환했습니다.');return;}
  state.stones--;
  const origin=new THREE.Vector3();camera.getWorldPosition(origin);
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  const spread=(.024+charge*.035)*(1-state.skill*.008);
  dir.x+=(Math.random()-.5)*spread;dir.y+=(Math.random()-.5)*spread;dir.z+=(Math.random()-.5)*spread;dir.normalize();
  const mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(state.quality==='큰 돌'?5:3.5,0),mat(0x4c443b));mesh.position.copy(origin).addScaledVector(dir,20);mesh.castShadow=true;
  mesh.userData={velocity:dir.multiplyScalar(340+charge*360),life:4,damage:(state.quality==='큰 돌'?55:35)*(.55+charge*.75)};scene.add(mesh);objects.projectiles.push(mesh);updateHUD();
}

function updatePlayer(dt){
  const p=objects.player;if(!p)return;
  staffAttackCooldown=Math.max(0,staffAttackCooldown-dt);
  if(p.userData.staff){
    if(p.userData.staffSwing>0){p.userData.staffSwing=Math.max(0,p.userData.staffSwing-dt);const t=1-p.userData.staffSwing/.36;p.userData.staff.rotation.z=-.45+Math.sin(t*Math.PI)*1.45;p.userData.staff.rotation.x=Math.sin(t*Math.PI)*.35;}
    else {p.userData.staff.rotation.z=THREE.MathUtils.lerp(p.userData.staff.rotation.z,-.025,Math.min(1,dt*10));p.userData.staff.rotation.x*=Math.max(0,1-dt*10);}
  }
  const forwardInput=(keys.KeyW?1:0)-(keys.KeyS?1:0);
  const strafeInput=(keys.KeyD?1:0)-(keys.KeyA?1:0);

  // Camera-relative movement: W/S follow the view direction, A/D follow screen left/right.
  const viewForward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)).normalize();
  const viewRight=new THREE.Vector3(-Math.cos(yaw),0,Math.sin(yaw)).normalize();
  const previousPosition=p.position.clone();
  const move=new THREE.Vector3();
  move.addScaledVector(viewForward,forwardInput).addScaledVector(viewRight,strafeInput);

  if(move.lengthSq()>0){
    move.normalize();
    const speed=(keys.Space?270:145)*(aiming?.55:1);
    const step=move.clone().multiplyScalar(speed*dt);
    const tryX=p.position.clone();tryX.x+=step.x;tryX.y=terrainHeight(tryX.x,tryX.z)+83;if(!collidesWorld(tryX,15))p.position.x=tryX.x;
    const tryZ=p.position.clone();tryZ.z+=step.z;tryZ.y=terrainHeight(tryZ.x,tryZ.z)+83;if(!collidesWorld(tryZ,15))p.position.z=tryZ.z;
    const wantedRot=Math.atan2(move.x,move.z);
    let delta=THREE.MathUtils.euclideanModulo(wantedRot-p.rotation.y+Math.PI,Math.PI*2)-Math.PI;
    p.rotation.y+=delta*Math.min(1,dt*12);
    p.userData.walkPhase+=dt*(keys.Space?15.5:9);
    const runningNow=!!keys.Space;
    const swing=Math.sin(p.userData.walkPhase)*(runningNow?.72:.38);
    const bodyRoot=p.userData.bodyRoot||p;
    bodyRoot.rotation.x=THREE.MathUtils.lerp(bodyRoot.rotation.x,runningNow?.16:0,Math.min(1,dt*8));
    bodyRoot.rotation.z=THREE.MathUtils.lerp(bodyRoot.rotation.z,0,Math.min(1,dt*10));
    const limbs=p.userData.limbs;
    if(limbs){limbs.leftLeg.rotation.x=swing;limbs.rightLeg.rotation.x=-swing;limbs.leftArm.rotation.x=-swing*.65;limbs.rightArm.rotation.x=swing*.65;}
  }else{
    const bodyRoot=p.userData.bodyRoot||p;
    bodyRoot.rotation.x=THREE.MathUtils.lerp(bodyRoot.rotation.x,0,Math.min(1,dt*8));
    bodyRoot.rotation.z=THREE.MathUtils.lerp(bodyRoot.rotation.z,0,Math.min(1,dt*10));
    const limbs=p.userData.limbs;
    if(limbs){for(const limb of Object.values(limbs))limb.rotation.x*=Math.max(0,1-dt*10);}
  }

  const ground=terrainHeight(p.position.x,p.position.z)+83;
  if(jumpPressed&&p.userData.grounded){p.userData.verticalVelocity=165;p.userData.grounded=false;}
  jumpPressed=false;
  if(!p.userData.grounded){
    p.userData.verticalVelocity-=360*dt;
    p.position.y+=p.userData.verticalVelocity*dt;
    if(p.position.y<=ground){p.position.y=ground;p.userData.verticalVelocity=0;p.userData.grounded=true;}
  }else p.position.y=ground;

  const beforeX=p.position.x,beforeZ=p.position.z;
  p.position.x=THREE.MathUtils.clamp(p.position.x,-WORLD/2+80,WORLD/2-80);
  p.position.z=THREE.MathUtils.clamp(p.position.z,-WORLD/2+80,WORLD/2-80);
  if(collidesWorld(p.position,15)){p.position.x=previousPosition.x;p.position.z=previousPosition.z;}else p.userData.lastSafePosition?.copy(p.position);
  if(p.position.x>EAST_CLIFF_X)p.position.x=EAST_CLIFF_X;

  const mode=CAMERA_MODES[cameraMode];
  const targetDistance=aiming?92:mode.distance;
  const targetHeight=aiming?78:mode.height;
  const targetFov=aiming?43:mode.fov;
  const smooth=1-Math.pow(.0015,dt);
  currentCamDistance=THREE.MathUtils.lerp(currentCamDistance,targetDistance,smooth);
  currentCamHeight=THREE.MathUtils.lerp(currentCamHeight,targetHeight,smooth);
  currentFov=THREE.MathUtils.lerp(currentFov,targetFov,smooth);
  if(Math.abs(camera.fov-currentFov)>.02){camera.fov=currentFov;camera.updateProjectionMatrix();}

  const cosPitch=Math.cos(pitch), sinPitch=Math.sin(pitch);
  const aimDir=new THREE.Vector3(Math.sin(yaw)*cosPitch,sinPitch,Math.cos(yaw)*cosPitch).normalize();
  const focus=new THREE.Vector3(p.position.x,p.position.y+58,p.position.z);
  const shoulderOffset=aiming?viewRight.clone().multiplyScalar(20):new THREE.Vector3();
  focus.add(shoulderOffset);

  // V cycles through four camera distances; aiming temporarily uses the close aiming camera.
  const firstPerson=!aiming&&CAMERA_MODES[cameraMode].firstPerson;
  const pivot=new THREE.Vector3(p.position.x,p.position.y+(firstPerson?74:(aiming?55:68)),p.position.z).add(shoulderOffset);
  let desired;
  if(firstPerson){
    desired=pivot.clone().addScaledVector(aimDir,9);
  }else{
    desired=pivot.clone().addScaledVector(aimDir,-currentCamDistance);
    desired.y+=(aiming?8:(cameraMode===3?34:24));
  }

  // Keep the camera above the terrain without collapsing it into the player.
  const cameraFloor=terrainHeight(desired.x,desired.z)+18;
  if(desired.y<cameraFloor) desired.y=cameraFloor;

  // Recover safely if an invalid position ever enters the camera/player state.
  if (![p.position.x,p.position.y,p.position.z,desired.x,desired.y,desired.z].every(Number.isFinite)) {
    p.position.set(-950,terrainHeight(-950,500)+83,500);
    p.userData.verticalVelocity=0;
    p.userData.grounded=true;
    desired.set(p.position.x, p.position.y+currentCamHeight, p.position.z+currentCamDistance);
  }

  camera.position.lerp(desired,smooth);
  const lookAt=pivot.clone().addScaledVector(aimDir,520);
  camera.lookAt(lookAt);
  camera.updateMatrixWorld();
  p.visible=!(aiming||(!aiming&&CAMERA_MODES[cameraMode].firstPerson));
  if(objects.aimRig){objects.aimRig.visible=aiming;const sling=objects.aimRig.userData.sling;if(sling){sling.rotation.z=charging?performance.now()*.018:0;sling.rotation.x=charging?.18:0;}objects.aimRig.rotation.z=0;}
}


let sheepHoldingCity=null;
let sheepHoldPoint=new THREE.Vector3();
function nearestGateHoldPoint(city,playerPos){
  const dx=playerPos.x-city.x,dz=playerPos.z-city.z;
  if(Math.abs(dx)>Math.abs(dz)){
    return new THREE.Vector3(city.x+Math.sign(dx)*((city.wallRX||city.wallR)+120),0,city.z);
  }
  return new THREE.Vector3(city.x,0,city.z+Math.sign(dz)*((city.wallRZ||city.wallR)+120));
}
function updateCameraOcclusion(){
  const p=objects.player;if(!p||!objects.jerusalem)return;
  objects.jerusalem.traverse(o=>{if(o.isMesh&&o.userData.cameraHidden){o.visible=true;o.userData.cameraHidden=false;}});
  const direction=p.position.clone().sub(camera.position),distance=direction.length();
  const ray=new THREE.Raycaster(camera.position,direction.normalize(),0,Math.max(0,distance-28));
  const hits=ray.intersectObjects(objects.jerusalem.children,true);
  for(const h of hits){
    const o=h.object;if(!o?.isMesh||o.userData.neverOcclude)continue;
    // Hide only nearby house/roof pieces; city walls and the Temple remain visible landmarks.
    if(h.distance>45&&h.distance<distance-25&&o.geometry?.parameters?.height<260){o.visible=false;o.userData.cameraHidden=true;}
  }
}

function updateCitySheepHold(){
  const p=objects.player?.position;if(!p)return;
  const inside=CITY_DEFS.find(c=>cityEllipseValue(c,p.x,p.z,-120)<1);
  if(inside){
    if(!sheepHoldingCity||sheepHoldingCity.name!==inside.name){
      sheepHoldingCity=inside;
      sheepHoldPoint.copy(nearestGateHoldPoint(inside,p));
    }
    objects.sheep.forEach((s,i)=>{
      const a=i/objects.sheep.length*Math.PI*2;
      s.userData.safeHold=true;
      s.userData.target.set(sheepHoldPoint.x+Math.sin(a)*90,0,sheepHoldPoint.z+Math.cos(a)*90);
    });
  }else if(sheepHoldingCity){
    const c=sheepHoldingCity;
    if(cityEllipseValue(c,p.x,p.z,180)>1){
      sheepHoldingCity=null;
      objects.sheep.forEach(s=>{s.userData.safeHold=false;s.userData.target.set(0,0,0);});
    }
  }
}

function preferredSheepWaypoint(s,target){
  const city=CITY_DEFS[0];
  const sInside=cityEllipseValue(city,s.position.x,s.position.z,-20)<1;
  const tInside=cityEllipseValue(city,target.x,target.z,-20)<1;
  if(sInside)return nearestGateHoldPoint(city,s.position);
  if(tInside){
    const hold=nearestGateHoldPoint(city,target);
    return hold;
  }
  const midX=(s.position.x+target.x)/2,midZ=(s.position.z+target.z)/2;
  if(cityEllipseValue(city,midX,midZ,80)<1){
    const gates=[[0,city.wallRZ+125],[0,-city.wallRZ-125],[city.wallRX+125,120],[-city.wallRX-125,260]];
    gates.sort((a,b)=>(Math.hypot(s.position.x-a[0],s.position.z-a[1])+Math.hypot(target.x-a[0],target.z-a[1]))-(Math.hypot(s.position.x-b[0],s.position.z-b[1])+Math.hypot(target.x-b[0],target.z-b[1])));
    return tempV2.set(gates[0][0],0,gates[0][1]);
  }
  return target;
}
function updateSheep(dt,time){
  updateCitySheepHold();
  if(soundEnabled&&Math.random()<dt*.012)playFileSound('sheep');
  const p=objects.player;
  objects.sheep.forEach((s,i)=>{
    let target=s.userData.target;
    if(target.lengthSq()===0){const a=i/objects.sheep.length*Math.PI*2+s.userData.phase;target=tempV.set(p.position.x-110+Math.sin(a)*110,0,p.position.z-110+Math.cos(a)*110);}
    const waypoint=preferredSheepWaypoint(s,target);
    const dx=waypoint.x-s.position.x,dz=waypoint.z-s.position.z,d=Math.hypot(dx,dz);
    const recalling=(s.userData.recallUntil||0)>performance.now();
    if(d>18){
      const speed=recalling?82:58;let nx=s.position.x+dx/d*speed*dt,nz=s.position.z+dz/d*speed*dt;
      let probe=new THREE.Vector3(nx,terrainHeight(nx,nz)+5,nz);
      if(isInsideJerusalem(nx,nz,-18)||collidesWorld(probe,10)){
        const side=i%2?1:-1;const sx=-dz/d*side,sz=dx/d*side;
        nx=s.position.x+sx*speed*.82*dt;nz=s.position.z+sz*speed*.82*dt;probe.set(nx,terrainHeight(nx,nz)+5,nz);
      }
      if(!isInsideJerusalem(nx,nz,-18)&&!collidesWorld(probe,10)){s.position.x=nx;s.position.z=nz;}
      const wantedSheepYaw=Math.atan2(-dz,dx);let sheepDelta=THREE.MathUtils.euclideanModulo(wantedSheepYaw-s.rotation.y+Math.PI,Math.PI*2)-Math.PI;s.rotation.y+=sheepDelta*Math.min(1,dt*9);
      const moved=s.position.distanceTo(s.userData.lastPos||s.position);
      s.userData.stuckTime=moved<.25?(s.userData.stuckTime||0)+dt:0;
      if(s.userData.stuckTime>2.2&&recalling){
        const rescue=nearestGateHoldPoint(CITY_DEFS[0],s.position);s.userData.target.set(rescue.x,0,rescue.z);s.userData.stuckTime=0;
      }
      s.userData.lastPos.copy(s.position);
    }else if(s.userData.target.lengthSq()>0&&!s.userData.safeHold){s.userData.target.set(0,0,0);s.userData.recallUntil=0;}
    const moving=d>18;
    if(moving&&s.userData.legs){
      s.userData.runPhase+=dt*(recalling?12:8);
      const stride=Math.sin(s.userData.runPhase)*(recalling?.55:.34);
      s.userData.legs[0].rotation.z=stride;s.userData.legs[3].rotation.z=stride;
      s.userData.legs[1].rotation.z=-stride;s.userData.legs[2].rotation.z=-stride;
      s.rotation.z=THREE.MathUtils.lerp(s.rotation.z,recalling?-.055:0,Math.min(1,dt*7));
    }else if(s.userData.legs){for(const leg of s.userData.legs)leg.rotation.z*=Math.max(0,1-dt*8);s.rotation.z*=Math.max(0,1-dt*8);}
    const bob=moving?Math.abs(Math.sin((s.userData.runPhase||0)*2))*(recalling?2.1:1.15):Math.sin(time*2+s.userData.phase)*.35;
    s.position.y=terrainHeight(s.position.x,s.position.z)+1+bob;
  });
}

function randomSpawnDelay(first=false){
  // First encounter: roughly 4–8 minutes. Later encounters: roughly 6–12 minutes.
  const min=first?240:360, max=first?480:720;
  return min+Math.random()*(max-min);
}
function dangerNotice(text,duration=4200){
  const el=$('#dangerNotice');
  el.textContent=text;
  clearTimeout(dangerNotice.timer);
  if(text) dangerNotice.timer=setTimeout(()=>{ if(el.textContent===text) el.textContent=''; },duration);
}
function scheduleNextEnemy(first=false){
  enemySpawnTimer=randomSpawnDelay(first);
  dangerWarningShown=false;
  dangerNotice('');
}
function spawnEnemyAtSafeDistance(){
  const p=objects.player.position,inside=isInsideCityCore(p.x,p.z,-80);
  const roll=Math.random();const type=inside?'bandit':(roll<.08?'bear':roll<.30?'lion':roll<.74?'wolf':'fox');
  const count=type==='wolf'?3:1,packId=type==='wolf'?++activeWolfPackId:0;
  for(let i=0;i<count;i++){
    let x,z;
    for(let tries=0;tries<40;tries++){const angle=Math.random()*Math.PI*2,distance=inside?360+Math.random()*260:720+Math.random()*420+i*50;x=p.x+Math.sin(angle)*distance;z=p.z+Math.cos(angle)*distance;const candidateInside=isInsideCityCore(x,z,-90);if((inside&&candidateInside)||(!inside&&!candidateInside))break;}
    const e=createPredator(type);e.userData.packId=packId;e.position.set(x,terrainHeight(x,z)+1,z);
  }
  playDangerSound();dangerNotice(inside?'성 안에 강도가 나타났습니다.':'성 밖에 야생 동물이 나타났습니다.',5200);
}

function updateEnemies(dt){
  if(enemyCooldown>0) enemyCooldown-=dt;
  if(objects.enemies.length===0){
    enemySpawnTimer-=dt;
    if(enemySpawnTimer<=18 && enemySpawnTimer>0 && !dangerWarningShown){
      dangerWarningShown=true;
      dangerNotice('멀리서 맹수의 기척이 느껴집니다.',5200);
    }
    if(enemySpawnTimer<=0 && enemyCooldown<=0){
      spawnEnemyAtSafeDistance();
      // Do not count down another encounter while this one is active.
      enemySpawnTimer=Infinity;
    }
  }
  for(const en of objects.enemies){
    if(en.userData.hp<=0) continue;
    const shouldBeInside=en.userData.type==='bandit';
    if(shouldBeInside!==isInsideCityCore(en.position.x,en.position.z,-70)){en.userData.hp=0;removeEnemyHealthUI(en);scene.remove(en);continue;}
    let target=objects.sheep[0],best=Infinity;
    for(const sh of objects.sheep){if(sh.userData.safeHold)continue;const d=sh.position.distanceTo(en.position);if(d<best){best=d;target=sh;}}
    if(en.position.distanceTo(objects.player.position)<360) target=objects.player;
    const dx=target.position.x-en.position.x,dz=target.position.z-en.position.z,d=Math.hypot(dx,dz);
    if(d>42){en.position.x+=dx/d*en.userData.speed*dt;en.position.z+=dz/d*en.userData.speed*dt;en.rotation.y=Math.atan2(dx,dz);}
    else if(target===objects.player&&!state.invincible){state.hp-=14*dt;}
    en.position.y=terrainHeight(en.position.x,en.position.z)+1;
  }
}
function updateProjectiles(dt){
  for(const p of objects.projectiles){p.userData.velocity.y-=120*dt;p.position.addScaledVector(p.userData.velocity,dt);p.userData.life-=dt;
    for(const en of objects.enemies){if(en.userData.hp>0&&p.position.distanceTo(en.position)<35){en.userData.hp-=p.userData.damage;p.userData.life=0;state.skill=Math.min(50,state.skill+1);if(en.userData.hp<=0){defeatEnemy(en);}}}
    if(p.position.y<terrainHeight(p.position.x,p.position.z))p.userData.life=0;
  }
  objects.projectiles=objects.projectiles.filter(p=>{if(p.userData.life<=0){scene.remove(p);return false;}return true;});
  objects.enemies=objects.enemies.filter(e=>{if(e.userData.hp<=0){removeEnemyHealthUI(e);return false;}return true;});
}

function checkMission(){
  if(state.missionDone||state.thirstFailed)return;
  let safe=0;
  for(const s of objects.sheep){
    if(Math.hypot(s.position.x-goal.x,s.position.z-goal.z)<240)safe++;
  }
  if(safe>=10){
    state.missionDone=true;
    state.respect=Math.min(100,state.respect+2);
    state.thirst=100;
    $('#thirstHud').classList.add('show');
    $('#mission').style.display='none';
    showMissionSuccess(2);
    chooseNextGoal();
    saveGame(true);
    setTimeout(()=>{
      state.missionDone=false;
      const mission=$('#mission');
      mission.innerHTML='<b>유랑 임무 '+missionCycle+'</b> · 양 10마리 이상을 다음 물구유와 풀구유가 있는 야영지까지 호위하십시오.';
      mission.style.display='block';
      notice('멀리 새로운 목동 야영지가 정해졌습니다.');
    },4300);
  }
}


function updateThirst(dt){
  if(!Number.isFinite(state.thirst))state.thirst=100;
  if(state.thirstFailed)return;

  const p=objects.player?.position;
  const inCity=p&&isInsideJerusalem(p.x,p.z,-40);
  const sheepAtGihon=objects.sheep.some(s=>Math.hypot(s.position.x-GIHON_SPRING.x,s.position.z-GIHON_SPRING.z)<GIHON_SPRING.r);
  const sheepAtWater=objects.sheep.some(s=>CITY_WATER_ZONES.some(w=>Math.hypot(s.position.x-w.x,s.position.z-w.z)<w.r));
  if(inCity||sheepAtWater){
    state.thirst=100;
    state.lowThirstWarned=false;
    $('#thirstHud').classList.add('show');
    if(sheepAtWater&&!state.gihonNoticeShown){state.gihonNoticeShown=true;notice(sheepAtGihon?'양 떼가 기혼 샘의 물을 마셔 갈증을 해소했습니다.':'양 떼가 쉴로악흐의 물을 마셔 갈증을 해소했습니다.');}
    return;
  }
  if(!sheepAtWater)state.gihonNoticeShown=false;

  // About twelve minutes from full to empty while travelling.
  state.thirst=THREE.MathUtils.clamp(state.thirst-dt*(100/720),0,100);
  const hud=$('#thirstHud'),bar=$('#thirstBar'),value=$('#thirstValue');
  hud.classList.add('show');
  bar.style.width=state.thirst+'%';
  value.textContent=Math.round(state.thirst);

  if(state.thirst<30&&!state.lowThirstWarned){
    state.lowThirstWarned=true;
    notice('양 떼가 심하게 목말라합니다. 다음 물구유를 서둘러 찾으십시오.');
  }
  if(state.thirst>45)state.lowThirstWarned=false;
  if(state.thirst<=0)triggerThirstFailure();
}
function triggerThirstFailure(){
  if(state.thirstFailed)return;
  state.thirstFailed=true;
  paused=true;
  $('#gameOver').classList.add('mission-fail');
  $('#gameOverTitle').textContent='미션 실패!';
  $('#gameOverText').textContent='양 떼가 물을 마시지 못했습니다. 마지막 저장 지점에서 다시 시작하시겠습니까?';
  $('#gameOver').classList.remove('hidden');
  document.exitPointerLock?.();
  setTimeout(()=>focusMenuItem($('#gameOver'),0),0);
}

const DAY_PHASES=[
  {name:'새벽',start:0.00,end:0.10},
  {name:'아침',start:0.10,end:0.28},
  {name:'점심',start:0.28,end:0.43},
  {name:'오후',start:0.43,end:0.64},
  {name:'저녁',start:0.64,end:0.78},
  {name:'밤',start:0.78,end:1.00}
];
function phaseFor(t){return DAY_PHASES.find(p=>t>=p.start&&t<p.end)||DAY_PHASES[0];}
function colorLerp(hexA,hexB,t){return new THREE.Color(hexA).lerp(new THREE.Color(hexB),t);}
function updateWorldTime(dt,realTime){
  if(!Number.isFinite(state.worldTime))state.worldTime=.29;
  // One full day takes 24 real minutes.
  state.worldTime=(state.worldTime+dt/(24*60))%1;
  const t=state.worldTime;
  const phase=phaseFor(t);
  $('#timePhaseLabel').textContent=phase.name;
  const totalMinutes=Math.floor(t*24*60);
  $('#timeClock').textContent=String(Math.floor(totalMinutes/60)).padStart(2,'0')+':'+String(totalMinutes%60).padStart(2,'0');

  const daylight=Math.max(0,Math.sin(Math.PI*THREE.MathUtils.clamp((t-.03)/.76,0,1)));
  const dawnGlow=Math.max(0,1-Math.abs(t-.08)/.11);
  const duskGlow=Math.max(0,1-Math.abs(t-.70)/.12);
  const glow=Math.max(dawnGlow,duskGlow);

  const skyTop=colorLerp(0x17233b,0x91afba,daylight).lerp(new THREE.Color(0xb78475),glow*.32);
  const skyMid=colorLerp(0x38445d,0xd8c9ae,daylight).lerp(new THREE.Color(0xe1a47d),glow*.42);
  const skyBottom=colorLerp(0x4b5367,0xe8d4ad,daylight).lerp(new THREE.Color(0xf0b887),glow*.46);
  if(skyMaterial){
    skyMaterial.uniforms.top.value.copy(skyTop);
    skyMaterial.uniforms.middle.value.copy(skyMid);
    skyMaterial.uniforms.bottom.value.copy(skyBottom);
  }
  scene.background.copy(skyTop.clone().lerp(skyMid,.5));
  scene.fog.color.copy(skyBottom.clone().lerp(skyMid,.35));
  if(sunLight){
    const angle=(t-.25)*Math.PI*2;
    sunLight.position.set(Math.cos(angle)*1500,Math.max(-250,Math.sin(angle)*1250),Math.sin(angle)*850);
    sunLight.intensity=.18+daylight*2.85;
    sunLight.color.copy(colorLerp(0x9ba6c8,0xffe0a3,daylight).lerp(new THREE.Color(0xffad78),glow*.5));
  }
  if(hemiLight){
    hemiLight.intensity=.38+daylight*1.8;
    hemiLight.color.copy(colorLerp(0x33486c,0xc7def0,daylight));
    hemiLight.groundColor.copy(colorLerp(0x201e28,0x5f442d,daylight));
  }
  if(sunDiscMesh){
    const a=(t-.25)*Math.PI*2;
    sunDiscMesh.position.set(Math.cos(a)*3000,Math.sin(a)*1800,Math.sin(a)*-2300);
    sunDiscMesh.visible=daylight>.04;
    sunDiscMesh.material.opacity=.35+daylight*.45;
    sunDiscMesh.lookAt(camera.position);
  }

  if(audioCtx&&windGain){
    windGain.gain.linearRampToValueAtTime(soundEnabled?(.07+(1-daylight)*.06):0,audioCtx.currentTime+.2);
  }
  if(soundEnabled&&audioCtx){
    if(daylight>.38&&realTime>nextBirdSound){
      playBird();nextBirdSound=realTime+8+Math.random()*18;
    }
    if(daylight<.14&&realTime>nextNightSound){
      playNightInsect();nextNightSound=realTime+.8+Math.random()*2.4;
    }
  }
}

function updateAmbientGraphics(dt,time){
  if(objects.templeSmoke){objects.templeSmoke.material.opacity=.22+Math.sin(time*.7)*.05;objects.templeSmoke.scale.x=1+Math.sin(time*.45)*.08;objects.templeSmoke.scale.z=1+Math.cos(time*.4)*.08;}
  if(objects.birds){
    objects.birds.position.x+=dt*10;
    objects.birds.position.z+=dt*3;
    objects.birds.position.y=720+Math.sin(time*.35)*28;
    if(objects.birds.position.x>1600)objects.birds.position.x=-1500;
  }
}

function update(dt,time){
  if(charging){charge=Math.min(1,charge+dt*.55);$('#charge i').style.width=(charge*100)+'%';}
  updateWorldTime(dt,time);updateFileAmbience();updateRegionLabel();updateCameraOcclusion();updateTownNPCs(dt);updatePlayer(dt);updateSheep(dt,time);updateEnemies(dt);updateProjectiles(dt);updateEnemyHealthUI();updateThirst(dt);updateAmbientGraphics(dt,time);checkMission();
  if(state.hp<=0){state.hp=0;$('#gameOver').classList.remove('mission-fail');$('#gameOverTitle').textContent='쓰러졌습니다';$('#gameOverText').textContent='마지막 저장 지점에서 다시 시작하시겠습니까?';if(!gameOverPenaltyApplied){state.respect=Math.max(0,state.respect-10);gameOverPenaltyApplied=true;notice('패배로 존중이 10 감소했습니다.');}paused=true;$('#gameOver').classList.remove('hidden');document.exitPointerLock?.();setTimeout(()=>focusMenuItem($('#gameOver'),0),0);}
  updateHUD();drawMini();
}

function drawMini(){
  const W=190,C=95,R=84;
  mctx.clearRect(0,0,W,W);
  mctx.save();
  mctx.beginPath();mctx.arc(C,C,92,0,Math.PI*2);mctx.clip();
  mctx.fillStyle='#bca271';mctx.fillRect(0,0,W,W);

  const player=objects.player.position;
  const local=(v)=>{
    const dx=v.x-player.x,dz=v.z-player.z;
    return {x:C+(dx/MINI_RANGE)*R,z:C+(dz/MINI_RANGE)*R,dx,dz};
  };

  // East/Dead Sea directional band appears when it is within radar range.
  const seaDx=2400-player.x;
  if(Math.abs(seaDx)<MINI_RANGE){
    const sx=C+(seaDx/MINI_RANGE)*R;
    mctx.fillStyle='#79a2a0';mctx.fillRect(sx,0,40,W);
    mctx.fillStyle='#476f8e';mctx.fillRect(sx+24,0,16,W);
  }

  mctx.fillStyle='#eee2bc';
  for(const s of objects.sheep){
    const q=local(s.position);
    if(Math.hypot(q.dx,q.dz)<=MINI_RANGE)mctx.fillRect(q.x-1.5,q.z-1.5,3,3);
  }
  mctx.fillStyle='#b6302b';
  for(const e of objects.enemies){
    const q=local(e.position);
    if(Math.hypot(q.dx,q.dz)<=MINI_RANGE)mctx.fillRect(q.x-2,q.z-2,4,4);
  }

  mctx.fillStyle='#5d4530';mctx.font='bold 9px sans-serif';for(const city of CITY_DEFS){const q=local(city);const d=Math.hypot(q.dx,q.dz);if(d<=MINI_RANGE){
    const rx=(city.wallRX||city.wallR)/MINI_RANGE*R,rz=(city.wallRZ||city.wallR)/MINI_RANGE*R;
    mctx.save();mctx.translate(q.x,q.z);mctx.strokeStyle='#6a5137';mctx.lineWidth=2.4;mctx.beginPath();
    for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,ir=1+.045*Math.sin(a*3)-.025*Math.cos(a*5),px=Math.sin(a)*rx*ir,pz=Math.cos(a)*rz*ir;if(i===0)mctx.moveTo(px,pz);else mctx.lineTo(px,pz);}
    mctx.closePath();mctx.stroke();
    mctx.fillStyle='#8d7655';for(let i=0;i<11;i++){const a=i/11*Math.PI*2;mctx.fillRect(Math.sin(a)*rx*.55-1.5,Math.cos(a)*rz*.55-1.5,3,3);}
    mctx.fillStyle='#b8a074';mctx.fillRect(-4,-rz*.56,8,11);mctx.restore();
    if(d<MINI_RANGE*.78){mctx.fillStyle='#5d4530';mctx.fillText(city.name,q.x+5,q.z-rz-4);}
  }}

  // Goal is always visible: inside the radar when near, on the rim when far.
  const gdX=goal.x-player.x,gdZ=goal.z-player.z;
  const gd=Math.max(1,Math.hypot(gdX,gdZ));
  const clamped=Math.min(R-8,(gd/MINI_RANGE)*R);
  const gx=C+(gdX/gd)*clamped,gz=C+(gdZ/gd)*clamped;
  mctx.strokeStyle='#f2d35b';mctx.lineWidth=3;
  mctx.beginPath();mctx.arc(gx,gz,7,0,Math.PI*2);mctx.stroke();
  if(gd>MINI_RANGE){
    mctx.fillStyle='#f2d35b';
    const a=Math.atan2(gdZ,gdX);
    mctx.beginPath();
    mctx.moveTo(gx+Math.cos(a)*8,gz+Math.sin(a)*8);
    mctx.lineTo(gx+Math.cos(a+2.45)*8,gz+Math.sin(a+2.45)*8);
    mctx.lineTo(gx+Math.cos(a-2.45)*8,gz+Math.sin(a-2.45)*8);
    mctx.closePath();mctx.fill();
  }

  // Player remains centered; arrow matches camera/world view direction.
  const dx=Math.sin(yaw),dz=Math.cos(yaw);
  const tipX=C+dx*15,tipZ=C+dz*15;
  const sideX=-dz*6,sideZ=dx*6;
  mctx.fillStyle='#203b67';mctx.beginPath();
  mctx.moveTo(tipX,tipZ);
  mctx.lineTo(C-dx*7+sideX,C-dz*7+sideZ);
  mctx.lineTo(C-dx*7-sideX,C-dz*7-sideZ);
  mctx.closePath();mctx.fill();

  mctx.fillStyle='#2d241b';mctx.font='bold 12px sans-serif';
  mctx.fillText('N',91,14);
  mctx.restore();
}

function loop(){if(!running||paused)return;const dt=Math.min(.033,clock.getDelta());const time=performance.now()/1000;update(dt,time);renderer.render(scene,camera);}
function updateHUD(){state.stones=THREE.MathUtils.clamp(state.stones,0,25);state.respect=THREE.MathUtils.clamp(state.respect,0,100);state.money=THREE.MathUtils.clamp(state.money,0,1000000);$('#hpBar').style.width=THREE.MathUtils.clamp(state.hp,0,100)+'%';$('#stoneCount').textContent='돌 '+state.stones+'/25';$('#respect').textContent='존중 '+state.respect+'/100';$('#money').textContent=state.money.toLocaleString('ko-KR')+' 셰켈';updateWeaponHUD();}
let noticeTimer;function notice(t){$('#notice').innerText=t;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').innerText='',2800);}
function saveGame(silent=false){if(!objects.player)return;const data={version:SAVE_VERSION,state,weapon:currentWeapon,cameraMode,missionCycle,goal:{x:goal.x,z:goal.z},player:{x:objects.player.position.x,z:objects.player.position.z},sheep:objects.sheep.map(s=>({x:s.position.x,z:s.position.z}))};localStorage.setItem('shepherdGame3DSave',JSON.stringify(data));if(!silent)notice('저장되었습니다.');}
function loadGame(){
  try{
    const d=JSON.parse(localStorage.getItem('shepherdGame3DSave'));
    if(!d)return false;
    if(d.version!==SAVE_VERSION){
      localStorage.removeItem('shepherdGame3DSave');
      return false;
    }
    Object.assign(state,d.state||{});
    if(!Number.isFinite(state.thirst))state.thirst=100;
    state.stones=THREE.MathUtils.clamp(state.stones||0,0,25);
    state.respect=THREE.MathUtils.clamp(state.respect||0,0,100);
    state.money=THREE.MathUtils.clamp(state.money||0,0,1000000);
    currentWeapon=d.weapon||'sling';
    cameraMode=Number.isInteger(d.cameraMode)?THREE.MathUtils.clamp(d.cameraMode,0,3):0;
    state.thirstFailed=false;
    missionCycle=d.missionCycle||1;
    if(d.goal){
      goal.set(d.goal.x,0,d.goal.z);
      if(CITY_DEFS.some(c=>Math.hypot(goal.x-c.x,goal.z-c.z)<c.r+300)||localSlope(goal.x,goal.z)>.65)goal.set(-1150,0,1050);
      moveGoalSite();
    }
    const requested=d.player||DEFAULT_START;
    const safe=placePlayerSafely(requested.x,requested.z);
    if(Array.isArray(d.sheep)){
      d.sheep.forEach((v,i)=>{
        if(!objects.sheep[i])return;
        const sx=Number.isFinite(v.x)?v.x:safe.x+(i%4)*55;
        const sz=Number.isFinite(v.z)?v.z:safe.z-120+Math.floor(i/4)*62;
        const sheepSafe=findSafeWorldPosition(sx,sz);
        objects.sheep[i].position.set(sheepSafe.x,terrainHeight(sheepSafe.x,sheepSafe.z)+22,sheepSafe.z);
      });
    }
    updateHUD();
    return true;
  }catch{
    localStorage.removeItem('shepherdGame3DSave');
    return false;
  }
}
