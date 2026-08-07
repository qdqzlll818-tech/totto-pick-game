(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const level = TottoGameConfig.getLevel(params.get("level"));
  const DEV_MODE = params.get("dev") === "1";
  const SHOW_DEBUG = DEV_MODE && params.get("debug-ui") !== "0";
  const REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  document.body.classList.toggle("from-home", Boolean(window.fromHome));
  const PROGRESS_KEY = "totto-pick-progress-v1";
  const SKIN_KEY = "totto-pick-skins-v1";
  const EQUIPPED_KEY = "totto-pick-equipped-skin-v1";
  const MOTION_KEY = "totto-motion-enabled-v1";
  const LEVEL_ORDER = TottoGameConfig.ORDER;
  const $ = selector => document.querySelector(selector);
  const clone = value => JSON.parse(JSON.stringify(value));
  const els = {
    items: $("#items"), tray: $("#tray"), reserve: $("#reserve"), score: $("#score"),
    remaining: $("#remaining"), timer: $("#timer"), combo: $("#combo"), trayCount: $("#trayCount"),
    shuffleLeft: $("#shuffleLeft"), moveLeft: $("#moveLeft"), reserveLeft: $("#reserveLeft"),
    undo: $("#undoBtn"), shuffle: $("#shuffleBtn"), move: $("#moveBtn"), reserveBtn: $("#reserveBtn"),
    intro: $("#intro"), result: $("#result"), toast: $("#toast"), pot: $("#pot"),
    shakeWave: $("#shakeWave"), motionStatus: $("#motionStatus"), motionChoice: $("#motionChoice"),
    pauseBtn: $("#pauseBtn"), pauseMenu: $("#pauseMenu"), pauseMain: $("#pauseMain"),
    restartConfirm: $("#restartConfirm"), continueBtn: $("#continueBtn"),
    restartBtn: $("#restartBtn"), confirmRestartBtn: $("#confirmRestartBtn"),
    cancelRestartBtn: $("#cancelRestartBtn"), themeHud: $("#themeHud"),
    startBtn: $("#startBtn"), skipIntro: $("#skipIntro"), loadingStatus: $("#loadingStatus"),
    physicsDebug: $("#physicsDebug"), physicsDebugStatus: $("#physicsDebugStatus"),
    debugExtractBtn: $("#debugExtractBtn"), debugShakeBtn: $("#debugShakeBtn")
  };

  let state;
  let previousState = null;
  let timerHandle = null;
  let resolveLock = false;
  let toastHandle = null;
  let motionEnabled = false;
  let wantsMotion = true;
  let isPaused = false;
  let boardReady = false;
  let physicsLock = false;
  let motionFallback = false;
  let animationSequence = 0;
  const itemElements = new Map();
  const decodedImages = new Map();
  const hitMasks = new Map();
  const detector = TottoMotionControls.createShakeDetector({ cooldownMs: 1600 });

  function visualMarkup(item, compact = false) {
    if (item.asset.startsWith("emoji:")) {
      return `<span class="emoji" aria-hidden="true">${item.asset.slice(6)}</span>`;
    }
    return `<img src="${item.asset}" alt="" decoding="async" ${compact ? "" : "draggable=\"false\""}>`;
  }

  function cacheHitMask(image) {
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;
    const key = image.currentSrc || image.src;
    if (hitMasks.has(key)) return;

    try {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 72 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const alpha = new Uint8ClampedArray(canvas.width * canvas.height);
      for (let source = 3, target = 0; source < pixels.length; source += 4, target += 1) {
        alpha[target] = pixels[source];
      }
      hitMasks.set(key, { width: canvas.width, height: canvas.height, alpha });
    } catch {
      hitMasks.set(key, null);
    }
  }

  function primeHitMask(button) {
    const image = button.querySelector("img");
    if (!image) return;
    if (image.complete) cacheHitMask(image);
    else image.addEventListener("load", () => cacheHitMask(image), { once: true });
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  async function preloadLevelAssets() {
    const assets = [...new Set(level.items.map(item => item.asset).filter(asset => !asset.startsWith("emoji:")))];
    let completed = 0;
    els.loadingStatus.hidden = false;
    els.startBtn.disabled = true;
    els.skipIntro.disabled = true;

    await Promise.all(assets.map(asset => new Promise(resolve => {
      const image = new Image();
      image.decoding = "async";
      image.onload = async () => {
        try { await image.decode?.(); } catch {}
        decodedImages.set(asset, image);
        cacheHitMask(image);
        completed += 1;
        els.loadingStatus.textContent = `正在解码本关素材 · ${completed}/${assets.length}`;
        resolve();
      };
      image.onerror = () => {
        completed += 1;
        els.loadingStatus.textContent = `正在准备本关素材 · ${completed}/${assets.length}`;
        resolve();
      };
      image.src = asset;
    })));
  }

  function createItemButton(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.uid = item.uid;
    button.setAttribute("aria-label", `选择${item.name}`);
    button.innerHTML = visualMarkup(item);
    itemElements.set(item.uid, button);
    return button;
  }

  async function mountBoardBatched() {
    const active = state.items
      .filter(item => !item.selected)
      .sort((left, right) => (left.depth ?? left.layer * 1000) - (right.depth ?? right.layer * 1000));
    const batchSize = REDUCED_MOTION ? 48 : 28;

    for (let start = 0; start < active.length; start += batchSize) {
      const fragment = new DocumentFragment();
      for (const item of active.slice(start, start + batchSize)) {
        fragment.appendChild(createItemButton(item));
      }
      els.items.appendChild(fragment);
      if (start + batchSize < active.length) {
        els.loadingStatus.textContent = `正在铺好物品 · ${Math.min(start + batchSize, active.length)}/${active.length}`;
        await nextFrame();
      }
    }
    boardReady = true;
    syncBoard();
    performance.mark?.("totto:board-ready");
    if (DEV_MODE) {
      const resources = performance.getEntriesByType("resource");
      const images = resources.filter(entry => /\.(png|webp)(\?|$)/.test(entry.name));
      const longTasks = window.__tottoStartupLongTasks || [];
      window.TottoStartupMetrics = {
        readyMs: performance.now(),
        itemDomCount: active.length,
        uniqueItemImages: new Set(level.items.map(item => item.asset)).size,
        imageRequests: images.length,
        imageTransferBytes: images.reduce((sum, entry) => sum + entry.transferSize, 0),
        imageDecodedBytes: images.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
        maxImageDurationMs: Math.max(0, ...images.map(entry => entry.duration)),
        longTaskCount: longTasks.length,
        totalLongTaskMs: longTasks.reduce((sum, entry) => sum + entry.duration, 0),
        maxLongTaskMs: Math.max(0, ...longTasks.map(entry => entry.duration))
      };
      document.body.dataset.startupMetrics = JSON.stringify(window.TottoStartupMetrics);
    }
    window.dispatchEvent(new CustomEvent("totto:board-ready", { detail: { levelId: level.id } }));
    els.loadingStatus.textContent = "本关已准备好";
    els.loadingStatus.hidden = true;
    els.startBtn.disabled = false;
    els.skipIntro.disabled = false;
  }

  function candidateFromButton(button) {
    const rect = button.getBoundingClientRect();
    const image = button.querySelector("img");
    const key = image ? image.currentSrc || image.src : "";
    const mask = hitMasks.get(key);

    return {
      uid: button.dataset.uid,
      z: Number(button.style.getPropertyValue("--z")) || 0,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      width: button.offsetWidth,
      height: button.offsetHeight,
      scale: Number(button.style.getPropertyValue("--s")) || 1,
      rotation: Number.parseFloat(button.style.getPropertyValue("--r")) || 0,
      alphaAt: (u, v) => image
        ? TottoItemHitTest.sampleContainedAlpha(mask, u, v, button.offsetWidth, button.offsetHeight)
        : 1
    };
  }

  function handleItemClick(event) {
    const focusedButton = event.target.closest?.(".item");
    if (event.detail === 0 && focusedButton) {
      event.preventDefault();
      pick(focusedButton.dataset.uid);
      return;
    }

    const candidates = [...els.items.querySelectorAll(".item:not(.theme-locked):not(.occluded):not(.is-settling)")].map(candidateFromButton);
    const hit = TottoItemHitTest.pickVisibleCandidate(
      candidates,
      { x: event.clientX, y: event.clientY }
    );
    if (DEV_MODE) {
      document.body.dataset.lastPhysicsPointer = JSON.stringify({
        x: event.clientX,
        y: event.clientY,
        candidates: candidates.map(candidate => {
          const local = TottoItemHitTest.localPoint(candidate, { x: event.clientX, y: event.clientY });
          return {
            uid: candidate.uid,
            local,
            alpha: candidate.alphaAt(local.u, local.v),
            centerAlpha: candidate.alphaAt(0.5, 0.5)
          };
        }),
        hit: hit?.uid || null
      });
    }
    if (!hit) return;

    event.preventDefault();
    event.stopPropagation();
    pick(hit.uid);
  }

  function setupLevel() {
    document.body.classList.add(`level-${level.id}`);
    const number = level.order + 1;
    document.title = `${level.title}｜托托救援队`;
    $("#levelEyebrow").textContent = `第${["一","二","三"][level.order] || number}关 · ${level.total} 个物品`;
    $("#levelTitle").textContent = level.title;
    $("#missionIcon").textContent = level.icon;
    $("#missionText").textContent = level.mission;
    $("#introIcon").textContent = level.icon;
    $("#introEyebrow").textContent = `托托救援 · 第${number}关`;
    $("#introTitle").textContent = level.introTitle || (level.id === "hotpot" ? "托托掉进火锅啦！" : "蒜头托托藏起来啦！");
    $("#introCopy").textContent = level.introCopy || `点击所有看得见的物品，凑齐三个就能消除。找到三个${level.items.at(-1).name}，完成这次救援！`;
    $("#introTotto").src = level.skinAsset;
    $("#pot").setAttribute("aria-label", level.containerLabel || `装满物品的${level.title}`);
    if (Array.isArray(level.sceneProps)) {
      $("#tableProps").innerHTML = level.sceneProps.map(prop => `<span>${prop}</span>`).join("");
    }
    $("#remaining").textContent = level.total;
  }

  function readProgress() {
    try {
      return { completed: [], coins: 0, clears: 0, bestScore: 0, levels: {}, bobaBonusDate: null, ...JSON.parse(localStorage.getItem(PROGRESS_KEY)) };
    } catch {
      return { completed: [], coins: 0, clears: 0, bestScore: 0, levels: {}, bobaBonusDate: null };
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function getSkins() {
    try { return JSON.parse(localStorage.getItem(SKIN_KEY)) || []; } catch { return []; }
  }

  function unlockSkin(id) {
    const skins = getSkins();
    if (skins.includes(id)) return false;
    skins.push(id);
    localStorage.setItem(SKIN_KEY, JSON.stringify(skins));
    return true;
  }

  function isUnlocked() {
    return TottoGameConfig.isLevelUnlocked(level.id, readProgress().completed);
  }

  function applyStableVisual(button, item) {
    const themePickable = TottoThemeMechanics.canPickItem(state.theme, item);
    const physicsPickable = TottoBoardMotion.canPickItem(item);
    button.className = [
      "item",
      item.special ? "special" : "",
      themePickable ? "" : "theme-locked",
      physicsPickable ? "" : "occluded",
      item.physicsAffected ? "physics-affected" : "",
      item.motionState !== "stable" ? "is-settling" : ""
    ].filter(Boolean).join(" ");
    button.setAttribute("aria-disabled", String(!themePickable || !physicsPickable));
    button.style.left = `${item.x}%`;
    button.style.top = `${item.y}%`;
    button.style.setProperty("--dx", "0px");
    button.style.setProperty("--dy", "0px");
    button.style.setProperty("--z", String(10 + Math.round((item.depth ?? item.z * 1000) / 10)));
    button.style.setProperty("--r", `${item.rotation}deg`);
    button.style.setProperty("--s", String(item.scale ?? 1));
    button.style.setProperty("--height", String(Math.max(0, item.z || 0)));
    button.style.setProperty("--shadow-y", `${4 + Math.min(7, item.z * 0.42)}px`);
    button.style.setProperty("--shadow-blur", `${3.5 + Math.min(7, item.z * 0.48)}px`);
    button.style.setProperty("--shadow-alpha", String(Math.max(0.25, 0.46 - item.z * 0.014)));
    button.dataset.debug = `z${item.z.toFixed(1)} L${item.layer} · ${item.motionState}`;
    button.title = DEV_MODE
      ? `${item.name}\nz=${item.z.toFixed(2)} layer=${item.layer}\n支持: ${item.supportUids.join(",") || "锅底"}\n遮挡: ${item.occluderUids.join(",") || "无"}\n速度: ${item.vx.toFixed(3)}, ${item.vy.toFixed(3)}, ${item.vz.toFixed(3)}`
      : item.name;
    primeHitMask(button);
  }

  function renderHud() {
    const active = state.items.filter(item => !item.selected);
    renderSlots(els.tray, state.tray, 7);
    renderSlots(els.reserve, state.reserve, 0);
    els.score.textContent = state.score;
    els.remaining.textContent = active.length;
    els.combo.textContent = `连击 ×${state.combo}`;
    els.trayCount.textContent = state.tray.length;
    els.shuffleLeft.textContent = state.shuffleLeft;
    els.moveLeft.textContent = state.moveLeft;
    els.reserveLeft.textContent = state.reserveLeft;
    renderThemeHud();
    const playing = state.status === "playing" && !isPaused;
    els.undo.disabled = !previousState || !playing;
    els.shuffle.disabled = state.shuffleLeft <= 0 || active.length < 2 || !playing;
    els.move.disabled = state.moveLeft <= 0 || state.tray.length === 0 || !playing;
    els.reserveBtn.disabled = state.reserveLeft <= 0 || state.tray.length === 0 || state.reserve.length >= 2 || !playing;
    renderPhysicsDebug();
    if (!physicsLock) save();
  }

  function syncBoard() {
    const active = state.items.filter(item => !item.selected);
    const activeUids = new Set(active.map(item => item.uid));
    for (const [uid, button] of itemElements) {
      if (activeUids.has(uid) || button.classList.contains("extracting")) continue;
      button.remove();
      itemElements.delete(uid);
    }

    const missing = active.filter(item => !itemElements.has(item.uid));
    if (missing.length) {
      const fragment = new DocumentFragment();
      for (const item of missing) fragment.appendChild(createItemButton(item));
      els.items.appendChild(fragment);
    }
    for (const item of active) applyStableVisual(itemElements.get(item.uid), item);
    renderHud();
  }

  function render() {
    if (boardReady) syncBoard();
    else renderHud();
  }

  function renderThemeHud() {
    const theme = state.theme || { kind: "none" };
    els.themeHud.hidden = false;

    if (theme.kind === "studio-combo") {
      els.themeHud.innerHTML = `<span>✨ 灵感连消</span><strong>${theme.streak ? `${theme.streak} 连 · 4 秒内续上` : "三消后 4 秒内继续"}</strong>`;
    } else if (theme.kind === "boba-orders") {
      const names = new Map(level.items.map(item => [item.id, item.name]));
      els.themeHud.innerHTML = `<span>🧋 今日订单</span><div class="order-chips">${theme.orders.map(type => `<b class="${theme.completed.includes(type) ? "done" : ""}">${theme.completed.includes(type) ? "✓ " : ""}${names.get(type) || type}</b>`).join("")}</div>`;
    } else if (theme.kind === "winter-yarn") {
      els.themeHud.innerHTML = `<span>🧶 毛线缠绕</span><strong>${theme.lockedUids.length ? `还有 ${theme.lockedUids.length} 件被缠住` : "毛线已经全部解开"}</strong>`;
    } else {
      els.themeHud.hidden = true;
      els.themeHud.innerHTML = "";
    }
  }

  function renderPhysicsDebug() {
    if (!SHOW_DEBUG || !state) return;
    document.body.classList.add("dev-physics");
    els.physicsDebug.hidden = false;
    const active = state.items.filter(item => !item.selected);
    const falling = active.filter(item => item.motionState !== "stable");
    const affected = active.filter(item => item.physicsAffected);
    const supports = active.reduce((sum, item) => sum + item.supportUids.length, 0);
    els.physicsDebugStatus.textContent = [
      `${active.length} 件`,
      `支持边 ${supports}`,
      `受影响 ${affected.length}`,
      `运动中 ${falling.length}`
    ].join(" · ");
  }

  function renderSlots(container, entries, fill) {
    container.innerHTML = "";
    entries.forEach(item => {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.title = item.name;
      slot.innerHTML = visualMarkup(item, true);
      container.appendChild(slot);
    });
    for (let index = entries.length; index < fill; index += 1) {
      const slot = document.createElement("div");
      slot.className = "slot";
      container.appendChild(slot);
    }
  }

  function physicsRandom() {
    state.physicsStep = (state.physicsStep || 0) + 1;
    const seed = (state.physicsSeed || 1) + state.physicsStep * 2654435761;
    return TottoBoardMotion.createSeededRandom(seed);
  }

  async function animateExtraction(item) {
    const button = itemElements.get(item.uid);
    if (!button || REDUCED_MOTION) return;
    const source = button.getBoundingClientRect();
    const target = els.tray.getBoundingClientRect();
    button.style.setProperty("--extract-x", `${target.left + target.width / 2 - source.left - source.width / 2}px`);
    button.style.setProperty("--extract-y", `${target.top + target.height / 2 - source.top - source.height / 2}px`);
    await nextFrame();
    button.classList.add("extracting");
    await wait(230);
  }

  function fallProgress(progress, bounce) {
    if (progress < 0.78) return (progress / 0.78) ** 2;
    const contact = (progress - 0.78) / 0.22;
    return 1 + Math.sin(contact * Math.PI) * bounce * (1 - contact);
  }

  function impulseProgress(progress, bounce) {
    return 1 - (1 - progress) ** 3 + Math.sin(progress * Math.PI) * bounce * 0.45;
  }

  async function animatePlans(plans) {
    if (!plans.length) {
      TottoBoardMotion.rebuildRelations(state.items);
      syncBoard();
      return;
    }
    const token = ++animationSequence;
    const byUid = new Map(state.items.map(item => [item.uid, item]));
    const container = els.items.getBoundingClientRect();
    for (const plan of plans) {
      const item = byUid.get(plan.uid);
      if (!item || item.selected) continue;
      item.motionState = plan.kind === "fall" ? "falling" : "sliding";
      item.isFalling = plan.kind === "fall";
      item.physicsAffected = true;
      const button = itemElements.get(item.uid);
      button?.classList.add("is-settling", "physics-affected");
    }
    renderPhysicsDebug();

    if (!REDUCED_MOTION) {
      const startedAt = performance.now();
      const totalDuration = Math.max(...plans.map(plan => plan.delay + plan.duration));
      await new Promise(resolve => {
        function frame(now) {
          if (token !== animationSequence) {
            resolve();
            return;
          }
          const elapsed = now - startedAt;
          for (const plan of plans) {
            const item = byUid.get(plan.uid);
            const button = itemElements.get(plan.uid);
            if (!item || item.selected || !button) continue;
            const progress = Math.max(0, Math.min(1, (elapsed - plan.delay) / plan.duration));
            const travel = plan.kind === "fall"
              ? fallProgress(progress, plan.bounce)
              : impulseProgress(progress, plan.bounce);
            const x = plan.start.x + (plan.target.x - plan.start.x) * travel;
            const y = plan.start.y + (plan.target.y - plan.start.y) * travel;
            const z = plan.start.z
              + (plan.target.z - plan.start.z) * progress
              + Math.sin(progress * Math.PI) * plan.lift;
            const rotation = plan.start.rotation
              + plan.rotationDelta * travel
              + Math.sin(progress * Math.PI * 2) * 2.2 * (1 - progress);
            item.visualX = x;
            item.visualY = y;
            item.vx = plan.velocity.x * (1 - progress);
            item.vy = plan.velocity.y * (1 - progress);
            item.vz = plan.kind === "fall" ? plan.velocity.z * (1 - progress) : Math.cos(progress * Math.PI) * plan.lift / plan.duration;
            item.angularVelocity = plan.rotationDelta / plan.duration * (1 - progress);
            button.style.setProperty("--dx", `${(x - plan.start.x) / 100 * container.width}px`);
            button.style.setProperty("--dy", `${(y - plan.start.y) / 100 * container.height}px`);
            button.style.setProperty("--r", `${rotation}deg`);
            button.style.setProperty("--height", String(Math.max(0, z)));
            button.style.setProperty("--shadow-y", `${4 + Math.min(7, z * 0.42)}px`);
            button.style.setProperty("--shadow-blur", `${3.5 + Math.min(7, z * 0.48)}px`);
            button.style.setProperty("--shadow-alpha", String(Math.max(0.25, 0.46 - z * 0.014)));
            button.style.setProperty("--z", String(10 + Math.round((z * 1000 + y * 10) / 10)));
            button.dataset.debug = `z${z.toFixed(1)} · ${item.motionState}`;
          }
          renderPhysicsDebug();
          if (elapsed < totalDuration) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    TottoBoardMotion.finalizePlans(state.items, plans);
    syncBoard();
  }

  async function pick(uid) {
    if (DEV_MODE) {
      document.body.dataset.lastPickAttempt = JSON.stringify({
        uid,
        boardReady,
        isPaused,
        resolveLock,
        physicsLock,
        status: state?.status
      });
    }
    if (!boardReady || isPaused || resolveLock || physicsLock || state.status !== "playing") return;
    const item = state.items.find(entry => entry.uid === uid && !entry.selected);
    if (!item) return;
    if (!TottoThemeMechanics.canPickItem(state.theme, item)) {
      showToast("先消除毛线球，解开这件物品");
      return;
    }
    if (!TottoBoardMotion.canPickItem(item)) {
      showToast("这个物品还被上面的东西压着");
      return;
    }
    previousState = clone(state);
    resolveLock = true;
    physicsLock = true;
    const fall = TottoBoardMotion.planRemoval(state.items, uid, physicsRandom());
    try {
      await animateExtraction(item);
      item.selected = true;
      state.tray.push({ uid: item.uid, type: item.type, asset: item.asset, name: item.name, special: item.special });
      state.score += 10;
      itemElements.get(item.uid)?.remove();
      itemElements.delete(item.uid);
      renderHud();
      await animatePlans(fall.plans);
      if (navigator.vibrate) navigator.vibrate(12);
    } finally {
      physicsLock = false;
      resolveLock = false;
    }
    await resolveMatches();
  }

  async function resolveMatches() {
    resolveLock = true;
    const groups = new Map();
    state.tray.forEach(item => {
      if (!groups.has(item.type)) groups.set(item.type, []);
      groups.get(item.type).push(item);
    });
    const match = [...groups.values()].find(group => group.length >= 3);
    if (match) {
      await wait(150);
      const ids = new Set(match.slice(0, 3).map(item => item.uid));
      const special = match[0].special;
      state.tray = state.tray.filter(item => !ids.has(item.uid));
      state.combo += 1;
      const themeResult = TottoThemeMechanics.onThemeMatch(
        state.theme,
        { type: match[0].type, at: Date.now() },
        Math.random
      );
      state.theme = themeResult.state;
      state.score += 90 + state.combo * 15 + (special ? 300 : 0) + themeResult.scoreBonus;
      const mechanicMessage = themeResult.scoreBonus
        ? `灵感连消 +${themeResult.scoreBonus}`
        : themeResult.unlockedUids.length
          ? `毛线松开了 ${themeResult.unlockedUids.length} 件物品`
          : "";
      showToast(special
        ? `${level.items.at(-1).name}出现！额外 +300`
        : mechanicMessage || `三消成功 · 连击 ${state.combo}`);
      if (navigator.vibrate) navigator.vibrate([20, 35, 20]);
    } else {
      state.combo = 0;
    }
    resolveLock = false;
    render();
    checkEnd();
  }

  function checkEnd() {
    if (state.items.every(item => item.selected) && state.tray.length === 0) {
      finish(true);
    } else if (state.tray.length >= 7) {
      finish(false);
    }
  }

  function finish(won) {
    state.elapsed = elapsedNow();
    state.status = won ? "won" : "lost";
    isPaused = false;
    document.body.classList.remove("game-paused");
    stopTimer();
    localStorage.removeItem(level.saveKey);
    const reward = won ? completeLevel() : null;
    openResult(won, reward);
  }

  function completeLevel() {
    const progress = readProgress();
    const first = !progress.completed.includes(level.id);
    if (first) progress.completed.push(level.id);
    const baseCoins = first ? 100 : 25;
    const today = localDateKey(new Date());
    const ordersComplete = state.theme?.kind === "boba-orders"
      && state.theme.orders.length === 3
      && state.theme.orders.every(type => state.theme.completed.includes(type));
    const dailyBobaBonus = level.id === "boba"
      && ordersComplete
      && (window.TottoCloud?.canClaimDailyBonus?.(progress.bobaBonusDate, today)
        ?? progress.bobaBonusDate !== today);
    const bonusCoins = dailyBobaBonus ? 10 : 0;
    if (dailyBobaBonus) progress.bobaBonusDate = today;
    progress.coins += baseCoins + bonusCoins;
    progress.clears += 1;
    progress.bestScore = Math.max(progress.bestScore || 0, state.score);
    const currentLevel = progress.levels?.[level.id] || {};
    progress.levels = {
      ...(progress.levels || {}),
      [level.id]: {
        best_score: Math.max(Number(currentLevel.best_score) || 0, state.score),
        best_time_ms: [Number(currentLevel.best_time_ms), state.elapsed]
          .filter(value => Number.isFinite(value) && value > 0)
          .sort((a, b) => a - b)[0] || null
      }
    };
    saveProgress(progress);
    const freshSkin = unlockSkin(level.skin);
    if (freshSkin) localStorage.setItem(EQUIPPED_KEY, level.skin);
    window.TottoCloud?.syncLocalProgress().catch(() => {});
    return { first, freshSkin, baseCoins, bonusCoins };
  }

  function localDateKey(date) {
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map((value, index) => index ? String(value).padStart(2, "0") : String(value))
      .join("-");
  }

  function openResult(won, reward) {
    const seconds = Math.floor(state.elapsed / 1000);
    $("#resultCharacter").src = won ? level.skinAsset : "assets/characters/totto-default.webp";
    $("#resultTitle").textContent = won ? `${level.title}救援成功！` : "收集槽塞满啦";
    $("#rewardBadge").textContent = won
      ? reward.freshSkin ? `新皮肤 · ${level.skinName}` : `已拥有 · ${level.skinName}`
      : "别急，再试一次";
    $("#resultText").textContent = won
      ? `用时 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒，得分 ${state.score}。本次获得 ${reward.baseCoins + reward.bonusCoins} 托托金币${reward.bonusCoins ? "（含今日订单 +10）" : ""}。`
      : "撤回和暂存能救急；像翻炒一样用力前后甩动手机，也能翻出下面的物品。";
    const next = level.next;
    $("#nextBtn").textContent = won && next ? `前往${TottoGameConfig.getLevel(next).title}` : "回到托托小屋";
    $("#nextBtn").href = won && next ? `index.html?level=${next}` : "home.html";
    els.result.classList.add("show");
  }

  function undo() {
    if (isPaused || physicsLock || !previousState) return;
    state = previousState;
    previousState = null;
    TottoBoardMotion.ensurePhysicsState(state.items);
    TottoBoardMotion.rebuildRelations(state.items);
    state.startedAt = Date.now();
    showToast("已撤回一步");
    render();
  }

  function shuffleBoard() {
    if (isPaused || physicsLock || state.shuffleLeft <= 0) return;
    previousState = clone(state);
    state.shuffleLeft -= 1;
    const active = state.items.filter(item => !item.selected);
    for (let index = active.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      for (const key of ["x", "y", "z", "layer", "depth", "rotation"]) {
        [active[index][key], active[target][key]] = [active[target][key], active[index][key]];
      }
    }
    TottoBoardMotion.rebuildRelations(state.items);
    showToast("物品重新排好啦");
    animatePot();
    render();
  }

  function moveOut() {
    if (isPaused || physicsLock || state.moveLeft <= 0 || !state.tray.length) return;
    previousState = clone(state);
    const item = state.tray.pop();
    const source = state.items.find(entry => entry.uid === item.uid);
    if (source) {
      source.selected = false;
      source.motionState = "stable";
      source.isFalling = false;
    }
    TottoBoardMotion.rebuildRelations(state.items);
    state.moveLeft -= 1;
    showToast("一个物品放回去了");
    render();
  }

  function reserveOne() {
    if (isPaused || physicsLock || state.reserveLeft <= 0 || !state.tray.length || state.reserve.length >= 2) return;
    previousState = clone(state);
    state.reserve.push(state.tray.pop());
    state.reserveLeft -= 1;
    showToast("已放入临时区");
    render();
  }

  function releaseReserve() {
    if (isPaused || physicsLock || !state.reserve.length || state.tray.length >= 7) return;
    previousState = clone(state);
    state.tray.push(state.reserve.pop());
    render();
    resolveMatches();
  }

  function elapsedNow() {
    return state.elapsed + (state.status === "playing" && !isPaused ? Date.now() - state.startedAt : 0);
  }

  function startTimer() {
    stopTimer();
    if (state.status !== "playing") return;
    state.startedAt = Date.now();
    timerHandle = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function updateTimer() {
    const seconds = Math.floor(elapsedNow() / 1000);
    els.timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  function save() {
    if (!state || state.status !== "playing") return;
    const stored = clone(state);
    stored.elapsed = elapsedNow();
    stored.startedAt = Date.now();
    localStorage.setItem(level.saveKey, JSON.stringify(stored));
  }

  function load() {
    const devRandom = DEV_MODE ? TottoBoardMotion.createSeededRandom(20260808 + level.order) : Math.random;
    const serialized = DEV_MODE && params.get("fresh") === "1" ? null : localStorage.getItem(level.saveKey);
    const restored = TottoGameState.restoreGame(serialized, level, devRandom);
    state = restored || TottoGameState.createGame(level, devRandom);
    state.startedAt = Date.now();
    return Boolean(restored);
  }

  function restart() {
    stopTimer();
    isPaused = false;
    document.body.classList.remove("game-paused");
    state = TottoGameState.createGame(level);
    previousState = null;
    els.result.classList.remove("show");
    els.pauseMenu.classList.remove("show");
    closeRestartConfirmation();
    render();
    startTimer();
  }

  function pauseGame() {
    if (physicsLock) {
      showToast("等物品落稳就能暂停啦");
      return;
    }
    if (!state || state.status !== "playing" || isPaused || els.intro.classList.contains("show")) return;
    state.elapsed = elapsedNow();
    state.startedAt = Date.now();
    isPaused = true;
    stopTimer();
    updateTimer();
    save();
    closeRestartConfirmation();
    document.body.classList.add("game-paused");
    els.pauseMenu.classList.add("show");
    requestAnimationFrame(() => els.continueBtn.focus());
  }

  function continueGame() {
    if (!isPaused) return;
    els.pauseMenu.classList.remove("show");
    document.body.classList.remove("game-paused");
    isPaused = false;
    startTimer();
    showToast("继续救援！");
  }

  function openRestartConfirmation() {
    els.pauseMain.hidden = true;
    els.restartConfirm.hidden = false;
    els.confirmRestartBtn.focus();
  }

  function closeRestartConfirmation() {
    els.pauseMain.hidden = false;
    els.restartConfirm.hidden = true;
  }

  function animatePot() {
    els.pot.classList.remove("shaking");
    void els.pot.offsetWidth;
    els.pot.classList.add("shaking");
    els.shakeWave.classList.remove("show");
    void els.shakeWave.offsetWidth;
    els.shakeWave.classList.add("show");
  }

  async function applyMotion(impulse) {
    const detail = typeof impulse === "string"
      ? { strength: impulse, direction: { x: 0.72, y: -0.34 }, peak: impulse === "strong" ? 19 : 13 }
      : impulse;
    if (!state || !boardReady || isPaused || physicsLock || resolveLock || state.status !== "playing" || detail.strength === "none") return;
    physicsLock = true;
    const result = TottoBoardMotion.planImpulse(state.items, detail, physicsRandom());
    animatePot();
    try {
      await animatePlans(result.plans);
      showToast(detail.strength === "strong" ? "托托用力翻了翻，物品重新堆稳啦" : "物品顺着翻锅方向滚动啦");
    } finally {
      physicsLock = false;
      save();
    }
  }

  function onDeviceMotion(event) {
    const acceleration = event.acceleration;
    if (!acceleration) return;
    const result = detector.updateDetailed(acceleration, event.timeStamp || performance.now());
    if (result.strength !== "none") void applyMotion(result);
  }

  async function enableMotion() {
    const permission = await TottoMotionControls.requestMotionPermission(window);
    if (!permission.granted) {
      motionEnabled = false;
      localStorage.removeItem(MOTION_KEY);
      motionFallback = permission.reason === "unsupported";
      els.motionStatus.textContent = motionFallback ? "轻翻按钮 · 点击使用" : "翻锅感应 · 未授权";
      els.motionStatus.classList.toggle("fallback", motionFallback);
      showToast(motionFallback ? "此设备没有动作传感器，可点击这里轻翻" : "没有获得动作与方向权限");
      return false;
    }
    window.removeEventListener("devicemotion", onDeviceMotion);
    window.addEventListener("devicemotion", onDeviceMotion, { passive: true });
    motionEnabled = true;
    motionFallback = false;
    localStorage.setItem(MOTION_KEY, "1");
    els.motionStatus.textContent = "翻锅感应 · 已开启";
    els.motionStatus.classList.add("on");
    return true;
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add("show");
    clearTimeout(toastHandle);
    toastHandle = setTimeout(() => els.toast.classList.remove("show"), 1600);
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function startGame(useMotion) {
    if (!boardReady) return;
    if (useMotion) await enableMotion();
    els.intro.classList.remove("show");
    isPaused = false;
    startTimer();
  }

  function configureDevScene() {
    if (!DEV_MODE) return;
    const scene = params.get("scene");
    if (!scene) return;
    const active = state.items.filter(item => !item.selected);
    const position = (item, x, y, z) => {
      item.selected = false;
      item.x = x;
      item.y = y;
      item.z = z;
      item.layer = Math.round(z);
      item.depth = Math.round(z * 1000 + y * 10);
      item.visualX = x;
      item.visualY = y;
      item.motionState = "stable";
      item.isFalling = false;
    };

    if (scene === "match") {
      const preferredType = level.id === "garlic" ? "garlic-head" : null;
      const matchType = preferredType || active.find(item => active.filter(candidate => candidate.type === item.type).length >= 3)?.type;
      const keep = active.filter(item => item.type === matchType).slice(0, 3);
      state.items.forEach(item => { item.selected = !keep.includes(item); });
      [[36, 52, 0], [50, 48, 0], [64, 52, 0]].forEach((point, index) => position(keep[index], ...point));
    } else if (scene === "opacity" && level.id === "garlic") {
      const black = active.find(item => item.type === "purple-garlic");
      const white = active.find(item => item.type === "garlic-head");
      const extras = active.filter(item => ![black, white].includes(item)).slice(0, 4);
      state.items.forEach(item => { item.selected = ![black, white, ...extras].includes(item); });
      position(white, 51, 51, 0.8);
      position(black, 49.5, 48.5, 1.7);
      extras.forEach((item, index) => position(item, 37 + index * 9, 60 + (index % 2) * 6, 0));
    } else if (scene === "collapse") {
      const keep = [];
      const types = new Set();
      for (const item of active) {
        if (types.has(item.type)) continue;
        types.add(item.type);
        keep.push(item);
        if (keep.length === 7) break;
      }
      state.items.forEach(item => { item.selected = !keep.includes(item); });
      const layout = [
        [50, 54, 0], [43, 49, 1], [57, 49, 1.1], [50, 43, 2],
        [35, 61, 0], [65, 61, 0], [50, 68, 0]
      ];
      keep.forEach((item, index) => position(item, ...layout[index]));
      state.devSupportUid = keep[0].uid;
    }
    state.tray = [];
    state.reserve = [];
    TottoBoardMotion.ensurePhysicsState(state.items);
    TottoBoardMotion.rebuildRelations(state.items);
  }

  setupLevel();
  if (window.fromHome) window.playBrandPose();
  if (!isUnlocked() && !DEV_MODE) {
    location.replace("home.html#map");
    return;
  }
  els.startBtn.disabled = true;
  els.skipIntro.disabled = true;
  const resumedSave = load();
  configureDevScene();
  renderHud();

  els.undo.addEventListener("click", undo);
  els.items.addEventListener("click", handleItemClick);
  els.shuffle.addEventListener("click", shuffleBoard);
  els.move.addEventListener("click", moveOut);
  els.reserveBtn.addEventListener("click", reserveOne);
  els.reserve.addEventListener("click", releaseReserve);
  $("#againBtn").addEventListener("click", restart);
  els.pauseBtn.addEventListener("click", pauseGame);
  els.continueBtn.addEventListener("click", continueGame);
  els.restartBtn.addEventListener("click", openRestartConfirmation);
  els.cancelRestartBtn.addEventListener("click", () => {
    closeRestartConfirmation();
    els.restartBtn.focus();
  });
  els.confirmRestartBtn.addEventListener("click", restart);
  els.startBtn.addEventListener("click", () => startGame(wantsMotion));
  els.skipIntro.addEventListener("click", () => startGame(false));
  els.motionChoice.addEventListener("click", () => {
    wantsMotion = !wantsMotion;
    els.motionChoice.classList.toggle("selected", wantsMotion);
  });
  els.motionStatus.addEventListener("click", async () => {
    if (isPaused) return;
    if (motionEnabled || motionFallback) {
      await applyMotion({ strength: "medium", direction: { x: 0.72, y: -0.34 }, peak: 13 });
    } else {
      await enableMotion();
      if (motionEnabled) showToast("翻锅感应已经开启");
    }
  });
  function simulateDevPick() {
    if (!DEV_MODE || physicsLock) return;
    const active = state.items.filter(item => !item.selected && TottoBoardMotion.canPickItem(item));
    const preferred = active.find(candidate => candidate.uid === state.devSupportUid);
    const supporting = active.find(candidate => state.items.some(item => item.supportUids.includes(candidate.uid)));
    void pick((preferred || supporting || active[0])?.uid);
  }

  els.debugExtractBtn.addEventListener("click", simulateDevPick);
  els.debugShakeBtn.addEventListener("click", () => {
    if (!DEV_MODE) return;
    void applyMotion({ strength: "strong", direction: { x: 0.82, y: -0.32 }, peak: 19 });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
  });
  document.addEventListener("keydown", event => {
    if (DEV_MODE && event.key.toLowerCase() === "p") {
      simulateDevPick();
      return;
    }
    if (DEV_MODE && event.key.toLowerCase() === "f") {
      void applyMotion({ strength: "strong", direction: { x: 0.82, y: -0.32 }, peak: 19 });
      return;
    }
    if (event.key === "Escape" && isPaused) {
      if (!els.restartConfirm.hidden) {
        closeRestartConfirmation();
        els.restartBtn.focus();
      } else {
        continueGame();
      }
    }
  });
  window.addEventListener("beforeunload", save);
  window.addEventListener("resize", () => {
    if (boardReady && !physicsLock) syncBoard();
  }, { passive: true });

  async function initialize() {
    await preloadLevelAssets();
    await mountBoardBatched();
    if (resumedSave) {
      els.intro.classList.remove("show");
      startTimer();
      showToast(`已继续上次的${level.title}`);
      if (localStorage.getItem(MOTION_KEY) === "1") {
        els.motionStatus.textContent = "翻锅感应 · 点击恢复";
      }
    }
    if (DEV_MODE) {
      if (SHOW_DEBUG) {
        document.body.classList.add("dev-physics");
        els.physicsDebug.hidden = false;
      }
      window.TottoDev = {
        getState: () => clone(state),
        simulatePick: uid => pick(uid || state.items.find(item => TottoBoardMotion.canPickItem(item))?.uid),
        simulateShake: (strength = "strong", direction = { x: 0.82, y: -0.32 }) => applyMotion({ strength, direction, peak: strength === "strong" ? 19 : 13 })
      };
      renderPhysicsDebug();
    }
  }

  initialize().catch(error => {
    console.error(error);
    els.loadingStatus.hidden = false;
    els.loadingStatus.textContent = "素材准备遇到问题，仍可尝试开始";
    els.startBtn.disabled = false;
    els.skipIntro.disabled = false;
  });
})();
