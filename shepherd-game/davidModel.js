import { GLTFLoader } from "./GLTFLoader.js";

// 다비드 확정 디자인 기반 절차형 저폴리곤 플레이어 모델.
// 정면/후면 천을 분리하고, 양옆은 허리띠까지 열어 네 귀퉁이를 유지한다.
export function createDavidModel({
  THREE,
  material,
  groundOffset,
  scene,
  runtime,
}) {
  const T = THREE;
  const player = new T.Group();
  player.name = "DavidFinalPlayableModel";
  player.userData.velocity = new T.Vector3();
  player.userData.verticalVelocity = 0;
  player.userData.grounded = true;
  player.userData.walkPhase = 0;
  player.userData.lastSafePosition = new T.Vector3();

  const skin = material(0xc9895a);
  const skinLight = material(0xe3a06a);
  const tunic = material(0xc8a06c);
  const outer = material(0xeee7d7);
  const outerShade = material(0xded4bf);
  const belt = material(0x65401f);
  const hair = material(0x7e2d16);
  const hairDark = material(0x57200f);
  const wrap = material(0xc7a77c);
  const wrapLight = material(0xd9bc91);
  const sandal = material(0x6e421e);
  const dark = material(0x201811);
  const eyeWhite = material(0xf5eadc);
  const blue = material(0x176a9b);
  const cordWhite = material(0xf4efe2);
  const wood = material(0x6f4a28);

  const bodyRoot = new T.Group();
  bodyRoot.name = "DavidBodyRoot";
  player.add(bodyRoot);
  player.userData.bodyRoot = bodyRoot;

  const addMesh = (parent, geometry, mat, position, scale, rotation) => {
    const mesh = new T.Mesh(geometry, mat);
    if (position) mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // 발과 샌들
  const limbs = {};
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.name = side < 0 ? "LeftLegRig" : "RightLegRig";
    leg.position.set(10 * side, -29, 0);
    bodyRoot.add(leg);
    addMesh(
      leg,
      new T.CylinderGeometry(4.4, 5.2, 27, 7),
      skin,
      [0, -13.5, 0],
    );
    addMesh(
      leg,
      new T.BoxGeometry(11.5, 5, 18),
      sandal,
      [0, -29, 3.5],
    );
    addMesh(
      leg,
      new T.BoxGeometry(9.5, 2.2, 15),
      skinLight,
      [0, -26.4, 3.2],
    );
    const strap = addMesh(
      leg,
      new T.TorusGeometry(5, 1.25, 5, 10, Math.PI),
      sandal,
      [0, -25.8, 5.2],
      [1, 0.65, 1],
      [Math.PI / 2, 0, 0],
    );
    strap.rotation.z = Math.PI;
    limbs[side < 0 ? "leftLeg" : "rightLeg"] = leg;
  }

  // 갈색 속옷: 옆의 열린 틈에서 허리띠까지 계속 보인다.
  addMesh(
    bodyRoot,
    new T.CylinderGeometry(18.5, 23.5, 72, 8),
    tunic,
    [0, 3, 0],
  );

  // 팔: 어깨 피벗 기준으로 걷기/달리기 애니메이션과 연결.
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.name = side < 0 ? "LeftArmRig" : "RightArmRig";
    arm.position.set(25.5 * side, 42, 0);
    bodyRoot.add(arm);
    addMesh(
      arm,
      new T.CylinderGeometry(7.4, 5.8, 31, 7),
      tunic,
      [0, -14, 0],
      null,
      [0, 0, -0.08 * side],
    );
    addMesh(
      arm,
      new T.CylinderGeometry(5.1, 4.4, 24, 7),
      skin,
      [1.1 * side, -40, 0],
    );
    addMesh(
      arm,
      new T.DodecahedronGeometry(5.3, 1),
      skinLight,
      [1.1 * side, -54, 0],
      [0.76, 1.05, 0.7],
    );
    limbs[side < 0 ? "leftArm" : "rightArm"] = arm;
  }
  limbs.leftArm.rotation.z = -0.12;
  limbs.rightArm.rotation.z = 0.12;
  player.userData.limbs = limbs;

  // 네 귀퉁이 겉옷: 앞/뒤 두 장이며 좌우 옆면은 만들지 않는다.
  // 판의 폭은 허리 아래에서만 넓어지고, 옆선은 y=3(허리띠)까지 완전히 열린다.
  const makePanelGeometry = (front) => {
    const z = front ? 15.7 : -15.7;
    const outward = front ? 1 : -1;
    const vertices = new Float32Array([
      -20, 47, z, 20, 47, z, 19, 4, z + 0.7 * outward,
      -24, -18, z + 1.2 * outward, 24, -18, z + 1.2 * outward,
      -19, 4, z + 0.7 * outward,
    ]);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.BufferAttribute(vertices, 3));
    if (front) geometry.setIndex([0, 2, 1, 2, 3, 4]);
    else geometry.setIndex([0, 1, 2, 2, 4, 3]);
    geometry.computeVertexNormals();
    return geometry;
  };
  const panels = [];
  for (const front of [true, false]) {
    const panel = addMesh(
      bodyRoot,
      makePanelGeometry(front),
      front ? outer : outerShade,
    );
    panel.name = front ? "FourCornerGarmentFront" : "FourCornerGarmentBack";
    panels.push(panel);

    // 확정 기준도의 하늘색 이중 테두리.
    const z = front ? 17.05 : -17.05;
    for (const y of [-13.4, -10.5]) {
      addMesh(
        bodyRoot,
        new T.BoxGeometry(45.5, 1.25, 0.8),
        blue,
        [0, y, z],
      );
    }
  }

  // 어깨 연결은 위쪽에만 짧게 두고 옆 허리 부분은 비워 둔다.
  for (const side of [-1, 1]) {
    addMesh(
      bodyRoot,
      new T.BoxGeometry(8.5, 10, 31),
      outer,
      [16.5 * side, 42, 0],
    );
  }

  // 허리띠: 겉옷 두 장을 고정하되 열린 옆 틈을 가리지 않는 가는 끈.
  addMesh(
    bodyRoot,
    new T.TorusGeometry(19.8, 2.25, 6, 24),
    belt,
    [0, 3, 0],
    [1, 1, 0.82],
    [Math.PI / 2, 0, 0],
  );
  addMesh(
    bodyRoot,
    new T.TorusGeometry(19.2, 1.5, 5, 24),
    belt,
    [0, 1.3, 0],
    [1, 1, 0.82],
    [Math.PI / 2, 0, 0],
  );

  // 네 귀퉁이마다 흰 실 3가닥 + תכלת 1가닥.
  const tzitzit = [];
  for (const x of [-21, 21]) {
    for (const z of [-17.2, 17.2]) {
      const corner = new T.Group();
      corner.name = `Tzitzit_${x < 0 ? "L" : "R"}_${z < 0 ? "B" : "F"}`;
      corner.position.set(x, -17, z);
      bodyRoot.add(corner);
      addMesh(
        corner,
        new T.CylinderGeometry(1.6, 1.6, 4.5, 6),
        cordWhite,
        [0, -1.8, 0],
      );
      addMesh(
        corner,
        new T.TorusGeometry(1.75, 0.55, 5, 10),
        blue,
        [0, -3.4, 0],
        null,
        [Math.PI / 2, 0, 0],
      );
      for (let thread = 0; thread < 4; thread++) {
        const threadMesh = addMesh(
          corner,
          new T.CylinderGeometry(0.48, 0.38, 18 + (thread % 2) * 2, 5),
          thread === 1 ? blue : cordWhite,
          [(thread - 1.5) * 1.5, -12.5, 0],
        );
        threadMesh.rotation.z = (thread - 1.5) * 0.025;
      }
      tzitzit.push(corner);
    }
  }
  player.userData.tzitzit = tzitzit;

  // 목과 얼굴
  addMesh(
    bodyRoot,
    new T.CylinderGeometry(7, 7.8, 12, 8),
    skin,
    [0, 52, 0],
  );
  const head = addMesh(
    bodyRoot,
    new T.DodecahedronGeometry(19.2, 1),
    skinLight,
    [0, 71, 0],
    [0.94, 1.07, 0.92],
  );
  head.name = "DavidHead";
  addMesh(
    bodyRoot,
    new T.ConeGeometry(3.2, 9.5, 5),
    skinLight,
    [0, 69, 18.4],
    null,
    [Math.PI / 2, 0, 0],
  );

  // 눈과 눈썹: 확정 정면의 큰 갈색 눈과 단정한 인상.
  for (const side of [-1, 1]) {
    addMesh(
      bodyRoot,
      new T.SphereGeometry(4.2, 9, 7),
      eyeWhite,
      [6.8 * side, 74, 16],
      [1, 0.72, 0.28],
    );
    addMesh(
      bodyRoot,
      new T.SphereGeometry(2.35, 8, 6),
      dark,
      [6.8 * side, 73.8, 17.25],
      [0.85, 1, 0.35],
    );
    addMesh(
      bodyRoot,
      new T.BoxGeometry(8, 1.55, 1.4),
      hairDark,
      [6.5 * side, 81.1, 16.3],
      null,
      [0, 0, -0.12 * side],
    );
    addMesh(
      bodyRoot,
      new T.DodecahedronGeometry(3.9, 0),
      skin,
      [18.1 * side, 71, 0],
      [0.5, 1, 0.72],
    );
  }

  // 곱슬머리 덩어리
  for (let ring = 0; ring < 2; ring++) {
    const count = 13 + ring * 3;
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * Math.PI * 2;
      const rearBias = Math.cos(angle);
      if (ring === 0 && rearBias > 0.72) continue;
      addMesh(
        bodyRoot,
        new T.IcosahedronGeometry(3.8 - ring * 0.25, 1),
        index % 2 ? hair : hairDark,
        [
          Math.sin(angle) * (18.2 - ring),
          82 - ring * 6,
          Math.cos(angle) * (17.8 - ring) - 3,
        ],
        [1.05, 0.88, 1],
      );
    }
  }

  // 머리수건: 낮은 다각형 돔과 겹친 띠.
  addMesh(
    bodyRoot,
    new T.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
    wrapLight,
    [0, 89, -1.5],
    [22, 17, 21],
  );
  for (let band = 0; band < 4; band++) {
    const ring = addMesh(
      bodyRoot,
      new T.TorusGeometry(20.5 - band * 1.2, 2.7, 6, 18),
      band % 2 ? wrapLight : wrap,
      [0, 85.5 + band * 3.1, -1.2],
      [1, 1, 0.93],
      [Math.PI / 2, 0, 0.06 * (band - 1.5)],
    );
    ring.name = `HeadWrapBand${band + 1}`;
  }

  // 지팡이와 물매 주머니
  const staff = addMesh(
    bodyRoot,
    new T.CylinderGeometry(4.6, 3.1, 164, 8),
    wood,
    [-29, 8, 8],
    null,
    [0, 0, -0.025],
  );
  staff.name = "ShepherdStaff";
  player.userData.staff = staff;
  player.userData.staffSwing = 0;
  addMesh(
    bodyRoot,
    new T.CylinderGeometry(4.1, 5.4, 30, 7),
    sandal,
    [25, -2, -8],
    null,
    [0, 0, 0.12],
  ).name = "SlingPouch";

  player.scale.setScalar(0.54);
  player.userData.groundOffset = groundOffset;
  scene.add(player);
  runtime.player = player;

  // 밤의 지팡이 불빛은 기존 게임 규칙과 동일하게 유지한다.
  const torch = new T.Group();
  torch.position.set(-35, 70, -6);
  const flameMaterial = new T.MeshBasicMaterial({
    color: 0xff6a22,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const flame = new T.Mesh(new T.ConeGeometry(8.5, 28, 9), flameMaterial);
  flame.position.y = 18;
  torch.add(flame);
  // Wide practical night light around David's staff. Intensity is animated by
  // game.js; the distance must stay large enough to illuminate streets and
  // nearby house fronts instead of only the flame itself.
  const glow = new T.PointLight(0xff925d, 0, 920, 1.15);
  glow.position.y = 16;
  torch.add(glow);
  torch.userData = {
    flame,
    glow,
    phase: Math.PI * 2 * Math.random(),
  };
  player.add(torch);
  runtime.staffNightLight = torch;

  // 동일한 스킨 메시 하나에서 걷기/달리기 클립만 전환한다.
  // 모델을 교체하지 않으므로 이동 상태가 바뀌어도 외형과 재질은 유지된다.
  // 로드에 실패하면 위 절차형 캐릭터가 그대로 안전한 대체 모델로 남는다.
  const fallbackChildren = [...bodyRoot.children];
  new GLTFLoader().load(
    "./assets/models/david_animated_optimized.glb",
    (gltf) => {
      const importedRoot = new T.Group();
      importedRoot.name = "DavidAnimatedRoot";
      const importedModel = gltf.scene;
      importedModel.name = "DavidAnimatedModel";

      // Tripo 파일은 이미 Y-up이다. 축을 다시 돌리면 캐릭터가 옆으로
      // 눕기 때문에 원본 축을 그대로 유지한다.
      importedModel.rotation.set(0, 0, 0);
      importedRoot.add(importedModel);
      importedRoot.updateMatrixWorld(true);

      let box = new T.Box3().setFromObject(importedRoot);
      const size = box.getSize(new T.Vector3());
      const targetLocalHeight = 164;
      const fitScale = targetLocalHeight / Math.max(size.y, 0.001);
      importedModel.scale.setScalar(fitScale);
      importedRoot.updateMatrixWorld(true);

      box = new T.Box3().setFromObject(importedRoot);
      const center = box.getCenter(new T.Vector3());
      importedModel.position.x -= center.x;
      importedModel.position.z -= center.z;
      importedModel.position.y += -58 - box.min.y;

      importedModel.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const importedMaterial of materials) {
          if (!importedMaterial) continue;
          importedMaterial.side = T.FrontSide;
          importedMaterial.transparent = false;
          importedMaterial.depthWrite = true;
          importedMaterial.roughness = Math.max(
            0.68,
            importedMaterial.roughness ?? 0.68,
          );
          if (importedMaterial.map) {
            importedMaterial.map.colorSpace = T.SRGBColorSpace;
            importedMaterial.map.anisotropy = 2;
            importedMaterial.map.needsUpdate = true;
          }
          importedMaterial.needsUpdate = true;
        }
      });

      // 공격에 쓰는 기존 지팡이만 유지하고 절차형 몸체는 새 모델로 교체한다.
      fallbackChildren.forEach((child) => {
        child.visible = child === staff;
      });
      bodyRoot.add(importedRoot);
      player.userData.importedAvatar = importedRoot;
      player.userData.importedAvatarBaseY = importedRoot.position.y;

      const prepareLoopingClip = (sourceClip, removeForwardMotion = false) => {
        if (!sourceClip) return null;
        const clip = sourceClip.clone();
        clip.name = `${sourceClip.name}_game`;
        for (const track of clip.tracks) {
          const valueSize = track.getValueSize();
          const keyCount = track.times.length;
          if (keyCount < 2) continue;

          // Tripo's in-place export still leaves accumulated forward travel on
          // Hip.position. Root is rotated -90 degrees around X, so the local Y
          // component is forward travel (not character height). Keeping it
          // makes every repeat snap the whole skeleton back to its first step.
          if (
            removeForwardMotion &&
            /(^|\.)Hip\.position$/.test(track.name) &&
            valueSize === 3
          ) {
            const forward = track.values[1];
            for (let key = 0; key < keyCount; key++) {
              track.values[key * 3 + 1] = forward;
            }
          }

          // Force a continuous loop boundary. Blend the final two samples
          // toward the first pose, then make the final sample identical.
          // Quaternion tracks must use spherical interpolation.
          const blendStart = Math.max(1, keyCount - 3);
          if (valueSize === 4 && /\.quaternion$/.test(track.name)) {
            const first = new T.Quaternion().fromArray(track.values, 0);
            for (let key = blendStart; key < keyCount; key++) {
              const amount = (key - blendStart + 1) / (keyCount - blendStart);
              const current = new T.Quaternion().fromArray(
                track.values,
                key * 4,
              );
              current.slerp(first, amount).normalize().toArray(
                track.values,
                key * 4,
              );
            }
          } else {
            for (let key = blendStart; key < keyCount; key++) {
              const amount = (key - blendStart + 1) / (keyCount - blendStart);
              for (let component = 0; component < valueSize; component++) {
                const index = key * valueSize + component;
                track.values[index] = T.MathUtils.lerp(
                  track.values[index],
                  track.values[component],
                  amount,
                );
              }
            }
          }
        }
        clip.resetDuration();
        return clip;
      };

      const clips = gltf.animations || [];
      const walkClip =
        clips.find((clip) => /walk/i.test(clip.name)) ||
        clips.reduce(
          (best, clip) =>
            !best || clip.duration > best.duration ? clip : best,
          null,
        );
      const runClip =
        clips.find((clip) => /run/i.test(clip.name)) ||
        clips.reduce(
          (best, clip) =>
            !best || clip.duration < best.duration ? clip : best,
          null,
        );
      const gameWalkClip = prepareLoopingClip(walkClip, true);
      const gameRunClip = prepareLoopingClip(runClip, true);
      const mixer = new T.AnimationMixer(importedModel);
      const walkAction = gameWalkClip ? mixer.clipAction(gameWalkClip) : null;
      const runAction =
        gameRunClip && runClip !== walkClip
          ? mixer.clipAction(gameRunClip)
          : null;
      for (const action of [walkAction, runAction]) {
        if (!action) continue;
        action.setLoop(T.LoopRepeat, Infinity);
        // fadeIn() multiplies its fade curve by action.weight. Keeping the
        // base weight at 0 makes every animation permanently contribute 0,
        // even while the mixer and clip time are advancing.
        action.setEffectiveWeight(1);
        action.play();
        action.enabled = false;
      }

      player.userData.animationMixer = mixer;
      player.userData.walkAction = walkAction;
      player.userData.runAction = runAction;
      player.userData.locomotionState = "idle";

      // The staff is equipment, so it must inherit the animated right-hand
      // bone. Object3D.attach preserves its current world alignment while the
      // pivot becomes a child of the hand. Attacks rotate this pivot, adding a
      // swing on top of the hand animation without detaching the staff.
      const rightHand =
        importedModel.getObjectByName("R_Hand") ||
        importedModel.getObjectByName("RightHand");
      if (rightHand) {
        const staffSwingPivot = new T.Group();
        staffSwingPivot.name = "StaffRightHandSwingPivot";
        rightHand.add(staffSwingPivot);
        staffSwingPivot.position.set(0, 0, 0);
        staffSwingPivot.rotation.set(0, 0, 0);
        staffSwingPivot.scale.set(1, 1, 1);
        staffSwingPivot.attach(staff);
        staffSwingPivot.userData.baseQuaternion =
          staffSwingPivot.quaternion.clone();
        player.userData.staff = staffSwingPivot;
        player.userData.staffVisual = staff;
      }

      player.userData.updateLocomotionAnimation = (
        delta,
        moving,
        running,
      ) => {
        const nextState = moving ? (running ? "run" : "walk") : "idle";
        if (nextState !== player.userData.locomotionState) {
          player.userData.locomotionState = nextState;
          const fade = 0.18;
          if (nextState === "walk") {
            walkAction?.reset().setEffectiveWeight(1).fadeIn(fade).play();
            runAction?.fadeOut(fade);
          } else if (nextState === "run") {
            runAction?.reset().setEffectiveWeight(1).fadeIn(fade).play();
            walkAction?.fadeOut(fade);
          } else {
            walkAction?.fadeOut(fade);
            runAction?.fadeOut(fade);
          }
        }
        mixer.update(Math.min(delta, 0.05));
      };
    },
    undefined,
    (error) => {
      console.warn(
        "애니메이션 다비드 모델을 불러오지 못해 기존 절차형 모델을 사용합니다.",
        error,
      );
    },
  );

  return player;
}
