(() => {
  "use strict";

  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";
  let threePromise;

  function loadThree() {
    if (!threePromise) threePromise = import(THREE_URL);
    return threePromise;
  }

  function isSupported() {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }

  function disposeTree(root) {
    root.traverse(node => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach(material => material.dispose?.());
      else node.material?.dispose?.();
    });
  }

  function capsule(THREE, radius, length, material, segments = 12) {
    return new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, segments), material);
  }

  function curveMesh(THREE, points, radius, material) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, 7, false), material);
  }

  function createTotto(THREE) {
    const character = new THREE.Group();
    character.name = "Totto";

    const cream = new THREE.MeshPhysicalMaterial({
      color: 0xffe5ad,
      roughness: 0.46,
      metalness: 0,
      clearcoat: 0.28,
      clearcoatRoughness: 0.54
    });
    const creamLight = new THREE.MeshPhysicalMaterial({
      color: 0xffedc4,
      roughness: 0.5,
      clearcoat: 0.2
    });
    const cocoa = new THREE.MeshPhysicalMaterial({
      color: 0x4b2d22,
      roughness: 0.3,
      clearcoat: 0.42
    });
    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xd7973d,
      roughness: 0.42,
      clearcoat: 0.25
    });
    const patchMaterial = new THREE.MeshStandardMaterial({ color: 0xd6a05f, roughness: 0.72 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.78, 40, 28), cream);
    body.name = "body";
    body.scale.set(0.84, 1.05, 0.72);
    body.position.set(0, -0.95, 0);
    body.castShadow = true;
    character.add(body);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.34, 0);
    character.add(headPivot);

    const head = new THREE.Mesh(new THREE.SphereGeometry(1.08, 52, 34), cream);
    head.name = "head";
    head.scale.set(1.08, 0.98, 0.86);
    head.castShadow = true;
    head.receiveShadow = true;
    headPivot.add(head);

    const face = new THREE.Group();
    face.position.z = 0.865;
    headPivot.add(face);

    const eyeGeometry = new THREE.SphereGeometry(0.105, 20, 14);
    const leftEye = new THREE.Mesh(eyeGeometry, cocoa);
    const rightEye = new THREE.Mesh(eyeGeometry, cocoa);
    leftEye.position.set(-0.42, -0.08, 0);
    rightEye.position.set(0.42, -0.08, 0);
    leftEye.scale.z = rightEye.scale.z = 0.55;
    face.add(leftEye, rightEye);

    const leftBrow = curveMesh(THREE, [[-0.57, 0.27, 0], [-0.43, 0.31, 0.025], [-0.28, 0.27, 0]], 0.028, cocoa);
    const rightBrow = curveMesh(THREE, [[0.28, 0.27, 0], [0.43, 0.31, 0.025], [0.57, 0.23, 0]], 0.028, cocoa);
    face.add(leftBrow, rightBrow);

    const mouth = curveMesh(THREE, [
      [-0.045, -0.3, 0],
      [0.06, -0.24, 0.018],
      [0.105, -0.33, 0.022],
      [0.025, -0.385, 0.025],
      [0.105, -0.44, 0.022],
      [0.04, -0.52, 0.01],
      [-0.07, -0.47, 0]
    ], 0.026, cocoa);
    face.add(mouth);

    const dotGeometry = new THREE.SphereGeometry(0.055, 16, 10);
    [[-0.78, 0.52], [-0.83, 0.38], [-0.86, 0.23]].forEach(([x, y], index) => {
      const dot = new THREE.Mesh(dotGeometry, gold);
      dot.position.set(x, y, -0.06 + index * 0.012);
      dot.scale.set(1, 1, 0.52);
      face.add(dot);
    });

    const leftArm = capsule(THREE, 0.15, 0.34, cream, 14);
    const rightArm = capsule(THREE, 0.15, 0.34, cream, 14);
    leftArm.position.set(-0.75, -0.88, 0.02);
    rightArm.position.set(0.75, -0.88, 0.02);
    leftArm.rotation.z = -0.25;
    rightArm.rotation.z = 0.25;
    leftArm.castShadow = rightArm.castShadow = true;
    character.add(leftArm, rightArm);

    const leftFoot = capsule(THREE, 0.2, 0.2, cream, 14);
    const rightFoot = capsule(THREE, 0.2, 0.2, cream, 14);
    leftFoot.position.set(-0.32, -1.64, 0.08);
    rightFoot.position.set(0.32, -1.64, 0.08);
    leftFoot.rotation.z = rightFoot.rotation.z = Math.PI / 2;
    leftFoot.castShadow = rightFoot.castShadow = true;
    character.add(leftFoot, rightFoot);

    const bow = new THREE.Group();
    bow.position.set(0.08, 1.25, 0.02);
    headPivot.add(bow);
    const bowLeft = new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 18), creamLight);
    const bowRight = new THREE.Mesh(new THREE.SphereGeometry(0.43, 28, 18), creamLight);
    bowLeft.scale.set(1.08, 0.58, 0.62);
    bowRight.scale.set(1.15, 0.62, 0.68);
    bowLeft.position.set(-0.32, 0.03, 0);
    bowRight.position.set(0.37, 0.02, 0);
    bowLeft.rotation.z = 0.35;
    bowRight.rotation.z = -0.3;
    const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 22, 14), creamLight);
    bowKnot.scale.set(0.9, 1.05, 0.82);
    bow.add(bowLeft, bowRight, bowKnot);

    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.25, 8), patchMaterial);
    patch.position.set(0.31, -1.08, 0.725);
    patch.rotation.z = 0.12;
    character.add(patch);
    const stitchMaterial = new THREE.LineBasicMaterial({ color: 0x9b673d });
    const stitchPoints = [];
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      stitchPoints.push(new THREE.Vector3(
        0.31 + Math.cos(angle) * 0.28,
        -1.08 + Math.sin(angle) * 0.28,
        0.745
      ));
    }
    stitchPoints.push(stitchPoints[0]);
    character.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(stitchPoints), stitchMaterial));

    const skinGroup = new THREE.Group();
    character.add(skinGroup);

    return {
      character,
      head,
      headPivot,
      face,
      eyes: [leftEye, rightEye],
      arms: [leftArm, rightArm],
      feet: [leftFoot, rightFoot],
      bow,
      skinGroup,
      materials: { cream, creamLight, cocoa, gold }
    };
  }

  function createChefSkin(THREE, model) {
    const group = model.skinGroup;
    const white = new THREE.MeshPhysicalMaterial({ color: 0xfff6df, roughness: 0.56, clearcoat: 0.15 });
    const red = new THREE.MeshPhysicalMaterial({ color: 0xe9664d, roughness: 0.42, clearcoat: 0.24 });

    const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.26, 28), white);
    hatBase.position.set(0, 1.32, 0);
    group.add(hatBase);
    [[-0.32, 1.56], [0, 1.65], [0.32, 1.56]].forEach(([x, y]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), white);
      puff.scale.set(1, 0.86, 0.85);
      puff.position.set(x, y, 0);
      group.add(puff);
    });

    const apron = new THREE.Mesh(new THREE.CircleGeometry(0.56, 24, 0, Math.PI), white);
    apron.scale.set(0.95, 1.2, 1);
    apron.position.set(0, -1.02, 0.73);
    apron.rotation.z = Math.PI;
    group.add(apron);

    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 8, 40, Math.PI), red);
    tie.position.set(0, -0.68, 0.75);
    tie.rotation.z = Math.PI;
    group.add(tie);
  }

  async function mount(container, options = {}) {
    if (!container || !isSupported()) throw new Error("WebGL is not available");
    const THREE = await loadThree();
    const mode = options.mode || "home";
    const isCompact = mode === "compact" || mode === "game";
    const interactive = options.interactive !== false;
    const reducedMotion = options.reducedMotion ?? matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isCompact ? 30 : 28, 1, 0.1, 100);
    camera.position.set(0, isCompact ? -0.05 : 0.08, isCompact ? 5.6 : 6.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;z-index:3";
    container.prepend(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff4d8, 0x8a6044, 2.25));
    const key = new THREE.DirectionalLight(0xfff0cb, 4.4);
    key.position.set(-3.5, 5.5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(isCompact ? 512 : 1024, isCompact ? 512 : 1024);
    scene.add(key);
    const rim = new THREE.PointLight(0xf59f76, 14, 8);
    rim.position.set(3, 1, 2.5);
    scene.add(rim);

    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd7a56f, roughness: 0.88, transparent: true, opacity: 0.5 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.1, 64), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.87;
    floor.receiveShadow = true;
    scene.add(floor);

    const model = createTotto(THREE);
    scene.add(model.character);
    model.character.scale.setScalar(isCompact ? 0.74 : 0.9);
    model.character.position.y = isCompact ? 0.18 : 0.05;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    const targets = { x: 0, y: 0 };
    const action = { name: "idle", started: 0, duration: 0 };
    let frameId = 0;
    let destroyed = false;
    let skin = "default";
    let blinkAt = 1.5 + Math.random() * 2.5;
    let pointerDown = null;

    function resize() {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function setSkin(nextSkin) {
      skin = nextSkin || "default";
      while (model.skinGroup.children.length) {
        const child = model.skinGroup.children.pop();
        disposeTree(child);
      }
      if (skin === "hotpot-chef") createChefSkin(THREE, model);
    }

    function setPointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointer.set(x * 2 - 1, -(y * 2 - 1));
      if (!reducedMotion) {
        targets.x = (x - 0.5) * 0.62;
        targets.y = (0.5 - y) * 0.35;
      }
    }

    function emitInteraction(part) {
      container.dispatchEvent(new CustomEvent("totto-interaction", {
        bubbles: true,
        detail: { type: `tap-${part}`, part }
      }));
    }

    function play(name) {
      const durations = { "tap-head": 0.62, "tap-body": 0.7, start: 1.05, win: 1.2, lose: 1.1, idle: 0 };
      action.name = name;
      action.started = clock.elapsedTime;
      action.duration = durations[name] || 0;
      if (!action.duration) return Promise.resolve();
      return new Promise(resolve => setTimeout(resolve, action.duration * 1000));
    }

    function onPointerDown(event) {
      if (!interactive) return;
      pointerDown = { x: event.clientX, y: event.clientY };
      setPointer(event);
    }

    function onPointerMove(event) {
      if (!interactive) return;
      setPointer(event);
    }

    function onPointerUp(event) {
      if (!interactive || !pointerDown) return;
      const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      pointerDown = null;
      if (distance > 12) return;
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([model.head, ...model.arms, ...model.feet, model.character.children[0]], true);
      const headHit = hits.some(hit => hit.object === model.head || hit.object.parent === model.headPivot);
      const part = headHit ? "head" : "body";
      play(headHit ? "tap-head" : "tap-body");
      emitInteraction(part);
    }

    function animate() {
      if (destroyed) return;
      frameId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const time = clock.getElapsedTime();
      const elapsed = time - action.started;
      const progress = action.duration ? Math.min(1, elapsed / action.duration) : 1;
      const pulse = Math.sin(progress * Math.PI);

      model.headPivot.rotation.y += (targets.x - model.headPivot.rotation.y) * 0.075;
      model.headPivot.rotation.x += (targets.y - model.headPivot.rotation.x) * 0.075;
      model.character.position.y = (isCompact ? 0.18 : 0.05) + (reducedMotion ? 0 : Math.sin(time * 1.8) * 0.035);
      model.character.rotation.z = reducedMotion ? 0 : Math.sin(time * 1.15) * 0.012;
      model.character.rotation.y *= 0.92;
      model.character.scale.setScalar(isCompact ? 0.74 : 0.9);
      model.eyes.forEach(eye => { eye.scale.y = 1; });
      model.arms[0].rotation.z = -0.25;
      model.arms[1].rotation.z = 0.25;

      if (time > blinkAt) {
        const blinkProgress = (time - blinkAt) / 0.16;
        const eyeScale = Math.max(0.08, Math.abs(blinkProgress - 1));
        model.eyes.forEach(eye => { eye.scale.y = eyeScale; });
        if (blinkProgress > 2) blinkAt = time + 2.2 + Math.random() * 3.4;
      }

      if (action.name === "tap-head" && progress < 1) {
        model.headPivot.position.y = 0.34 - pulse * 0.14;
        model.bow.rotation.z = Math.sin(progress * Math.PI * 4) * 0.12 * (1 - progress);
        model.eyes.forEach(eye => { eye.scale.y = Math.max(0.1, 1 - pulse * 0.95); });
      } else {
        model.headPivot.position.y += (0.34 - model.headPivot.position.y) * 0.16;
        model.bow.rotation.z *= 0.84;
      }

      if (action.name === "tap-body" && progress < 1) {
        model.character.position.y += Math.sin(progress * Math.PI) * 0.5;
        const squash = 1 + Math.sin(progress * Math.PI * 2) * 0.06;
        const base = isCompact ? 0.74 : 0.9;
        model.character.scale.set(base / squash, base * squash, base);
      }

      if (action.name === "start" && progress < 1) {
        model.character.position.x = progress * 2.7;
        model.character.position.y += Math.abs(Math.sin(progress * Math.PI * 4)) * 0.22;
        model.character.rotation.y = -progress * 1.1;
        const base = isCompact ? 0.74 : 0.9;
        model.character.scale.setScalar(base * (1 - progress * 0.42));
        model.arms[0].rotation.z = -0.25 - pulse * 1.1;
      } else if (action.name !== "start") {
        model.character.position.x *= 0.86;
      }

      if (action.name === "win" && progress < 1) {
        model.character.position.y += Math.abs(Math.sin(progress * Math.PI * 3)) * 0.38;
        model.arms[0].rotation.z = -1.45;
        model.arms[1].rotation.z = 1.45;
        model.character.rotation.y = Math.sin(progress * Math.PI * 4) * 0.2;
      }

      if (action.name === "lose" && progress < 1) {
        model.headPivot.rotation.z = Math.sin(progress * Math.PI * 5) * 0.04;
        model.character.position.y -= pulse * 0.16;
        model.eyes.forEach(eye => { eye.scale.y = 0.55; });
      }

      if (action.duration && progress >= 1 && action.name !== "idle") {
        action.name = "idle";
        action.duration = 0;
        model.character.position.x = 0;
      }

      renderer.render(scene, camera);
    }

    function destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      disposeTree(scene);
      renderer.dispose();
      renderer.domElement.remove();
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", () => {
      targets.x = 0;
      targets.y = 0;
      pointerDown = null;
    });

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    setSkin(options.skin);
    resize();
    animate();

    return { setSkin, play, destroy, get skin() { return skin; } };
  }

  window.Totto3D = { isSupported, mount };
})();
