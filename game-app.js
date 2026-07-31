(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const level = TottoGameConfig.getLevel(params.get("level"));
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
    cancelRestartBtn: $("#cancelRestartBtn")
  };

  let state;
  let previousState = null;
  let timerHandle = null;
  let resolveLock = false;
  let toastHandle = null;
  let motionEnabled = false;
  let wantsMotion = true;
  let lastMotionRender = 0;
  let isPaused = false;
  const hitMasks = new Map();
  const detector = TottoMotionControls.createShakeDetector({ cooldownMs: 1200 });

  function visualMarkup(item, compact = false) {
    if (item.asset.startsWith("emoji:")) {
      return `<span class="emoji" aria-hidden="true">${item.asset.slice(6)}</span>`;
    }
    return `<img src="${item.asset}" alt="" ${compact ? "" : "draggable=\"false\""}>`;
  }

  function cacheHitMask(image) {
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;
    const key = image.currentSrc || image.src;
    if (hitMasks.has(key)) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
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

    const candidates = [...els.items.querySelectorAll(".item")].map(candidateFromButton);
    const hit = TottoItemHitTest.pickVisibleCandidate(
      candidates,
      { x: event.clientX, y: event.clientY }
    );
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
      return { completed: [], coins: 0, clears: 0, bestScore: 0, ...JSON.parse(localStorage.getItem(PROGRESS_KEY)) };
    } catch {
      return { completed: [], coins: 0, clears: 0, bestScore: 0 };
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

  function render() {
    const active = state.items.filter(item => !item.selected);
    els.items.innerHTML = "";
    active.sort((a, b) => (a.depth ?? a.layer * 1000) - (b.depth ?? b.layer * 1000)).forEach(item => {
      const button = document.createElement("button");
      button.className = `item${item.special ? " special" : ""}`;
      button.type = "button";
      button.dataset.uid = item.uid;
      button.setAttribute("aria-label", `选择${item.name}`);
      button.style.left = `${item.x}%`;
      button.style.top = `${item.y}%`;
      button.style.setProperty("--z", String(10 + Math.round((item.depth ?? item.layer * 1000) / 10)));
      button.style.setProperty("--r", `${item.rotation}deg`);
      button.style.setProperty("--s", String(item.scale ?? 1));
      button.innerHTML = visualMarkup(item);
      els.items.appendChild(button);
      primeHitMask(button);
    });

    renderSlots(els.tray, state.tray, 7);
    renderSlots(els.reserve, state.reserve, 0);
    els.score.textContent = state.score;
    els.remaining.textContent = active.length;
    els.combo.textContent = `连击 ×${state.combo}`;
    els.trayCount.textContent = state.tray.length;
    els.shuffleLeft.textContent = state.shuffleLeft;
    els.moveLeft.textContent = state.moveLeft;
    els.reserveLeft.textContent = state.reserveLeft;
    const playing = state.status === "playing" && !isPaused;
    els.undo.disabled = !previousState || !playing;
    els.shuffle.disabled = state.shuffleLeft <= 0 || active.length < 2 || !playing;
    els.move.disabled = state.moveLeft <= 0 || state.tray.length === 0 || !playing;
    els.reserveBtn.disabled = state.reserveLeft <= 0 || state.tray.length === 0 || state.reserve.length >= 2 || !playing;
    save();
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

  async function pick(uid) {
    if (isPaused || resolveLock || state.status !== "playing") return;
    const item = state.items.find(entry => entry.uid === uid && !entry.selected);
    if (!item) return;
    previousState = clone(state);
    item.selected = true;
    state.tray.push({ uid: item.uid, type: item.type, asset: item.asset, name: item.name, special: item.special });
    state.score += 10;
    render();
    if (navigator.vibrate) navigator.vibrate(12);
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
      state.score += 90 + state.combo * 15 + (special ? 300 : 0);
      showToast(special ? `${level.items.at(-1).name}出现！额外 +300` : `三消成功 · 连击 ${state.combo}`);
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
    progress.coins += first ? 100 : 25;
    progress.clears += 1;
    progress.bestScore = Math.max(progress.bestScore || 0, state.score);
    saveProgress(progress);
    const freshSkin = unlockSkin(level.skin);
    if (freshSkin) localStorage.setItem(EQUIPPED_KEY, level.skin);
    window.TottoCloud?.syncLocalProgress().catch(() => {});
    return { first, freshSkin };
  }

  function openResult(won, reward) {
    const seconds = Math.floor(state.elapsed / 1000);
    $("#resultCharacter").src = won ? level.skinAsset : "assets/characters/totto-default.webp";
    $("#resultTitle").textContent = won ? `${level.title}救援成功！` : "收集槽塞满啦";
    $("#rewardBadge").textContent = won
      ? reward.freshSkin ? `新皮肤 · ${level.skinName}` : `已拥有 · ${level.skinName}`
      : "别急，再试一次";
    $("#resultText").textContent = won
      ? `用时 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒，得分 ${state.score}。本次获得 ${reward.first ? 100 : 25} 托托金币。`
      : "撤回和暂存能救急；像翻炒一样用力前后甩动手机，也能翻出下面的物品。";
    const next = level.next;
    $("#nextBtn").textContent = won && next ? `前往${TottoGameConfig.getLevel(next).title}` : "回到托托小屋";
    $("#nextBtn").href = won && next ? `index.html?level=${next}` : "home.html";
    els.result.classList.add("show");
  }

  function undo() {
    if (isPaused || !previousState) return;
    state = previousState;
    previousState = null;
    state.startedAt = Date.now();
    showToast("已撤回一步");
    render();
  }

  function shuffleBoard() {
    if (isPaused || state.shuffleLeft <= 0) return;
    previousState = clone(state);
    state.shuffleLeft -= 1;
    const active = state.items.filter(item => !item.selected);
    for (let index = active.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [active[index].x, active[target].x] = [active[target].x, active[index].x];
      [active[index].y, active[target].y] = [active[target].y, active[index].y];
      [active[index].layer, active[target].layer] = [active[target].layer, active[index].layer];
    }
    showToast("物品重新排好啦");
    animatePot();
    render();
  }

  function moveOut() {
    if (isPaused || state.moveLeft <= 0 || !state.tray.length) return;
    previousState = clone(state);
    const item = state.tray.pop();
    const source = state.items.find(entry => entry.uid === item.uid);
    if (source) source.selected = false;
    state.moveLeft -= 1;
    showToast("一个物品放回去了");
    render();
  }

  function reserveOne() {
    if (isPaused || state.reserveLeft <= 0 || !state.tray.length || state.reserve.length >= 2) return;
    previousState = clone(state);
    state.reserve.push(state.tray.pop());
    state.reserveLeft -= 1;
    showToast("已放入临时区");
    render();
  }

  function releaseReserve() {
    if (isPaused || !state.reserve.length || state.tray.length >= 7) return;
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
    const restored = TottoGameState.restoreGame(localStorage.getItem(level.saveKey), level);
    state = restored || TottoGameState.createGame(level);
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

  function applyMotion(strength) {
    if (!state || isPaused || state.status !== "playing" || strength === "none") return;
    const result = TottoBoardMotion.applyBoardMotion(state.items, strength);
    animatePot();
    const now = performance.now();
    if (strength !== "light" || now - lastMotionRender > 180) {
      render();
      lastMotionRender = now;
    }
    if (result.promoted) showToast(`晃出了 ${result.promoted} 个下面的物品`);
  }

  function onDeviceMotion(event) {
    const acceleration = event.acceleration;
    if (!acceleration) return;
    applyMotion(detector.update(acceleration, event.timeStamp || performance.now()));
  }

  async function enableMotion() {
    const permission = await TottoMotionControls.requestMotionPermission(window);
    if (!permission.granted) {
      motionEnabled = false;
      localStorage.removeItem(MOTION_KEY);
      els.motionStatus.textContent = permission.reason === "unsupported" ? "翻锅感应 · 此设备不支持" : "翻锅感应 · 未授权";
      showToast(permission.reason === "unsupported" ? "当前设备可直接使用屏幕道具" : "没有获得动作与方向权限");
      return false;
    }
    window.removeEventListener("devicemotion", onDeviceMotion);
    window.addEventListener("devicemotion", onDeviceMotion, { passive: true });
    motionEnabled = true;
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
    if (useMotion) await enableMotion();
    els.intro.classList.remove("show");
    isPaused = false;
    startTimer();
  }

  setupLevel();
  if (window.fromHome) window.playBrandPose();
  if (!isUnlocked()) {
    location.replace("home.html#map");
    return;
  }
  const resumed = load();
  render();
  if (resumed) {
    els.intro.classList.remove("show");
    startTimer();
    showToast(`已继续上次的${level.title}`);
    if (localStorage.getItem(MOTION_KEY) === "1") {
      els.motionStatus.textContent = "翻锅感应 · 点击恢复";
    }
  }

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
  $("#startBtn").addEventListener("click", () => startGame(wantsMotion));
  $("#skipIntro").addEventListener("click", () => startGame(false));
  els.motionChoice.addEventListener("click", () => {
    wantsMotion = !wantsMotion;
    els.motionChoice.classList.toggle("selected", wantsMotion);
  });
  els.motionStatus.addEventListener("click", async () => {
    if (isPaused) return;
    if (motionEnabled) {
      applyMotion("medium");
    } else {
      await enableMotion();
      if (motionEnabled) showToast("翻锅感应已经开启");
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) save();
  });
  document.addEventListener("keydown", event => {
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
})();
